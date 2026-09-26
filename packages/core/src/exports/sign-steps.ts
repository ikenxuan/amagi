/**
 * 反爬参数的**原子 step 工厂**：给 `client.<平台>.request` 做精细签名控制用。
 *
 * ## 它解决什么
 *
 * 端点声明里的 `sign` 早就能写成 `SignStep[]`，但 `client.<平台>.request` 这条裸请求路
 * 过去只能选一个注册名（`sign: 'a-bogus'`）或干脆不签（`sign: false`）——想「要 a_bogus
 * 但换个 msToken 长度」「只签 x_bogus 不要 secsdk」都没有出口。本入口把四平台的 step 工厂
 * 放出来，配合 `amagi.sign` 收 `SignDecl`，调用方可以自己列：
 *
 * ```ts
 * import { msToken, aBogus } from '@ikenxuan/amagi/sign-steps'
 *
 * // 自己挑要哪些、调参数（这里用 200 长度的 msToken，且不加 secsdk 收尾）
 * await client.douyin.request.get(url, { amagi: { sign: [msToken(200), aBogus()] } })
 * ```
 *
 * runtime 按 `phase`（`prepare` → `token` → `sign` → `finalize`）稳定排序后依次执行，
 * 所以数组顺序写反也不翻车（`[aBogus(), msToken()]` 与 `[msToken(), aBogus()]` 等价）。
 *
 * ## 与默认签名同源
 *
 * 这些工厂就是端点声明和平台签名器表内部用的同一批（阶段 2 已把两条路统一到一份实现）。
 * 所以你手挑的 `[wbi()]` 与不挑时的默认 `'wbi'` 压的是同一个签名器实例、同一份 `/nav`
 * 缓存，签出来必然一致。带状态的签名器（B站 wbi keys、快手 hxfalcon count）是进程级共享的。
 *
 * ## 命名
 *
 * 原子 step 用裸名（`msToken` / `aBogus` / `xs` / `wbi` …，四平台互不重名）；`douyinBogus`
 * / `douyinXBogus` 是抖音的常用组合预设（`[msToken, aBogus, secsdk]` / `[…, xBogus, …]`），
 * 带平台前缀。类型（`SignStep` / `SignPhase` / `SignFn` / `SignDecl`）一并放出，方便写
 * 辅助函数的入参 / 返回值。
 *
 * @module @ikenxuan/amagi/sign-steps
 */

export { aBogus, douyinBogus, douyinXBogus, msToken, secsdk, xBogus } from '../platforms/douyin/sign/steps'

export { rap, traceId, xs } from '../platforms/xiaohongshu/sign/steps'

export { qtparam, wbi } from '../platforms/bilibili/sign/steps'

export { hxfalcon } from '../platforms/kuaishou/sign/steps'

export type { SignDecl, SignFn, SignPhase, SignStep } from '../contracts/endpoint'
