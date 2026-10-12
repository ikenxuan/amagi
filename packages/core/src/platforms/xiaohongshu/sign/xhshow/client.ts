import { createHash } from 'node:crypto'

import { CryptoConfig } from './config'
import { CryptoProcessor, XsCommonSigner, buildSskProof, buildXywPayloadHex, xRapParam, type XsCommonOptions } from './core'
import { SessionManager, type SignState } from './session'
import { RandomGenerator, extractUri, buildUrl, getShardingKey } from './utils'
import {
  validateSignatureParams,
  validateGetSignatureParams,
  validatePostSignatureParams,
  validateXsCommonParams,
  type Method,
  type Payload,
  type SignFormat
} from './validators'

export class Xhshow {
  private config: CryptoConfig
  private cryptoProcessor: CryptoProcessor
  private randomGenerator: RandomGenerator

  /**
   * 创建 Xhshow 实例
   * @param config - 可选的加密配置对象，不传则使用默认配置
   */
  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()
    this.cryptoProcessor = new CryptoProcessor(this.config)
    this.randomGenerator = new RandomGenerator()
  }

  /**
   * 构建内容字符串（用于 MD5 计算和签名生成）
   * @param method - HTTP 请求方法
   * @param uri - 请求 URI 路径
   * @param payload - 请求参数或请求体
   * @returns 用于签名的内容字符串
   */
  private buildContentString(method: string, uri: string, payload: Payload = null): string {
    const normalizedPayload = payload || {}

    if (method.toUpperCase() === 'POST') {
      return uri + JSON.stringify(normalizedPayload)
    } else {
      if (Object.keys(normalizedPayload).length === 0) {
        return uri
      }

      // XHS signature algorithm requires only '=' to be encoded as '%3D',
      // other characters (including ',') should remain unencoded
      const params = Object.entries(normalizedPayload).map(([key, value]) => {
        let valStr = ''
        if (Array.isArray(value)) {
          valStr = value.map((v) => String(v)).join(',')
        } else {
          valStr = value !== null && value !== undefined ? String(value) : ''
        }
        return `${key}=${valStr.replace(/=/g, '%3D')}`
      })

      return `${uri}?${params.join('&')}`
    }
  }

  /**
   * 根据内容字符串生成 d 值（MD5 哈希）
   * @param content - 内容字符串
   * @returns MD5 哈希值（十六进制字符串）
   */
  private generateDValue(content: string): string {
    return createHash('md5').update(content, 'utf8').digest('hex')
  }

  /**
   * 构建签名
   * @param dValue - MD5 哈希值
   * @param a1Value - Cookie 中的 a1 值
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param stringParam - 字符串参数
   * @param timestamp - 可选的时间戳
   * @param signState - 可选的签名状态（用于会话管理）
   * @returns 编码后的签名字符串
   */
  private buildSignature(
    dValue: string,
    mValue: string,
    a1Value: string,
    xsecAppid: string = 'xhs-pc-web',
    stringParam: string = '',
    timestamp?: number,
    signState?: SignState
  ): string {
    const payloadArray = this.cryptoProcessor.buildPayloadArray(dValue, mValue, a1Value, xsecAppid, stringParam, timestamp, signState)

    const xorResult = this.cryptoProcessor.bitOps.xorTransformArray(payloadArray)
    return this.cryptoProcessor.b64encoder.encodeX3(xorResult.subarray(0, this.config.PAYLOAD_LENGTH))
  }

  /**
   * 生成请求签名（支持 GET 和 POST）
   *
   * 字段口径与前端 `seccore_signv2` 一致：x0~x2 取自模板，x3 为 mnsv2 签名，
   * x4 为请求体类型（POST 为 `'object'`、GET 为 `''`），x5 为签名内容串的 MD5；
   * 会话带 webSsk 时再加 x6/x7（会话 SSK 证明，见 {@link buildSskProof}）。
   *
   * @param method - HTTP 请求方法，'GET' 或 'POST'
   * @param uri - 请求 URI 路径（可以是完整 URL，会自动提取路径部分）
   * @param a1Value - Cookie 中的 a1 值
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param payload - GET 请求的查询参数或 POST 请求的请求体
   * @param timestamp - 可选的时间戳（秒），不传则使用当前时间
   * @param session - 可选的会话管理器，用于生成更真实的签名；带 webSsk 时生成 x6/x7
   * @returns x-s 签名字符串
   */
  signXs(
    method: Method,
    uri: string,
    a1Value: string,
    xsecAppid: string = 'xhs-pc-web',
    payload: Payload = null,
    timestamp?: number,
    session?: SessionManager
  ): string {
    validateSignatureParams(method, uri, a1Value)

    uri = extractUri(uri)

    const signatureData: Record<string, unknown> = { ...this.config.SIGNATURE_DATA_TEMPLATE }
    const contentString = this.buildContentString(method, uri, payload)
    const dValue = this.generateDValue(contentString)
    const mValue = method === 'GET' ? dValue : createHash('md5').update(uri, 'utf8').digest('hex')

    const signState = session ? session.getCurrentState(contentString) : undefined

    signatureData.x3 = this.config.X3_PREFIX + this.buildSignature(dValue, mValue, a1Value, xsecAppid, contentString, timestamp, signState)
    // 前端是 `data ? typeof data : ''`：POST 总带 JSON 请求体，GET 的参数在 URL 里
    signatureData.x4 = method === 'POST' ? 'object' : ''
    signatureData.x5 = dValue

    const proof = session ? buildSskProof(dValue, session.webSsk) : null
    if (proof) {
      signatureData.x6 = proof.x6
      signatureData.x7 = proof.x7
    }

    const jsonStr = JSON.stringify(signatureData)
    return this.config.XYS_PREFIX + this.cryptoProcessor.b64encoder.encode(jsonStr)
  }

  /**
   * 生成 XYW_ 格式签名（AES-128-CBC 加密）
   *
   * 使用独立于 signXs 的加密路径。签名格式由调用方显式选择，
   * 不根据登录态或 HTTP 406/461 自动切换。
   *
   * @param method - HTTP 请求方法，'GET' 或 'POST'
   * @param uri - 请求 URI 路径（可以是完整 URL）
   * @param a1Value - Cookie 中的 a1 值
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param payload - GET 请求的查询参数或 POST 请求的请求体
   * @param timestamp - 可选的时间戳（秒），不传则使用当前时间
   * @param _session - 未使用，仅为保持与 signXs 的接口一致
   * @returns XYW_ 格式签名字符串
   */
  signXyw(
    method: Method,
    uri: string,
    a1Value: string,
    xsecAppid: string = 'xhs-pc-web',
    payload: Payload = null,
    timestamp?: number,
    _session?: SessionManager
  ): string {
    validateSignatureParams(method, uri, a1Value)

    uri = extractUri(uri)
    const contentString = this.buildContentString(method, uri, payload)

    const timestampMs = String(this.getXT(timestamp))
    const payloadHex = buildXywPayloadHex({
      fullUri: contentString,
      a1Value,
      timestampMs,
      config: this.config
    })

    const xywData = {
      signSvn: this.config.XYW_SIGN_SVN,
      signType: this.config.XYW_SIGN_TYPE,
      appId: xsecAppid,
      signVersion: this.config.XYW_SIGN_VERSION,
      payload: payloadHex
    }
    const xywJson = JSON.stringify(xywData)
    return this.config.XYW_PREFIX + Buffer.from(xywJson, 'utf-8').toString('base64')
  }

  /**
   * 生成 x-s-common 签名
   * @param cookieDict - Cookie 字典对象或 Cookie 字符串
   * @param options - 同一会话的 b1；省略时保留原有生成行为
   * @returns x-s-common 签名字符串
   */
  signXsCommon(cookieDict: Record<string, any> | string, options: XsCommonOptions = {}): string {
    const parsedCookies = this.parseCookies(cookieDict)
    const signer = new XsCommonSigner(this.config)
    return signer.sign(parsedCookies, options)
  }

  /**
   * 生成 GET 请求签名（便捷方法）
   * @param uri - 请求 URI 路径
   * @param a1Value - Cookie 中的 a1 值
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param params - 查询参数对象
   * @param timestamp - 可选的时间戳（秒）
   * @param session - 可选的会话管理器
   * @returns x-s 签名字符串
   */
  signXsGet(
    uri: string,
    a1Value: string,
    xsecAppid: string = 'xhs-pc-web',
    params: Payload = null,
    timestamp?: number,
    session?: SessionManager
  ): string {
    validateGetSignatureParams(uri, a1Value)
    return this.signXs('GET', uri, a1Value, xsecAppid, params, timestamp, session)
  }

  /**
   * 生成 POST 请求签名（便捷方法）
   * @param uri - 请求 URI 路径
   * @param a1Value - Cookie 中的 a1 值
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param payload - 请求体对象
   * @param timestamp - 可选的时间戳（秒）
   * @param session - 可选的会话管理器
   * @returns x-s 签名字符串
   */
  signXsPost(
    uri: string,
    a1Value: string,
    xsecAppid: string = 'xhs-pc-web',
    payload: Payload = null,
    timestamp?: number,
    session?: SessionManager
  ): string {
    validatePostSignatureParams(uri, a1Value)
    return this.signXs('POST', uri, a1Value, xsecAppid, payload, timestamp, session)
  }

  /**
   * 生成 x-s-common 签名的便捷包装方法
   * @param cookieDict - Cookie 字典对象或 Cookie 字符串
   * @param options - 同一会话的 b1；省略时保留原有生成行为
   * @returns x-s-common 签名字符串
   */
  signXsc(cookieDict: Record<string, any> | string, options: XsCommonOptions = {}): string {
    validateXsCommonParams(cookieDict)
    return this.signXsCommon(cookieDict, options)
  }

  /**
   * 解密 x3 签名（Base64 格式）
   * @param x3Signature - x3 签名字符串
   * @returns 解密后的字节数组
   */
  decodeX3(x3Signature: string): Uint8Array {
    if (x3Signature.startsWith(this.config.X3_PREFIX)) {
      x3Signature = x3Signature.slice(this.config.X3_PREFIX.length)
    }

    const decodedBytes = this.cryptoProcessor.b64encoder.decodeX3(x3Signature)
    return this.cryptoProcessor.bitOps.xorTransformArray(Array.from(decodedBytes))
  }

  /**
   * 解密完整的 XYS 签名
   * @param xsSignature - x-s 签名字符串
   * @returns 解密后的签名数据对象
   * @throws 如果 JSON 解析失败则抛出错误
   */
  decodeXs(xsSignature: string): Record<string, any> {
    if (xsSignature.startsWith(this.config.XYS_PREFIX)) {
      xsSignature = xsSignature.slice(this.config.XYS_PREFIX.length)
    }

    const jsonString = this.cryptoProcessor.b64encoder.decode(xsSignature)
    try {
      return JSON.parse(jsonString)
    } catch (e) {
      throw new Error(`Invalid signature: JSON decode failed - ${e}`)
    }
  }

  /**
   * 构建带查询参数的完整 URL（便捷方法）
   * @param baseUrl - 基础 URL
   * @param params - 可选的查询参数对象
   * @returns 完整的 URL 字符串
   */
  buildUrl(baseUrl: string, params?: Record<string, any> | null): string {
    return buildUrl(baseUrl, params)
  }

  /**
   * 构建 POST 请求的 JSON 请求体字符串（便捷方法）
   * @param payload - 请求体对象
   * @returns JSON 字符串
   */
  buildJsonBody(payload: Record<string, any>): string {
    return JSON.stringify(payload)
  }

  /**
   * 生成 HTTP 请求头中的 x-b3-traceid
   * @returns x-b3-traceid 字符串
   */
  getB3TraceId(): string {
    return this.randomGenerator.generateB3TraceId()
  }

  /**
   * 生成 HTTP 请求头中的 x-xray-traceid
   * @param timestamp - 可选的时间戳（毫秒）
   * @param seq - 可选的序列号
   * @returns x-xray-traceid 字符串
   */
  getXrayTraceId(timestamp?: number, seq?: number): string {
    return this.randomGenerator.generateXrayTraceId(timestamp, seq)
  }

  /**
   * 生成搜索接口所需的 search_id
   * @returns Base36 编码的搜索 ID
   */
  getSearchId(): string {
    return this.randomGenerator.generateSearchId()
  }

  /**
   * 生成搜索接口所需的 request_id
   * @returns 格式为 "{random}-{timestamp_ms}" 的字符串
   */
  getSearchRequestId(): string {
    return this.randomGenerator.generateSearchRequestId()
  }

  /**
   * 生成 a1 Cookie 值
   * @returns 52 字符的 a1 值
   */
  static generateA1(): string {
    return RandomGenerator.generateA1()
  }

  /**
   * 根据 a1 值生成 web_id
   * @param a1 - a1 Cookie 值
   * @returns 32 字符的十六进制 web_id
   */
  static generateWebId(a1: string): string {
    return RandomGenerator.generateWebId(a1)
  }

  /**
   * 生成 x-t 请求头值（Unix 时间戳，毫秒）
   * @param timestamp - 可选的时间戳（秒），不传则使用当前时间
   * @returns Unix 时间戳（毫秒）
   */
  getXT(timestamp?: number): number {
    if (timestamp === undefined) {
      timestamp = Date.now() / 1000
    }
    return Math.floor(timestamp * 1000)
  }

  /**
   * 将 Cookie 解析为字典格式
   * @param cookies - Cookie 字典对象或 Cookie 字符串
   * @returns Cookie 字典对象
   */
  private parseCookies(cookies: Record<string, any> | string): Record<string, string> {
    if (typeof cookies === 'string') {
      const result: Record<string, string> = {}
      const pairs = cookies.split(';')
      for (const pair of pairs) {
        const trimmed = pair.trim()
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim()
          const value = trimmed.substring(eqIndex + 1).trim()
          result[key] = value
        }
      }
      return result
    }
    return cookies as Record<string, string>
  }

  /**
   * 生成包含签名和追踪 ID 的完整请求头
   * @param method - HTTP 请求方法，'GET' 或 'POST'
   * @param uri - 请求 URI 路径
   * @param cookies - Cookie 字典对象或 Cookie 字符串（必须包含 a1）
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param params - GET 请求的查询参数（POST 请求时不可用）
   * @param payload - POST 请求的请求体（GET 请求时不可用）
   * @param timestamp - 可选的时间戳（秒）
   * @param session - 可选的会话管理器
   * @returns 包含 x-s、x-s-common、x-t、x-b3-traceid、x-xray-traceid 的请求头对象
   * @throws 如果 GET 请求使用 payload 或 POST 请求使用 params 则抛出错误
   * @throws 如果 cookies 中缺少 a1 则抛出错误
   */
  signHeaders(
    method: Method,
    uri: string,
    cookies: Record<string, any> | string,
    xsecAppid: string = 'xhs-pc-web',
    params?: Record<string, any> | null,
    payload?: Record<string, any> | null,
    timestamp?: number,
    session?: SessionManager,
    signFormat: SignFormat = 'xys',
    userId?: string | null,
    xRap: boolean = false
  ): Record<string, string> {
    if (timestamp === undefined) {
      timestamp = Date.now() / 1000
    }

    const methodUpper = method.toUpperCase() as Method

    // Validate method and parameters
    let requestData: Record<string, any> | null
    if (methodUpper === 'GET') {
      if (payload !== undefined && payload !== null) {
        throw new Error("GET requests must use 'params', not 'payload'")
      }
      requestData = params ?? null
    } else if (methodUpper === 'POST') {
      if (params !== undefined && params !== null) {
        throw new Error("POST requests must use 'payload', not 'params'")
      }
      requestData = payload ?? null
    } else {
      throw new Error(`Unsupported method: ${method}`)
    }

    if (signFormat !== 'xys' && signFormat !== 'xyw') {
      throw new Error(`Unsupported signFormat=${JSON.stringify(signFormat)}; expected 'xys' or 'xyw'`)
    }

    const cookieDict = this.parseCookies(cookies)

    const a1Value = cookieDict.a1
    if (!a1Value) {
      throw new Error("Missing 'a1' in cookies")
    }

    const xS =
      signFormat === 'xyw'
        ? this.signXyw(methodUpper, uri, a1Value, xsecAppid, requestData, timestamp)
        : this.signXs(methodUpper, uri, a1Value, xsecAppid, requestData, timestamp, session)

    // 只取 b1：SessionManager 恰好结构兼容 XsCommonOptions，但整个会话对象不是这里的参数
    const xSCommon = this.signXsCommon(cookieDict, { b1: session?.b1 })
    const xT = this.getXT(timestamp)
    const xB3Traceid = this.getB3TraceId()
    const xXrayTraceid = this.getXrayTraceId(Math.floor(timestamp * 1000))

    const headers: Record<string, string> = {
      'x-s': xS,
      'x-s-common': xSCommon,
      'x-t': String(xT),
      'x-b3-traceid': xB3Traceid,
      'x-xray-traceid': xXrayTraceid,
      'x-mns': 'unload',
      'xy-direction': String(getShardingKey(userId))
    }

    if (xRap) {
      const rapUri = extractUri(uri)
      const rapApi = '//edith.xiaohongshu.com' + rapUri
      const rapData = requestData || {}
      headers['x-rap-param'] = xRapParam(rapApi, rapData)
    }

    return headers
  }

  /**
   * 生成 GET 请求的完整请求头（便捷方法）
   * @param uri - 请求 URI 路径
   * @param cookies - Cookie 字典对象或 Cookie 字符串（必须包含 a1）
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param params - 查询参数对象
   * @param timestamp - 可选的时间戳（秒）
   * @param session - 可选的会话管理器
   * @returns 包含签名和追踪 ID 的请求头对象
   */
  signHeadersGet(
    uri: string,
    cookies: Record<string, any> | string,
    xsecAppid: string = 'xhs-pc-web',
    params?: Record<string, any> | null,
    timestamp?: number,
    session?: SessionManager,
    signFormat: SignFormat = 'xys',
    userId?: string | null,
    xRap: boolean = false
  ): Record<string, string> {
    return this.signHeaders('GET', uri, cookies, xsecAppid, params, undefined, timestamp, session, signFormat, userId, xRap)
  }

  /**
   * 生成 POST 请求的完整请求头（便捷方法）
   * @param uri - 请求 URI 路径
   * @param cookies - Cookie 字典对象或 Cookie 字符串（必须包含 a1）
   * @param xsecAppid - 应用 ID，默认为 'xhs-pc-web'
   * @param payload - 请求体对象
   * @param timestamp - 可选的时间戳（秒）
   * @param session - 可选的会话管理器
   * @returns 包含签名和追踪 ID 的请求头对象
   */
  signHeadersPost(
    uri: string,
    cookies: Record<string, any> | string,
    xsecAppid: string = 'xhs-pc-web',
    payload?: Record<string, any> | null,
    timestamp?: number,
    session?: SessionManager,
    signFormat: SignFormat = 'xys',
    userId?: string | null,
    xRap: boolean = false
  ): Record<string, string> {
    return this.signHeaders('POST', uri, cookies, xsecAppid, undefined, payload, timestamp, session, signFormat, userId, xRap)
  }
}
