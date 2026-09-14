import crypto from 'node:crypto'

import a_bogus from '../../../douyin/sign/a_bogus'
// 本目录**不再重复实现**任何签名算法，全部从 `platforms/douyin/sign` 复用。
// 依赖方向 platform/ → platforms/，与 `platform/douyin/routes.ts` 一致。
//
// 这条原则是血的教训：`Mstoken` 与 `VerifyFpManager` 曾经在这里各有一份逐字复制，
// 于是 v7 那份修好时钟来源之后，legacy 这份还留着缺陷，而「v7 与 v6 逐项对照」
// 的测试因为只比长度，一点反应都没有。两份实现必然漂移，唯一可靠的办法是不留两份。
import { applySecsdkWebSign, type ApplySecsdkOptions } from '../../../douyin/sign/secsdkWebSign'
import { genVerifyFp } from '../../../douyin/sign/tokens'
import XBogus from '../../../douyin/sign/x_bogus'

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
    return genVerifyFp()
  }
}
