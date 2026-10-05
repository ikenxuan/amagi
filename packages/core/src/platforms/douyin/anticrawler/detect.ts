/**
 * 抖音 Argus 人机验证的形态识别。
 *
 * 真实链路（2026-10 实测）：无 cookie 访问 `www.douyin.com` 页面，服务器按
 * 缺什么验什么逐级下发三种挑战页，全部是「整页 HTML + 一段 JS」的形状：
 *
 * 1. **WAF PoW**（`_wafchallengeid` / `WAFJS`）—— 约 2.5KB，内嵌
 *    `cs="<base64 JSON>"`，要求 `sha256(prefix || utf8(i)) hex === expect`。
 *    解出后写 `_wafchallengeid` cookie（`Max-Age=1`）立即 reload。
 * 2. **acrawler VMP**（`_$jsvmprt`）—— 约 72KB，`window.byted_acrawler.init`
 *    一段加密 VM 代码，读 `__ac_nonce` cookie 计算 `__ac_signature`。
 * 3. **TTGCaptcha 滑块**（`验证码中间页` / `TTGCaptcha`）—— 真正的极验式滑块，
 *    无法纯程序化通过，只能转人工。
 *
 * 正常页面带 `_ROUTER_DATA` 水合数据。`none` 表示认不出 —— 调用方应直接放弃
 * 自动处理，别把来路不明的响应当挑战页硬解。
 */

/** 一份响应体命中的反爬形态 */
export type AnticrawlerKind = 'waf' | 'vmp' | 'captcha' | 'data' | 'none'

/**
 * 识别一份响应体的反爬形态。
 *
 * 判据只认「挑战页独有的脚本锚点」，宁可漏（返回 `'none'`）也不误判。
 * 顺序上有讲究：滑块中间页同时含 `TTGCaptcha` 与中外层 CSS，而 WAF / VMP 页
 * 也可能带 SDK 脚本 —— 所以特异的锚点优先，`TTGCaptcha` 放最后。
 * @param html - 响应体原文（非 HTML 文本也会安全地走到 `'none'`）
 * @returns 识别出的形态；认不出返回 `'none'`
 */
export const detectAnticrawler = (html: string): AnticrawlerKind => {
  if (html.includes('_$jsvmprt')) return 'vmp'
  if (html.includes('_wafchallengeid') || html.includes('WAFJS')) return 'waf'
  if (html.includes('验证码中间页') || html.includes('TTGCaptcha')) return 'captcha'
  if (html.includes('_ROUTER_DATA')) return 'data'
  return 'none'
}
