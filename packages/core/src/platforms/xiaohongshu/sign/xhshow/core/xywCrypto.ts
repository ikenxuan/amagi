/**
 * XYW_ signature crypto (AES-128-CBC).
 *
 * Ported from the upstream Python `core/xyw_crypto.py`. Data-fetching APIs
 * (user_posted, otherinfo, etc.) reject the traditional XYS_ format with HTTP
 * 406; the XYW_ format uses an independent AES-128-CBC crypto path.
 *
 * The upstream ships a hand-rolled AES-128 implementation. Since it is
 * standard AES-128 (identical S-box, RCON, key schedule and MixColumns), this
 * port uses Node's native `aes-128-cbc` cipher, which produces byte-identical
 * ciphertext while being far less error-prone.
 */

import { createCipheriv, createHash } from 'node:crypto'

import { CryptoConfig } from '../config'

const AES_BLOCK_SIZE = 16

/**
 * Apply PKCS#7 padding to a byte buffer.
 */
function pkcs7Pad(data: Buffer): Buffer {
  const padLen = AES_BLOCK_SIZE - (data.length % AES_BLOCK_SIZE)
  return Buffer.concat([data, Buffer.alloc(padLen, padLen)])
}

/**
 * AES-128-CBC cipher matching the upstream XYW implementation.
 */
export class XywCipher {
  private key: Buffer
  private iv: Buffer

  constructor(key: Buffer, iv: Buffer) {
    if (key.length !== AES_BLOCK_SIZE) {
      throw new Error('AES-128 requires a 16-byte key')
    }
    if (iv.length !== AES_BLOCK_SIZE) {
      throw new Error('AES-CBC IV must be 16 bytes')
    }
    this.key = key
    this.iv = iv
  }

  /**
   * Encrypt PKCS#7-padded plaintext with AES-128-CBC.
   *
   * @param plaintextBytes - Plaintext, already padded to a 16-byte boundary
   * @returns Ciphertext bytes
   */
  encrypt(plaintextBytes: Buffer): Buffer {
    if (plaintextBytes.length % AES_BLOCK_SIZE !== 0) {
      throw new Error('plaintextBytes must be PKCS#7 padded to a 16-byte boundary')
    }
    const cipher = createCipheriv('aes-128-cbc', this.key, this.iv)
    cipher.setAutoPadding(false)
    return Buffer.concat([cipher.update(plaintextBytes), cipher.final()])
  }
}

/**
 * Build the hex-encoded payload for an XYW_ signature.
 *
 * @param options.fullUri - The content string (uri + params/body)
 * @param options.a1Value - a1 value from cookies
 * @param options.timestampMs - Millisecond timestamp string
 * @param options.config - Crypto configuration
 * @param options.envFlags - Optional environment flags string
 * @returns Hex-encoded AES-128-CBC ciphertext
 */
export function buildXywPayloadHex(options: {
  fullUri: string
  a1Value: string
  timestampMs: string
  config: CryptoConfig
  envFlags?: string
}): string {
  const { fullUri, a1Value, timestampMs, config, envFlags } = options

  const x1 = createHash('md5').update(`url=${fullUri}`).digest('hex')
  const x2 = envFlags || config.XYW_ENV_FLAGS_DEFAULT
  const message = Buffer.from(`x1=${x1};x2=${x2};x3=${a1Value};x4=${timestampMs};`)
  const plaintext = pkcs7Pad(Buffer.from(message.toString('base64')))

  const cipher = new XywCipher(Buffer.from(config.XYW_AES_KEY, 'utf-8'), Buffer.from(config.XYW_AES_IV, 'utf-8'))
  return cipher.encrypt(plaintext).toString('hex')
}
