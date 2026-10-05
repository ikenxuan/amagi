/**
 * 抖音 Argus 人机验证：形态识别 + 自动解算 + 滑块中转。
 *
 * 三层防线（按服务器下发顺序）：
 *
 * 1. **WAF PoW**（`_wafchallengeid`）：纯程序化。sha256 暴搜，毫秒级。
 * 2. **acrawler VMP**（`_$jsvmprt`）：纯程序化。node:vm 跑挑战页脚本。
 * 3. **TTGCaptcha 滑块**（`验证码中间页`）：**转人工**，amagi 只中转不绕过。
 */

export * from './detect'
export * from './waf'
export * from './acrawler'
export * from './captcha'
export * from './solver'
