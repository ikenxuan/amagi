/**
 * `@ikenxuan/xhshow-ts` 的内联副本 —— 小红书签名算法本体。
 *
 * 2026-10-12 从 https://github.com/ikenxuan/xhshow-ts (v1.1.0) 迁入，使 amagi 不再
 * 需要同时维护两个库。目录结构、文件划分与导出面**刻意与上游保持一致**，便于日后
 * 对照上游改动；算法逻辑未动，仅删去 `dev.ts`（上游开发脚手架）并套用本仓格式。
 *
 * ## 许可
 *
 * 上游以 MIT 发布（© 2024 Cloxl）。amagi 整体是 GPL-3.0-only，MIT 并入 GPL 兼容，
 * 但依 MIT 条款须保留版权与许可声明 —— 全文见同目录 `LICENSE`。**不要删除它。**
 *
 * ## 浏览器边界（改动前务必先读）
 *
 * 本子树经 `node:crypto` / `node:zlib` 与 `Buffer` 实现，**只能在 Node 下运行**。
 * `../shape.ts` 与 `@ikenxuan/amagi/signing` 的浏览器可用性依赖于「不 import 本子树」，
 * 内联前后这条约束一字未变 —— 想在浏览器里用小红书算法需要另做可移植实现
 * （MD5 与 DES 都不在 WebCrypto 里），不是把这里的 import 换个来源就行。
 */
export { Xhshow } from './client'
export { CryptoProcessor, XsCommonSigner, CRC32, XywCipher, buildXywPayloadHex, xRapParam } from './core'
export type { XRapParamOptions } from './core'
export { CryptoConfig } from './config'
export { FingerprintGenerator } from './generators'
export { SessionManager } from './session'
export type { Fingerprint } from './generators'
export type { SignState } from './session'
export * from './utils'
export type { Method, Payload, SignFormat } from './validators'
