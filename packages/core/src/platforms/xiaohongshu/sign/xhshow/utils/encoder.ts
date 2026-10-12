import { CryptoConfig } from '../config'

export class Base64Encoder {
  private config: CryptoConfig
  private customEncodeTable: Map<string, string>
  private customDecodeTable: Map<string, string>
  private x3EncodeTable: Map<string, string>
  private x3DecodeTable: Map<string, string>

  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()

    // Cache translation tables for better performance
    this.customEncodeTable = this.buildTranslationTable(this.config.STANDARD_BASE64_ALPHABET, this.config.CUSTOM_BASE64_ALPHABET)
    this.customDecodeTable = this.buildTranslationTable(this.config.CUSTOM_BASE64_ALPHABET, this.config.STANDARD_BASE64_ALPHABET)
    this.x3EncodeTable = this.buildTranslationTable(this.config.STANDARD_BASE64_ALPHABET, this.config.X3_BASE64_ALPHABET)
    this.x3DecodeTable = this.buildTranslationTable(this.config.X3_BASE64_ALPHABET, this.config.STANDARD_BASE64_ALPHABET)
  }

  private buildTranslationTable(from: string, to: string): Map<string, string> {
    const table = new Map<string, string>()
    for (let i = 0; i < from.length; i++) {
      table.set(from[i], to[i])
    }
    return table
  }

  private translate(str: string, table: Map<string, string>): string {
    let result = ''
    for (const char of str) {
      result += table.get(char) ?? char
    }
    return result
  }

  /**
   * Encode a string using custom Base64 alphabet
   */
  encode(dataToEncode: string): string {
    const dataBytes = Buffer.from(dataToEncode, 'utf8')
    const standardEncoded = dataBytes.toString('base64')
    return this.translate(standardEncoded, this.customEncodeTable)
  }

  /**
   * Decode string using custom Base64 alphabet
   */
  decode(encodedString: string): string {
    const standardEncoded = this.translate(encodedString, this.customDecodeTable)
    try {
      const decoded = Buffer.from(standardEncoded, 'base64')
      return decoded.toString('utf8')
    } catch {
      throw new Error('Invalid Base64 input: unable to decode string')
    }
  }

  /**
   * Decode x3 signature using X3_BASE64_ALPHABET
   */
  decodeX3(encodedString: string): Buffer {
    const standardEncoded = this.translate(encodedString, this.x3DecodeTable)
    try {
      return Buffer.from(standardEncoded, 'base64')
    } catch {
      throw new Error('Invalid Base64 input: unable to decode string')
    }
  }

  /**
   * Encode x3 signature using X3_BASE64_ALPHABET
   */
  encodeX3(inputBytes: Uint8Array | Buffer): string {
    const standardEncoded = Buffer.from(inputBytes).toString('base64')
    return this.translate(standardEncoded, this.x3EncodeTable)
  }
}
