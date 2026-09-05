import crypto from 'node:crypto'

import a_bogus from './a_bogus'
import { applySecsdkWebSign, type ApplySecsdkOptions } from './secsdkWebSign'
import XBogus from './x_bogus'

const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

export class douyinSign {
  /**
   * 生成一个指定长度的随机字符串
   * @param length 字符串长度，默认为116
   * @returns
   */
  static Mstoken(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const randomBytes = crypto.randomBytes(length ?? 116)
    return Array.from(randomBytes, (byte) => characters[byte % characters.length]).join('')
  }

  /**
   * a_bogus 签名算法
   * @param url 需要签名的地址
   * @returns 对此地址签名后的URL查询参数
   */
  static AB(url: string, userAgent?: string): string {
    return a_bogus(url, userAgent ?? defaultUserAgent)
  }

  /**
   * X-Bogus 签名算法
   * @param url 需要签名的地址
   * @returns 对此地址签名后的URL查询参数
   */
  static XB(url: string, userAgent?: string): string {
    const xbogusResult = new XBogus().getXBogus(url, userAgent ?? defaultUserAgent)
    return xbogusResult.xbogus
  }

  /**
   * `x-secsdk-web-signature` 签名算法
   *
   * 与 `AB` / `XB` 不同，它改写整条 URL 而不是返回一个参数值：签名算的是规范化后的 query，
   * 服务端也按收到的 query 校验，所以必须发送返回的这条 URL。只对 SDK 策略表内的 path 生效，
   * 其余原样返回，因此可以无条件套用。必须是最后一步（webid → a_bogus → 本签名）。
   *
   * @param url 已拼好全部参数（含 a_bogus）的完整地址
   * @param options `uifid`（query 缺失时从 cookie 取）、`cookie`、`method`、`ts`
   * @returns 需要加签时返回带签名的完整 URL，否则原样返回
   */
  static SecSdk(url: string, options: ApplySecsdkOptions = {}): string {
    return applySecsdkWebSign(url, options)
  }

  /** 生成一个唯一的验证字符串 */
  static VerifyFpManager(): string {
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
