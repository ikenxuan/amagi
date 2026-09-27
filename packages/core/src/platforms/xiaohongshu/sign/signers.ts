import { type SignFn, stepsToSigner } from '../../../contracts/endpoint'
import { rap, traceId, xs } from './steps'

/**
 * 小红书签名器表：**只做「注册名 → `SignStep` 清单」的映射，不含算法**。
 *
 * 算法的唯一实现在 `./steps.ts`（四个基础签名器、helper，以及 XYS_/XYW_ 协议区别、
 * 签名路径为何取 signPath 等理由都在那边的文件头）。依赖方向单向 —— `signers.ts → steps.ts`，
 * 永不反向：两份实现并存时会改一边忘一边，而小红书签名错了往往整条请求被判 406，这类分叉极难发现。
 *
 * ## 两条路，一份实现
 *
 * 端点声明 `sign: [xs('get', 'xyw'), traceId()]` 走清单；`client.xiaohongshu.request` 不给
 * `amagi.sign` 时走字符串 `'xhs-get'` 这类名字查这张表。两者现在压的是同一批 step，签出来必然一致。
 *
 * ## 七个注册名
 *
 * XYS_（传统）路径：
 * - `'xhs-post'`：POST，x-s 用 `signXsPost` 对 body 签名
 * - `'xhs-get'`：GET，x-s 用 `signXsGet` 对 query 签名
 * - `'xhs-get-trace'`：GET + `x-b3-traceid`（userNoteList 专用）
 * - `'xhs-post-rap'`：POST + `x-rap-param`（feed / 搜索 / 发布类接口的额外校验）
 *
 * XYW_（2026-03 之后）路径 —— 数据获取类接口以 HTTP 406 拒绝 XYS_，x-s 改用以 `XYW_`
 * 开头的 AES-128-CBC 签名：
 * - `'xhs-get-xyw'`：GET，x-s 用 `signXyw`
 * - `'xhs-post-xyw'`：POST，x-s 用 `signXyw`
 * - `'xhs-get-xyw-trace'`：GET XYW + `x-b3-traceid`（userNoteList 专用）
 *
 * @module platforms/xiaohongshu/sign/signers
 */

/**
 * 平台签名器表，交给 runtime 的 `signers` 查名。
 *
 * 用 `satisfies` 而非显式 `: Record<string, SignFn>` 返回：后者会把键联合抹成宽
 * `string`，而 {@link XiaohongshuSignerName} 要靠 `keyof` 从这张表推导精确名字联合。
 * @returns 注册名 → 签名器
 */
export const createXiaohongshuSigners = () =>
  ({
    'xhs-post': stepsToSigner([xs('post', 'xys')]),
    'xhs-get': stepsToSigner([xs('get', 'xys')]),
    'xhs-get-trace': stepsToSigner([xs('get', 'xys'), traceId()]),
    'xhs-post-rap': stepsToSigner([xs('post', 'xys'), rap()]),
    'xhs-get-xyw': stepsToSigner([xs('get', 'xyw')]),
    'xhs-post-xyw': stepsToSigner([xs('post', 'xyw')]),
    'xhs-get-xyw-trace': stepsToSigner([xs('get', 'xyw'), traceId()])
  }) satisfies Record<string, SignFn>

/**
 * 小红书签名器名联合，从签名器表推导、不手写第二遍。
 *
 * `defineXiaohongshuEndpoint` 用它把端点 `sign` 的字符串分支从宽 `string` 收窄到
 * 这个联合 —— 写错名字编译期即报错，不必等运行时查表失败。
 */
export type XiaohongshuSignerName = keyof ReturnType<typeof createXiaohongshuSigners>
