import crypto from 'node:crypto'

import a_bogus from './a_bogus'
import { genVerifyFp } from './tokens'
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
   * 生成一个唯一的验证字符串
   *
   * 形状与旧实现一致（`verify_<base36 毫秒>_<36 位>`，分隔符在 8/13/18/23、
   * 版本位在 14、变体位在 19），但时钟来源从 `new Date().getTime()` 换成
   * `Date.now()` —— 原来那个绕开了 `vi.spyOn(Date, 'now')`，导致这个函数
   * **无法在测试里被冻结**，只能断言结构。现在可以钉死时钟与随机源了。
   */
  static VerifyFpManager(): string {
    return genVerifyFp()
  }
}
