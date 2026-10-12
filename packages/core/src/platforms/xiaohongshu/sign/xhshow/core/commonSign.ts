/**
 * x-s-common signature generation
 */

import { CryptoConfig } from '../config'
import { FingerprintGenerator } from '../generators/fingerprint'
import { Base64Encoder } from '../utils/encoder'
import { CRC32 } from './crc32'

export class XsCommonSigner {
  private config: CryptoConfig
  private fpGenerator: FingerprintGenerator
  private encoder: Base64Encoder

  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()
    this.fpGenerator = new FingerprintGenerator(this.config)
    this.encoder = new Base64Encoder(this.config)
  }

  /**
   * Generate x-s-common signature
   */
  sign(cookieDict: Record<string, string>): string {
    const a1Value = cookieDict.a1
    if (!a1Value) {
      throw new Error("Missing 'a1' in cookies")
    }

    const fingerprint = this.fpGenerator.generate(cookieDict, this.config.PUBLIC_USERAGENT)
    const b1 = this.fpGenerator.generateB1(fingerprint)

    const x9 = CRC32.crc32JsInt(b1)

    const signStruct = { ...this.config.SIGNATURE_XSCOMMON_TEMPLATE }
    signStruct.x5 = a1Value
    signStruct.x8 = b1
    signStruct.x9 = x9

    const signJson = JSON.stringify(signStruct)
    const xsCommon = this.encoder.encode(signJson)

    return xsCommon
  }
}
