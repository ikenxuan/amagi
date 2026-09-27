import { type SignFn, stepsToSigner } from '../../../contracts/endpoint'
import { qtparam, wbi } from './steps'

/**
 * B站签名器表：**薄壳，把注册名映射到 `./steps.ts` 的 SignStep 清单，不含算法**。
 *
 * 端点声明的 `wbi()` / `qtparam()` 与 `client.bilibili.request` 查表的 `'wbi'` /
 * `'qtparam'` 压的是同一份 step、走 `steps.ts` 里那个模块级 `WbiSigner`
 * （`sharedWbi`），所以两条路的签名必然一致、`/nav` 缓存一次两用：
 * - `'wbi'`：给 URL 追加 `&wts=..&w_rid=..`（comments / userDynamicList /
 *   userSpaceInfo）。
 * - `'qtparam'`：视频流专属 —— 登录态 → `/nav` 取 vipStatus → wbi 签名 +
 *   fnval 档位（videoStream / bangumiStream）。
 *
 * 依赖方向单向：`signers.ts → steps.ts`，永不反向（两份实现并存必然改一边忘一边）。
 * `WbiSigner` 进程级共享一份（`PLATFORM_RUNTIME` 是模块级 const，模块求值时只调一次
 * `createBilibiliSigners`），keys 缓存进程内复用。
 */
export interface BilibiliSigners {
  wbi: SignFn
  qtparam: SignFn
}

/**
 * B站签名器名联合（`'wbi' | 'qtparam'`），从签名器表推导、不手写第二遍。
 *
 * `defineBilibiliEndpoint` 用它把端点 `sign` 的字符串分支从宽 `string` 收窄到这个
 * 联合 —— 写错名字编译期即报错，不必等运行时查表失败。
 */
export type BilibiliSignerName = keyof BilibiliSigners

/**
 * 创建 B站签名器表（薄壳，进程级共享）。
 *
 * 不自建 `WbiSigner` —— `wbi()` / `qtparam()` 内部引用 `steps.ts` 的模块级
 * `sharedWbi`，所以 `createBilibiliSigners()` 调多次也共用同一个实例、同一份
 * `/nav` 缓存（与旧注释「每 client 一份」相反 —— 但实现上本来就只有一份，这里是
 * 让注释对上实现）。
 * @returns 注册名 → 签名器
 */
export const createBilibiliSigners = (): BilibiliSigners => ({
  wbi: stepsToSigner([wbi()]),
  qtparam: stepsToSigner([qtparam()])
})
