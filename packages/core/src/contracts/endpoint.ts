import type zod from 'zod'

import type { AmagiErrorCode, Judge } from './error'
import type { TraceReason } from './meta'
import type { Platform } from './platform'
import type { RawResponse, RequestConfig, RequestSpec } from './request'

/**
 * 端点声明契约。
 *
 * v7 的核心：**一个端点一份声明，其余全部派生。** 参数类型、运行时校验、
 * HTTP 路由、fetcher 方法、bound fetcher、方法名映射、文档与测试清单
 * 全部从这份声明推出来，不再散在 11–15 个文件里靠人工同步
 * （v6 实测已经漂移：`userFavoriteList` 不在 `api-spec.ts`、
 * B站 comments 的 5 个参数被 zod 悄悄吃掉）。
 *
 * `contracts/` 是零依赖叶子层：本文件只 type-import 外部包 `zod` 与同目录契约。
 * 端点的钩子需要「发请求」的能力，但 contracts 不能反向依赖 transport，
 * 所以 {@link EndpointCtx} 只声明 `send` 的**形状**，由 transport 去实现。
 */

/**
 * 只携带类型、不携带值的令牌。
 *
 * 用来把响应类型写进声明而不产生任何运行时开销：
 * `response: type<DouyinVideoWork>()`。
 */
export interface TypeToken<T> {
  /** 幻影字段，运行时永远是 `undefined`，只为让 TS 能推出 `T` */
  readonly __type?: T
}

/**
 * 造一个响应类型令牌
 * @returns 携带 `T` 的令牌，运行时是个空对象
 */
export const type = <T>(): TypeToken<T> => ({})

/** 端点全名，形如 `'douyin.videoWork'` */
export type EndpointName = `${Platform}.${string}`

/**
 * 端点钩子拿到的执行上下文。
 *
 * `send` 是依赖倒置点：contracts 只声明「能发一次请求并拿到 {@link RawResponse}」
 * 这个形状，transport 提供实现。这样 `prepare` 里换 guest cookie、取 wbi key
 * 都必须走 transport，用户配的 proxy / agent / 超时才对它生效
 * —— v6 的 `wbi.ts` 直连 axios，正是 A5。
 */
export interface EndpointCtx {
  /** 发起调用的 client 实例 id；静态 fetcher 用 `'static'` */
  clientId: string
  /** 平台 */
  platform: Platform
  /** 本次调用使用的 cookie */
  cookie: string
  /** 本次调用使用的 User-Agent */
  userAgent: string
  /** 调用方传入的请求配置 */
  requestConfig: RequestConfig
  /**
   * 发一次底层请求。由 transport 注入
   * @param spec - 请求描述
   * @param reason - 这次请求的来源，决定它在 trace 里的 `reason`
   * @returns 原始响应
   */
  send: (spec: RequestSpec, reason?: TraceReason) => Promise<RawResponse>
}

/** 自定义签名器：拿到请求描述与上下文，返回签好名的请求描述 */
export type SignFn = (spec: RequestSpec, ctx: EndpointCtx) => RequestSpec | Promise<RequestSpec>

/**
 * 签名声明。
 *
 * - 字符串：平台签名器表里的名字（如 `'a_bogus'` / `'xhs-post'`）。
 *   平台可以再包一层 `defineEndpoint` 把它收窄成自己的签名器名联合。
 * - `false`：显式声明这个端点不签名（抖音搜索、表情包接口）。
 * - 函数：一次性的自定义签名。
 */
export type SignDecl = string | false | SignFn

/** 多请求聚合 / 分段并发时，部分失败怎么处理 */
export type PartialPolicy =
  /** 缺失的部分留空，整体仍算成功（v6 快手 userProfile 与抖音弹幕的隐式行为） */
  | 'tolerate'
  /** 任一部分失败即整体失败 */
  | 'fail'

/**
 * 声明式翻页。
 *
 * 翻页在 `send` 的**外层**循环：每一页都完整走
 * `build → sign → send → decode → judge`，所以每页都会重新签名（v6 是对的，保持）。
 */
export interface PaginateDef<TParams> {
  /** 单页最多能取多少条，用来把目标条数切成多次请求 */
  maxPageSize: number
  /** 目标条数取自哪个参数，默认 `'number'`。该参数缺失时只取一页 */
  limitParam?: keyof TParams & string
  /**
   * 从一页响应里取出本页条目
   * @param page - 这一页 decode 之后的值
   * @returns 本页条目数组；空数组表示到底了
   */
  items: (page: unknown) => unknown[]
  /**
   * 从一页响应里取下一页游标
   * @param page - 这一页 decode 之后的值
   * @returns 游标；`undefined` / `null` 表示没有下一页
   */
  nextCursor: (page: unknown) => string | number | undefined | null
  /**
   * 平台显式的「还有更多」标记，返回 `false` 时提前停止
   * @param page - 这一页 decode 之后的值
   * @returns 是否还有下一页
   */
  hasMore?: (page: unknown) => boolean
  /**
   * 把游标与本次要取的条数写进参数，产出下一次请求用的参数
   * @param params - 校验后的参数
   * @param cursor - 上一页给出的游标
   * @param pageSize - 本次请求应当取的条数
   * @returns 下一次请求用的参数
   */
  nextParams: (params: TParams, cursor: string | number, pageSize: number) => TParams
  /**
   * 把所有页合并成最终交给 `normalize` 的值。缺省时给出 `{ pages, items }`
   * @param pages - 每页 decode 之后的值，按请求顺序
   * @param items - 按 `limitParam` 截断后的累积条目
   * @returns 合并结果
   */
  merge?: (pages: unknown[], items: unknown[]) => unknown
}

/**
 * 一个端点的完整声明。
 *
 * `TParams` 是参数 **schema** 类型（不是推导后的参数类型），这样
 * `zod.input<TParams>`（调用方能传的形状，含 coerce 前的字符串）与
 * `zod.infer<TParams>`（校验后的形状）都还能取到。
 *
 * 每个可选槽位对应一种非常规端点形态：
 * `compute` → 纯本地计算不发请求；`decode` → protobuf / multi-JSON / HTML；
 * `build` 返回数组 → 多请求聚合与分段并发；`prepare` → 前置换凭证 / 取 key；
 * `paginate` → 声明式翻页；`judge` → 平台判定；`normalize` → 裁剪整形。
 */
export interface EndpointDef<TParams extends zod.ZodType, TData> {
  /** 端点全名，形如 `'douyin.videoWork'` */
  name: EndpointName
  /** HTTP 路由路径。**同平台内必须唯一**，重复则 `createRoutes` 启动即抛错 */
  route: string
  /** 参数 schema。参数类型由它推导，不再手写第二遍 */
  params: TParams
  /**
   * 前置步骤：换 guest cookie、取 wbi key、bootstrap 指纹。
   * 产物并入 ctx，产生的请求以 `reason: 'prepare'` 进 trace
   * @param ctx - 当前上下文
   * @returns 要并入 ctx 的字段
   */
  prepare?: (ctx: EndpointCtx) => Promise<Partial<EndpointCtx>>
  /**
   * 构造请求。返回数组即表示多请求聚合 / 分段并发
   * @param params - 校验后的参数
   * @param ctx - 当前上下文
   * @returns 单个或多个请求描述
   */
  build?: (params: zod.infer<TParams>, ctx: EndpointCtx) => RequestSpec | RequestSpec[]
  /** 签名声明：签名器名字、`false`（显式不签名）或一次性函数 */
  sign?: SignDecl
  /**
   * 解码响应体。缺省按 JSON 处理；protobuf / multi-JSON / HTML 在这里落地。
   * 抛错时管线映射为 `kind: 'parse'` / `code: 'DECODE_FAILED'`
   * @param raw - 原始响应体
   * @param res - 完整的原始响应
   * @returns 解码后的值
   */
  decode?: (raw: unknown, res: RawResponse) => unknown
  /** 声明式翻页 */
  paginate?: PaginateDef<zod.infer<TParams>>
  /** 多请求聚合 / 分段并发时的部分失败语义，默认 `'fail'` */
  partial?: PartialPolicy
  /** 平台响应判定。缺省用所在平台的默认 judge */
  judge?: Judge
  /**
   * 裁剪整形为最终 `data`
   * @param decoded - decode（与 paginate 合并）之后的值
   * @param params - 校验后的参数
   * @returns 最终返回给调用方的数据
   */
  normalize?: (decoded: unknown, params: zod.infer<TParams>) => TData
  /**
   * 纯本地计算，不发请求。声明了它就跳过 prepare / build / sign / send
   * @param params - 校验后的参数
   * @returns 最终返回给调用方的数据
   */
  compute?: (params: zod.infer<TParams>) => TData
  /** 响应类型令牌，`type<Foo>()`。`TData` 主要由它推导 */
  response?: TypeToken<TData>
  /** 覆盖默认重试策略：命中这些错误码时重试（如 B站 `-412` 的 `RISK_CONTROL`） */
  retryOn?: AmagiErrorCode[]
}

/**
 * 声明一个端点。
 *
 * 运行时就是恒等函数，全部价值在类型推导：`TParams` 从 `params` 推出，
 * `TData` 从 `response` / `normalize` / `compute` 推出。
 * @param def - 端点声明
 * @returns 原样返回 `def`，但带上推导好的具体类型
 */
export const defineEndpoint = <TParams extends zod.ZodType, TData = unknown>(
  def: EndpointDef<TParams, TData>
): EndpointDef<TParams, TData> => def

/**
 * 任意端点声明。
 *
 * `TParams` 出现在 `build` / `normalize` / `compute` 的**形参**位置（逆变），
 * 所以这里必须用 `any` 才能让具体端点赋值进来 —— 换成 `unknown`
 * 会让 `EndpointDef<具体 schema, T>` 不可赋值给它。
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyEndpointDef = EndpointDef<any, any>

/** 一个平台的端点注册表：端点短名 → 声明 */
export type Registry = Record<string, AnyEndpointDef>

/** 取端点的参数 schema 类型 */
export type ParamsSchemaOf<D> = D extends EndpointDef<infer P, unknown> ? P : never

/** 取端点「调用方能传的参数」类型（coerce 之前，对应 `zod.input`） */
export type InputOf<D> = D extends EndpointDef<infer P, unknown> ? zod.input<P> : never

/** 取端点「校验后的参数」类型（对应 `zod.infer`） */
export type ParsedOf<D> = D extends EndpointDef<infer P, unknown> ? zod.infer<P> : never

/** 取端点的响应数据类型 */
// oxlint-disable-next-line typescript/no-explicit-any
export type DataOf<D> = D extends EndpointDef<any, infer T> ? T : never
