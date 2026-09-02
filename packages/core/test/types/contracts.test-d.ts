import type { AnyEndpointDef, DataOf, EndpointCtx, EndpointDoc, EndpointName, InputOf, ParsedOf, Registry } from 'amagi/contracts/endpoint'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { AmagiError, AmagiErrorCode, ErrorKind, Judge, JudgeVerdict, ValidationIssue } from 'amagi/contracts/error'
import type { AmagiMeta, RequestTrace, TraceReason } from 'amagi/contracts/meta'
import type { Platform } from 'amagi/contracts/platform'
import type { AmagiHeaders, HttpMethod, RawResponse, RequestConfig, RequestSpec } from 'amagi/contracts/request'
import type { AmagiFailure, AmagiResult, AmagiSuccess } from 'amagi/contracts/result'
/**
 * contracts/ 的类型层契约（由 `pnpm test:types` 运行）。
 *
 * 这些断言是 v7 契约层的编译期防线：契约类型的形状一旦被改坏，
 * 这里立刻是类型错误，而不是等到某个平台端点搬迁时才炸。
 */
import { describe, expectTypeOf, it } from 'vitest'
import zod from 'zod'

describe('contracts/platform', () => {
  it('Platform 恰好是四个平台名的联合', () => {
    expectTypeOf<Platform>().toEqualTypeOf<'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'>()
  })
})

describe('contracts/error', () => {
  it('ErrorKind 恰好是 12 个成员的联合', () => {
    expectTypeOf<ErrorKind>().toEqualTypeOf<
      | 'validation'
      | 'auth'
      | 'rate_limit'
      | 'risk'
      | 'not_found'
      | 'forbidden'
      | 'unavailable'
      | 'network'
      | 'timeout'
      | 'parse'
      | 'internal'
      | 'unknown'
    >()
  })

  it('AmagiError 的四个字段是必填，其余可选', () => {
    expectTypeOf<AmagiError>().toHaveProperty('kind').toEqualTypeOf<ErrorKind>()
    expectTypeOf<AmagiError>().toHaveProperty('code').toEqualTypeOf<AmagiErrorCode>()
    expectTypeOf<AmagiError>().toHaveProperty('message').toEqualTypeOf<string>()
    expectTypeOf<AmagiError>().toHaveProperty('retryable').toEqualTypeOf<boolean>()
    expectTypeOf<Required<Pick<AmagiError, 'kind' | 'code' | 'message' | 'retryable'>>>().toEqualTypeOf<
      Pick<AmagiError, 'kind' | 'code' | 'message' | 'retryable'>
    >()
  })

  it('ValidationIssue 的 path / message 必填', () => {
    expectTypeOf<ValidationIssue>().toEqualTypeOf<{ path: string; message: string; received?: unknown }>()
  })

  it('Judge 接受 (raw, http) 并返回 JudgeVerdict', () => {
    expectTypeOf<Judge>().parameters.toEqualTypeOf<[unknown, { status: number }]>()
    expectTypeOf<Judge>().returns.toEqualTypeOf<JudgeVerdict>()
  })
})

describe('contracts/meta', () => {
  it('TraceReason 恰好覆盖五个取值', () => {
    expectTypeOf<TraceReason>().toEqualTypeOf<'initial' | 'retry' | 'page' | 'segment' | 'prepare'>()
  })

  it('AmagiMeta 只有 trace 是可选字段', () => {
    expectTypeOf<keyof AmagiMeta>().toEqualTypeOf<'requestId' | 'clientId' | 'platform' | 'endpoint' | 'durationMs' | 'attempts' | 'trace'>()
    expectTypeOf<Required<Omit<AmagiMeta, 'trace'>>>().toEqualTypeOf<Omit<AmagiMeta, 'trace'>>()
    expectTypeOf<AmagiMeta['platform']>().toEqualTypeOf<Platform>()
    expectTypeOf<AmagiMeta['trace']>().toEqualTypeOf<RequestTrace[] | undefined>()
  })

  it('RequestTrace 的 reason 必填，status / retryOf 可选', () => {
    expectTypeOf<RequestTrace>().toHaveProperty('reason').toEqualTypeOf<TraceReason>()
    expectTypeOf<Required<Omit<RequestTrace, 'status' | 'retryOf'>>>().toEqualTypeOf<Omit<RequestTrace, 'status' | 'retryOf'>>()
  })
})

describe('contracts/result', () => {
  it('成功分支的键集合里没有 error', () => {
    expectTypeOf<keyof AmagiSuccess<number>>().toEqualTypeOf<'success' | 'data' | 'message' | 'meta'>()
    // @ts-expect-error 成功分支不声明 error 键
    expectTypeOf<AmagiSuccess<number>>().toHaveProperty('error')
  })

  it('失败分支的键集合里没有 data', () => {
    expectTypeOf<keyof AmagiFailure>().toEqualTypeOf<'success' | 'error' | 'message' | 'meta'>()
    // @ts-expect-error 失败分支不声明 data 键
    expectTypeOf<AmagiFailure>().toHaveProperty('data')
  })

  it('success 是判别键，收窄后两侧字段互斥可用', () => {
    const r = {} as AmagiResult<{ id: string }>
    if (r.success) {
      expectTypeOf(r.data).toEqualTypeOf<{ id: string }>()
      expectTypeOf(r).toEqualTypeOf<AmagiSuccess<{ id: string }>>()
    } else {
      expectTypeOf(r.error).toEqualTypeOf<AmagiError>()
      expectTypeOf(r).toEqualTypeOf<AmagiFailure>()
    }
  })

  it('信封顶层没有 code 字段（v6 的 HTTP 码与平台业务码混用点）', () => {
    expectTypeOf<keyof AmagiResult<number>>().toEqualTypeOf<'success' | 'message' | 'meta'>()
  })
})

describe('contracts/request', () => {
  it('HttpMethod 与 v6 取值一致', () => {
    expectTypeOf<HttpMethod>().toEqualTypeOf<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>()
  })

  it('RequestConfig 保持 v6 形状：不含 url / method / data', () => {
    expectTypeOf<RequestConfig>().not.toHaveProperty('url')
    expectTypeOf<RequestConfig>().not.toHaveProperty('method')
    expectTypeOf<RequestConfig>().not.toHaveProperty('data')
    expectTypeOf<RequestConfig>().toHaveProperty('timeout')
    expectTypeOf<RequestConfig>().toHaveProperty('proxy')
  })

  it('RequestSpec 只有 method / url 必填', () => {
    expectTypeOf<Required<Pick<RequestSpec, 'method' | 'url'>>>().toEqualTypeOf<Pick<RequestSpec, 'method' | 'url'>>()
    expectTypeOf<RequestSpec['method']>().toEqualTypeOf<HttpMethod>()
    expectTypeOf<RequestSpec['responseType']>().toEqualTypeOf<'json' | 'text' | 'arraybuffer' | undefined>()
  })

  it('RawResponse 的 headers 是大小写不敏感容器，status 必填', () => {
    expectTypeOf<RawResponse['headers']>().toEqualTypeOf<AmagiHeaders>()
    expectTypeOf<RawResponse['status']>().toEqualTypeOf<number>()
    expectTypeOf<RawResponse['body']>().toEqualTypeOf<unknown>()
  })

  it('AmagiHeaders.get 返回 string | undefined', () => {
    expectTypeOf<AmagiHeaders['get']>().returns.toEqualTypeOf<string | undefined>()
    expectTypeOf<AmagiHeaders['clone']>().returns.toEqualTypeOf<AmagiHeaders>()
  })
})

describe('contracts/endpoint', () => {
  const withParams = defineEndpoint({
    name: 'douyin.typeProbeWithParams',
    route: '/__type_probe_with_params',
    params: zod.object({ aweme_id: zod.string().min(1), number: zod.coerce.number().int().default(10) }),
    build: (p) => ({ method: 'GET', url: `https://example.com/?id=${p.aweme_id}&n=${p.number}` }),
    response: type<{ ok: true }>()
  })

  const computeOnly = defineEndpoint({
    name: 'bilibili.typeProbeCompute',
    route: '/__type_probe_compute',
    params: zod.object({ bvid: zod.string() }),
    compute: (p) => ({ aid: p.bvid.length })
  })

  it('TParams 从 params 推导：build 的形参是校验后的类型', () => {
    expectTypeOf<ParsedOf<typeof withParams>>().toEqualTypeOf<{ aweme_id: string; number: number }>()
    expectTypeOf(withParams.build).parameter(0).toEqualTypeOf<{ aweme_id: string; number: number }>()
  })

  it('InputOf 是 coerce 之前调用方能传的形状：number 可省且可传字符串', () => {
    expectTypeOf<InputOf<typeof withParams>['aweme_id']>().toEqualTypeOf<string>()
    expectTypeOf<InputOf<typeof withParams>>().toExtend<{ number?: unknown }>()
    expectTypeOf<{ aweme_id: string }>().toExtend<InputOf<typeof withParams>>()
  })

  it('TData 由 response 令牌推导', () => {
    expectTypeOf<DataOf<typeof withParams>>().toEqualTypeOf<{ ok: true }>()
  })

  it('没有 response 时 TData 由 compute 的返回类型推导', () => {
    expectTypeOf<DataOf<typeof computeOnly>>().toEqualTypeOf<{ aid: number }>()
  })

  it('name 必须是 <platform>.<name> 形状', () => {
    expectTypeOf<EndpointName>().toEqualTypeOf<`${Platform}.${string}`>()
    defineEndpoint({
      // @ts-expect-error 'weibo' 不是受支持的平台，端点全名前缀非法
      name: 'weibo.nope',
      route: '/__nope',
      params: zod.object({})
    })
  })

  it('response 与 normalize 的返回类型不一致时报错', () => {
    defineEndpoint({
      name: 'douyin.typeProbeConflict',
      route: '/__type_probe_conflict',
      params: zod.object({}),
      normalize: () => ({ a: 1 }),
      // @ts-expect-error response 声明的 { b: string } 与 normalize 推出的 { a: number } 冲突
      response: type<{ b: string }>()
    })
  })

  it('具体端点可以赋值给 AnyEndpointDef 与 Registry', () => {
    expectTypeOf(withParams).toExtend<AnyEndpointDef>()
    expectTypeOf({ withParams, computeOnly }).toExtend<Registry>()
  })

  it('EndpointCtx.send 由 transport 注入，返回 RawResponse', () => {
    expectTypeOf<EndpointCtx['send']>().returns.resolves.toEqualTypeOf<RawResponse>()
    expectTypeOf<EndpointCtx['requestConfig']>().toEqualTypeOf<RequestConfig>()
  })

  it('doc 是可选槽位：不写也能声明端点（59 个端点一个不改也能编译）', () => {
    expectTypeOf<AnyEndpointDef['doc']>().toEqualTypeOf<EndpointDoc | undefined>()
    // withParams 与 computeOnly 都没写 doc，仍然是合法声明
    expectTypeOf(withParams.doc).toEqualTypeOf<EndpointDoc | undefined>()
  })

  it('EndpointDoc 只有 summary 必填', () => {
    expectTypeOf<EndpointDoc['summary']>().toEqualTypeOf<string>()
    expectTypeOf<Required<Omit<EndpointDoc, 'summary'>>>().toEqualTypeOf<Omit<Required<EndpointDoc>, 'summary'>>()
    expectTypeOf<keyof EndpointDoc>().toEqualTypeOf<'summary' | 'description' | 'deprecated' | 'externalDocs'>()
    defineEndpoint({
      name: 'douyin.typeProbeDoc',
      route: '/__type_probe_doc',
      params: zod.object({}),
      // @ts-expect-error summary 是必填项，只写 description 不合法
      doc: { description: '缺 summary' }
    })
  })

  it('tags 不进声明（平台即 tag，由生成器从 name 派生）', () => {
    defineEndpoint({
      name: 'douyin.typeProbeDocTags',
      route: '/__type_probe_doc_tags',
      params: zod.object({}),
      // @ts-expect-error 声明里没有 tags 槽位，同一个事实不写两遍
      doc: { summary: '探针', tags: ['douyin'] }
    })
  })
})
