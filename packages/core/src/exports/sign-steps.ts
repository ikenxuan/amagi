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
 * import { douyin } from '@ikenxuan/amagi/sign-steps'
 *
 * // 自己挑要哪些、调参数（这里用 200 长度的 msToken，且不加 secsdk 收尾）
 * await client.douyin.request.get(url, { amagi: { sign: [douyin.msToken(200), douyin.aBogus()] } })
 * ```
 *
 * runtime 按 `phase`（`prepare` → `token` → `sign` → `finalize`）稳定排序后依次执行，
 * 所以数组顺序写反也不翻车（`[douyin.aBogus(), douyin.msToken()]` 与
 * `[douyin.msToken(), douyin.aBogus()]` 等价）。
 *
 * ## 与默认签名同源
 *
 * 这些工厂就是端点声明和平台签名器表内部用的同一批（阶段 2 已把两条路统一到一份实现）。
 * 所以你手挑的 `[bilibili.wbi()]` 与不挑时的默认 `'wbi'` 压的是同一个签名器实例、同一份
 * `/nav` 缓存，签出来必然一致。带状态的签名器（B站 wbi keys、快手 hxfalcon count）是进程级共享的。
 *
 * ## 命名：按平台分命名空间
 *
 * step 工厂按平台归入四个命名空间对象（`douyin` / `bilibili` / `kuaishou` / `xiaohongshu`），
 * 而不是平铺到一个入口 —— `douyin.msToken()` 一眼看出归属，也不会随平台增多而重名。
 * `douyin.douyinBogus` / `douyin.douyinXBogus` 是抖音的常用组合预设
 * （`[msToken, aBogus, secsdk]` / `[…, xBogus, …]`）。
 *
 * 类型（`SignStep` / `SignPhase` / `SignFn` / `SignDecl`）不属于任何单一平台，平铺导出，
 * 方便写辅助函数的入参 / 返回值。
 *
 * @module @ikenxuan/amagi/sign-steps
 */

import { qtparam, wbi } from '../platforms/bilibili/sign/steps'
import { aBogus, douyinBogus, douyinXBogus, msToken, secsdk, xBogus } from '../platforms/douyin/sign/steps'
import { hxfalcon } from '../platforms/kuaishou/sign/steps'
import { rap, traceId, xs } from '../platforms/xiaohongshu/sign/steps'

/** 抖音的反爬参数 step 工厂与组合预设 */
export const douyin = { msToken, aBogus, xBogus, secsdk, douyinBogus, douyinXBogus } as const

/** B站的反爬参数 step 工厂 */
export const bilibili = { wbi, qtparam } as const

/** 快手的反爬参数 step 工厂 */
export const kuaishou = { hxfalcon } as const

/** 小红书的反爬参数 step 工厂 */
export const xiaohongshu = { xs, traceId, rap } as const

export type { SignDecl, SignFn, SignPhase, SignStep } from '../contracts/endpoint'
