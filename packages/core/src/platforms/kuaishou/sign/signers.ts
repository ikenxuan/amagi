import type { SignFn } from '../../../contracts/endpoint'
import { AmagiHeaders, type HeadersInput, type RequestSpec } from '../../../contracts/request'
import { createKuaishouSigner, type KuaishouSigner } from './index'

/**
 * 快手签名器表。
 *
 * v7 之前这张表**不存在**：`KuaishouSigner` 写得很完整、`createKuaishouSigner()`
 * 也导出了，但 `signLiveApiUrl` / `signLiveApiRequest` 在 `src/` 里除了 `sign/`
 * 目录自身没有任何调用点，`PLATFORM_RUNTIME.kuaishou` 也没有 `signers` 一项 ——
 * 于是**发出去的每一个快手请求都没有 `__NS_hxfalcon`**，`caver` 与 `kww` 也一个
 * 都不发。cookie 因此成了签名的替代凭证：不是快手要求 cookie，是 amagi 没签名，
 * 只能拿 cookie 当凭证。
 *
 * 缺口能活到现在是因为它**静默**：`PLATFORM_RUNTIME` 少一项既不报编译错误也不
 * 挂测试（`judge` 少一项是同一个位置的同一类漏项）。`test/client/runtime.test.ts`
 * 现在把「四个平台都要有 signers 或显式注明无」钉成断言。
 *
 * 一张表只有一个签名器：快手的 `live_api`（`/rest/k/*`）与 H5（`/rest/wd/*`）
 * 共用 `__NS_hxfalcon` 这一套算法，区别只在喂什么料。
 */

/** 签名时必须出现在 query 里的版本标记 —— 它参与 sign input，不能只在发送时补 */
const CAVER_PARAM = 'caver'

/**
 * 取参与签名的请求体。
 *
 * 只认普通对象：签名把 `JSON.stringify(body)` 拼在 sign input 尾部，而 transport
 * 交给 axios 的也是同一个对象（同样 `JSON.stringify`），两边逐字一致才算签对。
 * 若 body 已被端点预先序列化成字符串或换成了别的形状，签名与实发就会错位 ——
 * 这正是「签名验证失败」最难查的形态，所以这里直接抛，不静默签一个错的。
 * @param spec - 请求描述
 * @returns 参与签名的请求体
 */
const signableBody = (spec: RequestSpec): Record<string, unknown> => {
  if (spec.body === undefined || spec.body === null) return {}
  if (typeof spec.body !== 'object' || Array.isArray(spec.body)) {
    throw new Error(`快手签名只支持普通对象 body，收到 ${Array.isArray(spec.body) ? 'array' : typeof spec.body}`)
  }
  return spec.body as Record<string, unknown>
}

/**
 * 造 `__NS_hxfalcon` 签名器。
 *
 * 签名的三份料全部从 spec 上取 —— 走正规 `sign` 声明这条路，`body` 天然可得，
 * 不需要在 request 层手动把 body 递给签名器：
 * - query：从 `spec.url` 解析，必须含 `caver`（缺就按签名器自己的 `catVersion`
 *   补上，补的值与最终发出去的一致）
 * - `spec.signPath`：规范签名路径。此前端点（如 `userProfile`）已经在 spec 里
 *   填了它，但没有任何人读 —— 「端点准备好被签名」只做了一半
 * - `spec.body`：POST 端点的请求体，`photo/info` 一类严格校验的接口非它不可
 * @param signer - 签名器实例（状态随实例：`count` / `startupRandom` / 匿名 kww）
 * @returns 签名函数
 */
export const createHxfalconSigner =
  (signer: KuaishouSigner): SignFn =>
  (spec, ctx) => {
    const url = new URL(spec.url)
    if (!url.searchParams.get(CAVER_PARAM)) url.searchParams.set(CAVER_PARAM, signer.getCatVersion())

    const signed = signer.signLiveApiUrl(url.toString(), ctx.cookie, spec.signPath, signableBody(spec))
    const headers = new AmagiHeaders(spec.headers as HeadersInput)
    for (const [key, value] of Object.entries(signed.headers)) headers.set(key, value)

    return { ...spec, url: signed.url, headers: headers.toJSON() }
  }

/** 快手签名器表：一张表只有一个签名器，live_api 与 H5 共用 */
export interface KuaishouSigners extends Record<string, SignFn> {
  /** `__NS_hxfalcon` */
  hxfalcon: SignFn
}

/**
 * 创建快手签名器表。
 *
 * 表由 `PLATFORM_RUNTIME.kuaishou.signers` 持有，与另外三个平台同构 ——
 * client fetcher / `createKuaishouRoutes` / 静态 fetcher 三个入口共用同一张表，
 * 保证任何入口下的签名行为一致（漏装表就是从这里漏的）。
 *
 * `signer` 可注入：签名器实例带状态（`count` / `startupRandom` / 匿名 kww），
 * 测试要验 `caver` 或连续签名不重复时自己造一个传进来，不必从表里反挖 ——
 * 表里只放 `SignFn`，混进一个实例会让它不再满足 `Record<string, SignFn>`。
 * @param signer - 签名器实例，缺省新建一个
 * @returns 签名器表
 */
export const createKuaishouSigners = (signer: KuaishouSigner = createKuaishouSigner()): KuaishouSigners => ({
  hxfalcon: createHxfalconSigner(signer)
})
