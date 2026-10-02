import type { AnyEndpointDef, DataOf, EndpointCtx, EndpointDoc, EndpointName, ParsedOf, Registry } from 'amagi/contracts/endpoint'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { AmagiError, AmagiErrorCode, ErrorKind, Judge, JudgeVerdict, ValidationIssue } from 'amagi/contracts/error'
import type { AmagiMeta, RequestTrace, TraceReason } from 'amagi/contracts/meta'
import type { Platform } from 'amagi/contracts/platform'
import type { AmagiHeaders, HttpMethod, RawResponse, RequestConfig, RequestSpec } from 'amagi/contracts/request'
import type { AmagiFailure, AmagiResult, AmagiSuccess } from 'amagi/contracts/result'
import type { BoundBilibiliFetcher, BoundDouyinFetcher } from 'amagi/model/fetchers'
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
    expectTypeOf<keyof AmagiMeta>().toEqualTypeOf<
      'requestId' | 'clientId' | 'platform' | 'endpoint' | 'durationMs' | 'attempts' | 'trace'
    >()
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
  it('成功分支只多一个 `error?: undefined` 占位键（9.2 放宽硬约束 2）', () => {
    expectTypeOf<keyof AmagiSuccess<number>>().toEqualTypeOf<'success' | 'data' | 'error' | 'message' | 'meta'>()
    // 声明了 error，但类型只能是 undefined —— 运行时该键不存在，读出来就是 undefined
    expectTypeOf<AmagiSuccess<number>>().toHaveProperty('error').toEqualTypeOf<undefined>()
    // 占位键是可选的：造成功信封时不写 error 仍然合法（runtime/execute.ts 就不写）
    expectTypeOf<{ success: true; data: number; message: string; meta: AmagiMeta }>().toExtend<AmagiSuccess<number>>()
  })

  it('失败分支只多一个 `data?: undefined` 占位键', () => {
    expectTypeOf<keyof AmagiFailure>().toEqualTypeOf<'success' | 'error' | 'data' | 'message' | 'meta'>()
    expectTypeOf<AmagiFailure>().toHaveProperty('data').toEqualTypeOf<undefined>()
    expectTypeOf<{ success: false; error: AmagiError; message: string; meta: AmagiMeta }>().toExtend<AmagiFailure>()
  })

  it('对侧键只能是 undefined：塞真值是编译错误（v6 的说谎不许搬进 v7）', () => {
    const meta = {} as AmagiMeta
    const err = {} as AmagiError
    // @ts-expect-error 成功信封的 error 占位键不许塞真的 AmagiError
    const _lyingSuccess: AmagiSuccess<number> = { success: true, data: 1, error: err, message: 'x', meta }
    // @ts-expect-error 失败信封的 data 占位键不许塞真值
    const _lyingFailure: AmagiFailure = { success: false, error: err, data: 1, message: 'x', meta }
  })

  it('未收窄也能读 data / error（修 BUG-2 的直接后果）', () => {
    const r = {} as AmagiResult<{ id: string }>
    expectTypeOf(r.data).toEqualTypeOf<{ id: string } | undefined>()
    expectTypeOf(r.error).toEqualTypeOf<AmagiError | undefined>()
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
    expectTypeOf<keyof AmagiResult<number>>().toEqualTypeOf<'success' | 'data' | 'error' | 'message' | 'meta'>()
    // @ts-expect-error 顶层没有 code，HTTP 码在 error.http.status、平台码在 error.platform.code
    expectTypeOf<AmagiResult<number>>().toHaveProperty('code')
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
    // 与真实端点一致：默认值写 `.default().optional()`（裸 default 在 ParsedOf 里是必填）
    params: zod.object({ aweme_id: zod.string().min(1), number: zod.coerce.number().int().default(10).optional() }),
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
    expectTypeOf<ParsedOf<typeof withParams>>().toEqualTypeOf<{ aweme_id: string; number?: number | undefined }>()
    expectTypeOf(withParams.build).parameter(0).toEqualTypeOf<{ aweme_id: string; number?: number | undefined }>()
  })

  it('fetcher 方法签名取校验后的形状（ParsedOf）：coerce 数字是 number 而非 unknown', () => {
    // 回归钉：调用方签名曾按 zod.input 取，coerce 参数在悬停里显示 unknown，
    // 与文档标注的 number 对不上（2026-10 收口，InputOf 因此删除）
    type CommentsOptions = Parameters<BoundBilibiliFetcher['fetchComments']>[0]
    expectTypeOf<CommentsOptions['number']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<CommentsOptions['mode']>().toEqualTypeOf<number | undefined>()
    // @ts-expect-error 必填的 type 不能省
    const missingType: CommentsOptions = { oid: '170001' }
    expectTypeOf(missingType).toEqualTypeOf<CommentsOptions>()
  })

  it('internalParam：内部参数不进调用方签名，公开字段原样', () => {
    // 回归钉：品牌只在类型层可见（shape 上筛键、PublicParamsOf 挖掉）。运行时行为
    // —— zod 校验照常、nextParams 照常写入游标 —— 由端点测试与翻页测试管。
    type CommentsOptions = Parameters<BoundBilibiliFetcher['fetchComments']>[0]
    // Omit 是恒等的 → pagination_str 已不在公开签名里；若有人把标记弄丢，这条会红
    expectTypeOf<Omit<CommentsOptions, 'pagination_str'>>().toEqualTypeOf<CommentsOptions>()
    expectTypeOf<CommentsOptions['oid']>().toEqualTypeOf<string>()
    expectTypeOf<CommentsOptions['type']>().toEqualTypeOf<number>()

    type UserVideoOptions = Parameters<BoundDouyinFetcher['fetchUserVideoList']>[0]
    expectTypeOf<Omit<UserVideoOptions, 'max_cursor'>>().toEqualTypeOf<UserVideoOptions>()
    expectTypeOf<UserVideoOptions['sec_uid']>().toEqualTypeOf<string>()
    expectTypeOf<UserVideoOptions['number']>().toEqualTypeOf<number | undefined>()
  })

  it('internalParam：内部参数在对象字面量里传入会被拒', () => {
    // excess property check：公开类型上没有这个键，字面量多传即编译错
    type CommentsOptions = Parameters<BoundBilibiliFetcher['fetchComments']>[0]
    // @ts-expect-error pagination_str 是内部参数（翻页游标由端点接管）
    const leaked: CommentsOptions = { oid: '170001', type: 1, pagination_str: 'x' }
    expectTypeOf(leaked).toEqualTypeOf<CommentsOptions>()

    type UserVideoOptions = Parameters<BoundDouyinFetcher['fetchUserVideoList']>[0]
    // @ts-expect-error max_cursor 同理
    const leakedCursor: UserVideoOptions = { sec_uid: 'MS4wLjABAAAxxxxx', max_cursor: '0' }
    expectTypeOf(leakedCursor).toEqualTypeOf<UserVideoOptions>()
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

  it('response 与 normalize 的返回类型不一致时报错，且错误落在 normalize 上', () => {
    defineEndpoint({
      name: 'douyin.typeProbeConflict',
      route: '/__type_probe_conflict',
      params: zod.object({}),
      // @ts-expect-error normalize 返回 { a: number }，与 response 声明的 { b: string } 不符
      normalize: () => ({ a: 1 }),
      response: type<{ b: string }>()
    })
  })

  it('normalize 不再参与 TData 推导 —— 类型只由 response 令牌说了算', () => {
    // 这条锁的是「12 处双写」被删掉的前提：`normalize` 的返回类型曾经会**覆盖**
    // response 令牌，于是端点的 data 类型悄悄退化成钩子的宽松推导，绕法是在钩子上
    // 重复标注同一个映射条目。现在 `normalize` 的返回类型包了 `NoInfer<>`，
    // 只被检查、不参与推导，所以不标注也不会变宽。
    const withoutAnnotation = defineEndpoint({
      name: 'douyin.typeProbeNoInfer',
      route: '/__type_probe_noinfer',
      params: zod.object({}),
      // 刻意不标注返回类型，且返回值比 response 声明的更宽松（多一个键）
      normalize: () => ({ b: 'x', extra: 1 }),
      response: type<{ b: string }>()
    })
    expectTypeOf<DataOf<typeof withoutAnnotation>>().toEqualTypeOf<{ b: string }>()
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
