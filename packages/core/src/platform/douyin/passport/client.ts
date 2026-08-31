/**
 * passport 登录的 HTTP 客户端
 *
 * 走 amagi 自己的 `fetchResponse`（axios），因此代理、超时、重试与网络事件与其它接口一致。
 *
 * 客户端本身是无状态的：会话状态（`msToken`、`passport_csrf_token`）都以 cookie 形式
 * 随调用方传入的 cookie 串进出，`x-tt-passport-verify-portrait` 则由 `ttwid` 派生，
 * 因此同一份 cookie 在整个登录过程中会得到稳定的 portrait，调用方无需额外保存任何东西。
 */
import crypto from 'node:crypto'

import { emitLogDebug, fetchResponse, isNetworkErrorResult } from 'amagi/model'
import { RequestConfig } from 'amagi/server'
import { AxiosRequestConfig, AxiosResponse } from 'axios'

import { aBogus } from './aBogus'
import { CookieJar } from './cookieJar'
import { LOGIN_HOST, makeAidSign, makeCommonParams, makeLiteParams, makeSignAndQs, randomHex, serializeQuery, WEB_HOST } from './params'

/** 与签名里的浏览器环境保持一致的 UA */
export const PASSPORT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

/** 单次请求默认超时 */
const DEFAULT_TIMEOUT = 15_000

/** SSO 跳转最多跟随的次数 */
const MAX_REDIRECT_HOPS = 5

/** 浏览器客户端提示头，服务端会与 UA 交叉校验 */
const CLIENT_HINTS: Record<string, string> = {
  'sec-ch-ua': '"Not_A Brand";v="99", "Chromium";v="142"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"'
}

/** passport 接口的通用响应形状 */
export interface PassportPayload {
  message?: string
  error_code?: number
  description?: string
  data?: Record<string, unknown>
}

export interface PassportResponse<T = PassportPayload> {
  /** HTTP 状态码 */
  status: number
  /** 原始响应体 */
  raw: string
  /** 解析后的 JSON，解析失败时为空对象 */
  body: T
  /** 合并了本次 Set-Cookie 之后的完整 cookie 串 */
  cookie: string
}

/** 安全解析 JSON，失败返回空对象 */
const parseJson = <T>(text: string): T => {
  try {
    return JSON.parse(text) as T
  } catch {
    return {} as T
  }
}

/**
 * 由 ttwid 派生出稳定的 verify portrait
 *
 * 浏览器里这个值在一次登录页生命周期内固定不变。这里用 cookie 中已有的设备指纹推导，
 * 既保证同一会话内多次调用得到同一个值，又不需要调用方额外携带状态。
 * @param jar 当前会话 cookie
 */
const deriveVerifyPortrait = (jar: CookieJar): string => {
  const seed = jar.get('ttwid') ?? jar.get('__ac_nonce') ?? 'douyin-passport'
  const hex = crypto.createHash('sha256').update(seed).digest('hex')
  const uuid = [hex.slice(0, 8), hex.slice(8, 12), `4${hex.slice(13, 16)}`, `8${hex.slice(17, 20)}`, hex.slice(20, 32)].join('-')
  return `${uuid}.login`
}

export class DouyinPassportClient {
  /** 会话 cookie */
  readonly cookies: CookieJar

  /**
   * @param cookie 已有的会话 cookie 串
   * @param requestConfig amagi 的请求配置（代理、超时、额外请求头）
   */
  constructor(
    cookie?: string,
    private readonly requestConfig?: RequestConfig
  ) {
    this.cookies = new CookieJar(cookie)
  }

  /** CSRF token：优先用服务端下发的，缺失时本地生成并同步写进 cookie（双提交校验） */
  private get csrfToken(): string {
    const fromCookie = this.cookies.get('passport_csrf_token')
    if (fromCookie) return fromCookie

    const generated = randomHex(32)
    this.cookies.set('passport_csrf_token', generated)
    this.cookies.set('passport_csrf_token_default', generated)
    return generated
  }

  /**
   * 初始化登录环境指纹
   *
   * 依次请求抖音首页拿 `__ac_nonce`、再向 ttwid 服务注册拿 `ttwid`。两步都是匿名的，
   * 任意机器、任意系统都能跑；失败不抛错，只会让后续更容易命中风控。
   */
  async bootstrap(): Promise<void> {
    if (this.cookies.has('ttwid') && this.cookies.has('__ac_nonce')) return

    await this.send({
      method: 'GET',
      url: `https://${WEB_HOST}/`,
      headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', ...CLIENT_HINTS }
    })

    await this.send({
      method: 'POST',
      url: 'https://ttwid.bytedance.com/ttwid/register/',
      headers: { 'Content-Type': 'application/json', Origin: `https://${WEB_HOST}`, Referer: `https://${WEB_HOST}/` },
      data: JSON.stringify({ aid: 6383, service: WEB_HOST })
    })

    emitLogDebug(`[douyin passport] 环境指纹就绪: ttwid=${this.cookies.has('ttwid')}, ac_nonce=${this.cookies.has('__ac_nonce')}`)
  }

  /**
   * 请求 login.douyin.com 的 passport 接口（四重签名 + a_bogus 形态）
   * @param path 接口路径，如 `/passport/web/get_qrcode/`
   * @param params 业务参数，并入 query
   */
  async request<T extends PassportPayload = PassportPayload>(
    path: string,
    params: Record<string, string | number> = {}
  ): Promise<PassportResponse<T>> {
    const common = makeCommonParams(params)
    const { sign, qs } = makeSignAndQs(common, {})

    const query: Record<string, string> = { ...common, sign, qs }
    const msToken = this.cookies.get('msToken')
    if (msToken) query.msToken = msToken

    const queryString = serializeQuery(query)
    const url = `https://${LOGIN_HOST}${path}?${queryString}&a_bogus=${encodeURIComponent(aBogus(queryString, PASSPORT_USER_AGENT))}`

    return this.send<T>({
      method: 'GET',
      url,
      headers: {
        Accept: 'application/json, text/javascript',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `https://${WEB_HOST}/`,
        'x-tt-passport-aid-sign': makeAidSign(path),
        'x-tt-passport-csrf-token': this.csrfToken,
        'x-tt-passport-verify-portrait': deriveVerifyPortrait(this.cookies),
        'x-tt-passport-trace-id': String(common.biz_trace_id),
        ...CLIENT_HINTS
      }
    })
  }

  /**
   * 请求 www.douyin.com 的验证页接口（lite 形态：固定 query + 表单 body，无签名）
   * @param path 接口路径，如 `/passport/web/send_code/`
   * @param params 业务参数，进 body
   * @param bizTraceId 业务追踪 ID，同一次验证流程内保持一致
   */
  async liteRequest<T extends PassportPayload = PassportPayload>(
    path: string,
    params: Record<string, string>,
    bizTraceId: string
  ): Promise<PassportResponse<T>> {
    return this.send<T>({
      method: 'POST',
      url: `https://${WEB_HOST}${path}?${serializeQuery(makeLiteParams(bizTraceId))}`,
      headers: {
        Accept: 'application/json, text/javascript',
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: `https://${WEB_HOST}`,
        Referer: `https://${WEB_HOST}/`,
        'x-tt-passport-aid-sign': makeAidSign(path),
        'x-tt-passport-csrf-token': this.csrfToken,
        'x-tt-passport-verify-portrait': deriveVerifyPortrait(this.cookies),
        'x-tt-passport-trace-id': bizTraceId,
        ...CLIENT_HINTS
      },
      data: serializeQuery(params)
    })
  }

  /**
   * 跟随扫码确认后下发的 SSO 跳转链，把最终的登录凭证收进 CookieJar
   * @param redirectUrl `check_qrconnect` 返回的 redirect_url
   * @returns 是否拿到登录态 cookie
   */
  async followSsoRedirect(redirectUrl: string): Promise<boolean> {
    let current = redirectUrl

    for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
      const response = await this.send({
        method: 'GET',
        url: current,
        maxRedirects: 0,
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          Referer: `https://${LOGIN_HOST}/`,
          ...CLIENT_HINTS
        }
      })

      const location = response.location
      if (!location || response.status < 300 || response.status >= 400) break
      current = new URL(location, current).toString()
    }

    return this.cookies.isLoggedIn()
  }

  /** 实际发请求：合并 cookie、消化 Set-Cookie 与 msToken */
  private async send<T extends PassportPayload = PassportPayload>(
    config: AxiosRequestConfig
  ): Promise<PassportResponse<T> & { location?: string }> {
    const cookie = this.cookies.toString()
    const response = await fetchResponse<string>({
      timeout: this.requestConfig?.timeout ?? DEFAULT_TIMEOUT,
      proxy: this.requestConfig?.proxy,
      ...config,
      responseType: 'text',
      // 交给上层按 302 手动跟随，避免 axios 自动跳转时吞掉中途下发的 Set-Cookie
      maxRedirects: config.maxRedirects ?? 5,
      headers: {
        'User-Agent': PASSPORT_USER_AGENT,
        ...(config.headers as Record<string, string>),
        ...(cookie ? { Cookie: cookie } : {})
      }
    })

    if (isNetworkErrorResult(response)) {
      throw new Error(response.error.amagiError.errorDescription)
    }

    const axiosResponse = response as AxiosResponse<string>
    this.cookies.applySetCookie(axiosResponse.headers['set-cookie'])

    const refreshed = axiosResponse.headers['x-ms-token']
    if (typeof refreshed === 'string' && refreshed) this.cookies.set('msToken', refreshed)

    const raw = typeof axiosResponse.data === 'string' ? axiosResponse.data : JSON.stringify(axiosResponse.data)
    return {
      status: axiosResponse.status,
      raw,
      body: parseJson<T>(raw),
      cookie: this.cookies.toString(),
      location: axiosResponse.headers.location as string | undefined
    }
  }
}
