import crypto from 'crypto'

import a_bogus from './a_bogus'

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
}
export class douyinSign {
  /**
   * 生成一个指定长度的随机字符串
   * @param length 字符串长度，默认为116
   * @returns 
   */
  static Mstoken (length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const randomBytes = crypto.randomBytes(length ?? 116)
    return Array.from(randomBytes, (byte) => characters[byte % characters.length]).join('')
  }

  /**
   * a_bogus 签名算法
   * @param url 需要签名的地址
   * @returns 对此地址签名后的URL查询参数
   */
  static AB (url: string): string {
    return a_bogus(url, headers['User-Agent'])
  }

  /** 生成一个唯一的验证字符串 */
  static VerifyFpManager (): string {
    const e = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
    const t = e.length
    const n = new Date().getTime().toString(36)
    const r: (string | number)[] = []

    r[8] = '_'
    r[13] = '_'
    r[18] = '_'
    r[23] = '_'
    r[14] = '4'

    for (let o, i = 0; i < 36; i++) {
      if (!r[i]) {
        o = 0 | (Math.random() * t)
        r[i] = e[i === 19 ? (3 & o) | 8 : o]
      }
    }

    return 'verify_' + n + '_' + r.join('')
  }
}
