import { type SignFn, stepsToSigner } from '../../../contracts/endpoint'
import type { KuaishouSigner } from './index'
import { hxfalcon, sharedKuaishouSigner } from './steps'

/**
 * 快手签名器表：**只做「注册名 → `SignStep` 清单」的映射，不含算法**。
 *
 * 算法的唯一实现在 `./steps.ts`（`createHxfalconSigner` / `hxfalcon()` step）。依赖方向
 * 单向 —— `signers.ts → steps.ts`，永不反向：两份实现并存时会改一边忘一边，而快手签名
 * 错了大多是 `result=50 签名验证失败` 这类难查的形态。
 *
 * 一张表只有一个签名器：快手的 `live_api`（`/rest/k/*`）与 H5（`/rest/wd/*`）
 * 共用 `__NS_hxfalcon` 这一套算法，区别只在喂什么料。
 */

/**
 * 快手签名器表：一张表只有一个签名器，live_api 与 H5 共用。
 *
 * 不再 `extends Record<string, SignFn>`：那条索引签名会让 `keyof` 退化成宽
 * `string`，{@link KuaishouSignerName} 就取不到精确名字。每个字段显式 `: SignFn`
 * 已足够保证「表里只放签名器」，runtime 侧仍能把它赋给 `Record<string, SignFn>`。
 */
export interface KuaishouSigners {
  /** `__NS_hxfalcon` */
  hxfalcon: SignFn
}

/**
 * 快手签名器名联合（`'hxfalcon'`），从表推导。
 *
 * `defineKuaishouEndpoint` 用它把端点 `sign` 的字符串分支收窄到这个联合 ——
 * 写错名字编译期即报错，不必等运行时查表失败。
 */
export type KuaishouSignerName = keyof KuaishouSigners

/**
 * 创建快手签名器表。
 *
 * 表由 `PLATFORM_RUNTIME.kuaishou.signers` 持有，与另外三个平台同构 ——
 * client fetcher / `createKuaishouRoutes` / 静态 fetcher 三个入口共用同一张表，
 * 保证任何入口下的签名行为一致。
 *
 * `signer` 可注入：缺省用 `steps.ts` 的模块级 {@link sharedKuaishouSigner}，于是端点
 * 声明与 `client.kuaishou.request` 两条路共用一个 `count`；测试可注入独立实例做隔离。
 * @param signer - 签名器实例，缺省用共享实例
 * @returns 签名器表
 */
export const createKuaishouSigners = (signer: KuaishouSigner = sharedKuaishouSigner) =>
  ({
    hxfalcon: stepsToSigner([hxfalcon(signer)])
  }) satisfies KuaishouSigners
