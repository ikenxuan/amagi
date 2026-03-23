import type { KuaishouLiveApiRequest } from '../API'
import { deriveKuaishouHeHashFieldHex, deriveKuaishouHeHex, deriveKuaishouPureSignature } from './he'
import {
  buildKuaishouHxfalconPayload,
  buildKuaishouHxfalconSignInput,
  deriveKuaishouKww,
  KuaishouHxfalconPayload
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
import { deriveKuaishouSecsStackTail, deriveKuaishouSecsState, getKuaishouPureRuntimeState } from './state'

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
 * 快手签名工具集。
 *
 * 负责将请求描述对象转换为带 `__NS_hxfalcon` / `kww` 的最终请求材料。
 */
export class kuaishouSign {
  /**
   * 获取当前纯算法运行时使用的 `caver`。
   *
   * @returns 快手 `caver` 值
   */
  static getCatVersion (): string {
    return getKuaishouPureRuntimeState().catVersion
  }

  /**
   * 生成快手请求头中的 `kww` 值。
   *
   * @param cookie - 原始 Cookie 字符串
   * @returns `kww` 请求头值
   */
  static generateKww (cookie?: string): string {
    return deriveKuaishouKww(cookie)
  }

  /**
   * 根据结构化签名载荷生成 `__NS_hxfalcon`。
   *
   * @param payload - 已标准化的快手签名载荷
   * @returns 包含最终签名串、sign input 与 `caver` 的结果
   */
  static generateHxfalconFromPayload (payload: KuaishouHxfalconPayload): Pick<KuaishouLiveApiSignature, 'signResult' | 'signInput' | 'catVersion'> {
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
  static signLiveApiUrl (
    url: string,
    cookie?: string,
    signPath?: string
  ): KuaishouLiveApiSignature {
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
  static signLiveApiRequest (
    request: KuaishouLiveApiRequest,
    cookie?: string
  ): KuaishouLiveApiSignature {
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
