import type zod from 'zod'

import type { AmagiErrorCode, Judge } from './error'
import type { TraceReason } from './meta'
import type { Platform } from './platform'
import type { RawResponse, RequestConfig, RequestSpec } from './request'

/**
 * 端点声明契约。
 *
 * 核心：**一个端点一份声明，其余全部派生。** 参数类型、运行时校验、
 * HTTP 路由、fetcher 方法、bound fetcher、方法名映射、文档与测试清单
 * 全部从这份声明推出来，不再散在十几个文件里靠人工同步。
 *
 * `contracts/` 是零依赖叶子层：本文件只 type-import 外部包 `zod` 与同目录契约。
 * 端点的钩子需要「发请求」的能力，但 contracts 不能反向依赖 transport，
 * 所以 {@link EndpointCtx} 只声明 `send` 的**形状**，由 transport 去实现。
 */

/**
 * 只携带类型、不携带值的令牌。
 *
 * 用来把响应类型写进声明而不产生任何运行时开销：
 * `response: type<DouyinReturnTypeMap['videoWork']>()`。
 *
 * `T` 取平台返回数据的实测快照类型（`XxxReturnTypeMap` 的键与端点短名
 * 一一对应），快照自带的索引签名让「平台加字段」不算 breaking。
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
 * 端点参数上的语义视图开关。
 *
 * 当前只接受 `'raw'`（默认 —— 数据恒为平台原始载荷，无归一化层）。将来扩展为
 * `'raw' | 'canonical'` 时配合 {@link EndpointDef.toCanonical} 提供跨平台统一视图；
 * 位置先留好，避免以后给参数加字段时变成破坏性变更。
 */
export type ViewMode = 'raw'

/**
 * 端点钩子拿到的执行上下文。
 *
 * `send` 是依赖倒置点：contracts 只声明「能发一次请求并拿到 {@link RawResponse}」
 * 这个形状，transport 提供实现。这样 `prepare` 里换 guest cookie、取 wbi key
 * 都必须走 transport，用户配的 proxy / agent / 超时才对它生效。
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
   * @param requestConfig - 单次调用的请求配置（合并进本次请求）。缺省时
   *   由 execute 把 ctx.requestConfig 当作默认值补上 —— 管线内任何内部请求
   *   （prepare 换 guest cookie、取 wbi key）都与主请求用同一份配置
   * @returns 原始响应
   */
  send: (spec: RequestSpec, reason?: TraceReason, requestConfig?: RequestConfig) => Promise<RawResponse>
}

/** 自定义签名器：拿到请求描述与上下文，返回签好名的请求描述 */
export type SignFn = (spec: RequestSpec, ctx: EndpointCtx) => RequestSpec | Promise<RequestSpec>

/**
 * 签名阶段：决定一个端点内多个反爬参数（{@link SignStep}）的执行先后。
 *
 * 端点作者只声明「要哪些参数」，不用手排顺序 —— runtime 按本枚举的固定次序排好再执行。
 * 抖音那条链是活例：`webid → msToken → a_bogus/x_bogus → secsdk`，颠倒任意一步签名就
 * 不成立，所以把「顺序」这个不变量收进机制层，而不是交给每个端点声明处去保证。
 *
 * - `prepare`：签名前的补参（如按 cookie 补 webid）。
 * - `token`：本地随机令牌（如抖音 `msToken`），必须先于主签名进 URL。
 * - `sign`：主签名（`a_bogus` / `x_bogus` / `wbi` / `x-s` / `hxfalcon` 等）。
 * - `finalize`：收尾（如抖音 `secsdk` 重写整条 URL、小红书追加 `x-b3-traceid`）。
 */
export type SignPhase = 'prepare' | 'token' | 'sign' | 'finalize'

/**
 * 一个原子反爬参数。
 *
 * `apply` 复用 {@link SignFn}：「这个参数写进 query / header / 还是重写整条 URL」是它的
 * 内部实现，端点作者不感知。`phase` 是唯一的顺序语义，同 phase 内按数组出现顺序执行。
 *
 * 端点用 `sign: [msToken(184), aBogus(), secsdk()]` 直接列出要哪些参数；增删数组元素
 * 即可，不必为「要参数1不要参数2」另注册签名器名。详见仓库根 `SIGN_REFACTOR_TODO.md`。
 */
export interface SignStep {
  /** 执行阶段，决定与同端点其他步骤的先后 */
  phase: SignPhase
  /** 把这个反爬参数盖到请求上 */
  apply: SignFn
}

/**
 * 签名声明。
 *
 * - {@link SignStep} / `SignStep[]`：**推荐**。原子反爬参数清单，runtime 按 {@link SignPhase}
 *   排序后依次 `apply`；单个步骤可省数组（`sign: hxfalcon()`）。
 * - 字符串：平台签名器表里的名字（如 `'a_bogus'` / `'xhs-post'`）。默认宽 `string`，
 *   平台可以再包一层 `defineEndpoint`（传 `TSign` 为自己的签名器名联合）把它收窄。
 *   与 SignStep 清单渐进共存，全平台迁移完成后再定去留。
 * - `false`：显式声明这个端点不签名（抖音搜索、表情包接口）。
 * - 函数：一次性的自定义签名。
 */
export type SignDecl<TSign extends string = string> = TSign | false | SignFn | SignStep | SignStep[]

/** 多请求聚合 / 分段并发时，部分失败怎么处理 */
export type PartialPolicy =
  /** 缺失的部分留空，整体仍算成功 */
  | 'tolerate'
  /** 任一部分失败即整体失败 */
  | 'fail'

/**
 * 一页 / 一段的默认类型，取最终返回 `TData`（一页 / 一段与返回同形）。
 * `TData` 是 `unknown` / `any` / `never` 时退成 `Record<string, any>`（随便点，但挡住把它当函数调）。
 */
export type PageOf<TData> = [TData] extends [never] ? Record<string, any> : unknown extends TData ? Record<string, any> : TData

/**
 * 翻页跑完交给 `merge` 的值。`lastPage` 恒有值（空跑由 {@link PaginateOutcome} 单独承载），
 * 所以端点能直接 `...lastPage`。不保留每页完整体、只留累积条目，避免内存峰值。
 */
export interface PaginatedValue<TPage = unknown, TItem = unknown> {
  /** 最后一页 decode 之后的值 */
  lastPage: TPage
  /** 按目标条数截断后的累积条目 */
  items: TItem[]
}

/**
 * 翻页结果：`{ empty: true }`（一个请求都没发）或 `{ empty: false } & PaginatedValue`（发过、有页）。
 * 用判别联合而不是让 `lastPage` 可空，这样 merge 里 `lastPage` 恒有值。
 */
export type PaginateOutcome<TPage = unknown, TItem = unknown> = { empty: true } | ({ empty: false } & PaginatedValue<TPage, TItem>)

/**
 * 声明式翻页：一页页往后翻，每页都走 ③build→④sign→⑤send→⑥decode→⑦judge，最后 `merge` 收尾。
 * 页类型 `TPage` 缺省取 `PageOf<TData>`（一页与返回同形），所以 `items` / `hasMore` / `nextParams`
 * 自动拿到 `response` 的形状、不必断言。详细机制见开发文档「翻页与会话」。
 */
export interface PaginateDef<TParams, TData = unknown, TPage = unknown, TItem = unknown> {
  /** 单页最多取多少条，用来把目标条数切成几次请求 */
  maxPageSize: number
  /** 目标条数取自哪个参数，默认 `'number'`；该参数为 0 时一个请求都不发 */
  limitParam?: keyof TParams & string
  /** 每页条数写回哪个参数，默认与 `limitParam` 相同 */
  countParam?: keyof TParams & string
  /** 页形状与最终返回不同形时才写（覆盖 `TPage`）；缺省取 `PageOf<TData>` */
  page?: TypeToken<TPage>
  /** 从一页里取出本页条目（`page` 已是 `TPage`）；返回空数组表示到底了 */
  items: (page: TPage) => TItem[]
  /** 还有没有下一页；返回 `false` 立刻停 */
  hasMore: (page: TPage) => boolean
  /** 根据这一页产出下一次请求的参数（游标怎么带端点自己定） */
  nextParams: (params: TParams, page: TPage) => TParams
  /** 把跨页累积的条目收成最终 data（可选）：`value.lastPage` 恒有值、`value.items` 是累积条目 */
  merge?: (value: PaginatedValue<TPage, TItem>, params: TParams) => NoInfer<TData>
}

/**
 * 「同构分段并发」跑完交给 {@link EndpointDef.aggregate} 的值（与 {@link PaginatedValue} 一个套路）。
 * `head` 恒有值（全失败时 execute 不进 aggregate），所以端点能直接 `...head`。段类型 `TPage`
 * 缺省取 `PageOf<TData>`（段与返回同形），与 paginate 的 page 共用。详见「端点注册表」。
 */
export interface AggregatedValue<TPage = unknown> {
  /** 各段 decode 之后的值，顺序同 build 的分段；失败段（`partial: 'tolerate'`）为 undefined */
  parts: ReadonlyArray<TPage | undefined>
  /** 第一段成功段（恒有值）：元信息从它取，可直接 `...head` */
  head: TPage
}

/**
 * 端点的文档元数据 —— OpenAPI 规范里「面向人的那部分」的唯一出处。
 *
 * 规范从注册表派生，所以描述文案也只能长在声明里：写进文档站的 Markdown
 * 就成了「手写第二遍」，必然漂移。
 *
 * `tags` 故意不在这里：**平台就是 tag**，由生成器从 {@link EndpointDef.name}
 * 的平台段派生，同一个事实不写两遍。
 */
export interface EndpointDoc {
  /**
   * OpenAPI 的 `summary`：一句话说清这个端点返回什么。
   *
   * 写法约定：**中文名词短语、不带句号、不超过 40 字**，例如 `'视频作品详细信息'`。
   * 它会出现在 API 参考的端点卡片标题与侧边栏条目上，写成整句或超长都会被截断。
   */
  summary: string
  /**
   * OpenAPI 的 `description`：一句话讲不完的部分 —— 参数之间的约束、平台侧限制、
   * 与相近端点的区别。支持 Markdown、可多行。没有要补充的就别写。
   */
  description?: string
  /** 标为废弃：生成的 operation 带 `deprecated: true`，文档站会画删除线 */
  deprecated?: boolean
  /** 指向平台官方文档（或仓库内的说明页） */
  externalDocs?: {
    /** 文档地址 */
    url: string
    /** 链接文案，缺省由文档站决定 */
    description?: string
  }
}

/**
 * 一个端点的完整声明。**声明一份，其余（方法 / 路由 / 类型 / 文档）全部派生。**
 *
 * 下面的字段大多对应「调一次接口」的流程步骤，注释里用 ①~⑧ 标出顺序：
 * ① 校验参数 → ② prepare → ③ build → ④ sign → ⑤ 发请求 → ⑥ decode → ⑦ judge → ⑧ 整形。
 * 完整字段清单、派生关系与设计取舍见开发文档「端点注册表」与「契约与信封」。
 */
export interface EndpointDef<TParams extends zod.ZodType, TData, TSign extends string = string, TPage = PageOf<TData>, TItem = unknown> {
  /** 端点全名，形如 `'douyin.videoWork'`（声明信息） */
  name: EndpointName
  /** HTTP 路由路径，同平台内必须唯一（声明信息） */
  route: string
  /** ① 参数 schema（zod）：校验、类型推导、文档参数表都从它派生 */
  params: TParams
  /** 文档元数据：`summary` 必填（API 参考的标题来源），`description` 可选 */
  doc?: EndpointDoc
  /** ② 发请求前的准备（可选）：换游客 cookie、取密钥等；返回的字段并入上下文 */
  prepare?: (ctx: EndpointCtx) => Promise<Partial<EndpointCtx>>
  /** ③ 拼请求。返回数组 = 多个请求并发（分段并发 / 多请求聚合） */
  build?: (params: zod.infer<TParams>, ctx: EndpointCtx) => RequestSpec | RequestSpec[]
  /** ④ 签名（可选）：{@link SignStep} 清单（推荐，可直接列出要哪些反爬参数）/ 签名器名字 / `false`（不签）/ 一次性函数 */
  sign?: SignDecl<TSign>
  /** ⑥ 解码响应（可选，⑤ 是发请求）：默认按 JSON；protobuf / 多段 JSON / HTML 在这里处理 */
  decode?: (raw: unknown, res: RawResponse) => unknown
  /** 翻页（可选）：把 ③~⑦ 包成一页页翻的循环，详见「端点注册表」 */
  paginate?: PaginateDef<zod.infer<TParams>, TData, TPage, TItem>
  /** 多个请求时的部分失败策略：`'tolerate'`（缺的留空）/ `'fail'`（默认，一个失败即整体失败） */
  partial?: PartialPolicy
  /** ⑦ 判定成功 / 失败（可选）：缺省用所在平台的默认判定 */
  judge?: Judge
  /**
   * ⑧ 把响应整理成最终 data（可选）。`decoded` 是解码后的响应、什么形状都可能，所以类型是 unknown。
   * 分段并发改用 {@link EndpointDef.aggregate}、翻页改用 {@link PaginateDef.merge}（都带类型、更好写）。
   * 为什么是 unknown、`NoInfer` 的作用见「契约与信封」。
   */
  normalize?: (decoded: unknown, params: zod.infer<TParams>) => NoInfer<TData>
  /**
   * ⑧ 整理「同构分段并发」结果（可选，`normalize` 的带类型版本）：`value.parts` 是各段结果、
   * `value.head` 是第一段成功段（恒有值，可直接 `...head`）。声明了它就别再写 `normalize`（会被忽略）。
   * 只适用各段同形；异构聚合（快手 `userProfile`）仍用 `normalize`。详见「端点注册表」。
   */
  aggregate?: (value: AggregatedValue<TPage>, params: zod.infer<TParams>) => NoInfer<TData>
  /** 纯本地计算、不发请求（可选）：声明了它就跳过 ②~⑧，直接算出 data（如 AV/BV 互转） */
  compute?: (params: zod.infer<TParams>) => TData
  /** 响应类型令牌 `type<T>()`：**data 的类型只从这里来**。详见「契约与信封」 */
  response?: TypeToken<TData>
  /** 命中这些错误码时端点级重试（如 B站 `-412`）。详见「端点注册表」 */
  retryOn?: AmagiErrorCode[]
  /** 重试时重新 build + 重新签名（而非原样重放）；抖音 Argus 需要它。详见「端点注册表」 */
  retryFresh?: boolean
  /** 预留槽位，当前恒为 `undefined`（跨平台统一视图，将来才用） */
  toCanonical?: undefined
}

/**
 * 整形钩子互斥：一个端点最多一个收尾钩子。同时写 `aggregate` 与 `normalize` 时
 * execute 只认 `aggregate`、`normalize` 被静默忽略，所以在声明处就用类型挡住。
 * 交叉进 `defineXxxEndpoint` 的入参后，两个都写会编译报错（`test/contracts` 那道门给中文兜底）。
 */
export type ExclusiveShaping = { aggregate?: undefined } | { normalize?: undefined }

/**
 * 声明一个端点。运行时是恒等函数（原样返回 `def`），全部价值在类型推导：
 * `TParams` 从 `params` 推、`TData` 从 `response` / `compute` 推。
 * 平台一般用各自的 `defineXxxEndpoint`（把签名器名收窄），不直接用这个。
 * @param def - 端点声明
 */
export const defineEndpoint = <
  TParams extends zod.ZodType,
  TData = unknown,
  TSign extends string = string,
  TPage = PageOf<TData>,
  TItem = unknown
>(
  def: EndpointDef<TParams, TData, TSign, TPage, TItem> & ExclusiveShaping
): EndpointDef<TParams, TData, TSign, TPage, TItem> => def

/**
 * 任意端点声明。
 *
 * `TParams` 出现在 `build` / `normalize` / `compute` 的形参位置，`TPage` / `TItem` 出现在
 * `paginate.items` 等形参位置（都逆变），所以这里必须用 `any` 才能让具体端点赋值进来 ——
 * 换成 `unknown` 会让 `EndpointDef<具体 schema, …>` 不可赋值给它。
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyEndpointDef = EndpointDef<any, any, any, any, any>

/** 一个平台的端点注册表：端点短名 → 声明 */
export type Registry = Record<string, AnyEndpointDef>

/** 取端点的参数 schema 类型 */
export type ParamsSchemaOf<D> = D extends EndpointDef<infer P, unknown, any, any, any> ? P : never

/** 取端点「调用方能传的参数」类型（coerce 之前，对应 `zod.input`） */
export type InputOf<D> = D extends EndpointDef<infer P, unknown, any, any, any> ? zod.input<P> : never

/** 取端点「校验后的参数」类型（对应 `zod.infer`） */
export type ParsedOf<D> = D extends EndpointDef<infer P, unknown, any, any, any> ? zod.infer<P> : never

/** 取端点的响应数据类型 */
export type DataOf<D> = D extends EndpointDef<any, infer T, any, any, any> ? T : never
