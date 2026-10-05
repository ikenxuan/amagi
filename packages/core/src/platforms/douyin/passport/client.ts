/**
 * 桌面 IM Passport 登录的 HTTP 客户端（imdesktop 域）。
 *
 * 走 amagi 自己的 `fetchResponse`（axios），因此代理、超时、重试与网络事件与其它接口一致。
 * 设备身份（deviceId/installId/guid）、verify portrait 与 biz_trace_id 是实例状态，
 * 由策略层在每次 start/poll 时依据会话数据恢复注入。
 */
import { randomUUID } from 'node:crypto'

import { AxiosRequestConfig, AxiosResponse } from 'axios'

import type { RequestConfig } from '../../../contracts/request'
import { fetchResponse, isNetworkErrorResult } from '../../../transport/legacy'
import { UA, im } from './const'
import { Jar } from './jar'
import { aidSign, normalizePassportPath, noonTs } from './sign/aid'
import { randomHex, randomTrace } from './sign/qs'

/** 单次请求默认超时 */
const DEFAULT_TIMEOUT = 15_000

/** passport 接口的通用响应形状 */
export interface PassportPayload {
  message?: string
  error_code?: number
  description?: string
  data?: Record<string, unknown>
}

export interface DesktopPassportResponse<T = PassportPayload> {
  /** HTTP 状态码 */
  status: number
  /** 原始响应体 */
  raw: string
  /** 解析后的 JSON，解析失败时为空对象 */
  body: T
  /** 合并了本次 Set-Cookie 之后的完整 cookie 串 */
  cookie: string
  /** axios 响应头（原样透出，供 verifyDecision 读取决策头） */
  headers: AxiosResponse['headers']
}

/** 安全解析 JSON，失败返回空对象 */
const parseJson = <T>(text: string): T => {
  try {
    return JSON.parse(text) as T
  } catch {
    return {} as T
  }
}

export interface HttpOpts {
  /** 浏览器复制的 Cookie 或上一轮会话 */
  cookie?: string
  userAgent?: string
  /** amagi 的请求配置（代理、超时、额外请求头） */
  requestConfig?: RequestConfig
}

/** 桌面 IM Passport 客户端：Cookie/UA/超时封装 + Passport 请求头；签名由调用方组装进 URL 后直发 */
export class Http {
  readonly jar: Jar
  readonly ua: string
  bizTraceId: string
  /** 服务端注册的桌面设备身份（登录时注入；'0' 表示未注册） */
  deviceId = '0'
  installId = '0'
  guid = randomHex(32)

  private readonly requestConfig?: RequestConfig
  private readonly portrait = `${randomUUID()}.login`

  constructor(opts: HttpOpts = {}) {
    this.requestConfig = opts.requestConfig
    this.jar = new Jar(opts.cookie)
    this.ua = opts.userAgent ?? UA
    // trace-id 首次生成后回写 jar，保证后续请求与 Passport 头一致
    this.bizTraceId = this.jar.get('biz_trace_id') ?? randomTrace()
    this.jar.set('biz_trace_id', this.bizTraceId)
  }

  /** 注入服务端注册的桌面设备身份（device_register 签发） */
  setDevice(device: { deviceId: string; installId: string; guid: string }): void {
    this.deviceId = device.deviceId
    this.installId = device.installId
    this.guid = device.guid
  }

  hasDevice(): boolean {
    return this.deviceId !== '0' && /^\d+$/.test(this.deviceId)
  }

  /** 桌面 Passport 接口请求头（imdesktop 域） */
  passportHeaders(url: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json, text/javascript',
      Referer: im.origin,
      'x-tt-passport-trace-id': this.bizTraceId,
      'x-tt-passport-verify-portrait': this.portrait
    }
    const csrf = this.jar.get('passport_csrf_token') ?? this.jar.get('passport_csrf_token_default')
    if (csrf) headers['x-tt-passport-csrf-token'] = csrf
    const sign = this.aidSignFor(url)
    if (sign) headers['x-tt-passport-aid-sign'] = sign
    return headers
  }

  private aidSignFor(url: string): string | undefined {
    try {
      return aidSign({
        aid: im.aid,
        appKey: im.appKey,
        path: normalizePassportPath(new URL(url).pathname),
        ts: noonTs()
      })
    } catch {
      return undefined
    }
  }

  /** 请求任意 URL 并解析 JSON；随响应吸收 Set-Cookie 与 msToken */
  async json<T>(url: string, init: AxiosRequestConfig = {}): Promise<DesktopPassportResponse<T>> {
    return this.send<T>({ ...init, url })
  }

  /** 实际发请求：合并 cookie、消化 Set-Cookie 与 msToken */
  private async send<T>(config: AxiosRequestConfig): Promise<DesktopPassportResponse<T>> {
    const cookie = this.jar.header()
    const response = await fetchResponse<string>({
      ...this.requestConfig,
      ...config,
      timeout: this.requestConfig?.timeout ?? config.timeout ?? DEFAULT_TIMEOUT,
      proxy: this.requestConfig?.proxy ?? config.proxy,
      // 透传 adapter：测试注入用（生产环境没有 adapter，行为不变）
      ...(config.adapter ? { adapter: config.adapter } : {}),
      responseType: 'text',
      maxRedirects: config.maxRedirects ?? 5,
      headers: {
        'User-Agent': this.ua,
        ...(config.headers as Record<string, string>),
        ...(cookie ? { Cookie: cookie } : {})
      }
    })

    if (isNetworkErrorResult(response)) {
      throw new Error(response.error.amagiError.errorDescription)
    }

    const axiosResponse = response as AxiosResponse<string>
    const setCookie = axiosResponse.headers['set-cookie']
    if (typeof setCookie === 'string') this.jar.absorb(setCookie)
    else if (Array.isArray(setCookie)) for (const line of setCookie) this.jar.absorb(line)

    const refreshed = axiosResponse.headers['x-ms-token']
    if (typeof refreshed === 'string' && refreshed) this.jar.set('msToken', refreshed)

    const raw = typeof axiosResponse.data === 'string' ? axiosResponse.data : JSON.stringify(axiosResponse.data)
    return {
      status: axiosResponse.status,
      raw,
      body: parseJson<T>(raw),
      cookie: this.jar.header(),
      headers: axiosResponse.headers
    }
  }
}

/** 响应头里的验证中心决策标记；缺失时返回 undefined */
export function verifyDecision(headers: AxiosResponse['headers']): string | undefined {
  const value = (headers as Record<string, unknown>)['x-tt-passport-decision']
  if (typeof value === 'string' && value) return value
  return undefined
}
