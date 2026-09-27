import type { SignFn, SignStep } from '../../../contracts/endpoint'
import { AmagiHeaders, type HeadersInput, type RequestSpec } from '../../../contracts/request'
import { createKuaishouSigner, type KuaishouSigner } from './index'

/**
 * 快手反爬参数的原子单元（{@link SignStep}）。
 *
 * 快手的 `live_api`（`/rest/k/*`）与 H5（`/rest/wd/*`）共用 `__NS_hxfalcon` 这一套
 * 算法，区别只在喂什么料 —— 所以只有一个 step 工厂。这里是快手签名的**唯一实现**，
 * `signers.ts` 是薄壳：依赖方向单向 `signers.ts → steps.ts`，永不反向。
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
 * - `spec.signPath`：规范签名路径（端点已在 spec 里填好）
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

/**
 * 模块级共享的快手签名器实例。
 *
 * 带状态（`count` / `startupRandom` / 匿名 kww），端点声明与 `client.kuaishou.request`
 * 两条路共用它 —— `count` 一致递增，同旧 `createKuaishouSigners` 的默认实例。
 */
export const sharedKuaishouSigner = createKuaishouSigner()

/**
 * `__NS_hxfalcon` 签名（live_api 与 H5 共用一套算法，区别只在喂什么料）。
 *
 * `signer` 缺省用模块级 {@link sharedKuaishouSigner}（端点声明走这条）；`signers.ts`
 * 需要注入独立实例时传入，这样注入的 `count` 状态才生效。
 * @param signer - 签名器实例，缺省用共享实例
 * @returns `sign` 阶段的签名步骤
 */
export const hxfalcon = (signer: KuaishouSigner = sharedKuaishouSigner): SignStep => ({
  phase: 'sign',
  apply: createHxfalconSigner(signer)
})

/** 清空共享签名器实例的状态（测试隔离用：`sharedKuaishouSigner` 是模块级、跨用例共享） */
export const resetKuaishouSignerState = (): void => sharedKuaishouSigner.reset()
