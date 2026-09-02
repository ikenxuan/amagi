# v6 → v7 迁移矩阵

> 基线来自 `packages/core/test/contract/__snapshots__/public-surface.test.ts.snap`
> —— v6 入口共导出 **146 个名字**，本文逐类给出去留。

## 一句话总结

**成功分支的代码零改动，错误分支需要改读法。** 除此之外的破坏性变更都能靠
编译错误发现，且有兼容层兜底。

```ts
// 这段代码 v6 / v7 都成立
const r = await client.douyin.fetcher.fetchVideoWork({ aweme_id })
if (r.success) console.log(r.data)
```

---

## 四种调用形态全部保留

| 形态 | v6 | v7 |
| --- | --- | --- |
| client 实例 | `amagi({cookies,request}).douyin.fetcher.fetchVideoWork(o)` | 不变 |
| 静态 fetcher | `amagi.douyinFetcher.fetchVideoWork(o, ck, cfg)` | 不变 |
| 工厂 | `amagi.createBoundDouyinFetcher(ck).fetchVideoWork(o)` | 不变 |
| HTTP / 事件 / 工具集 | `client.startServer(4567)` / `amagi.on(...)` / `amagi.douyin.sign` | 不变 |

新增（不影响旧写法）：`client.call('douyin.videoWork', params)`、
`client.endpoints(platform)`、`client.<platform>.login`。

---

## 新增 HTTP 路径

v6 抖音 5 个作品 methodType（`parseWork` / `videoWork` / `imageAlbumWork` /
`slidesWork` / `textWork`）共用 `/fetch_one_work` 一条路由（#47/#48/#54）。
v7 拆成 5 条独立路由，**新增以下 4 条**：

| 新路径 | 端点 | 说明 |
| --- | --- | --- |
| `/fetch_video_work` | `douyin.videoWork` | 原 `videoWork` |
| `/fetch_image_album_work` | `douyin.imageAlbumWork` | 原 `imageAlbumWork` |
| `/fetch_slides_work` | `douyin.slidesWork` | 原 `slidesWork` |
| `/fetch_text_work` | `douyin.textWork` | 原 `textWork` |

`parseWork` 保留原路径 `/fetch_one_work`，因此**旧 URL 依然可用**；其余四个
端点原来打的 `/fetch_one_work` 需要换成上表的新路径。同平台内路由唯一性由
`server/routes.ts` 启动期校验，重复注册直接抛错。

---

## 逐类去留

146 个顶层运行时导出的处置：

| 处置 | 数量 | 占比 |
| --- | --- | --- |
| **保留且形状不变** | 59 | 40% |
| **保留但形状变化**（B 档，编译期可发现） | 8 | 6% |
| **删除**（B 档） | 79 | 54% |

> 「删除 54%」看着激进，但其中 41 个是逐个导出的 zod schema
> （`DouyinWorkParamsSchema` 这类），24 个是内部零引用的
> `api-spec.ts` + `method-keys.ts`。真正会被用户直接引用的删除项只有
> `registerXxxRoutes` 别名与 4 张路由表。

### 保留且形状不变（59 个）

| 类别 | 导出 |
| --- | --- |
| 入口 | `default` `amagi` `CreateApp` `createAmagiClient` |
| 静态 fetcher | `douyinFetcher` `bilibiliFetcher` `kuaishouFetcher` `xiaohongshuFetcher` |
| bound fetcher 工厂 | `createBound{Douyin,Bilibili,Kuaishou,Xiaohongshu}Fetcher` |
| 平台工具集 | `douyinUtils` `bilibiliUtils` `kuaishouUtils` `xiaohongshuUtils` |
| 路由工厂 | `create{Douyin,Bilibili,Kuaishou,Xiaohongshu}Routes` |
| 签名 | `douyinSign` `kuaishouSign` `xiaohongshuSign` `wbi_sign` `qtparam` `av2bv` `bv2av` `parseDmSegMobileReply` |
| URL 构造器 | `{douyin,bilibili,kuaishou,xiaohongshu}ApiUrls` |
| passport | `douyinPassport` `requestPassportQrcode` `checkPassportQrcode` `sendPassportVerifyCode` `validatePassportVerifyCode` |
| 事件 | `amagiEvents` 与 12 个 `emit*` |
| 传输 | `fetchData` `fetchResponse` |
| 错误 | `ApiError` `ValidationError` `handleError` |
| 平台常量类型 | `CommentType` `DynamicType` `MajorType` `AdditionalType` |

> **注意**：单个 fetcher 方法（`fetchVideoInfo` 等 59 个）**不在顶层导出**里
> —— 它们只能通过 fetcher 对象访问（`amagi.douyinFetcher.fetchVideoWork`）。
> 唯一例外是 4 个 passport 方法，v6 在 `src/index.ts` 里显式具名导出了它们
> （因为自别名路径导致 `export *` 生成的 `.d.ts` 对下游不可解析）。
> v7 取消自别名后这个 workaround 不再必要，但**导出保留**以免破坏。

全局单例 `amagiEvents` 与 12 个 `emit*` 自由函数**一个都没删、形状一字未改**。
但 v7 的 `client.events` 是**另一条总线**（实例级），名字对齐、负载换形，
逐条见下方「事件系统：名字对齐、负载换形」。

`getXxxDefaultConfig` 系列不在顶层导出（只在 `amagi/platform/defaultConfigs`
子路径），因此小红书补齐 `requestConfig` 形参这件事对顶层公开面无影响。

### 保留但形状变化（8 个，B 档）

| 导出 | v6 | v7 | 迁移动作 |
| --- | --- | --- | --- |
| `validateDouyinParams` `validateBilibiliParams` `validateKuaishouParams` `validateXiaohongshuParams` | 抛 `ZodError` | 返回 `ValidateOutcome`，不抛 | 想保留抛出行为用 `assertValidParams` |
| `createSuccessResponse` | `(data, message, code)` | `(data, meta, message?)` | 主要内部使用 |
| `createErrorResponse` | `(error, message, code, data)` | `(error: AmagiError, meta)` | 同上 |
| `isNetworkErrorResult` | 判 `{success:false, error.amagiError}` | 改判 `r.error.kind === 'network'` | 保留同名 deprecated 转发 |
| `getHeadersAndData` | 顶层导出，业务层直接用 | 移入 transport，不再对外 | 需要响应头改用 `meta.trace` |

以及类型层面的 `Result` / `SuccessResult` / `ErrorResult`
—— 顶层 `code` 删除、`error` 形状重做。

### 放宽（1 条，非破坏）：信封两支各加一个 `?: undefined` 对侧键

阶段 9.2 修 BUG-2（`AmagiResult<T>` 上读不到 `data`）带来的形状变更。方向是
**编译错误变合法**，反向不成立 —— 9.2 之前能编译的代码 9.2 之后照旧编译，
所以它不构成破坏性变更，但形状确实动了，出处记在这里。

| 名字 | 9.2 之前 | 9.2 之后 | 破坏性 |
| --- | --- | --- | --- |
| `AmagiSuccess<T>` | `success` / `data` / `message` / `meta` | 多一个 `error?: undefined` | 无（放宽：`r.error` 从 TS2339 变成 `AmagiError \| undefined`） |
| `AmagiFailure` | `success` / `error` / `message` / `meta` | 多一个 `data?: undefined` | 无（放宽：`r.data` 从 TS2339 变成 `T \| undefined`，即 v6 的读法） |
| `isSuccess` / `isFailure` | 不存在（全仓 grep 命中 0 处） | 顶层新增，类型守卫 | 无（纯新增） |
| `unwrap` / `AmagiThrownError` | 同上 | 顶层新增：失败即抛 + 抛出物的 Error 子类 | 无（纯新增） |
| `AmagiResult` / `AmagiSuccess` / `AmagiFailure` / `AmagiError` | 顶层取不到（只在 `contracts/*`，而 `package.json` 的 `exports` 不开子路径） | 顶层类型导出 | 无（纯新增，不进运行时公开面） |

**运行时形状一个字节都没变**，这是与 v6 的分界线。v6 的错在**说谎**：
`SuccessResult` / `ErrorResult` 两支都声明 `data`（一支 `T`、一支 `never`），
`data: data as never` 声明成 `never` 却在运行时塞真值（v6 定义现存
`validation/legacy.ts:28-47`）。v7 的对侧键运行时**根本不存在**，声明与事实一致。
三处断言钉住它：`test/contracts/result.test.ts`（`'error' in ok === false` /
`'data' in bad === false`）、`test/errors/errors.test.ts`（两个 builder 的
`Object.keys`）、`test/runtime/execute.test.ts`（真管线产出的信封）。

收窄能力没退化：`success` 仍是唯一判别键，`if (r.success)` 之后 `data` 是 `T`、
`else` 之后 `error` 是 `AmagiError`，都不带 `| undefined`。四种读法
（不收窄读 `data` / `if` 收窄 / `filter(isSuccess)` / `unwrap`）在
`test/types/result-reading.test-d.ts` 里逐条断言，且全部用真 fetcher 类型
—— 9.2 之前那条 `as unknown as` 手写联合的绕行（`response-types.test-d.ts`）
一并删除。

`unwrap` 与 `@ikenxuan/amagi/compat` 不重叠：`unwrap` 是 v7 的**单点显式选择**
（这一处调用想让失败抛就抛，返回类型是 `T`，抛的是带 `AmagiError` 全字段、
`cause` 不吞的 `AmagiThrownError`）；compat 是 v6 语义的**整体回填**（把返回值
换回带顶层 `code` 的 v6 信封）。要哪种语义选哪个，混用没有意义。

公开面计数：`public-surface.test.ts.snap` 的导出名清单 **70 → 74**，新增的
四个名字就是 `isSuccess` / `isFailure` / `unwrap` / `AmagiThrownError`
（四个类型名是 `export type`，不进运行时清单）。

### 新增：`ClientOptions.debug`（纯新增，非破坏）

阶段 9.1 修 BUG-6。`AmagiError.raw` 的注释一直写着「client 开 debug 时才填」，
但那个开关**根本不存在** —— `ClientOptions` 只有 `cookies` / `request`，
`makeClientCtx` 从不设 `ctx.debug`，全仓 `debug: true` 赋值 0 处，于是
`error.raw` 在任何配置下都不会出现。9.4 第 1 项把 `AmagiError` 的字段表改成由
`contracts/error.ts` 的 TSDoc 渲染之后，这句空话已经 publish 到文档站上。

| 名字 | 9.1 之前 | 9.1 之后 | 破坏性 |
| --- | --- | --- | --- |
| `ClientOptions` | `{ cookies?, request? }` | 多一个 `debug?: boolean` | 无（纯新增，默认 `false`） |
| `AmagiError.raw` | 声明有、**永远不填** | `createClient({ debug: true })` 时填原始响应体 | 无（默认行为一字不变：失败信封上**连 `raw` 这个键都没有**，不是 `raw: undefined`） |

作用范围**只有 client 实例上的 fetcher**：静态 fetcher
（`amagi.douyinFetcher.fetchXxx(o, ck, cfg)`）与 HTTP 服务的平台路由没有这个
开关 —— 前者的三参签名是 v6 冻结的、塞不下第四个开关，而 `requestConfig` 是
原样透传给 axios 的配置，混进 amagi 自己的开关会让那个类型不再是「axios 配置」；
理由与替代写法记在 `client/static.ts` 的注释里。原始响应可能很大、也可能带
敏感字段，所以这是个 opt-in 开关，不是默认行为。

### 事件系统：实例总线的 12 个事件名与负载形状（A 档 / B 档）

阶段 9.1 补事件名缺口 + 修 BUG-4 带来的变更。**两条总线并存，别当成一条**：

| 总线 | 怎么拿 | 事件名 | 负载 | 生命周期 |
| --- | --- | --- | --- | --- |
| v6 全局单例 | `amagiEvents`、`amagi.on(...)`（静态） | 12 个（`AmagiEventType`） | v6 `*EventData`，带 `timestamp: Date` | v7 全程保留、形状一字不改，v8 移除 |
| v7 实例总线 | `client.events`、`client.on(...)` | 同样 12 个（`AmagiBusEventMap`） | v7 形状：带 `meta` / `trace`，没有 `timestamp` | v7 起就是这一条 |

9.1 之前实例总线只声明 4 个名字，**而且一个都不会触发**（BUG-4：`makeClientCtx`
既没透传 `bus`，也没给 `HttpClient` 注入 `emit`）。9.1 之后 12 个名字都能 `on`，
其中 10 个真的会发。

#### 名字对齐表

| 事件名 | v6.6.0 发布版（全局单例） | v7 实例总线（9.1 之后） |
| --- | --- | --- |
| `log:info` | 1 处（B站评论翻到末尾） | **不发**，见下方「不对齐的两个」 |
| `log:warn` | getdata 未知接口 / 参数告警、`networks.ts` 退避前 | 每次退避重试一条，文案与 v6 **逐字一致** |
| `log:error` | `networks.ts` 放弃、B站「评论区未开放」、小红书请求失败 | 传输层放弃时一条，文案逐字一致 |
| `log:debug` | 抖音弹幕分段 ×4、passport ×2 | **不发**，见下方「不对齐的两个」 |
| `log:mark` | `startServer` 启动 | v7 门面 `startServer` 启动（**不带 chalk 颜色**，颜色是展示层的事） |
| `http:request` | **0 处**：声明了却从不发（#5） | 每发一次底层请求一条 |
| `http:response` | **0 处**（#5） | 每条请求结束一条，含非 2xx 与传输失败 |
| `http:error` | **0 处**，连 `emitHttpError` 都不存在 | 拿到非 2xx 响应时一条，紧跟在 `http:response` 后面 |
| `network:retry` | `networks.ts` 退避前 | transport 退避前；**429 / 5xx 也算**（v6 因 `validateStatus: () => true` 永远进不来） |
| `network:error` | `networks.ts` 放弃时 | transport 放弃时（请求始终没拿到响应） |
| `api:success` | 四平台 `internal.ts` 各一处 | `runtime/execute.ts` 收尾，覆盖全部 59 个端点 |
| `api:error` | 同上 | 同上 |

> 对照的是 `v6.6.0` **标签**。本分支上 v6 侧的 emit 点已经少了一批：
> `platform/*/getdata.ts` 与 `model/networks.ts` 在阶段 6 删除 / 搬迁之后，
> `log:info` 归零、`api:*` 只剩已 `@deprecated` 的抖音 passport 四个方法还在发。

#### 不对齐的两个：`log:info` / `log:debug`

名字在 `AmagiBusEventMap` 里（`on` 能编译），但 v7 核心链路没有 emit 点：

- **`log:info`** —— v7 新管线没有 info 级日志。v6 唯一那处（B站
  「已到达评论末尾或无更多评论」）在 v7 里是 `paginate` 的正常终止条件，
  不值得一条日志。
- **`log:debug`** —— v6 的 debug 全在抖音弹幕分段与 passport，前者在 v7 由
  `partial: 'tolerate'` + `meta.trace` 表达（每段各有一条 `http:*` 事件，比
  日志更可查），后者是已 `@deprecated` 的 v6 路径，仍写**全局单例**。

清单钉在 `runtime/events.ts` 的 `UNEMITTED_BUS_EVENT_NAMES` 常量上，
`test/runtime/events.test.ts` 有一条 KNOWN-GAP 用例断言它恰好是这两个
—— 谁给它们接了线，用例变红，逼着一起改这一节。

#### 负载形状：监听器搬家要改读法

| 事件名 | v6 负载（全局单例，不变） | v7 实例总线负载 |
| --- | --- | --- |
| `log:*` ×5 | `{ level, message, args?, timestamp }` | `{ level, message, args?, meta? }` |
| `http:request` `http:response` | `{ method, url, statusCode, responseTime, clientIP?, requestSize?, responseSize?, timestamp }` | `{ meta, trace }` |
| `http:error` | `NetworkErrorEventData` | `{ meta, trace, status }` |
| `network:retry` | `{ errorCode, attempt, maxRetries, delayMs, url?, timestamp }` | `{ meta, trace, code, errno?, status?, attempt, maxRetries, delayMs }` |
| `network:error` | `{ errorCode, message, retries, url?, timestamp }` | `{ meta, trace, code, errno?, message, attempts }` |
| `api:success` | `{ platform, methodType, response, statusCode, duration, timestamp }` | `{ meta, data }` |
| `api:error` | `{ platform, methodType, errorCode?, errorMessage, url?, duration?, timestamp }` | `{ meta, error }` |

三处容易踩的差别：

1. **`platform` / `methodType` / `duration` / `statusCode` 都进了 `meta`**
   （`meta.platform` / `meta.endpoint`（全名，如 `douyin.videoWork`）/
   `meta.durationMs` / `trace[].status`），顶层读不到了。
2. **`timestamp: Date` 没有了。** 归因改用 `meta.requestId` / `meta.clientId`
   —— 这正是缺陷 10 的修法：v6 的负载里没有任何关联 id，多实例并发时
   分不清事件是谁发的。与调用无关的日志（`log:mark`）本来就没有 `meta`。
3. **`network:*` 的 `errorCode` 拆成两个字段。** v6 的 `errorCode` 装的是传输层
   errno（`ECONNRESET`），v7 分成 `code`（`AmagiErrorCode`，如 `RATE_LIMITED`）
   与 `errno`（原样的 errno，拿到响应时没有）；`url` 去 `trace.url` 读。
   `network:error` 的 `retries`（重试了几次）换成 `attempts`（一共发了几次）。

破坏性分级：**TS 用户是 B 档**（负载类型变了，`d.platform` 直接编译错误），
**JS 用户是 A 档**（读到 `undefined`，没人拦）。两条总线的名字完全一样，
所以**判断依据是从哪儿拿的总线**，不是事件名。

类型名是 `AmagiBusEventMap` / `AmagiBusEventName` / `AMAGI_BUS_EVENT_NAMES`，
**不叫** `AmagiEventMap`：顶层已经有 v6 的同名类型，两个同名 interface 一起进
dts 会被打包器给其中一个加 `$1` 后缀（实测过：两边都叫 `AmagiEventMap` 时
`dist/index-*.d.ts` 里确实多出一个带后缀的 interface）。v8 移除
`model/events.ts` 时再把名字收回来。这三个名字目前还不在顶层导出，
随 `createClient` 一起进公开面（9.1 第 5 项）。

> `usage/guide/events.mdx` 整页仍在讲 v6 全局单例与 v6 负载
> （`data.platform` / `data.methodType` / `data.timestamp`），对实例总线的读者
> 是错的 —— 归 9.1 的文档项 / 9.5 的 twoslash 全量检查处理。

### 删除（79 个，B 档）

| 导出 | 数量 | 删除理由 |
| --- | --- | --- |
| 逐个导出的 `*ParamsSchema` | 41 | schema 归端点声明持有，不再逐个对外。需要时用 `client.endpoints()` 取 |
| `method-keys.ts`（4×3 组 `*InternalMethods` / `*FetcherMethods` / `*MethodToFetcher` + `MethodMaps` + `toFetcherMethod`） | 14 | 内部零引用（313 行）；文件开头写的设计前提「getdata.ts 仍使用中文 key」已经是假的 |
| `api-spec.ts`（4 个 `*ApiRoutes` + 4 个 `*MethodMapping` + `getApiRoute` + `getEnglishMethodName`） | 10 | 内部零引用（393 行）；导出的路由表（`/work`）与真实服务（`/fetch_one_work`）完全不符，是一份错误的公开文档 |
| `*MethodRoutes` | 4 | 路由由端点声明持有 |
| `*ValidationSchemas` | 4 | 同上 |
| `registerXxxRoutes` | 4 | 与 `createXxxRoutes` 是同一函数的别名，v5 遗留 |
| `bilibiliErrorCodeMap` `isSmsCodeVerifyWay` | 2 | 前者合并进 `bilibiliJudge`，后者收进会话引擎 |

另外这些不在顶层导出、但在子路径导出的也一并删除：

- 4 个 `*APIErrorCode` 枚举（约 180 行）。`bilibiliAPIErrorCode` 是字符串枚举
  却用来比数字码（实测 `Object.values(...).includes(-101)` 为 `false`），
  `xiaohongshuAPIErrorCode` 是混合枚举导致 `Object.values()` 泄漏反向映射键。
  替代物是 `AmagiErrorCode` 字符串联合 + `error.platform.code`。
- `TypeMode` / `TypeControl` / `ConditionalReturnType` / `ExtractTypeMode`
- `overload-types.ts` 的 6 个重载类型别名（约 130 行）
- `platform/bilibili/sign/CorrespondPath.ts` / `dm_img.ts` /
  `types/ReturnDataType/Kuaishou/WorkComments.ts`（三个从未被导入的文件）

### 需要人判断（C 档）

只有两条，都提供兼容层：

**① 参数校验失败不再抛出**

```ts
// v6：校验失败走 catch
try {
  await client.douyin.fetcher.fetchVideoWork({ aweme_id: '' })
} catch (e) {
  console.error(e.message)   // '抖音数据获取失败: ...'
}

// v7：校验失败走 else 分支，且带字段路径
const r = await client.douyin.fetcher.fetchVideoWork({ aweme_id: '' })
if (!r.success && r.error.kind === 'validation') {
  for (const i of r.error.issues!) console.error(i.path, i.message)
}
```

这是**最容易踩的一条**，因为 v6 代码里的 `try/catch` 在 v7 下不会进 catch，
而是静默走到 `if (r.success)` 的 else 分支 —— 如果那里没写处理就变成静默失败。
所以它属于 C 档且必须有兼容层。

**② 小红书风控 HTML 不再当成功**

v6 拿到 `<html>` 反爬页时 `return response`（成功透出）；
v7 判为 `kind: 'risk'` / `code: 'ANTIBOT_PAGE'`，原始 HTML 在 `error.raw`。

---

## 「8 项保留但形状变化」实施规格（2026-09-02 定稿，compat 已先行）

> 背景：阶段门 6 复查发现这 8 项名字仍是 v6 形状（validateXxxParams 抛
> ZodError、createXxxResponse 的 v6 信封、isNetworkErrorResult 判 v6 形状、
> 顶层 Result 类型带 code）。owner 决策：按本矩阵真实施，compat
> （上方小节）先行覆盖 v6 信封读法。本小节冻结每项的新形状与消费方处置。

### 新形状

| 名字 | v7 形状 | 说明 |
| --- | --- | --- |
| `validateXxxParams` ×4 | 返回 `ValidateOutcome<T>`，**不抛** | `{ ok: true; value } \| { ok: false; issues: ValidationIssue[] }`；schema 表不动（quirk 已在端点声明里修） |
| `assertValidParams` ×4（新增） | `(methodType, params) => value`，失败抛 `ValidationError` | 要保留 v6 抛出行为的调用方用它 |
| `createSuccessResponse` | `(data, meta: AmagiMeta, message?)` → `AmagiSuccess<T>` | message 默认 `SUCCESS_MESSAGE` |
| `createErrorResponse` | `(error: AmagiError, meta)` → `AmagiFailure` | |
| `isNetworkErrorResult` | 双形态转发：带顶层 `code` 的 v6 信封走旧判定；否则判 `r.error.kind === 'network'` | @deprecated，转发逻辑不复制 |
| `getHeadersAndData` | 已在 6.2 移入 transport、不再对外 | 无需动作 |
| 顶层 `Result` / `SuccessResult` / `ErrorResult` / `BaseResponse` | 摘除 v6 定义导出；v7 信封是 `AmagiResult` 族 | 类型层面破坏属 B 档（`r.code` 编译错误，codemod 处理） |

### 消费方处置（v6 行为保留给 deprecated 内部）

8 项名字的内部消费方只有 3 处 deprecated 遗留（`model/fetchers/douyin/auth.ts`
的 4 个 passport 方法、`transport/legacy.ts` 的 fetchData/fetchResponse、
`platform/douyin/passport/client.ts`）。它们继续产出 v6 信封，但**不再借用
顶层 helper**：

- 新建内部模块 `validation/legacy.ts`（不进顶层 barrel）：v6 的
  `Result` / `SuccessResult` / `ErrorResult` / `BaseResponse` 类型与
  `createV6Success` / `createV6Error` builder 搬到这里
- auth.ts / transport/legacy.ts 改从 `validation/legacy.ts` 取用，行为与
  用例零变化（passport 4 方法仍返带 `code` 的 v6 信封，compat 透传规则不变）
- passport/client.ts 的 `isNetworkErrorResult` 消费点（判 fetchResponse
  的 v6 输出）改为内部 v6 判定，不依赖顶层转发函数

### 测试处置

- 形状相关的既有用例（errors.test.ts 的 createXxxResponse v6 形状断言、
  validation/*.test.ts 的抛错断言）按新形状**改写为正读法**，不改则红
- 指向 schema quirk 的 KNOWN-DEFECT 钉子（如 note_id 空串）随本批删除
  —— 修复已落在端点声明的 `min(1)` / `coerce` 上（06 行 #52-61）
- events 全局单例钉子（#6）随 client 事件实例级化重写（另一独立项）

---

## 兼容层：`@ikenxuan/amagi/compat`

一行切换，把 v7 信封回填成 v6 形状并恢复抛出行为：

```ts
// v6 写法完全不用改
import amagi from '@ikenxuan/amagi/compat'

const client = amagi({ cookies: { douyin: ck } })
try {
  const r = await client.douyin.fetcher.fetchVideoWork({ aweme_id: '' })
  if (r.success) use(r.data)
  else console.error(r.code, r.message, r.error.amagiError.errorDescription)
} catch (e) { /* 校验失败仍走这里 */ }
```

实现方式是一层薄包装，不复制业务逻辑：

```ts
const toLegacy = <T>(r: AmagiResult<T>): LegacyResult<T> =>
  r.success
    ? { success: true, code: 200, message: r.message, data: r.data, error: undefined as never }
    : {
        success: false,
        code: legacyCode(r.error),                 // ErrorKind → v6 的数字 code
        message: r.message,
        data: undefined as never,
        error: {
          code: r.error.platform?.code ?? r.error.code,
          data: r.error.raw ?? null,
          amagiError: {
            errorDescription: r.error.message,
            requestType: r.meta.endpoint.split('.')[1],
            requestUrl: r.error.raw ? undefined : undefined
          },
          amagiMessage: r.error.message
        }
      }
```

生命周期：**v7 全程保留，v8 移除。** compat 入口在导入时打一次
`log:warn` 事件提示迁移，不刷屏。

> 兼容层刻意做成**单向、只读、无状态**的转换函数集合 ——
> 它不参与请求流程，只在返回前套一层。这样它不会成为第二套实现，
> 也不会因为忘了同步而与主路径漂移（v6 的 `api-spec.ts` 就是那样烂掉的）。

---

## codemod

`npx @ikenxuan/amagi-codemod v6-to-v7 src/`

能自动改的：

| 变换 | 说明 |
| --- | --- |
| 删 `typeMode: 'strict'` | 现在是默认行为，参数多余 |
| `typeMode: 'loose'` → `as any` | 在使用 `r.data` 的地方补断言 |
| `r.code` → `r.error.platform?.code`（错误分支）/ 删除（成功分支） | 需要先判断分支，靠 TS 类型信息 |
| `r.error.amagiError.errorDescription` → `r.error.message` | 直接替换 |
| `r.error.errorDescription` → `r.error.message` | 直接替换 |
| `registerXxxRoutes` → `createXxxRoutes` | 直接替换 |
| `import { XxxApiRoutes }` → 报错并给出提示 | 无自动替代，需人工 |

不能自动改的（codemod 只标注 `// TODO(amagi-v7):`）：

- `try/catch` 包裹的校验错误处理（需要人判断该怎么处理失败分支）
- 依赖 `checkQrcodeStatus` 返回 `headers` 的代码
- 依赖小红书 HTML 透出的代码

---

## Phase 2 的接口预留

跨平台语义视图（决策 ③ 推迟到 Phase 2）需要在 v7 就把位置留好，
否则加进来时又是破坏性变更。

预留方式：端点参数上留一个 `view` 字段，v7 只接受 `'raw'`（默认）：

```ts
// v7
type ViewMode = 'raw'
// Phase 2
type ViewMode = 'raw' | 'canonical'
```

以及在端点声明里留 `toCanonical` 槽位：

```ts
export const videoWork = defineEndpoint({
  // ...
  response: type<DouyinVideoWork>(),
  toCanonical: undefined            // Phase 2 填入 (raw) => CanonicalWork
})
```

于是 Phase 2 的加入是纯增量：

```ts
const r = await client.douyin.fetcher.fetchVideoWork({ aweme_id, view: 'canonical' })
r.data.title        // 跨平台统一字段
```

返回类型由 `view` 条件推导：

```ts
type DataOf<D, V extends ViewMode> =
  V extends 'canonical' ? CanonicalOf<D> : ResponseOf<D>
```

---

## KNOWN-DEFECT 归属

61 条 `KNOWN-DEFECT` 在 v7 的处置。编号对应
`test/contract/__snapshots__/known-defects.test.ts.snap` 里的出现顺序。

### 修复（52 条）

| 编号 | 由什么消除 |
| --- | --- |
| 1, 8 | 顶层 `code` 删除，HTTP 状态码由 `ErrorKind → status` 表决定 |
| 2, 3 | 失败信封运行时没有 `data` 键、成功信封运行时没有 `error` 键（9.2 起类型上各带一个 `?: undefined` 对侧键，运行时不变，见上方「放宽」小节）；`AmagiError` 非空 |
| 4 | `meta.requestId` / `meta.clientId` 进入所有事件负载 |
| 5 | `http:request` / `http:response` 由 transport 真实发出 |
| 6 | 事件总线改为实例级（保留全局默认实例给静态 fetcher） |
| 7 | `platform.message` 由 runtime 统一提取，不再各平台自己捞 |
| 9, 10 | 判定收敛到唯一的 `judge`，getdata/internal 双判定消失 |
| 11 | `AmagiError` 只有一种形状 |
| 12, 14, 17, 26, 27, 28 | header 容器大小写不敏感；UA 清理在 transport 出口做一次 |
| 13 | 判定表用显式 `switch`，不再依赖 `&&` 短路 |
| 15 | `ErrorKind` 与平台码分离，不再复用数字 500 |
| 16 | HTTP 4xx/5xx 由 judge 映射为对应 `ErrorKind`，不再全量放行 |
| 18 | transport 深拷贝请求描述 |
| 19, 20, 21 | 同上（header 容器） |
| 22 | `build` 从校验后的 params 取值，删掉 `API.ts` 里的硬编码 |
| 23, 24, 25, 29, 30, 31, 32, 33 | 四平台共用同一 `defaultConfig` 契约，UA 版本集中维护 |
| 34, 35 | 纯计算端点的 `params` 补格式校验（BV 号正则、整数约束） |
| 36, 37, 38 | 签名器声明前置条件，`build` 保证满足；违反时是 `kind: 'internal'` 而非抛出 |
| 40, 41, 42, 43 | 签名状态随 client 实例，不再是模块单例 |
| 44, 45 | cookie 解析收敛到 `contracts/cookie.ts`，正则加锚点 |
| 46 | `getSearchId` 的 BigInt/string 拼接 bug 直接修 |
| 47, 48, 54 | 路由唯一性在启动期（方案 A 可到编译期）校验，冲突即失败 |
| 49 | `ErrorKind → HTTP status` 映射表 |
| 51 | `typeMode` 删除 |
| 52 | 参数类型从 schema `infer`，不存在「声明了但 schema 里没有」 |
| 53, 60 | schema 的 `refine` 与 `min(1)` 逐条修正 |
| 55, 56 | 数量类参数统一用 `coerce.number().int().positive()`，布尔不再被静默转 1 |
| 57, 58 | 快手 `comments` 补分页参数；`count` 改 `coerce` |
| 59 | 校验文案集中到一份 message catalog，统一语言 |
| 61 | `cursor` 语义统一（分页游标由 `paginate` 声明，不再各平台各定类型） |

### 保留（9 条，附理由）

| 编号 | 内容 | 保留理由 |
| --- | --- | --- |
| 39 | `VerifyFpManager` 用 `new Date()` 而非 `Date.now()` | 改了会让签名快照失效，而这个函数的输出本就要求随机。测试改为断言结构而非快照 |
| 50 | HTTP 服务无鉴权 | v7 提供 opt-in token 中间件与 `host` 参数，但**默认行为不变**（改默认属破坏性 A 档）。v8 再切默认值 |
| — | 响应类型可能过时 | 明确写进承诺：类型是实测快照，平台加字段不算 breaking。配三条逃生舱 |

> 剩余几条在实现阶段逐个确认 —— 有些 `KNOWN-DEFECT` 是 `it.each` 的
> 参数化标题（如「HTTP %i 被当作成功」），实际对应多个用例，
> 归属时按行为而非标题数计。

---

## 发布节奏

| 版本 | 内容 | 破坏性 |
| --- | --- | --- |
| 6.7.0 | 切环 + 契约下沉 + `wbi` 走 transport | 无 |
| 7.0.0-beta.x | 统一信封 + 会话抽象 + 删死码 | 有，附本文档 |
| 7.0.0 | 稳定 + `compat` 子路径 + codemod | 同上 |
| 7.1.0 | 端点注册表迁移完成（若选方案 A 混搭路径） | 无（对外形态不变） |
| 8.0.0 | 移除 `compat`；`startServer` 默认绑 `127.0.0.1`；语义视图 | 有 |
