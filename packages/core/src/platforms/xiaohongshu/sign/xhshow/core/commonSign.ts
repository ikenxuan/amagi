/**
 * x-s-common signature generation
 */

import { CryptoConfig } from '../config'
import { FingerprintGenerator } from '../generators/fingerprint'
import { validateB1 } from '../utils/b1'
import { Base64Encoder } from '../utils/encoder'
import { CRC32 } from './crc32'

export interface XsCommonOptions {
  /** 同一 Cookie 会话保存的 b1，原样写入 x8；省略时保留原有生成行为。 */
  readonly b1?: string
}

export class XsCommonSigner {
  private config: CryptoConfig
  private encoder: Base64Encoder

  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()
    this.encoder = new Base64Encoder(this.config)
  }

  /**
   * Generate x-s-common signature
   */
  sign(cookieDict: Record<string, string>, options: XsCommonOptions = {}): string {
    const a1Value = cookieDict.a1
    if (!a1Value) {
      throw new Error("Missing 'a1' in cookies")
    }

    let b1 = options.b1
    validateB1(b1)
    if (b1 === undefined) {
      const fpGenerator = new FingerprintGenerator(this.config)
      b1 = fpGenerator.generateB1(fpGenerator.generate(cookieDict, this.config.PUBLIC_USERAGENT))
    }

    const x9 = CRC32.crc32JsInt(b1)

    const signStruct = { ...this.config.SIGNATURE_XSCOMMON_TEMPLATE }
    signStruct.x5 = a1Value
    signStruct.x8 = b1
    signStruct.x9 = x9
    // x4 就是站点构建号，与 webBuild Cookie 同源（2026-09-25 真机实测两者都是 6.56.3）。
    // 优先跟着调用方的 Cookie 走，模板里的默认值只是抓不到 Cookie 时的兜底 ——
    // 否则每次平台发版都要改库里的常量，而旧值会让请求带上一个过期的构建号。
    if (cookieDict.webBuild) signStruct.x4 = cookieDict.webBuild

    const signJson = JSON.stringify(signStruct)
    const xsCommon = this.encoder.encode(signJson)

    return xsCommon
  }
}
