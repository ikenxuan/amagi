/**
 * `client.<平台>.request` 的单次 amagi 专属选项。
 *
 * 从 `contracts/request.ts` 拆出来独立成文件，唯一原因是**解依赖环**：`request.ts`
 * 被 `contracts/endpoint.ts` type-import，所以 `request.ts` 里的类型不能反向引
 * `endpoint.ts`（会成环、`deps:check` 红）；而本文件不被 `endpoint.ts` 引用，可以
 * 安全 type-import `endpoint.ts` 的 `SignDecl`（阶段 4.2 放宽 `sign` 时用）。
 *
 * `contracts/` 是零依赖叶子层，本文件维持该性质：只 type-import 仓库内的契约类型，
 * 不碰任何 runtime / platform 模块。
 */

import type { SignDecl } from './endpoint'

/**
 * 单次请求的 amagi 专属选项。
 *
 * 挂在 axios 配置的 `amagi` 键下（`client.douyin.request.get(url, { amagi: { cookie: false } })`）。
 * **只装 axios 装不下的东西** —— `timeout` / `responseType` / `params` / `headers` /
 * `signal` / `proxy` 这些一律直接用 axios 自己的键，不经这里转手。
 */
export interface AmagiRequestOptions {
  /**
   * 本次怎么签名。取值同端点声明的 `sign`（{@link SignDecl}）：
   *
   * - 不给：按平台默认（见 `client/request/profile.ts` 的档案表）——抖音走
   *   `[msToken(184), aBogus(), secsdk()]`、快手 `[hxfalcon()]`、小红书按 method
   *   推 GET / POST、B站默认**不签**（27 条端点里只有 5 条签名，默认签会大面积签错）。
   * - 字符串：平台签名器表里注册过的名字（`'a-bogus'` / `'hxfalcon'` / `'xhs-get'` …）；
   *   写错名字管线抛 `未注册的签名器`。
   * - `false`：本次不签。
   * - {@link SignStep} / `SignStep[]`：**精细控制**——从 `@ikenxuan/amagi/sign-steps`
   *   import step 工厂，自己列要哪些反爬参数，如 `[msToken(200), aBogus()]`。
   *   runtime 按 phase 排序执行，与端点声明里的清单同一套机制。
   * - {@link SignFn}：一次性的自定义签名函数。
   *
   * 放宽到全量 `SignDecl` 是有意的：`SignStep.apply` 本身就是 `SignFn`，暴露 step 工厂
   * 已等于把 `SignFn` / `EndpointCtx` / `RequestSpec` 带上公开面，再切一个窄联合只是徒增限制。
   */
  sign?: SignDecl
  /**
   * 本次**不带** cookie。
   *
   * 类型上只能填 `false` —— `true` 本来就是默认值，写成联合类型只会多一种
   * 没人会用的写法。落地的语义与端点声明里的 `dropHeaders: ['cookie']` 完全一样：
   * 在所有 header 合并**之后**删，所以调用方自己从 `headers` 塞进来的 ck 也一起删掉。
   *
   * 存在的理由：有些接口带 ck 反而拿不到数据（B站评论区会按账号改变热度池排序）。
   */
  cookie?: false
  /**
   * 签名用的接口路径。不给时从 URL 反推 pathname。
   *
   * 小红书 `x-s` 只吃 pathname；快手有 4 条路径与公开 URL 不一致
   * （如 `userInfoById` 的 URL 是 `/rest/w` 前缀、签名路径是 `/rest/k/user/info`）。
   */
  signPath?: string
  /**
   * 从平台基线里**删掉**的头（大小写不敏感）。
   *
   * 逃生舱：快手 H5 端点用移动 UA，而基线是照桌面 Chrome 攒的，两者拼在一起
   * 自相矛盾。`cookie: false` 是 `dropHeaders: ['cookie']` 的糖。
   */
  dropHeaders?: readonly string[]
}
