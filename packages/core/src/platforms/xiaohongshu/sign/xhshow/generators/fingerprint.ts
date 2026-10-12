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

/** b1 只取指纹里的这 19 个键，顺序即浏览器 JSON 的键序 */
const B1_KEYS = [
  'x33',
  'x34',
  'x35',
  'x36',
  'x37',
  'x38',
  'x39',
  'x42',
  'x43',
  'x44',
  'x45',
  'x46',
  'x48',
  'x49',
  'x50',
  'x51',
  'x52',
  'x82',
  'x84'
] as const

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
   *
   * 格式：customBase64(UTF-8(RC4(JSON(19 键), B1_SECRET_KEY)))。RC4 密文按 latin1 读成字符串后再走
   * UTF-8，所以 ≥0x80 的字节各占两个字节 —— 与 Python 版 `quote` + 按 `%` 拆字节等价。
   * 2026-10-07 用 Edge 154 的 `localStorage.b1` 反解确认（fp 脚本 `as/v2/fp/c4a1036f…`）。
   * 旧实现把字节数组再 `JSON.stringify` 一次才编码，产出的是浏览器从不会发的「数字数组文本」。
   */
  generateB1(fp: Fingerprint): string {
    const b1Fp: Record<string, any> = {}
    for (const key of B1_KEYS) b1Fp[key] = fp[key]
    return this.encoder.encode(this.rc4Encrypt(JSON.stringify(b1Fp), this.b1Key))
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
    const collectedAt = Date.now() - 100 - Math.floor(Math.random() * 1400)
    // timeOrigin 是带小数的毫秒；Number → string 与浏览器一致（小数位为 0 时不带小数点）
    const timeOrigin = Math.round((collectedAt - 3000 - Math.random() * 11000) * 10) / 10

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
      // x37 取 fp 脚本稳态那次写入的位图；冷启动第一次写入只有第 9 / 18 位（后台标签只到这一步）
      x37: '0|0|0|0|0|0|0|0|0|1|0|0|1|0|0|0|0|1|1|0|0|0|0|0',
      x38: '0|0|1|0|1|0|0|0|0|0|1|0|1|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0',
      // x39 是这台设备累计写 b1 的次数（字符串），全新设备从 '0' 起
      x39: '0',
      x40: '0',
      x41: '0',
      x42: '3.5.6',
      // 3.5.6 的 fp 脚本会调 canvas，但 x43 在实测的 6 次写入（游客 / 登录态）里都是这个常量
      x43: 'Canvas not supported',
      // x44 是采集时刻，比 b1 写入早 0.1-1.5s；x84 的 mt.to 是 performance.timeOrigin，比 x44 早几秒
      x44: `${collectedAt}`,
      x45: '__SEC_CAV__1-1-1-1-1|',
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
      x82: `1|${FPData.B1_PAGE_GLOBALS.join('|')}`.slice(0, 300),
      // 无交互的稳态：鼠标 / 键盘计数为空，ft 各项尚未发生
      x84: `{mt:{to:${timeOrigin}},m:{},k:{},p:{ulr:0,f:1,ps:1},st:{h:0,f:1,kr:0},ft:{ae:null,ak:null,cdr:null,bf:null,fi:null}}`,
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

    fp.x39 = '0'
    fp.x44 = `${Date.now()}`
    fp.x57 = cookieString
    fp.x66 = {
      referer: 'https://www.xiaohongshu.com/explore',
      location: url,
      frame: 0
    }
  }
}
