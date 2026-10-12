/**
 * Browser fingerprint generator
 */

import { createHash, randomBytes } from 'node:crypto'

import { CryptoConfig } from '../config'
import * as FPData from '../data/fingerprintData'
import { Base64Encoder } from '../utils/encoder'
import * as helpers from './fingerprintHelpers'

export interface Fingerprint {
  [key: string]: any
}

export class FingerprintGenerator {
  private config: CryptoConfig
  private b1Key: Buffer
  private encoder: Base64Encoder

  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()
    this.b1Key = Buffer.from(this.config.B1_SECRET_KEY, 'utf8')
    this.encoder = new Base64Encoder(this.config)
  }

  /**
   * Generate b1 parameter from fingerprint
   */
  generateB1(fp: Fingerprint): string {
    const b1Fp: Record<string, any> = {
      x33: fp.x33,
      x34: fp.x34,
      x35: fp.x35,
      x36: fp.x36,
      x37: fp.x37,
      x38: fp.x38,
      x39: fp.x39,
      x42: fp.x42,
      x43: fp.x43,
      x44: fp.x44,
      x45: fp.x45,
      x46: fp.x46,
      x48: fp.x48,
      x49: fp.x49,
      x50: fp.x50,
      x51: fp.x51,
      x52: fp.x52,
      x82: fp.x82
    }

    const b1Json = JSON.stringify(b1Fp)

    // RC4 encryption
    const ciphertext = this.rc4Encrypt(b1Json, this.b1Key)

    // URL encode with specific safe characters
    const encodedUrl = this.customUrlEncode(ciphertext)

    // Convert to byte array
    const b: number[] = []
    const parts = encodedUrl.split('%').slice(1)
    for (const part of parts) {
      const chars = part.split('')
      b.push(parseInt(chars.slice(0, 2).join(''), 16))
      for (const c of chars.slice(2)) {
        b.push(c.charCodeAt(0))
      }
    }

    const b1 = this.encoder.encode(JSON.stringify(b))
    return b1
  }

  /**
   * RC4 encryption implementation
   */
  private rc4Encrypt(data: string, key: Buffer): string {
    // Initialize S-box
    const S = new Array(256)
    for (let i = 0; i < 256; i++) {
      S[i] = i
    }

    let j = 0
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + key[i % key.length]) % 256
      ;[S[i], S[j]] = [S[j], S[i]]
    }

    // Encrypt
    const dataBytes = Buffer.from(data, 'utf8')
    const result = Buffer.alloc(dataBytes.length)
    let i = 0
    j = 0

    for (let k = 0; k < dataBytes.length; k++) {
      i = (i + 1) % 256
      j = (j + S[i]) % 256
      ;[S[i], S[j]] = [S[j], S[i]]
      const t = (S[i] + S[j]) % 256
      result[k] = dataBytes[k] ^ S[t]
    }

    // Convert to latin1 string
    return result.toString('latin1')
  }

  /**
   * Custom URL encode matching Python's quote with safe="!*'()~_-"
   */
  private customUrlEncode(str: string): string {
    const safeChars = "!*'()~_-"
    let result = ''

    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      const code = str.charCodeAt(i)

      if (
        (code >= 0x41 && code <= 0x5a) || // A-Z
        (code >= 0x61 && code <= 0x7a) || // a-z
        (code >= 0x30 && code <= 0x39) || // 0-9
        safeChars.includes(char)
      ) {
        result += char
      } else {
        result += '%' + code.toString(16).toUpperCase().padStart(2, '0')
      }
    }

    return result
  }

  /**
   * Generate browser fingerprint
   */
  generate(cookies: Record<string, string>, userAgent: string): Fingerprint {
    const cookieString = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')

    const screenConfig = helpers.getScreenConfig()
    const isIncognitoMode = helpers.weightedRandomChoice(['true', 'false'], [0.95, 0.05])
    const [vendor, renderer] = helpers.getRendererInfo()

    const x78Y = Math.floor(Math.random() * 100) + 2350

    const fp: Fingerprint = {
      x1: userAgent,
      x2: 'false',
      x3: 'zh-CN',
      x4: helpers.weightedRandomChoice(FPData.COLOR_DEPTH_OPTIONS.values, FPData.COLOR_DEPTH_OPTIONS.weights),
      x5: helpers.weightedRandomChoice(FPData.DEVICE_MEMORY_OPTIONS.values, FPData.DEVICE_MEMORY_OPTIONS.weights),
      x6: '24',
      x7: `${vendor},${renderer}`,
      x8: helpers.weightedRandomChoice(FPData.CORE_OPTIONS.values, FPData.CORE_OPTIONS.weights),
      x9: `${screenConfig.width};${screenConfig.height}`,
      x10: `${screenConfig.availWidth};${screenConfig.availHeight}`,
      x11: '-480',
      x12: 'Asia/Shanghai',
      x13: isIncognitoMode,
      x14: isIncognitoMode,
      x15: isIncognitoMode,
      x16: 'false',
      x17: 'false',
      x18: 'un',
      x19: 'Win32',
      x20: '',
      x21: FPData.BROWSER_PLUGINS,
      x22: helpers.generateWebglHash(),
      x23: 'false',
      x24: 'false',
      x25: 'false',
      x26: 'false',
      x27: 'false',
      x28: '0,false,false',
      x29: '4,7,8',
      x30: 'swf object not loaded',
      x33: '0',
      x34: '0',
      x35: '0',
      x36: `${Math.floor(Math.random() * 20) + 1}`,
      x37: '0|0|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|1|0|0|0|0|0',
      x38: '0|0|1|0|1|0|0|0|0|0|1|0|1|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0',
      x39: 0,
      x40: '0',
      x41: '0',
      x42: '3.4.4',
      x43: helpers.generateCanvasHash(),
      x44: `${Date.now()}`,
      x45: '__SEC_CAV__1-1-1-1-1|__SEC_WSA__|',
      x46: 'false',
      x47: '1|0|0|0|0|0',
      x48: '',
      x49: '{list:[],type:}',
      x50: '',
      x51: '',
      x52: '',
      x55: '380,380,360,400,380,400,420,380,400,400,360,360,440,420',
      x56: `${vendor}|${renderer}|${helpers.generateWebglHash()}|35`,
      x57: cookieString,
      x58: '180',
      x59: '2',
      x60: '63',
      x61: '1291',
      x62: '2047',
      x63: '0',
      x64: '0',
      x65: '0',
      x66: {
        referer: '',
        location: 'https://www.xiaohongshu.com/explore',
        frame: 0
      },
      x67: '1|0',
      x68: '0',
      x69: '326|1292|30',
      x70: ['location'],
      x71: 'true',
      x72: 'complete',
      x73: '1191',
      x74: '0|0|0',
      x75: 'Google Inc.',
      x76: 'true',
      x77: '1|1|1|1|1|1|1|1|1|1',
      x78: {
        x: 0,
        y: x78Y,
        left: 0,
        right: 290.828125,
        bottom: x78Y + 18,
        height: 18,
        top: x78Y,
        width: 290.828125,
        font: FPData.FONTS
      },
      x82: '_0x17a2|_0x1954',
      x31: '124.04347527516074',
      x79: '144|599565058866',
      x53: createHash('md5').update(randomBytes(32)).digest('hex'),
      x54: FPData.VOICE_HASH_OPTIONS,
      x80: '1|[object FileSystemDirectoryHandle]'
    }

    return fp
  }

  /**
   * Update fingerprint with new cookies and URL
   */
  update(fp: Fingerprint, cookies: Record<string, string>, url: string): void {
    const cookieString = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')

    fp.x39 = 0
    fp.x44 = `${Date.now()}`
    fp.x57 = cookieString
    fp.x66 = {
      referer: 'https://www.xiaohongshu.com/explore',
      location: url,
      frame: 0
    }
  }
}
