import type { SignFn } from '../../../contracts/endpoint'
import { createQtparamSigner } from './qtparam'
import { createWbiSigner, type WbiSigner } from './wbi'

/**
 * B站签名器表。
 *
 * 两个签名器共享同一个 {@link WbiSigner} 实例（`/nav` 缓存一次两用）：
 * - `'wbi'`：给 URL 追加 `&wts=..&w_rid=..`（comments / userDynamicList /
 *   userSpaceInfo）。
 * - `'qtparam'`：视频流专属 —— 登录态 → `/nav` 取 vipStatus → wbi 签名 +
 *   fnval 档位（videoStream / bangumiStream）。
 *
 * 每 client 实例创建一份（`PLATFORM_RUNTIME.bilibili.signers`），keys 缓存
 * 随实例。
 */
export interface BilibiliSigners {
  wbi: SignFn
  qtparam: SignFn
  /** 共享的 {@link WbiSigner} 实例 */
  instance: WbiSigner
}

/**
 * B站签名器名联合（`'wbi' | 'qtparam'`）。
 *
 * 从 {@link BilibiliSigners} 排除 `instance` —— 那是共享的 {@link WbiSigner}
 * 实例、不是签名器（runtime 装配时也把它剥掉）。`defineBilibiliEndpoint` 用它把
 * 端点 `sign` 的字符串分支收窄，写错名字编译期即报错。
 */
export type BilibiliSignerName = Exclude<keyof BilibiliSigners, 'instance'>

/** 创建 B站签名器表（每 client 一份） */
export const createBilibiliSigners = (): BilibiliSigners => {
  const instance = createWbiSigner()
  return {
    wbi: instance.sign,
    qtparam: createQtparamSigner(instance),
    instance
  }
}
