# 方案 A：声明式端点注册表 + 执行管线

> **推荐方案。** 唯一能把「加一个接口改 11–15 个文件」真正降到 1 个文件的设计。
> 前置阅读：[01-response-envelope.md](./01-response-envelope.md)

## 核心思路

v6 的问题不是分层不够，而是**同一件事被声明了太多遍**。一个端点的信息
（名字、参数、URL、签名、路由、返回类型、翻页方式）散在 11–15 个文件里，
彼此靠人工同步 —— 而实测已经漂移了（`userFavoriteList` 不在 `api-spec.ts`、
B站 comments 的 5 个参数被 zod 悄悄吃掉）。

方案 A 的做法：**一个端点一份声明，其余全部派生。**

```
声明（endpoints/videoWork.ts）
   ├─→ 参数类型           z.infer<typeof params>
   ├─→ 运行时校验         params.safeParse()
   ├─→ HTTP 路由          route 字段，唯一性编译期可查
   ├─→ fetcher 方法       registry 遍历生成
   ├─→ bound fetcher      Proxy 包一层，不再手写 19 个转发
   ├─→ 方法名映射         registry 的 key
   └─→ 文档与测试清单      registry 遍历生成
```

---

## 目录结构

```
packages/core/src/
  contracts/              零依赖叶子。任何模块都可以依赖它，它不依赖任何人
    result.ts             AmagiResult / AmagiSuccess / AmagiFailure
    error.ts              AmagiError / ErrorKind / AmagiErrorCode / judge 类型
    meta.ts               AmagiMeta / RequestTrace
    request.ts            RequestSpec / RequestConfig / Headers（大小写不敏感）
    cookie.ts             cookie 解析与序列化（唯一实现，修 A8）
    platform.ts           Platform 联合类型
    endpoint.ts           EndpointDef / defineEndpoint 的类型定义

  transport/              全仓唯一能发 HTTP 请求的地方
    client.ts             HttpClient：send(spec) -> RawResponse
    retry.ts              退避策略
    trace.ts              RequestTrace 收集

  platforms/
    douyin/
      api.ts              URL 构造（纯函数）
      sign/               签名算法（纯函数，原样搬迁）
      judge.ts            平台响应判定
      config.ts           默认 header 基线
      session/            扫码登录会话
      endpoints/
        videoWork.ts
        comments.ts
        ...               19 个文件
        index.ts          export const douyinRegistry = { videoWork, comments, ... }
    bilibili/ kuaishou/ xiaohongshu/   同构

  runtime/
    execute.ts            执行管线
    paginate.ts           声明式翻页
    events.ts             事件总线（实例级）

  client/
    createClient.ts       门面：createClient / fetcher / boundFetcher
    fetcher.ts            从 registry 生成 fetcher 对象

  server/
    routes.ts             从 registry 生成 Express 路由
    auth.ts               可选的 token 鉴权中间件
```

依赖方向严格单向：

```
contracts ← transport ← platforms ← runtime ← client ← server
```

`RequestConfig` 从 `server/index.ts`（v6 里 34 个文件值导入它，
而那个模块里 `new Chalk()` 并建 Express app）搬到 `contracts/request.ts`
—— 这一步就消掉了 36 个环里的大半。CI 加 `dpdm --exit-code circular:1` 钉死。

---

## 端点声明

```ts
export interface EndpointDef<TParams extends z.ZodTypeAny, TData> {
  /** 端点全名，'<platform>.<name>' */
  name: string
  /** HTTP 路由路径。同平台内唯一，重复则构建失败 */
  route: string
  /** 参数 schema。参数类型 = z.infer<TParams>，不再手写第二遍 */
  params: TParams
  /** 前置步骤：换 guest cookie、拿 wbi key、bootstrap 指纹 */
  prepare?: (ctx: Ctx) => Promise<Partial<Ctx>>
  /** 构造请求。返回单个或多个 RequestSpec */
  build?: (p: z.infer<TParams>, ctx: Ctx) => RequestSpec | RequestSpec[]
  /** 签名器名字，或自定义函数 */
  sign?: SignerName | ((spec: RequestSpec, ctx: Ctx) => RequestSpec)
  /** 解码：protobuf / multi-JSON / HTML，默认按 JSON */
  decode?: (raw: unknown, res: RawResponse) => unknown
  /** 声明式翻页 */
  paginate?: PaginateDef<z.infer<TParams>>
  /** 平台判定，缺省用平台默认 judge */
  judge?: Judge
  /** 裁剪整形为最终 data */
  normalize?: (decoded: unknown, p: z.infer<TParams>) => TData
  /** 纯本地计算，不发请求 */
  compute?: (p: z.infer<TParams>) => TData
  /** 响应类型标记 */
  response?: TypeToken<TData>
  /** 覆盖重试策略 */
  retryOn?: AmagiErrorCode[]
}
```

最简的端点：

```ts
// platforms/douyin/endpoints/videoWork.ts
import { z } from 'zod'
import { defineEndpoint } from 'amagi/contracts/endpoint'
import { douyinApi } from '../api'
import type { DouyinVideoWork } from '../../../types/douyin/videoWork'

export const videoWork = defineEndpoint({
  name: 'douyin.videoWork',
  route: '/fetch_video_work',
  params: z.object({ aweme_id: z.string().min(1, '作品 ID 不能为空') }),
  build: (p, ctx) => ({ method: 'GET', url: douyinApi(ctx.userAgent).workDetail(p) }),
  sign: 'a_bogus',
  response: type<DouyinVideoWork>()
})
```

对比 v6：同一个端点在 v6 需要改
`types/DouyinAPIParams.ts` + `validation/douyin.ts`（schema + 路由表）+
`platform/douyin/API.ts` + `platform/douyin/getdata.ts`（switch case）+
`model/fetchers/douyin/video.ts` + `types.ts` + `bound.ts` + `index.ts` +
`types/api-spec.ts` + `types/method-keys.ts` + 响应类型 —— 11 处。

---

## 执行管线

```
                          ┌──── 任一步失败 ────┐
                          ▼                    ▼
params ──validate──▶ prepare ──build──▶ sign ──send──▶ decode ──judge──▶ normalize ──▶ AmagiResult
   │                    │                        │        │        │          │
   │                    │                        │        │        │          └─ 端点声明
   │                    │                        │        │        └─ 平台 judge
   │                    │                        │        └─ 端点 decode（默认 JSON.parse）
   │                    │                        └─ transport（重试 / trace / 事件）
   │                    │                        
   │                    └─ 换凭证、拿 key（结果并入 ctx，进 trace）
   └─ zod safeParse，失败即 kind: 'validation' 并带 issues[]
```

关键性质：

- **任何一步失败都在同一处收口成信封**，`execute()` 里只有一个 catch，
  映射为 `kind: 'internal'`。管线里的函数都不需要自己造错误对象。
- **`paginate` 在 `send` 外层循环**，每一页都完整走 `build → sign → send → decode → judge`，
  所以每页都会重新签名（v6 是对的，要保持）。
- **`attempts` 与 `trace` 由 transport 累加**，管线不用手动记。

```ts
// runtime/execute.ts 的骨架
export const execute = async <P extends z.ZodTypeAny, T>(
  def: EndpointDef<P, T>,
  input: unknown,
  ctx: Ctx
): Promise<AmagiResult<T>> => {
  const meta = startMeta(def, ctx)
  try {
    const parsed = def.params.safeParse(input)
    if (!parsed.success) return fail(meta, validationError(parsed.error))

    if (def.compute) return ok(meta, def.compute(parsed.data))   // 纯计算，不发请求

    const fullCtx = def.prepare ? { ...ctx, ...(await def.prepare(ctx)) } : ctx
    const pages = def.paginate
      ? await runPaginated(def, parsed.data, fullCtx, meta)
      : await runOnce(def, parsed.data, fullCtx, meta)

    if (!pages.ok) return fail(meta, pages.error)
    return ok(meta, def.normalize ? def.normalize(pages.value, parsed.data) : (pages.value as T))
  } catch (cause) {
    return fail(meta, internalError(cause))
  } finally {
    meta.durationMs = Date.now() - meta.startedAt
  }
}
```

---

## 8 种非常规端点形态怎么落地

这一节是方案 A 的可行性验证 —— 每种形态都必须有对应写法，套不进去就要改设计。

### ① 纯本地计算，不发请求（`avToBv` / `bvToAv`）

用 `compute`，管线直接跳过 prepare/build/sign/send。顺带修 A7
（v6 返回 `'av170001'` 字符串）：

```ts
export const bvToAv = defineEndpoint({
  name: 'bilibili.bvToAv',
  route: '/bv_to_av',
  params: z.object({ bvid: z.string().regex(/^BV1[0-9A-Za-z]{9}$/, 'BV 号格式不正确') }),
  compute: (p) => ({ aid: bv2av(p.bvid) }),      // number，不带 'av' 前缀
  response: type<{ aid: number }>()
})
```

> `params` 顺手补了 BV 号格式校验 —— v6 是任意非空字符串都放行，
> 于是 `bv2av('not-a-bvid')` 静默返回垃圾值（KNOWN-DEFECT #34）。

### ② protobuf 响应（B站实时弹幕）

`build` 里声明 `responseType`，`decode` 里解 protobuf：

```ts
export const videoDanmaku = defineEndpoint({
  name: 'bilibili.videoDanmaku',
  route: '/fetch_danmaku',
  params: z.object({ cid: z.coerce.number().int().positive(), segment_index: z.coerce.number().int().positive().default(1) }),
  build: (p) => ({ method: 'GET', url: bilibiliApi.videoDanmaku(p), responseType: 'arraybuffer' }),
  decode: (raw) => parseDmSegMobileReply(raw as ArrayBuffer),
  judge: () => ({ ok: true }),                   // protobuf 响应没有 code 字段
  response: type<BiliDanmaku[]>()
})
```

`decode` 抛错时管线映射为 `kind: 'parse'` / `code: 'DECODE_FAILED'`
—— v6 是让异常穿到 `GlobalGetData` 的 catch 里变成一个字符串。

### ③ HTML 原样透出（小红书风控页）

不是端点的特例，而是**平台 judge 的职责**。小红书 judge 里加一条：

```ts
export const xiaohongshuJudge: Judge = (raw, http) => {
  if (typeof raw === 'string' && raw.includes('<html>')) {
    return { ok: false, kind: 'risk', code: 'ANTIBOT_PAGE', retryable: true }
  }
  ...
}
```

> 这里与 v6 行为不同：v6 是 `return response`（当成功透出 HTML）。
> v7 判成 `risk`，因为拿到风控页显然不是成功。属破坏性变更 C 档，
> 迁移文档里会写明；原始 HTML 仍在 `error.raw` 里（debug 模式）。

### ④ 多请求聚合（快手 `userProfile` 一次打 12 个接口）

`build` 返回 `RequestSpec[]`，transport 并发发送，`normalize` 收到数组：

```ts
export const userProfile = defineEndpoint({
  name: 'kuaishou.userProfile',
  route: '/fetch_user_profile',
  params: z.object({ principalId: z.string().min(1) }),
  build: (p, ctx) => [
    ksApi.userInfoById(p),
    ksApi.userSensitiveInfo(p),
    ksApi.userPublicTab(p),
    // ... 12 条
  ].map((r) => ({ method: 'GET', url: r.url, signPath: r.signPath, tag: r.type })),
  sign: 'hxfalcon',
  normalize: (parts) => assembleKuaishouProfile(parts as KsPart[]),
  response: type<KsUserProfile>()
})
```

关键收益：v6 那 650 行归一化 helper（`createEmpty*Result` / `mapLiveDetailTo*` /
`resolveKuaishou*` / `dedupe*`）从 `getdata.ts` 里搬进
`platforms/kuaishou/assemble/`，**「响应变换」这个关注点终于有了归属**。
这是缺陷 8 的根治点。

部分失败的语义由端点声明：

```ts
  partial: 'tolerate',   // 'tolerate' 缺失的部分留空 | 'fail' 任一失败即整体失败
```

### ⑤ 反爬 multi-JSON 拼接响应（抖音综合搜索）

`decode` 负责把粘在一起的多个 JSON 块拆开并合并：

```ts
export const search = defineEndpoint({
  name: 'douyin.search',
  route: '/fetch_search_info',
  params: z.object({
    query: z.string().min(1),
    type: z.enum(['general', 'user', 'video']).default('general'),
    number: z.coerce.number().int().positive().default(10),
    search_id: z.string().optional()
  }),
  build: (p, ctx) => ({ method: 'GET', url: douyinApi(ctx.userAgent).search(p), headers: searchReferer(p) }),
  sign: false,                                    // 搜索接口不加 a_bogus
  decode: (raw) => (typeof raw === 'string' ? mergeMultiJson(raw) : raw),
  paginate: searchPagination,
  response: type<DouyinSearchResult>()
})
```

`mergeMultiJson` 就是 v6 的 `parseDouyinMultiJson` + `filterSearchResponses`，
从 `getdata.ts` 搬到 `platforms/douyin/decode.ts`，变成可单测的纯函数。

### ⑥ 分段并发 + 合并 + 排序（抖音弹幕按 32s 切段）

同样是 `build` 返回多个 spec，但分段数由参数算出：

```ts
export const danmakuList = defineEndpoint({
  name: 'douyin.danmakuList',
  route: '/fetch_work_danmaku',
  params: z.object({
    aweme_id: z.string().min(1),
    duration: z.coerce.number().int().nonnegative(),
    start_time: z.coerce.number().int().nonnegative().optional(),
    end_time: z.coerce.number().int().nonnegative().optional()
  }).refine((d) => (d.end_time ?? d.duration) <= d.duration, { path: ['end_time'], message: '结束时间不能超过视频总时长' })
   .refine((d) => (d.start_time ?? 0) < (d.end_time ?? d.duration), { path: ['start_time'], message: '开始时间必须小于结束时间' }),

  build: (p, ctx) => splitSegments(p, 32_000).map((seg) => ({
    method: 'GET',
    url: douyinApi(ctx.userAgent).danmakuList({ ...p, ...seg }),
    tag: `segment:${seg.start}`
  })),
  sign: 'a_bogus',
  partial: 'tolerate',                            // 单段失败不影响整体，与 v6 一致
  normalize: (parts) => mergeDanmaku(parts as DanmakuPart[]),
  response: type<DouyinDanmakuList>()
})
```

`mergeDanmaku` 负责 v6 里那段「push + sort by offset_time + 取第一段的 extra/log_pb」的逻辑。

### ⑦ 前置请求换凭证（小红书 guest cookie、抖音 passport bootstrap）

`prepare` 的产物并入 ctx，并以 `reason: 'prepare'` 进 trace：

```ts
// platforms/xiaohongshu/endpoints/homeFeed.ts
export const homeFeed = defineEndpoint({
  name: 'xiaohongshu.homeFeed',
  route: '/fetch_home_feed',
  params: z.object({ /* ... */ }),
  prepare: async (ctx) => {
    if (extractA1(ctx.cookie)) return {}                       // 已有 a1，无需前置
    return { cookie: await ctx.transport.guestCookie() }       // 换 guest cookie
  },
  build: (p, ctx) => {
    const { url, body, apiPath } = xhsApi.homeFeed(p)
    return { method: 'POST', url, body, meta: { apiPath } }
  },
  sign: 'xhs-post',                                            // 由签名器统一注入 x-s / x-t / x-s-common
  response: type<XhsHomeFeed>()
})
```

两个收益：

- v6 里 `x-s` / `x-t` / `x-s-common` 那段拼装在 7 个 case 里各写一遍，
  现在收敛成一个签名器（缺陷 8）。
- wbi key 的前置请求可以加 TTL 缓存（`prepare` 里查缓存），
  修掉「每次签名都打一次 `/nav`」（缺陷 4）。

B站的 wbi 同理，且**必须走 transport**，不再像 v6 的 `wbi.ts` 那样直连 axios
（A5）—— 这样用户配的 proxy / agent / 超时才对它生效。

### ⑧ 多步会话状态机（两个平台的扫码登录）

**不用端点表达。** 会话是独立的一等概念，见
[05-session-and-polling.md](./05-session-and-polling.md)。
但它复用同一套 `contracts` / `transport` / 信封 —— 这正是抖音 passport
在 v6 里游离在架构外的问题所在。

---

## registry 与派生物

```ts
// platforms/douyin/endpoints/index.ts
export const douyinRegistry = {
  videoWork, imageAlbumWork, slidesWork, textWork, parseWork, danmakuList,
  comments, commentReplies,
  userProfile, userVideoList, userFavoriteList, userRecommendList,
  search, suggestWords,
  musicInfo, liveRoomInfo, emojiList, dynamicEmojiList
} as const satisfies Registry
```

### 派生 fetcher

```ts
// client/fetcher.ts
export type FetcherOf<R extends Registry> = {
  [K in keyof R as MethodName<K>]: FetcherMethod<R[K]>
}

type FetcherMethod<D> = D extends EndpointDef<infer P, infer T>
  ? <TOverride = T>(
      params: z.input<P>,
      cookie?: string,
      requestConfig?: RequestConfig
    ) => Promise<AmagiResult<TOverride>>
  : never
```

`MethodName` 把 `videoWork` 映射成 `fetchVideoWork` —— 一张显式的名字表
（不是字符串拼接），因为 v6 的命名有 `searchContent` / `parseWork` /
`requestLoginQrcode` / `convertAvToBv` 这些不规则形式，必须逐个对齐 v6 才能兼容。

```ts
// client/method-names.ts —— 唯一一处手写映射，且有测试对着 v6 快照校验
export const METHOD_NAMES = {
  'douyin.videoWork':   'fetchVideoWork',
  'douyin.search':      'searchContent',
  'douyin.parseWork':   'parseWork',
  'bilibili.avToBv':    'convertAvToBv',
  // ...
} as const satisfies Record<string, string>
```

### 派生 bound fetcher

v6 的 `bound.ts` 每个平台手写 19–27 条转发（`fetchVideoWork: (o, r) => fetchVideoWork(o, ...resolve(r))`）。
v7 用 Proxy 一次搞定，方法集合自动跟随 registry：

```ts
export const createBoundFetcher = <R extends Registry>(
  registry: R, cookie: string, base?: RequestConfig
): BoundFetcherOf<R> =>
  new Proxy({} as BoundFetcherOf<R>, {
    get: (_, method: string) => (params: unknown, override?: RequestConfig) => {
      const [ck, cfg] = resolveBoundRequest(cookie, base, override)
      return execute(lookup(registry, method), params, makeCtx(ck, cfg))
    }
  })
```

### 派生 HTTP 路由

```ts
export const createRoutes = (registry: Registry, ctx: CtxFactory): Router => {
  const router = Router()
  const seen = new Map<string, string>()
  for (const [name, def] of Object.entries(registry)) {
    const dup = seen.get(def.route)
    if (dup) throw new Error(`路由冲突：${name} 与 ${dup} 都注册在 ${def.route}`)
    seen.set(def.route, name)
    router.get(def.route, makeHandler(def, ctx))
  }
  return router
}
```

**这一行 `throw` 就修掉了 KNOWN-DEFECT #47/#48/#54** —— v6 抖音有 5 个
methodType 共用 `/fetch_one_work`，Express 只命中第一个，其余 4 个 HTTP 不可达。
v7 在启动期直接失败，不可能带着这个 bug 发版。

> 路由唯一性还能上到编译期：给 registry 加一个 `UniqueRoutes<R>` 约束类型，
> 重复时 `satisfies` 报错。实现方式是把 route 字面量收集成联合再查重，
> 59 个端点的规模下类型检查开销可接受。作为增强项，不是必需。

### 派生的其他产物

| 派生物 | v6 里的对应文件 | v7 |
| --- | --- | --- |
| 方法名 ↔ 端点映射 | `types/method-keys.ts`（313 行，内部零引用） | registry 的 key + `METHOD_NAMES` |
| 路由表 | `validation/*.ts` 的 `*MethodRoutes` | `def.route` |
| 「API 规范」路由表 | `types/api-spec.ts`（393 行，与真实服务不符） | 删除 |
| 参数类型 | `types/*APIParams.ts` | `z.infer<typeof def.params>` |
| schema 映射表 | `validation/*.ts` 的 `*ValidationSchemas` | registry 遍历 |
| bound fetcher 转发 | 4 个 `bound.ts`，共 ~250 行 | Proxy |
| fetcher 接口声明 | 4 个 `types.ts`，共 ~700 行 | `FetcherOf<R>` |

---

## 对外形态保持不变

四种 v6 调用形态原样可用（这是硬约束，见
[06-migration.md](./06-migration.md)）：

```ts
// ① client 实例
const client = amagi({ cookies: { douyin: ck }, request: { timeout: 8000 } })
await client.douyin.fetcher.fetchVideoWork({ aweme_id })

// ② 静态 fetcher
await amagi.douyinFetcher.fetchVideoWork({ aweme_id }, ck)

// ③ 工厂
const f = amagi.createBoundDouyinFetcher(ck)
await f.fetchVideoWork({ aweme_id })

// ④ HTTP 服务 + 事件 + 工具集
client.startServer(4567)
amagi.on('api:error', (e) => log(e.meta.requestId, e.error.code))
amagi.douyin.sign.AB(url, ua)
```

v7 新增（不影响 v6 写法）：

```ts
// 直接按端点名调用，不经过 fetcher 的方法名映射
await client.call('douyin.videoWork', { aweme_id })

// 遍历能力（v6 拿不到）
for (const ep of client.endpoints('douyin')) console.log(ep.name, ep.route)
```

---

## 搬迁计划

59 个端点 + 2 套会话，按平台切分成可独立 review 的批次：

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| 0 | `contracts/` + `transport/` + `runtime/` 骨架，无端点 | 单测；`dpdm` 0 环 |
| 1 | 小红书 7 个端点（最少、且覆盖 POST + 签名 + prepare） | 现有 xhs 用例全绿 |
| 2 | 快手 6 个端点（覆盖多请求聚合 + 650 行归一化搬迁） | 现有 ks 用例全绿 |
| 3 | 抖音 19 个端点（覆盖分页 + multi-JSON + 分段并发） | 现有 douyin 用例全绿 |
| 4 | B站 27 个端点（覆盖 protobuf + wbi + qtparam） | 现有 bilibili 用例全绿 |
| 5 | 两套登录会话（见 05） | 新增会话用例 |
| 6 | 删 v6 遗留：`api-spec.ts` / `method-keys.ts` / 3 个死文件 / `bound.ts` / 重载类型 | 公开面快照 diff 与迁移表逐条对齐 |
| 7 | `compat` 子路径导出 | 兼容层用例 |

每个阶段的验收标准都是**现有 816 个用例继续通过**（除标注了
`KNOWN-DEFECT` 且本阶段声明要修的那些）。这是把测试基线用起来的方式：
搬迁不是「重写后跑一遍看看」，而是每一批都对着基线核对。

---

## 代价与风险

诚实列出来，这是选方案时要权衡的：

| 项 | 说明 |
| --- | --- |
| **新增机械** | `defineEndpoint` 的类型推导、`execute` 管线、`FetcherOf<R>` 的映射类型。这些是自己要维护的抽象，出问题时排查链路比 v6 的直白 switch 长 |
| **类型推导复杂度** | `z.infer` + 条件类型 + Proxy 的组合，IDE 提示可能不如手写接口直观。需要在阶段 0 就把 `FetcherOf` 的推导验证到位，否则后面 59 个端点都受影响 |
| **一次性投入大** | 阶段 0–6 之间无法发版（或只能发 beta）。如果期间有紧急功能需求会很难受 |
| **回退成本高** | 走到阶段 3 才发现设计不对，回退等于白干。缓解：阶段 1 用最小的小红书验证全套扩展点 |
| **`partial` 语义要想清楚** | 多请求聚合的部分失败该 tolerate 还是 fail，v6 是隐式的（快手 tolerate、抖音弹幕 tolerate），v7 变显式后要逐个确认，别改了行为 |

风险缓解的关键是**阶段 1 选小红书**：7 个端点里同时有 POST、
三重签名头、`prepare` 换 guest cookie、分页，能把 8 种形态里的 4 种验证掉。
如果小红书搬完发现扩展点不够用，此时沉没成本还很小。
