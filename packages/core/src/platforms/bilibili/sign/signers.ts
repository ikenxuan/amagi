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
 * 随实例（修 #4）。
 */
export interface BilibiliSigners {
  'wbi': SignFn
  'qtparam': SignFn
  /** 共享实例，测试可直接取用（验 /nav 缓存次数） */
  instance: WbiSigner
}

/** 创建 B站签名器表（每 client 一份） */
export const createBilibiliSigners = (): BilibiliSigners => {
  const instance = createWbiSigner()
  return {
    'wbi': instance.sign,
    'qtparam': createQtparamSigner(instance),
    instance
  }
}
