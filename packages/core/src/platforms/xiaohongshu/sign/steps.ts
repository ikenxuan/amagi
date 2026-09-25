import type { SignStep } from '../../../contracts/endpoint'
import { AmagiHeaders, type HeadersInput, type RequestSpec } from '../../../contracts/request'
import { generateXB3Traceid, generateXRapParam } from './index'
import { xhsGetSigner, xhsGetXywSigner, xhsPostSigner, xhsPostXywSigner } from './signers'

/**
 * 小红书反爬参数的原子单元（{@link SignStep}）。
 *
 * 端点用 `sign: [xs('get', 'xyw'), traceId()]` 直接列出要哪些。x-s 系列的具体算法复用
 * signers.ts 里现成的四个 SignFn，这里只做 (method × protocol) 选择与可选头叠加。
 */

/**
 * `x-s` + `x-s-common` + `x-t` + `x-xray-traceid` 四个签名头。
 *
 * @param method - GET 签 query、POST 签 body
 * @param protocol - `'xys'` 传统 / `'xyw'` 绕 406（2026-03 后数据接口必用）
 */
export const xs = (method: 'get' | 'post', protocol: 'xys' | 'xyw'): SignStep => ({
  phase: 'sign',
  apply: method === 'get' ? (protocol === 'xyw' ? xhsGetXywSigner : xhsGetSigner) : protocol === 'xyw' ? xhsPostXywSigner : xhsPostSigner
})

/** 在已签名的 spec 上补一个头 */
const withHeader = (spec: RequestSpec, name: string, value: string): RequestSpec => {
  const headers = new AmagiHeaders(spec.headers as HeadersInput).set(name, value)
  return { ...spec, headers: headers.toJSON() }
}

/** `x-b3-traceid`（userNoteList / noteComments 需要），phase = `'finalize'` */
export const traceId = (): SignStep => ({
  phase: 'finalize',
  apply: (spec) => withHeader(spec, 'x-b3-traceid', generateXB3Traceid())
})

/** `x-rap-param`（feed / 搜索 / 发布类需要），phase = `'finalize'`。api 入参去协议、保留 `//host/path` */
export const rap = (): SignStep => ({
  phase: 'finalize',
  apply: (spec) => {
    const url = new URL(spec.url)
    const api = `//${url.host}${url.pathname}`
    return withHeader(spec, 'x-rap-param', generateXRapParam(api, (spec.body ?? {}) as Record<string, unknown>))
  }
})
