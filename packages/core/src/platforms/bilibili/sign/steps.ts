import type { SignStep } from '../../../contracts/endpoint'
import { createQtparamSigner } from './qtparam'
import { createWbiSigner } from './wbi'

/**
 * B站反爬参数的原子单元（{@link SignStep}）。
 *
 * `wbi()` 与 `qtparam()` 共用一个模块级 {@link WbiSigner} 实例 —— 一次 `/nav` 的 TTL
 * 缓存两用，同旧 `createBilibiliSigners` 里的 instance。
 */
const sharedWbi = createWbiSigner()
const qtparamSigner = createQtparamSigner(sharedWbi)

/** `wbi`：URL 追加 `&wts=&w_rid=`（comments / userDynamicList / userSpaceInfo） */
export const wbi = (): SignStep => ({ phase: 'sign', apply: (spec, ctx) => sharedWbi.sign(spec, ctx) })

/**
 * `qtparam`：视频流专属。登录判断 + fnval 档位 + wbi 签名强耦合，整体封成一个单元
 * （fnval 依赖 vipStatus、且必须加在「基于原始 URL 的 wbi 签名」之后，拆开必错）。
 */
export const qtparam = (): SignStep => ({ phase: 'sign', apply: qtparamSigner })

/** 清空共享 WbiSigner 的 keys 缓存（测试隔离用：sharedWbi 是模块级、跨用例共享） */
export const resetSharedWbiCache = (): void => sharedWbi.reset()
