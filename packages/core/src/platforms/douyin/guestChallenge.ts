import { computeAcSignature } from './sign/acSignature'

/**
 * 游客握手的 `__ac_signature`：纯算，不执行挑战页。
 *
 * 这条链（`./guestCredential.ts`）原先在一次性 Worker 的 `node:vm` 里执行首页内联的
 * acrawler 本体，垫的是本文件自己那份 `BROWSER_SHIM`，与 mint.ts 此前那份 shim 不是
 * 同一份。环境位不同签名就不同，所以换成 {@link computeAcSignature} 之前先验了等价：
 *
 * 2026-10-11 拿 `challenge-page.html` fixture，在原 `BROWSER_SHIM` + 原 `WORKER_SOURCE`
 * 那套 context 选项里照原顺序跑（本体与引导块拼接执行，再 `init({ aid: 99999999, dfp: 0 })`
 * + `sign('', nonce)`），与纯算逐位对照：进程内 480 组（12 种 UA，长 1–300 × nonce 长
 * 1–48 共 8 档 × 整秒内偏移 0/1/499/500/999 ms），外加原 `signDouyinGuestChallenge`
 * 真 Worker 36 组，全部逐位相同（调用跨整秒的样本按前后两秒各算一份、命中其一）。从输出
 * 解出的档案与 mint.ts 那份相同：`hiWord` 8240、`fieldMask` `0x88120`（环境位 directSign /
 * dom / test）、14 字符头一致。所以这是等价替换，不是换了签名语义。原实现见 `40275421`。
 *
 * 入参里刻意没有挑战页 html：签名用不上它，「不解析挑战页」于是是类型上做不到的事。
 * @param nonce - 首发 Set-Cookie 里的 `__ac_nonce`
 * @param userAgent - 握手 UA，必须与后续请求一致
 * @returns 47 字符签名；nonce 或 UA 为空时 `null`
 */
export const signDouyinGuestChallenge = (nonce: string, userAgent: string): string | null => {
  try {
    return computeAcSignature(nonce, userAgent)
  } catch {
    return null
  }
}
