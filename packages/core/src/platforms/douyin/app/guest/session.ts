import type { EndpointCtx } from '../../../../contracts/endpoint'
import type { RawResponse } from '../../../../contracts/request'
import type { DouyinAppOptions } from '../options'
import { AppCookieJar } from './cookies'
import { createAppDevice, type AppDevice } from './device'
import { acquireCookies, registerDevice, signOwnedRequest } from './requests'
import { loadAppSnapshot, saveAppSnapshot, type AppGuestSnapshot } from './state'
import { resolveAppSessionFile } from './storage'

const sessions = new WeakMap<DouyinAppOptions, AppGuestSession>()
const persisted = new Map<string, WeakRef<AppGuestSession>>()

/** 同一配置对象或本地快照文件的 SDK、HTTP 路由和采样工具共用初始化。 */
export const appGuestSessionFor = (options: DouyinAppOptions): AppGuestSession => {
  const file = resolveAppSessionFile(options.sessionFile)
  const key = !options.session ? `${options.signerBaseUrl}\0${file}` : undefined
  const cached = sessions.get(options) ?? (key ? persisted.get(key)?.deref() : undefined)
  if (cached) return cached
  const session = new AppGuestSession({ ...options, sessionFile: file })
  sessions.set(options, session)
  if (key) persisted.set(key, new WeakRef(session))
  for (const [path, value] of persisted) if (!value.deref()) persisted.delete(path)
  return session
}

/** 单个 SDK 实例拥有一份设备和 Cookie，初始化/刷新单飞，不随业务重试换设备。 */
export class AppGuestSession {
  readonly device: AppDevice
  private readonly jar: AppCookieJar
  private readonly sessionFile: string
  private refreshedAt: number
  private pending?: Promise<void>
  constructor(private readonly options: DouyinAppOptions) {
    this.sessionFile = resolveAppSessionFile(options.sessionFile)
    const snapshot = options.session || loadAppSnapshot(this.sessionFile)
    this.device = snapshot ? structuredClone(snapshot.device) : createAppDevice()
    this.jar = new AppCookieJar(snapshot?.cookies)
    this.refreshedAt = snapshot?.refreshedAt ?? 0
  }
  ensure(ctx: EndpointCtx): Promise<void> {
    if (
      this.refreshedAt > Date.now() - 12 * 3600000 &&
      this.device.device_id &&
      this.device.install_id &&
      this.jar.header('https://aweme.snssdk.com/').includes('ttwid=')
    )
      return Promise.resolve()
    if (!this.pending)
      this.pending = this.initialize(ctx).finally(() => {
        this.pending = undefined
      })
    return this.pending
  }
  private async initialize(ctx: EndpointCtx): Promise<void> {
    const signerBaseUrl = this.options.signerBaseUrl!
    if (!this.device.device_id || !this.device.install_id) {
      await registerDevice(ctx, signerBaseUrl, this.device, this.jar)
      this.persist()
    }
    await acquireCookies(ctx, signerBaseUrl, this.device, this.jar)
    this.refreshedAt = Date.now()
    this.persist()
  }
  cookie(url: string): string {
    return this.jar.header(url)
  }
  snapshot(): AppGuestSnapshot {
    return { version: 1, device: structuredClone(this.device), cookies: this.jar.serialize(), refreshedAt: this.refreshedAt }
  }
  observe(response: RawResponse): void {
    const host = new URL(response.url).hostname
    if (!(host.endsWith('.snssdk.com') || host.endsWith('.amemv.com') || host === 'ttwid.bytedance.com')) return
    if (response.setCookie?.length) {
      this.jar.accept(response.url, response.setCookie)
      this.persist()
    }
  }
  refresh(ctx: EndpointCtx): Promise<void> {
    this.refreshedAt = 0
    return this.ensure(ctx)
  }
  sign(spec: Parameters<typeof signOwnedRequest>[0], ctx: EndpointCtx) {
    return signOwnedRequest(spec, ctx, this.options.signerBaseUrl!, this.device, this.jar)
  }
  private persist(): void {
    saveAppSnapshot(this.sessionFile, this.snapshot())
  }
}
