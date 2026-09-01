# 会话与轮询

> 三个架构方案共用这一份设计。目标：把抖音 passport（1,593 行，游离在架构外）
> 与 B站扫码登录（形态完全不同）收归同一抽象，轮询提供回调，
> 且**类型签名严格到「回调返回错字段编译期报错」**。

## 现状：同一件事两套东西

| | 抖音 passport | B站扫码 |
| --- | --- | --- |
| 状态表达 | 判别联合 `status: new\|scanned\|verify\|confirmed\|expired\|risk\|busy\|unknown` | 原样透出平台码 `86101` / `86090` / `86038` / `0` |
| 凭证产出 | 归一化的 `cookie: string` | `data: { data, headers }` —— 让调用方自己从 `headers` 抠 `Set-Cookie` |
| 二次验证 | 有完整支持（发码 / 验码 / 多种 verify_way） | 无 |
| 轮询循环 | 调用方自己写 | 调用方自己写 |
| 是否走主流水线 | **否**，自建 `DouyinPassportClient` | 是（普通端点） |
| 字段命名 | `expire_time` / `expires_in` / `redirectUrl` / `verifyTicket` / `biz_trace_id` / `logged_in` / `wrongCode` 混用 | 平台原样 |

调用方要为两个平台写两套完全不同的登录代码，且 B站那份还要自己解析 HTTP 头。

---

## v7 抽象

会话是**一等概念**，与「单次请求的端点」并列。它复用同一套
`contracts` / `transport` / 信封 —— 这正是 passport 在 v6 里的问题所在。

### 状态机

```ts
/** 登录会话的状态。判别键是 phase */
export type LoginState =
  /** 二维码已就绪，等待扫码 */
  | { phase: 'pending';   qrcode: Qrcode }
  /** 已扫码，等待手机端确认 */
  | { phase: 'scanned';   qrcode: Qrcode }
  /** 需要二次验证，必须应答 challenge 才能继续 */
  | { phase: 'challenge'; challenge: LoginChallenge }
  /** 登录成功 */
  | { phase: 'success';   credential: Credential }
  /** 二维码过期，需要重新开始 */
  | { phase: 'expired' }
  /** 用户在手机端点了取消 */
  | { phase: 'rejected' }
  /** 触发风控 */
  | { phase: 'risk';      reason: string }
  /** 会话失败（网络、协议变更、内部错误） */
  | { phase: 'failed';    error: AmagiError }

export interface Qrcode {
  /** 二维码承载的内容，直接拿去生成图片 */
  content: string
  /** 轮询令牌。B站是 qrcode_key，抖音是 token */
  token: string
  /** 绝对过期时刻，Unix 毫秒 */
  expiresAt: number
  /** 剩余秒数，取码时算出 */
  expiresInSec: number
}

export interface Credential {
  /** 完整登录态 cookie 串，可直接传给 fetcher */
  cookie: string
  /** 凭证过期时刻，能从 cookie 里解析出来时才有 */
  expiresAt?: number
  /** 平台原始产物（抖音的 sso 响应、B站的 Set-Cookie 数组等） */
  raw?: unknown
}
```

**`Credential` 是跨平台统一的** —— B站不再透出 `headers` 让调用方自己抠。
`phase` 命名是四个平台通用的语义，不再暴露 `86101` 这种平台码
（想要的话在 `state.raw` 里）。

### Challenge

```ts
export type LoginChallenge = SmsChallenge | CaptchaChallenge

export interface SmsChallenge {
  kind: 'sms'
  /** 脱敏手机号，如 '138****8000' */
  maskedMobile: string
  /** 平台给出的可选验证方式，原样保留供排查 */
  availableWays: string[]
  /** 发送验证码。返回重发等待秒数 */
  sendCode(): Promise<AmagiResult<{ retryAfterSec: number }>>
}

export interface CaptchaChallenge {
  kind: 'captcha'
  imageUrl: string
  /** 极验/腾讯验证码等的初始化参数 */
  payload: Record<string, unknown>
}
```

### 应答类型 —— 严格签名的落点

```ts
/** 按 challenge 的 kind 决定应答的形状 */
export type ChallengeAnswer<C extends LoginChallenge> =
  C extends SmsChallenge     ? { code: string } :
  C extends CaptchaChallenge ? { ticket: string; randstr?: string } :
  never
```

于是回调的返回类型由传入的 challenge 精确决定：

```ts
onChallenge: <C extends LoginChallenge>(challenge: C) =>
  ChallengeAnswer<C> | Promise<ChallengeAnswer<C>>
```

编译期效果：

```ts
await session.watch({
  onChallenge: async (c) => {
    if (c.kind === 'sms') {
      await c.sendCode()
      return { code: '123456' }          // ✅
      // return { ticket: 'x' }          // ❌ 类型错误：sms 分支要求 { code: string }
      // return { code: 123456 }         // ❌ 类型错误：code 必须是 string
    }
    return { ticket: await solve(c.imageUrl) }   // ✅ captcha 分支
    // return { code: '1' }              // ❌ 类型错误：captcha 分支不接受 code
  }
})
```

> `c.kind === 'sms'` 收窄后 `C` 被推断为 `SmsChallenge`，
> `ChallengeAnswer<SmsChallenge>` 求值为 `{ code: string }`。
> 这是「类型签名必须严格设计好」的具体实现方式：
> **不用可选字段的宽松对象，而用条件类型让每个分支只接受它该接受的字段。**

---

## 三种消费方式

同一个引擎，三个出口。选哪个取决于调用方的运行环境。

### ① 回调（推荐，适合 CLI / 机器人 / 服务端一次性登录）

```ts
export interface WatchHandlers {
  /** 二维码就绪。同一个会话里只会调用一次 */
  onQrcode?: (qrcode: Qrcode) => void | Promise<void>
  /** 已扫码待确认 */
  onScanned?: () => void | Promise<void>
  /** 需要二次验证。返回值驱动状态机前进 */
  onChallenge?: <C extends LoginChallenge>(challenge: C) => ChallengeAnswer<C> | Promise<ChallengeAnswer<C>>
  /** 每次状态变化都会调用，用于日志 */
  onState?: (state: LoginState) => void
  /** 登录成功 */
  onSuccess?: (credential: Credential) => void | Promise<void>
  /** 终止性失败（expired / rejected / risk / failed） */
  onError?: (error: AmagiError, state: LoginState) => void | Promise<void>
}

export interface WatchOptions extends WatchHandlers {
  signal?: AbortSignal
  /** 整个会话的超时。默认取二维码的 expiresAt */
  timeoutMs?: number
  /** 轮询间隔的下限，防止服务端给出过小的 interval。默认 1000 */
  minIntervalMs?: number
}

/** 返回终态。永不 reject（除调用方回调自己抛出） */
watch(options: WatchOptions): Promise<AmagiResult<Credential>>
```

用法：

```ts
const ac = new AbortController()
const result = await client.douyin.login.qrcode().watch({
  onQrcode:  (qr) => renderQrcodeImage(qr.content, qr.expiresInSec),
  onScanned: ()   => console.log('已扫码，请在手机上确认'),
  onChallenge: async (c) => {
    if (c.kind !== 'sms') throw new Error('暂不支持图形验证码')
    const sent = await c.sendCode()
    if (!sent.success) throw new Error(sent.error.message)
    console.log(`验证码已发至 ${c.maskedMobile}，${sent.data.retryAfterSec}s 后可重发`)
    return { code: await prompt('请输入验证码: ') }
  },
  onSuccess: (cred) => saveCookie(cred.cookie),
  signal: ac.signal
})

if (result.success) use(result.data.cookie)
else console.error(result.error.kind, result.error.message)
```

**没有 `onChallenge` 时**：遇到 `challenge` 阶段直接终止，返回
`kind: 'auth'` / `code: 'CAPTCHA_REQUIRED'` 的失败信封，
`error.raw` 里带上 challenge 对象，调用方可以自己处理后重开会话。

### ② AsyncIterable（适合把状态推给 UI / WebSocket）

```ts
const session = client.bilibili.login.qrcode()

for await (const state of session) {
  ws.send(JSON.stringify({ phase: state.phase }))

  switch (state.phase) {
    case 'pending':   showQrcode(state.qrcode.content); break
    case 'scanned':   showHint('已扫码'); break
    case 'challenge': await session.answer(await askUser(state.challenge)); break
    case 'success':   save(state.credential.cookie); break
    case 'expired':
    case 'rejected':
    case 'risk':
    case 'failed':    showError(state); break
  }
}
```

`switch` 上的 `phase` 是判别联合，漏分支时 `default: assertNever(state)` 会报错
—— 平台以后新增状态，所有调用点在编译期就能被找出来。

`session.answer(answer)` 用于 challenge 阶段推进；类型是
`answer<C extends LoginChallenge>(a: ChallengeAnswer<C>): Promise<void>`，
和回调路径共享同一套约束。

### ③ 手动单步（适合把会话状态存进外部队列 / 无状态 HTTP 服务）

```ts
const session = client.douyin.login.qrcode()

// 第一步：取码。返回 { state, token } —— token 用于之后恢复会话
const first = await session.start()
await redis.set(`login:${uid}`, session.serialize())

// 之后每次轮询（可以在另一个进程里）
const resumed = client.douyin.login.resume(await redis.get(`login:${uid}`))
const state = await resumed.next()
await redis.set(`login:${uid}`, resumed.serialize())
```

`serialize()` / `resume()` 是对 v6 现状的正式化：v6 的 passport 就是把会话
装在 cookie 串里让调用方来回传，只是没有名字也没有类型。
v7 把它变成显式 API，且 `serialize()` 的产物是 opaque string
（内部含 cookie + token + 平台标识 + 版本号），调用方不需要知道结构。

---

## 引擎与策略

```ts
/** 平台只需实现这个接口，轮询循环 / 超时 / 退避 / 取消全在引擎里 */
export interface QrcodeLoginStrategy {
  readonly platform: Platform
  /** 取二维码 */
  start(ctx: SessionCtx): Promise<AmagiResult<{ qrcode: Qrcode; ctx: SessionCtx }>>
  /** 单次轮询 */
  poll(ctx: SessionCtx): Promise<AmagiResult<{ state: LoginState; ctx: SessionCtx; intervalMs: number }>>
  /** 应答 challenge（只有支持二次验证的平台需要实现） */
  answer?(ctx: SessionCtx, challenge: LoginChallenge, answer: unknown):
    Promise<AmagiResult<{ ctx: SessionCtx }>>
  /** 从 opaque string 恢复 */
  deserialize(blob: string): SessionCtx
  serialize(ctx: SessionCtx): string
}
```

引擎负责的部分（四个平台一次写好）：

- 轮询循环与 `intervalMs` 退避（取服务端给的 `interval`，
  下限 `minIntervalMs`，`busy` 状态时加倍）
- `expiresAt` 超时 → `phase: 'expired'`
- `AbortSignal` 取消 → 返回 `kind: 'internal'` / `code: 'ABORTED'` 的失败信封
- challenge 的应答编排（等回调 → 调 `strategy.answer` → 继续轮询）
- 每次轮询进 `trace`，`attempts` 累加
- 事件：`session:state` / `session:success` / `session:error`，都带 `meta`

平台策略只写协议细节。抖音的实现直接复用现有的
`platform/douyin/passport/`（1,593 行原样保留，它是正确的），
外面套一层适配：

```ts
// platforms/douyin/session/qrcode.ts
export const douyinQrcodeStrategy: QrcodeLoginStrategy = {
  platform: 'douyin',

  async start (ctx) {
    const client = new DouyinPassportClient(ctx.cookie, ctx.requestConfig)
    await client.bootstrap()
    const res = await client.request('/passport/web/get_qrcode/', { /* ... */ })
    const qr = parseQrcode(res.body)
    if (!qr) return fail('DECODE_FAILED', res)
    return ok({
      qrcode: {
        content: qr.content,
        token: qr.token,
        expiresAt: qr.expireTime * 1000,                                  // 秒 → 毫秒
        expiresInSec: Math.max(0, qr.expireTime - Math.floor(Date.now() / 1000))
      },
      ctx: { ...ctx, cookie: res.cookie, token: qr.token }
    })
  },

  async poll (ctx) { /* check_qrconnect + parsePollResult → LoginState */ },
  async answer (ctx, challenge, answer) { /* send_code / validate_code */ },
  serialize, deserialize
}
```

B站的策略把 v6 那个「返回 `{ data, headers }`」的形状收进内部：

```ts
// platforms/bilibili/session/qrcode.ts
async poll (ctx) {
  const res = await ctx.transport.send({ method: 'GET', url: bilibiliApi.qrcodeStatus({ qrcode_key: ctx.token }) })
  const code = (res.body as { data: { code: number } }).data.code
  switch (code) {
    case 86101: return ok({ state: { phase: 'pending',  qrcode: ctx.qrcode! }, ctx, intervalMs: 2000 })
    case 86090: return ok({ state: { phase: 'scanned',  qrcode: ctx.qrcode! }, ctx, intervalMs: 2000 })
    case 86038: return ok({ state: { phase: 'expired' },                       ctx, intervalMs: 0 })
    case 86083: return ok({ state: { phase: 'rejected' },                      ctx, intervalMs: 0 })
    case 0:     return ok({
      state: { phase: 'success', credential: { cookie: mergeSetCookie(res.headers), raw: res.body } },
      ctx, intervalMs: 0
    })
    default:    return ok({ state: { phase: 'failed', error: platformError(code, res) }, ctx, intervalMs: 0 })
  }
}
```

`mergeSetCookie(res.headers)` 就是 v6 让调用方自己做的那件事，
现在在平台策略内部完成 —— 调用方拿到的是统一的 `Credential`。

---

## 会话在客户端上的位置

```ts
client.douyin.login.qrcode(options?)     → LoginSession
client.douyin.login.resume(blob)         → LoginSession
client.bilibili.login.qrcode(options?)   → LoginSession
client.bilibili.login.resume(blob)       → LoginSession
// 快手 / 小红书暂无扫码登录实现，属性不存在（类型层面也不存在，不是运行时报错）
```

类型上用条件属性表达「只有支持登录的平台才有 `login`」：

```ts
type PlatformModule<P extends Platform> = {
  fetcher: BoundFetcherOf<RegistryOf<P>>
  sign: SignerOf<P>
} & (P extends 'douyin' | 'bilibili' ? { login: LoginNamespace } : {})
```

于是 `client.kuaishou.login` 是编译错误，而不是运行时 `undefined.qrcode()`。

---

## v6 低阶方法的去向

v6 的 7 个登录相关方法**全部保留**（deprecated 但可用），
因为它们是有状态流程的手动分解，某些场景（无状态 HTTP 服务）确实需要：

| v6 方法 | v7 状态 | 替代 |
| --- | --- | --- |
| `requestPassportQrcode` | 保留 | `client.douyin.login.qrcode().start()` |
| `checkPassportQrcode` | 保留 | `session.next()` |
| `sendPassportVerifyCode` | 保留 | `challenge.sendCode()` |
| `validatePassportVerifyCode` | 保留 | `session.answer({ code })` |
| `requestLoginQrcode`（B站） | 保留 | `client.bilibili.login.qrcode().start()` |
| `checkQrcodeStatus`（B站） | **返回形状变化** | `session.next()` |
| `fetchLoginStatus`（B站） | 不变 | 它是普通端点，不属于会话 |

`checkQrcodeStatus` 是唯一有破坏性变更的一个：v6 返回
`{ data: { data, headers } }`，v7 返回统一信封且不透出 `headers`。
兼容层 `@ikenxuan/amagi/compat` 会保留旧形状一个大版本。

`douyinPassport` 工具集（底层构件：`DouyinPassportClient` / `CookieJar` /
`TicketGuard` / `aBogus` / `sm3` / 各 parser）也全部保留导出 ——
它们是协议层构件，有人会拿去自己编排。

---

## 顺带修掉的字段命名

按 [01 的命名规约](./01-response-envelope.md#字段命名规约)，
v6 那批混用的字段在 v7 里的对应关系：

| v6 | v7 | 说明 |
| --- | --- | --- |
| `expire_time`（绝对秒） | `qrcode.expiresAt`（绝对毫秒） | `At` 后缀 = 绝对时刻 |
| `expires_in`（剩余秒） | `qrcode.expiresInSec` | `Sec` 后缀 = 时长（秒） |
| `logged_in` | 由 `phase === 'success'` 表达 | 冗余字段删除 |
| `redirectUrl` | 内部字段，不再对外 | 引擎自己跟随 SSO 跳转 |
| `verifyTicket` / `encryptUid` / `stdParams` / `newVerifyFlow` / `diversionTag` | 收进 `SessionCtx`，不对外 | 调用方不需要知道 |
| `verifyWays: { verifyWay, mobile }[]` | `challenge.availableWays: string[]` + `challenge.maskedMobile` | 拆成两个语义清晰的字段 |
| `biz_trace_id` | 收进 `SessionCtx` | v6 要求调用方发码/验码传同一个值，v7 由引擎维护 |
| `verify_way` | 收进 `SessionCtx` | 同上 |
| `retryAfter` | `retryAfterSec` | 补单位后缀 |
| `wrongCode: boolean` | `error.code === 'PARAM_INVALID'` + `retryable: true` | 归入统一错误体系 |
| `ok: boolean` | 由信封的 `success` 表达 | 冗余字段删除 |

v6 里「调用方必须记得把 `biz_trace_id` 和 `verify_way` 在发码与验码之间
原样传回，否则验证失败」这类隐式契约全部由引擎接管 ——
这是把状态机做成一等概念之后自然消失的一类 bug。

---

## 测试策略

会话是有状态流程，测试要能驱动状态序列而不发真实请求。
沿用现有测试基线的 adapter 注入手法：

```ts
// 用脚本化的 adapter 驱动一整条登录路径
const h = scriptedAdapter([
  { match: '/get_qrcode/',      body: qrcodeResponse },
  { match: '/check_qrconnect/', body: pollNew },
  { match: '/check_qrconnect/', body: pollScanned },
  { match: '/check_qrconnect/', body: pollVerify },
  { match: '/send_code/',       body: sendCodeOk },
  { match: '/validate_code/',   body: validateOk },
  { match: '/check_qrconnect/', body: pollConfirmed }
])

const states: LoginState['phase'][] = []
const result = await client.douyin.login.qrcode({ adapter: h.adapter }).watch({
  onState:     (s) => states.push(s.phase),
  onChallenge: async (c) => { await c.sendCode(); return { code: '123456' } }
})

expect(states).toEqual(['pending', 'scanned', 'challenge', 'success'])
expect(result.success).toBe(true)
expect(result.data.cookie).toContain('sessionid=')
```

必须覆盖的路径：

- 完整成功（无 challenge）
- 完整成功（经过 sms challenge）
- 二维码过期（`expiresAt` 到点）
- 用户拒绝
- 风控
- `busy` 限频退避（间隔加倍）
- `AbortSignal` 取消
- 没有 `onChallenge` 时遇到 challenge → 失败信封且 `error.raw` 带 challenge
- `serialize()` → 新进程 `resume()` → 继续轮询
- 类型测试：`onChallenge` 返回错字段编译报错（`*.test-d.ts` + `@ts-expect-error`）
