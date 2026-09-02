import type { KuaishouLiveApiRequest } from '../api'
import { deriveKuaishouHeHashFieldHex, deriveKuaishouHeHex, deriveKuaishouPureSignature } from './he'
import {
  buildKuaishouHxfalconPayload,
  buildKuaishouHxfalconSignInput,
  createKuaishouAnonymousKwwCache,
  deriveKuaishouKww,
  type KuaishouAnonymousKwwCache,
  type KuaishouHxfalconPayload
} from './helpers'
import { buildKuaishouHudrInfoCache, buildKuaishouHudrPayload, deriveKuaishouHudrBody } from './hudr'
import {
  bytesToLowerHex,
  computeKuaishouLrcHex,
  deriveKuaishouB2has,
  deriveKuaishouB2sa,
  deriveKuaishouCts,
  hexToSignedBytes,
  toLittleEndianHex,
  transformKuaishouHeHex,
  xorByteArrays
} from './primitives'
import {
  createKuaishouPureRuntimeState,
  deriveKuaishouSecsStackTail,
  deriveKuaishouSecsState,
  getKuaishouPureRuntimeState,
  type KuaishouPureRuntimeState
} from './state'

/**
 * 快手 `live_api` 请求签名结果。
 */
export type KuaishouLiveApiSignature = {
  url: string
  headers: Record<string, string>
  signResult: string
  signInput: string
  catVersion: string
}

/**
 * 快手签名器（**实例级**，v7 新增）。
 *
 * v7 修 #40/#41/#42：v6 的 `kuaishouSign` 是静态类，签名状态（`count` /
 * `startupRandom` / 匿名 `kww` 缓存）全部挂在**模块级单例**上 ——
 * 同进程内两个 client 的签名互相干扰，且测试之间共享 `count`（#41/#42）、
 * 匿名 `kww` 恒定不变（#40）。v7 每个 client 持有一个 `KuaishouSigner`
 * 实例，状态随实例走：
 * - `count` 每次签名递增，但只影响当前实例（两个 client 互不干扰）。
 * - 匿名 `kww` 按实例缓存（同一实例内复用，不同实例各自生成）。
 * - `startupRandom` 按实例生成。
 */
export class KuaishouSigner {
  private readonly runtimeState: KuaishouPureRuntimeState
  private readonly anonymousKwwCache: KuaishouAnonymousKwwCache

  constructor() {
    this.runtimeState = createKuaishouPureRuntimeState()
    this.anonymousKwwCache = createKuaishouAnonymousKwwCache()
  }

  /**
   * 获取当前纯算法运行时使用的 `caver`。
   * @returns 快手 `caver` 值
   */
  getCatVersion(): string {
    return this.runtimeState.catVersion
  }

  /**
   * 生成快手请求头中的 `kww` 值（匿名分支按实例缓存，修 #40）。
   * @param cookie - 原始 Cookie 字符串
   * @returns `kww` 请求头值
   */
  generateKww(cookie?: string): string {
    return deriveKuaishouKww(cookie, this.anonymousKwwCache)
  }

  /**
   * 根据结构化签名载荷生成 `__NS_hxfalcon`。
   *
   * `count` 随实例递增（修 #41/#42）：同一实例内连续签名结果不同（防重放），
   * 但两个实例的 `count` 互不干扰。
   *
   * @param payload - 已标准化的快手签名载荷
   * @returns 包含最终签名串、sign input 与 `caver` 的结果
   */
  generateHxfalconFromPayload(
    payload: KuaishouHxfalconPayload
  ): Pick<KuaishouLiveApiSignature, 'signResult' | 'signInput' | 'catVersion'> {
    const signInput = buildKuaishouHxfalconSignInput(payload)
    const count = this.runtimeState.count
    const secs = deriveKuaishouSecsState(count)
    const scriptCount = globalThis.document?.scripts?.length ?? 0
    const catVersion = this.runtimeState.catVersion
    const signResult = deriveKuaishouPureSignature({
      count,
      randomValue: Math.random(),
      scriptCount,
      secs,
      signInput,
      startupRandom: this.runtimeState.startupRandom,
      timestamp: Date.now()
    }).signResult
    this.runtimeState.count += 1

    return {
      signResult,
      signInput,
      catVersion
    }
  }

  /**
   * 为快手 `live_api` URL 签名。
   * @param url - 实际请求 URL
   * @param cookie - 原始 Cookie 字符串
   * @param signPath - 可选的规范签名路径
   * @returns 带签名 URL、附加请求头和调试信息
   */
  signLiveApiUrl(url: string, cookie?: string, signPath?: string): KuaishouLiveApiSignature {
    const payload = buildKuaishouHxfalconPayload(url, signPath)
    const { signResult, signInput, catVersion } = this.generateHxfalconFromPayload(payload)
    const signedUrl = new URL(url)
    const headers: Record<string, string> = {}
    const kww = deriveKuaishouKww(cookie, this.anonymousKwwCache)

    signedUrl.searchParams.set('__NS_hxfalcon', signResult)
    signedUrl.searchParams.set('caver', catVersion)

    if (kww) {
      headers.kww = kww
    }

    return {
      url: signedUrl.toString(),
      headers,
      signResult,
      signInput,
      catVersion
    }
  }

  /**
   * 为结构化的快手 `live_api` 请求描述对象签名。
   *
   * 与 v6 静态类相同，但状态随实例。
   *
   * @param request - 快手 `live_api` 请求描述对象
   * @param cookie - 原始 Cookie 字符串
   * @returns 带签名 URL、附加请求头和调试信息
   */
  signLiveApiRequest(request: KuaishouLiveApiRequest, cookie?: string): KuaishouLiveApiSignature {
    return this.signLiveApiUrl(request.url, cookie, request.signPath)
  }
}

/**
 * 创建一个快手签名器实例。
 *
 * 每个 client 持有一个实例，签名状态（`count` / `startupRandom` /
 * 匿名 `kww`）随实例走（修 #40/#41/#42）。
 * @returns 新的签名器实例
 */
export const createKuaishouSigner = (): KuaishouSigner => new KuaishouSigner()

/**
 * 快手签名工具集（静态类，与 v6 完全一致）。
 *
 * 仅供对照测试与过渡期使用 —— v7 生产代码用 {@link createKuaishouSigner}
 * 创建实例级签名器（状态随 client 实例，修 #40/#41/#42）。
 */
export class kuaishouSign {
  /**
   * 获取当前纯算法运行时使用的 `caver`。
   *
   * @returns 快手 `caver` 值
   */
  static getCatVersion(): string {
    return getKuaishouPureRuntimeState().catVersion
  }

  /**
   * 生成快手请求头中的 `kww` 值。
   *
   * @param cookie - 原始 Cookie 字符串
   * @returns `kww` 请求头值
   */
  static generateKww(cookie?: string): string {
    return deriveKuaishouKww(cookie)
  }

  /**
   * 根据结构化签名载荷生成 `__NS_hxfalcon`。
   *
   * @param payload - 已标准化的快手签名载荷
   * @returns 包含最终签名串、sign input 与 `caver` 的结果
   */
  static generateHxfalconFromPayload(
    payload: KuaishouHxfalconPayload
  ): Pick<KuaishouLiveApiSignature, 'signResult' | 'signInput' | 'catVersion'> {
    const signInput = buildKuaishouHxfalconSignInput(payload)
    const runtimeState = getKuaishouPureRuntimeState()
    const count = runtimeState.count
    const secs = deriveKuaishouSecsState(count)
    const scriptCount = globalThis.document?.scripts?.length ?? 0
    const catVersion = runtimeState.catVersion
    const signResult = deriveKuaishouPureSignature({
      count,
      randomValue: Math.random(),
      scriptCount,
      secs,
      signInput,
      startupRandom: runtimeState.startupRandom,
      timestamp: Date.now()
    }).signResult
    runtimeState.count += 1

    return {
      signResult,
      signInput,
      catVersion
    }
  }

  /**
   * 为快手 `live_api` URL 签名。
   *
   * @param url - 实际请求 URL
   * @param cookie - 原始 Cookie 字符串
   * @param signPath - 可选的规范签名路径
   * @returns 带签名 URL、附加请求头和调试信息
   */
  static signLiveApiUrl(url: string, cookie?: string, signPath?: string): KuaishouLiveApiSignature {
    const payload = buildKuaishouHxfalconPayload(url, signPath)
    const { signResult, signInput, catVersion } = this.generateHxfalconFromPayload(payload)
    const signedUrl = new URL(url)
    const headers: Record<string, string> = {}
    const kww = deriveKuaishouKww(cookie)

    signedUrl.searchParams.set('__NS_hxfalcon', signResult)
    signedUrl.searchParams.set('caver', catVersion)

    if (kww) {
      headers.kww = kww
    }

    return {
      url: signedUrl.toString(),
      headers,
      signResult,
      signInput,
      catVersion
    }
  }

  /**
   * 为结构化的快手 `live_api` 请求描述对象签名。
   *
   * 这是项目层更推荐使用的入口，因为它能显式保留 `signPath` 元数据。
   *
   * @param request - 快手 `live_api` 请求描述对象
   * @param cookie - 原始 Cookie 字符串
   * @returns 带签名 URL、附加请求头和调试信息
   */
  static signLiveApiRequest(request: KuaishouLiveApiRequest, cookie?: string): KuaishouLiveApiSignature {
    return this.signLiveApiUrl(request.url, cookie, request.signPath)
  }
}

export {
  buildKuaishouHudrInfoCache,
  buildKuaishouHudrPayload,
  buildKuaishouHxfalconPayload,
  buildKuaishouHxfalconSignInput,
  bytesToLowerHex,
  computeKuaishouLrcHex,
  createKuaishouAnonymousKwwCache,
  createKuaishouPureRuntimeState,
  deriveKuaishouB2has,
  deriveKuaishouB2sa,
  deriveKuaishouCts,
  deriveKuaishouHeHashFieldHex,
  deriveKuaishouHeHex,
  deriveKuaishouHudrBody,
  deriveKuaishouKww,
  deriveKuaishouPureSignature,
  deriveKuaishouSecsStackTail,
  deriveKuaishouSecsState,
  getKuaishouPureRuntimeState,
  hexToSignedBytes,
  toLittleEndianHex,
  transformKuaishouHeHex,
  xorByteArrays
}
