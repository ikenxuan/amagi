# 统一响应体系

> 三个架构方案共用这一份设计。它是 v7 的核心，也是「不管网络错误、内部错误
> 还是请求成功，都要有一套标准接口响应体系」这个诉求的落点。

## 现状：一个字段三种形状

v6 声明 `Result.error` 的类型是 `APIErrorType`，实测有三种形状：

| 触发条件 | `error` 实际是 | 读法 |
| --- | --- | --- |
| 平台返回非 0 `status_code` | **`undefined`** | 无法读，`error.xxx` 直接抛 TypeError |
| `getdata` 自己造的错（空响应 / 内容过滤） | `ErrorDetail` | `error.errorDescription` |
| `networks` 造的错（传输失败） | `APIErrorType` | `error.amagiError.errorDescription` |

后两种**没有任何公共字段**。加上顶层 `code` 混用了 HTTP 状态码（200/500）与
平台业务码（`-352`/`-404`），以及四个平台各写一套成败判定
（`status_code!==0` / `code!==0` / `Object.values(枚举).includes(code)` ×2），
结果是**调用方无法写出一段跨平台通用的错误处理代码**。

---

## v7 信封

```ts
/** 所有对外 API 的唯一返回类型 */
export type AmagiResult<T> = AmagiSuccess<T> | AmagiFailure

export interface AmagiSuccess<T> {
  success: true
  /** 端点声明的返回类型 */
  data: T
  /** 面向人的简短说明，成功时固定为 '获取成功' */
  message: string
  meta: AmagiMeta
}

export interface AmagiFailure {
  success: false
  /** 唯一的错误载体，永不为 undefined */
  error: AmagiError
  /** 等价于 error.message，为兼容 v6 的 result.message 读法保留 */
  message: string
  meta: AmagiMeta
}
```

设计约束：

1. **`success` 是唯一判别键**，与 v6 一致。`if (r.success)` 之后 `r.data` 可用，
   `else` 之后 `r.error` 可用，两者互斥且都非 `undefined` —— 由类型保证。
2. **失败分支没有 `data`，成功分支没有 `error`。** v6 用
   `data: never` / `error: never` 声明却在运行时把键留成 `undefined`，
   v7 直接不声明该键。
3. **顶层没有 `code`。** HTTP 状态码在 `error.http.status`，
   平台业务码在 `error.platform.code`，amagi 自己的错误码在 `error.code`。
   三者语义不同，不再挤一个字段。
4. **`AmagiResult` 永不 reject。** 参数校验失败、内部异常、网络中断
   全部映射为 `success: false`。见下文「永不抛出」。

---

## 错误载体

```ts
export interface AmagiError {
  /** 判别键，跨平台统一的错误大类 */
  kind: ErrorKind
  /** 稳定的字符串错误码，可用于 switch 与埋点 */
  code: AmagiErrorCode
  /** 面向人的说明，取平台原文优先，缺失时用 catalog 里的兜底文案 */
  message: string
  /** 是否值得重试。调用方据此决定退避还是放弃 */
  retryable: boolean
  /** 平台原始错误码与文案，一个字都不丢 */
  platform?: { code: string | number; message?: string }
  /** 真实发生的 HTTP 状态（有请求才有） */
  http?: { status: number; statusText?: string }
  /** kind === 'validation' 时的字段级错误 */
  issues?: ValidationIssue[]
  /** 原始响应体。默认不带，client 开 debug 时才填 */
  raw?: unknown
  /** 底层 Error 对象，仅用于日志 */
  cause?: unknown
}

export interface ValidationIssue {
  /** 点号路径，如 'verify.stdParams.token' */
  path: string
  message: string
  /** 收到的值，用于排查 */
  received?: unknown
}
```

---

## 错误分类学

`kind` 是粗粒度分支（调用方通常只关心这一层），`code` 是细粒度归因（用于埋点）。

```ts
export type ErrorKind =
  | 'validation'   // 入参不合法，本地就能判定，没有发出请求
  | 'auth'         // 需要登录 / cookie 失效 / 权限不足于身份
  | 'rate_limit'   // 限频，退避后可重试
  | 'risk'         // 风控、验证码、需要人工介入
  | 'not_found'    // 资源不存在、已删除、已下架
  | 'forbidden'    // 有身份但无权限：地区限制、付费内容、隐私设置
  | 'unavailable'  // 平台侧不可用：5xx、维护、过载
  | 'network'      // 传输层失败：连接重置、DNS、代理
  | 'timeout'      // 超时
  | 'parse'        // 响应拿到了但解析不了：非 JSON、protobuf 损坏、反爬 HTML
  | 'internal'     // amagi 自身的 bug
  | 'unknown'      // 平台返回了没见过的错误码
```

`retryable` 的默认值由 `kind` 推导，端点可覆盖：

| kind | retryable | 说明 |
| --- | --- | --- |
| `rate_limit` `unavailable` `network` `timeout` | `true` | 退避后重试有意义 |
| `risk` | `true` | 但需要更长退避，且连续命中应停手 |
| `validation` `auth` `not_found` `forbidden` `parse` `internal` | `false` | 重试不会改变结果 |
| `unknown` | `false` | 保守 |

### `AmagiErrorCode`

字符串常量联合，不用 enum（v6 的 `bilibiliAPIErrorCode` 用字符串 `'-101'`
去比数字 `-101`，以及 `xiaohongshuAPIErrorCode` 混合 enum 导致
`Object.values()` 泄漏反向映射键，都是 enum 带来的）。

```ts
export type AmagiErrorCode =
  // validation
  | 'PARAM_INVALID' | 'PARAM_MISSING'
  // auth
  | 'COOKIE_MISSING' | 'COOKIE_EXPIRED' | 'LOGIN_REQUIRED'
  // rate_limit / risk
  | 'RATE_LIMITED' | 'RISK_CONTROL' | 'CAPTCHA_REQUIRED'
  // resource
  | 'NOT_FOUND' | 'DELETED' | 'PRIVATE' | 'GEO_RESTRICTED' | 'PAID_CONTENT'
  // platform / transport
  | 'PLATFORM_ERROR' | 'PLATFORM_UNAVAILABLE'
  | 'NETWORK_ERROR' | 'TIMEOUT'
  // decode
  | 'EMPTY_RESPONSE' | 'DECODE_FAILED' | 'ANTIBOT_PAGE'
  // internal
  | 'INTERNAL_ERROR' | 'UNKNOWN_ERROR'
```

---

## 平台判定表（`judge`）

每个平台一份纯函数，把原始响应映射为「成功」或一个 `AmagiError`。
**这是全仓唯一判定成败的地方**，取代 v6 里 4 个 `internal.ts` 的
`if (rawData.xxx)` 与 4 个 `GlobalGetData` 里的重复逻辑。

```ts
export interface JudgeVerdict {
  ok: boolean
  kind?: ErrorKind
  code?: AmagiErrorCode
  /** 覆盖 retryable 的默认推导 */
  retryable?: boolean
}

export type Judge = (raw: unknown, http: { status: number }) => JudgeVerdict
```

抖音示例：

```ts
export const douyinJudge: Judge = (raw, http) => {
  if (http.status >= 500) return { ok: false, kind: 'unavailable', code: 'PLATFORM_UNAVAILABLE' }
  if (http.status === 429) return { ok: false, kind: 'rate_limit', code: 'RATE_LIMITED' }
  if (raw === '' || raw == null) return { ok: false, kind: 'auth', code: 'EMPTY_RESPONSE' }

  const body = raw as { status_code?: number; filter_detail?: { filter_reason?: string } }
  if (body.filter_detail?.filter_reason) return { ok: false, kind: 'forbidden', code: 'DELETED' }

  switch (body.status_code) {
    case 0:        return { ok: true }
    case undefined: return { ok: true }        // 部分端点（emojiList）本就没有这个字段
    case 2154:     return { ok: false, kind: 'risk',  code: 'RISK_CONTROL' }
    case 8:        return { ok: false, kind: 'auth',  code: 'COOKIE_EXPIRED' }
    default:       return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }
  }
}
```

> 注意 `case undefined: return { ok: true }` —— v6 的
> `rawData.status_code !== 0` 会把任何没有 `status_code` 的成功响应判成失败。
> 判定表把「这个端点没有状态字段」变成一个显式的、可测的分支。

B站的判定同时修掉 A2（`data: {}` 与 `data: null` 结论相反）与 A3（`message` 丢失）：

```ts
export const bilibiliJudge: Judge = (raw, http) => {
  const body = raw as { code?: number; message?: string; data?: unknown; result?: unknown }
  if (body.code === 0) return { ok: true }        // 空负载不再当错误，交给 normalize 处理
  if (body.code === -412) return { ok: false, kind: 'risk', code: 'RISK_CONTROL', retryable: true }
  if (body.code === -101 || body.code === -658) return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED' }
  if (body.code === -404) return { ok: false, kind: 'not_found', code: 'NOT_FOUND' }
  if (body.code === -352) return { ok: false, kind: 'risk', code: 'RISK_CONTROL' }
  if (body.code === -509 || body.code === -799) return { ok: false, kind: 'rate_limit', code: 'RATE_LIMITED' }
  return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }
}
```

`platform.message` 由 runtime 从原始响应统一提取（`message` / `status_msg` /
`msg` 依次尝试），不再由各平台自己捞 —— 这是 A3 的根治点。

---

## 可观测性：`AmagiMeta`

```ts
export interface AmagiMeta {
  /** 每次逻辑调用一个 id，贯穿事件、日志、trace */
  requestId: string
  /** 发起调用的 client 实例 id；静态 fetcher 用 'static' */
  clientId: string
  platform: Platform
  /** 端点全名，如 'douyin.videoWork' */
  endpoint: string
  /** 从进入 fetcher 到返回信封的总耗时 */
  durationMs: number
  /** 实际发出的 HTTP 请求数，含重试与分页。分页 3 页 + 1 次重试 = 4 */
  attempts: number
  /** 每次底层请求的明细。默认不带，client 开 trace 时才填 */
  trace?: RequestTrace[]
}

export interface RequestTrace {
  url: string
  method: string
  status?: number
  durationMs: number
  /** 'initial' | 'retry' | 'page' | 'segment' | 'prepare' */
  reason: TraceReason
  /** 重试原因 */
  retryOf?: AmagiErrorCode
}
```

解决的问题：

- **A4（重试叠乘）**：`attempts` 把「一次调用打了 16 个请求」变成可见的数字，
  且 `trace[].reason` 能区分是端点内重试还是传输层重试。
- **缺陷 10（事件无关联 id）**：`requestId` / `clientId` 同时进事件负载，
  多实例并发时可归因。
- **缺陷 4 的性能问题**：wbi key 的前置请求会以 `reason: 'prepare'` 出现在
  trace 里，「每次签名都打一次 /nav」这件事变得肉眼可见。

事件负载统一带上 `meta`：

```ts
export interface ApiSuccessEvent { meta: AmagiMeta; data: unknown }
export interface ApiErrorEvent   { meta: AmagiMeta; error: AmagiError }
export interface HttpRequestEvent  { meta: AmagiMeta; trace: RequestTrace }
export interface HttpResponseEvent { meta: AmagiMeta; trace: RequestTrace }
```

`http:request` / `http:response` 这两个 v6 声明了却从未发射的事件，
在 v7 由 transport 真实发出（对应 KNOWN-DEFECT #5）。

---

## 永不抛出

v6 的 4 个 `internal.ts` 都是这个形状：

```ts
async function fetchXxxInternal(...): Promise<Result<T>> {
  try { ... return createSuccessResponse(...) }
  catch (error) { throw new Error(`抖音数据获取失败: ${message}`) }   // ← 声明返回 Result，却抛
}
```

于是调用方必须**同时**处理返回值里的错误和抛出的异常，且抛出时结构化信息全丢
（只剩一个字符串）。v7 的规则：

> **`AmagiResult` 永不 reject。** 唯一例外是调用方自己传入的回调抛出
> （如 `onChallenge`），此时原样上抛，因为那是调用方的代码。

映射规则：

| v6 行为 | v7 行为 |
| --- | --- |
| zod 校验失败 → `throw ZodError` 包成 `Error` | `success: false`，`kind: 'validation'`，`issues[]` 带字段路径 |
| `GlobalGetData` catch 里造的对象 | `success: false`，`kind` 由 judge 决定 |
| axios 非 AxiosError 异常原样上抛 | `success: false`，`kind: 'internal'`，`cause` 保留原始 Error |
| 签名函数抛错（如 `AB('')`） | `success: false`，`kind: 'internal'`，`code: 'INTERNAL_ERROR'` |

这是**破坏性变更 C 档**：v6 里靠 `try/catch` 捕获参数错误的代码在 v7 下不再进
catch。兼容层的处理见 [06-migration.md](./06-migration.md)。

---

## 字段命名规约

v6 的登录返回类型里同时存在 `expire_time` / `expires_in` / `redirectUrl` /
`verifyTicket` / `biz_trace_id` / `logged_in` / `wrongCode` —— 一个类型四种风格。
v7 用三条规则消除歧义：

| 位置 | 规约 | 例 |
| --- | --- | --- |
| **amagi 自有字段** | `camelCase` | `requestId` `durationMs` `retryable` `expiresAt` `maskedMobile` |
| **入参** | 保持平台原生 `snake_case` | `aweme_id` `bvid` `sec_uid` `qrcode_key` |
| **平台原始响应体** | 一个字不改 | `data.aweme_detail.aweme_id` |

「入参保持平台原生」是刻意的：用户是照着平台文档或抓包结果写参数的，
把 `aweme_id` 改成 `awemeId` 只会增加对照成本，且是纯破坏性变更。
而归一化输出（登录状态、分页游标、凭证）属于 amagi 自有字段，一律 camelCase。

时间字段统一后缀：

| 后缀 | 含义 | 类型 |
| --- | --- | --- |
| `At` | 绝对时刻 | Unix 毫秒 `number` |
| `Ms` | 时长 | 毫秒 `number` |
| `Sec` | 时长 | 秒 `number` |

v6 的 `expire_time`（绝对秒）+ `expires_in`（剩余秒）在 v7 里是
`expiresAt`（绝对毫秒）+ `expiresInSec`（剩余秒），语义从名字就能看出来。

---

## HTTP 模式的状态码映射

v6 的 HTTP 服务里，业务错误恒返回 200（`res.json(result)` 不设状态码），
而抛出的错误走 `res.status(errorResponse.code)` —— 一个 B站的 `-352`
会被喂给 `res.status()`。v7 用一张表：

| `ErrorKind` | HTTP status |
| --- | --- |
| `validation` | 400 |
| `auth` | 401 |
| `forbidden` `risk` | 403 |
| `not_found` | 404 |
| `timeout` | 408 |
| `rate_limit` | 429 |
| `internal` `parse` `unknown` | 500 |
| `network` | 502 |
| `unavailable` | 503 |

HTTP 响应体就是信封本身，额外补一个 `requestPath`：

```jsonc
// 成功
{ "success": true, "data": { ... }, "message": "获取成功",
  "meta": { "requestId": "...", "endpoint": "douyin.videoWork", "durationMs": 412, "attempts": 1 },
  "requestPath": "/api/douyin/fetch_one_work?aweme_id=7123" }

// 失败（HTTP 401）
{ "success": false,
  "error": { "kind": "auth", "code": "COOKIE_EXPIRED", "message": "登录状态已失效",
             "retryable": false, "platform": { "code": -101, "message": "账号未登录" } },
  "message": "登录状态已失效",
  "meta": { ... },
  "requestPath": "/api/bilibili/fetch_one_video?bvid=BV1xx411c7mD" }
```

`error.http.status` 保留的是 amagi 请求**平台**时拿到的状态码，
与 amagi 自己返回给调用方的 HTTP 状态码是两个不同的值，不要混淆。

---

## 响应类型的维护策略

删掉 `typeMode`（决策 ②）之后，`types/ReturnDataType/` 那 26,580 行从
「默认不生效的装饰」变成**关键路径**。必须同时给出维护策略，否则会出现
「平台加了个字段，用户拿不到，只能等我们发版」的新问题。

### 三条逃生舱

```ts
// ① 直接放弃类型
const r = await client.douyin.fetcher.fetchVideoWork({ aweme_id })
const raw = r.success ? (r.data as any) : null

// ② 显式泛型覆盖（每个端点都接受一个可选的响应类型参数）
const r2 = await client.douyin.fetcher.fetchVideoWork<MyVideoWork>({ aweme_id })
//    r2.data 是 MyVideoWork

// ③ client 级开关：整个实例都不做响应类型断言
const loose = amagi({ cookies, responseTypes: 'raw' })   // data: unknown
```

### 类型的稳定性承诺

写进 README 与 JSDoc：

> `types/ReturnDataType/` 下的类型是**某一时刻真实响应的实测快照**。
> 平台新增字段不视为 breaking change，也不保证及时补充。
> 需要访问未声明字段时用上面三条逃生舱之一，不要等我们发版。

对应地，所有响应接口不再用精确的封闭结构，而是允许扩展：

```ts
// 每个响应类型都继承这个，未声明的字段可访问且不报错
export interface PlatformPayload { [key: string]: unknown }
export interface DouyinVideoWork extends PlatformPayload {
  status_code: number
  aweme_detail: DouyinAwemeDetail
}
```

> 这一步很关键。没有索引签名的话，「删掉 typeMode」会把 v6 里
> 大量拿 `any` 硬读字段的代码全部变成编译错误，破坏性变更从 B 档滑到 C 档。
> 加上索引签名后，读未声明字段返回 `unknown` 而非报错，用户只需补一个断言。

### Phase 2：从样本生成

手写 26,580 行不可持续。Phase 2 的路线：

1. 在 `test/fixtures/<platform>/<endpoint>.json` 存真实响应样本（脱敏）。
2. 构建期用 `quicktype` / `json-to-ts` 生成 `.d.ts`，产物纳入版本控制。
3. 加一条测试：样本必须能通过生成的类型校验（防止手改类型后与样本脱节）。
4. 平台改字段时只需更新样本，类型自动跟随。

这条路线的前置是 v7 的架构落地（端点声明里有 `response` 槽位可以指向生成的类型），
所以不在 v7 范围内，但架构必须为它留位。

---

## 迁移前后对照

```ts
// ────────── v6 ──────────
try {
  const r = await client.bilibili.fetcher.fetchVideoInfo({ bvid })
  if (r.success) {
    console.log(r.data.data.title)          // any，写错字段不报错
  } else {
    // error 可能是 undefined / ErrorDetail / APIErrorType，三种读法
    console.error(r.code, r.message, (r.error as any)?.errorDescription
                                  ?? (r.error as any)?.amagiError?.errorDescription)
  }
} catch (e) {
  // 参数校验失败走这里
}

// ────────── v7 ──────────
const r = await client.bilibili.fetcher.fetchVideoInfo({ bvid })
if (r.success) {
  console.log(r.data.data.title)            // 精确类型
} else {
  console.error(r.error.kind, r.error.code, r.error.message)
  console.error('平台原始:', r.error.platform?.code, r.error.platform?.message)
  if (r.error.retryable) scheduleRetry()
}
// 不需要 try/catch —— 参数校验失败也走 else 分支，issues 里有字段路径
```

跨平台通用的错误处理（v6 写不出来）：

```ts
const handle = (r: AmagiResult<unknown>) => {
  if (r.success) return r.data
  switch (r.error.kind) {
    case 'auth':       return refreshCookieAndRetry()
    case 'rate_limit': return backoff(r.error.retryable)
    case 'risk':       return notifyHuman(r.error.message)
    case 'not_found':  return null
    default:           throw new Error(`[${r.meta.endpoint}] ${r.error.code}`)
  }
}
```

这段代码对四个平台的任意端点都成立 —— 这就是「统一响应体系」要达到的效果。
