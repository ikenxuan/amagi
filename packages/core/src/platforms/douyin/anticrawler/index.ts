/**
 * 抖音 Argus 反爬：形态识别 + WAF 自动解算 + 滑块中间页提取。
 *
 * 三条通道、三种处置（细节见各文件，边界在 `./solver.ts` 的表里）：
 *
 * 1. **WAF PoW**（`_wafchallengeid`）：自动解。纯 sha256 计算，解完由管线立即重放。
 * 2. **acrawler VMP**（响应体 `_$jsvmprt` 或响应头新发的 `__ac_nonce`）：**自动解** ——
 *    `__ac_signature` 由 `../sign/acSignature.ts` 纯算产出，解完同样立即重放。本目录
 *    不引入任何脚本执行路径（`node:vm` / `worker_threads` / `eval` / `new Function`
 *    一概没有）这条没变。
 * 3. **TTGCaptcha 滑块**（`验证码中间页`）：只提取不求解，由 `../captcha.ts` 的
 *    第二条通道转成 `error.challenge` 交给真人。
 *
 * 另有一份进程内缓存 `./acNonce.ts`：记住解出来的 `__ac_nonce`（按调用方 cookie 的身份
 * 分键），下次发送前把 `__ac_nonce` + 现算的 `__ac_signature` 直接带上，于是同一个
 * 客户端第二次裸打页面一发就过，不再白撞一次挑战。
 *
 * @module platforms/douyin/anticrawler
 */

export * from './acNonce'
export * from './captcha'
export * from './detect'
export * from './solver'
export * from './waf'
