# PR #188 迁进 v7：评估与方案

> 源：`main` 的 `056ae3a feat(douyin): 新增免鉴权接口，修复风控与 webid 相关问题 (#188)`
> （14 文件 / +834 −40，作者 @OduckO）
> 目标：`refactor-v7`（本文写于 `task/3`，HEAD `1023aeb`）
> 下游：`kkkkkk-10086@2403e75`「抖音号、原声、限时表情走 amagi 免鉴权接口」

## 一句话

**不能 cherry-pick，但也不需要大重构。** 那 14 个文件里 9 个在 v7 已不在主路径上
（`internal.ts` / `getdata.ts` / `bound.ts` / `guest.ts` / `types.ts` 那一层整层被删），
所以这是一次「按能力重新落点」。九项改动里 **3 项 v7 已经结构性具备**（不用迁）、
**4 项是一行到十行的落点搬迁**、**2 项要新开扩展点**（webid 的响应侧回收、风控换参重试）——
后两项就是需要拍板的「小重构」，各约 30 行，形状照抄 `1548725` 加 `error.challenge`
那次的做法。

---

## 一、九项改动在 v7 的落点

| # | PR #188 的改动 | v7 现状 | 要做什么 | 量级 |
|---|---|---|---|---|
| 1 | 4 条免鉴权 methodType | 缺 | 4 个新 `endpoints/*.ts`，`sign: false` + `dropHeaders: ['cookie']` | 中（撞 5 处快照/门禁） |
| 2 | `x-secsdk-web-signature` 纯算签名 | 缺 | 搬 `secsdkWebSign.ts` + 复合进现有签名器 | 中 |
| 3 | webid 改读响应头、按 ttwid 缓存、删 13 处写死值 | **13 处写死值一字不差地在 v7 里**（`platforms/douyin/api.ts:216…678`） | 新增平台级响应观察钩子 + `webid.ts` + 注入进签名管线 | **高（要动 contracts + runtime）** |
| 4 | 风控时换整套参数重试（≤5 次） | `retryOn` 有，但**原样重放同一个 spec** | 让重试循环重新 `build`+`sign`（opt-in） | **高（要动 contracts + runtime）** |
| 5 | 失败信封带真实业务码而非恒 500 | **已具备**：`error.platform.code` / `error.http.status` / `error.code` 三者分开 | 只需给 `douyinJudge` 的 `status_code !== 0` 分支补 `kind`/`code` | 低 |
| 6 | 收紧非 JSON 判据，别误伤综合搜索分块流 | **已具备**：v7 的 judge 跑在 `decode` **之后**，且 `search` 自带 `searchJudge` 绕开公共前置 | 不迁。但发现一处 v7 自己的残留缺陷，见 §四.3 | 低 |
| 7 | 作品详情走 `www-hj` 边缘 + 视频页参数 | 缺 | `api.ts:206` 改 host + 加两个 query | 一行 |
| 8 | `emojiList` 补 `need_all=true`；修 `dynamicEmojiList` 的 `scenes` 双重编码 | 缺（**两个 bug 都随搬迁进了 v7**） | `api.ts:305` / `api.ts:544` | 各一行 |
| 9 | 空响应提示语列出三种成因 | 缺 | `JudgeVerdict` **没有 `message` 字段**，只能改 `DEFAULT_ERROR_MESSAGES` 或新增一个 code | 低（受 contracts 约束） |

两个容易改错的地方：

- `packages/core/src/platform/douyin/API.ts`（**单数**，599 行）是 v7 主路径不读的冻结副本，
  但仍从 `douyinUtils.douyinApiUrls` 对外暴露、并被 `test/platform/api-urls.test.ts` 的快照锁着。
  PR #188 改的是它；v7 要改的是 `platforms/douyin/api.ts`（**复数**）。
- `validation/douyin.ts` 在 v7 主路径上**不再参与请求校验**（校验长在端点 `params` 上，
  `runtime/execute.ts:327`），它只服务 legacy 导出面与 `DouyinDataOptions<T>` 类型。
  但 `test/validation/contract.test.ts` 会交叉校验 `DouyinValidationSchemas` × `DouyinMethodRoutes`，
  两张表要么都加、要么都不加。

---

## 二、必须新开的两个扩展点（这就是「小重构」）

### 2.1 webid：平台级响应观察钩子

webid 的难点不是算法（v6 那 71 行几乎可以原样搬），是**它要求 URL 构造依赖一个运行期才知道的值**——
这在 v7 里是第一次。

拆成三件事，各自的落点：

**① 回收（读响应头）。** 能拿到 `RawResponse`（含 `headers: AmagiHeaders`）的只有两处：
端点自己的 `decode(raw, res)`，以及 `prepare` 里 `await ctx.send(...)` 的返回值。
两条都不行：走 `decode` 要改 19 个端点，走 `prepare` 要多发一次请求。

> **建议**：给 `ExecuteOptions` 加一个可选的平台钩子，在 `runSpec` 的 send 之后调用一次：
>
> ```ts
> // contracts/endpoint.ts 或 runtime/execute.ts
> observe?: (res: RawResponse, ctx: EndpointCtx) => void
> ```
>
> 形状与既有的 `challenge?: ChallengeExtractor`（`runtime/execute.ts:73`）完全同构：
> 声明在 `ExecuteOptions`，值来自 `PLATFORM_RUNTIME.douyin`，由三个入口
> （`client/fetcher.ts` / `client/static.ts` / `platform/*/routes.ts` 共用的
> `makeClientCtx`）统一注入。`1548725` 加 `error.challenge` 时走的就是这条路，
> 有现成的测试与文档位置（`docs/v7/dev/internals/transport.mdx`）。

**② 缓存。** 新建 `platforms/douyin/webid.ts`，形状照 `platforms/kuaishou/did.ts`：
模块级 `Map<ttwid, webid>` + 进程级单例。ttwid 从 `ctx.cookie` 用
`getCookieValue(cookie, 'ttwid')`（`contracts/cookie.ts:52`）取 —— 不要照抄 v6 那个正则，
仓库已经有唯一一份 cookie 解析。

> `kuaishou/did.ts:151-162` 已经如实记账过同一个取舍：**这是进程级的、不是每 client 一份**，
> 因为端点定义本身就是模块级单例。webid 沿用同一条记账，别在这一轮改。

**③ 注入。** webid 必须在 a_bogus **之前**进 query。v7 里签名器的契约正好合适：
`SignFn = (spec, ctx) => RequestSpec`，能改 URL、能读 `ctx.cookie`。所以把它做成签名管线的第一段：

```
withWebid → a_bogus / x_bogus → secsdk
```

三段全在 `platforms/douyin/sign/signers.ts` 里复合，`createDouyinSigners()` 的两个键
（`'a-bogus'` / `'x-bogus'`）各返回复合后的函数。**`api.ts` 里 13 处 `webid:` 只删不加**，
`getBaseParams()` 也不用改签名 —— 这样避开了「让同步的 URL 构造依赖运行期状态」那条最脏的路。

代价如实记着：`sign: false` 的两个端点（`emojiList` / `search`）拿不到 webid。
v6 也是这样（它的 `withDouyinWebid` 只在 `buildSignedUrl` 里被调），行为一致。

### 2.2 风控换参重试：让重试循环重新 build + sign

`retryOn` 已经实现（`runtime/execute.ts:381-403`），B站 20 个端点在用（`retryOn: ['RISK_CONTROL']`）。
但它**原样重放同一个已签名的 spec** —— 而 PR #188 的整个前提是「Argus 按单次请求的 token 组判定，
换一组就过」。同一个 `msToken` + 同一个 `a_bogus` 重发 3 次，结果必然相同。抖音这边现在
**一个端点都没声明 `retryOn`**，所以今天连原样重放都没有。

需要的改动集中在一处：把 `build → sign` 收进 `runSpec` 的重试循环，且**必须 opt-in**——
分页分支的注释（`execute.ts:409-410`）已经写明，快手那类带可变状态的签名器会被多推一格。

```ts
// contracts/endpoint.ts
/** 重试时重新 build + 重新签名（而不是重放同一个 spec）。风控按单次 token 组判定的平台需要它 */
retryFresh?: boolean
```

`runSpec` 已经有现成的形状可以复用：分页分支（`execute.ts:412-422`）就是
「每轮重新 build + 重新 sign」的回调，把那段抽成一个 `buildOne(params)` 给两边共用即可。

顺带两个 v6 里说得不准的地方，迁的时候别照抄进注释：

- v6 说「`DouyinData` 每次调用都会重新生成 msToken / verifyFp / a_bogus」——
  **`verifyFp` / `fp` 是模块级常量**（v6 `API.ts:54`、v7 `api.ts:153` 都是
  `const fp = douyinSign.VerifyFpManager()`），进程内恒定。真正每次都变的是
  `msToken`（build 时算）与 `a_bogus`（sign 时算，含时间戳）。
- 次数：v6 是 5 次 + 线性退避 0.4s；v7 的 `DEFAULT_MAX_RETRIES` 是 3 + 指数退避 1/2/4s。
  要 5 次就得再加一个 per-endpoint 的 `maxRetries` 槽位 —— 建议先按 v7 的 3 次落地，
  少一个槽位；真不够再加。

---

## 三、4 条免鉴权端点：不需要新机制

「免鉴权」在 v7 里**已经能声明出来**，不用给 `EndpointDef` 加 `auth` 字段：

| 诉求 | v7 的现成写法 |
|---|---|
| 不加签名 | `sign: false`（`contracts/endpoint.ts:99`，`emojiList` 已在用） |
| 不发 cookie | `dropHeaders: ['cookie']`（`contracts/request.ts:167`，在所有 header 合并**之后**删，所以能删掉 `attachCookie` 写的头和用户单次传进来的头） |
| 换 UA / 换 host | `build` 返回的 `headers` 覆盖基线 |
| 桌面基线头与 `iesdouyin` / `amemv` 不匹配 | 同一个 `dropHeaders` 一并删掉 `referer` / `sec-fetch-*` / `sec-ch-ua*` |

> `dropHeaders` 目前全仓只有快手 H5 那两个端点在用，且**没有一个端点用它删过 cookie**——
> 这 4 条会是第一次。注意快手 `KUAISHOU_H5_DROP_HEADERS` 里**没有** `'cookie'`，
> 它 JSDoc 里那句「不发 Cookie 头」指的是不注入 did，用户配了 cookie 照样发。
> 别把那个清单当成「免鉴权」的先例来抄。

一条草稿（其余三条同形）：

```ts
// platforms/douyin/endpoints/guestUserInfo.ts
export const guestUserInfo = defineEndpoint({
  name: 'douyin.guestUserInfo',
  route: '/fetch_guest_user_info',
  doc: { summary: '抖音号转用户信息（免鉴权）' },
  params: zod.object({ unique_id: zod.string().min(1, { error: '抖音号不能为空' }) }),
  build: (p) => ({
    method: 'GET',
    url: douyinApiUrls.getGuestUserInfo(p),
    dropHeaders: DOUYIN_GUEST_DROP_HEADERS   // ['cookie', 'referer', 'sec-fetch-site', ...]
  }),
  sign: false,
  response: type<DouyinReturnTypeMap['guestUserInfo']>()
})
```

要同步登记的地方（这就是 v7「加一个接口改 1 个文件」的那个 1 之外的派生物）：

1. `platforms/douyin/endpoints/index.ts` —— `douyinRegistry` + 末尾 re-export
2. `platforms/douyin/api.ts` —— 4 个 URL 构造方法 + `GUEST_BASE` / `EMOJI_RESOURCE_URL` 两个常量
3. `types/ReturnDataType/Douyin/index.ts` —— `DouyinReturnTypeMap` 4 个条目
4. `client/method-names.ts` —— 只有不规则名才要；`guestUserInfo → fetchGuestUserInfo`
   是规则派生，**可以不加**（`fetcher.ts:192` 的 `fetch + 首字母大写` 兜底）。
   但下游 `kkkkkk-10086` 探针查的正是 `fetchGuestUserInfo` 这几个名字，
   建议显式写进表里，别依赖兜底
5. `validation/douyin.ts` 的两张表（见 §一 的第二条提醒）
6. `packages/core/openapi.json` —— 跑 `pnpm openapi` 重新生成，它被 `openapi:check` 逐字节锁

---

## 四、顺手发现的三处 v7 自己的问题

这三条不在 PR #188 里，是这次读代码时撞出来的，与「配了 CK 也有概率失败」直接相关。

### 4.1 `douyinJudge` 的业务码分支给的是裸 `{ ok: false }`

`platforms/douyin/judge.ts:47-49`：`status_code` 非 0 时返回 `{ ok: false }`，没有 `kind`/`code`。
于是 `fromVerdict` 兜底成 `kind: 'unknown'` + `code: 'PLATFORM_ERROR'` + `retryable: false`
（`execute.ts:207-218`）。真实业务码仍在 `error.platform.code` 里没丢。

> **2026-09-06 更正**：这一条我先写成了「抖音的风控业务码永远进不了 `risk`，`retryOn` 因此空转」，
> 并据此把它列为「§二.2 能否生效的前置」。**那个因果是错的。**
> 抖音的 Argus 拦截根本不走业务码 —— 它的响应体是**纯文本**
> （`Blocked by ArgusSecurityPlugin …`），命中的是 `contracts/error.ts:274` 的
> `verdictFromNonJsonBody`，早就被判成 `risk` / `ANTIBOT_PAGE` / `retryable: true`。
> 所以 `retryOn: ['ANTIBOT_PAGE']` 不需要任何 judge 改动就能生效。
>
> 另外 `docs/v7/01-response-envelope.md:180-190` 那份设计稿里的
> `2154 → risk` / `8 → auth` 是**示意，不是实测的码表**。抖音没有公开业务码表，
> 同一个码在不同接口含义还不一样（`5` 在 `dynamicEmojiList` 是「参数不合法」、
> 在 `guestUserInfo` 是「抖音号不存在」）。编一张表出来只会制造假的确定性。
>
> 实际做法：把裸 `{ ok: false }` 写成显式的 `unknown` / `PLATFORM_ERROR` /
> `retryable: false` —— 行为一个字不变，但「不分类」从此是一个声明，
> 而不是从兜底里继承来的副作用。

### 4.2 `searchJudge` 把 Argus 拦截报成「cookie 失效」

`platforms/douyin/endpoints/search.ts:21-23`：非对象一律 `auth` / `COOKIE_EXPIRED`。
搜索被 Argus 拦下来时响应体是纯文本，走的正是这一支 —— 于是**报出来的是「ck 失效」**，
和 PR #188 花了两轮才排查掉的那个误导完全同型，只是换了一个位置。

建议：`searchJudge` 在判 `auth` 之前先过一次 Argus 关键字（`/ArgusSecurityPlugin|Blocked by/i`），
命中判 `risk` / `ANTIBOT_PAGE`。

### 4.3 空响应的文案：有一个现成的空槽位

`douyinJudge:24-26` 把 `raw === ''` 判成 `auth` / `COOKIE_EXPIRED`，而
**`JudgeVerdict` 没有 `message` 字段**（`contracts/error.ts:198`）——judge 只能分类，
改不了文案，文案只能来自 `DEFAULT_ERROR_MESSAGES`。

但 `AmagiErrorCode` 里**已经有 `'EMPTY_RESPONSE'`**（`contracts/error.ts:73`，
兜底文案 `'平台返回了空响应'`），而且它**全仓一处都没用过** —— 声明了却没人判。
所以这条最省：

- `douyinJudge` 的空响应分支从 `COOKIE_EXPIRED` 改判 `EMPTY_RESPONSE`；
- 三种成因的话写进 `DEFAULT_ERROR_MESSAGES.EMPTY_RESPONSE`，因为没有别的平台在用它，
  **改它的影响面是零**，不像改 `COOKIE_EXPIRED` 会波及另外三个平台。

不用新增 code，不用动联合类型。顺带把一个空声明填上了。
唯一要确认的是「空响应不再算 `kind: 'auth'`」这个语义变化 ——
`EMPTY_RESPONSE` 该归 `parse` 还是保留 `auth`，需要你拍（见 §六 决策 6）。

---

## 五、会被打到的门禁与派生物

八道门禁照旧（`typecheck` / `test` / `test:types` / `lint` / `deps:check` / `types:size` /
`openapi:check` / `types:check`）。其中**一定会红、需要一起改**的：

| 位置 | 为什么会红 | 处置 |
|---|---|---|
| `test/contracts/endpoint-doc.test.ts:22` | 硬编码 `['douyin', douyinRegistry, 19]` | 改成 23，并给 4 条新端点写 ≤40 字的 `doc.summary` |
| `test/contract/__snapshots__/fetcher-surface.test.ts.snap` | fetcher 方法名清单 | 新增 4 个方法名，正常更新 |
| `test/server/__snapshots__/routes.test.ts.snap` | 路由从 registry 派生 | 新增 4 条路由，正常更新 |
| `packages/core/openapi.json` | 逐字节锁 | `pnpm openapi` 重新生成 |
| `test/platforms/douyin/api.test.ts` | 16 条 URL 逐项对照 v6 | 删 webid / 改 host / 加 `need_all` / 修 `scenes` 都会打到，逐条改断言 |
| `test/platforms/douyin/judge.test.ts` | judge 分类变化 | §四.1 的分支要补用例 |
| `test/platforms/douyin/signers.test.ts` | 签名管线复合了 webid + secsdk | 补「webid 在 a_bogus 之前」「secsdk 只对策略表内 path 生效」两组 |
| `test/runtime/execute.test.ts` | 新 `observe` 钩子与 `retryFresh` | 各补一组 |
| `test/client/runtime.test.ts` | `PLATFORM_RUNTIME.douyin` 多一个键 | 照 `challenge` 那次改 |
| `packages/response-types` + `types:check` | 4 个新响应类型 | 见下 |

**不会被打到、但值得确认一遍的**：

- `test/platform/__snapshots__/sign-douyin.test.ts.snap`（签名快照，PRD 里的红线）——
  只要不碰 `sign/a_bogus.ts` / `sign/x_bogus.ts` 就一字不变。**新增 secsdk 是加一个新文件，
  不改这两个**；复合发生在 `signers.ts`（管线层，不进这份快照）。
  如果这份快照变了 → 一定是搬错了，不要 `vitest -u`。
- `test/platform/__snapshots__/api-urls.test.ts.snap` 锁的是**单数** `platform/douyin/API.ts`。
  只要不动那个冻结副本就不红 —— 但那意味着 `douyinUtils.douyinApiUrls` 对外暴露的 URL
  与主路径分叉更远（写死 webid 留在那份里）。**要不要一起改，见 §六 决策 7。**
- `packages/web` 的控制台从 registry 派生（`packages/web/server/endpoints.ts:19-23`），
  4 条新端点会自动出现，不用改前端。

### 响应类型怎么给

PR #188 给 4 个新条目填的是 `any`。v7 走的是「corpus 样本 → typegen 生成 → `types:check`
比对」那条线（`RESPONSE-TYPE-AUTOGEN-PRD.md`），`any` 与这个方向相反，而且
`corpus/` 目录下**抖音一份样本都还没有**。三个选项：

1. 手写最小形状（只写下游真读的那几个键：`user_info.sec_uid` / `music_info.mid|id_str|play_url.uri`
   / `android_emoji_resource.{md5,resource_url}`），JSDoc 里写明「不完整，等 corpus」；
2. 先录 corpus（这 4 条**免鉴权，不需要 cookie**，是抖音里最容易录的 4 条）再生成；
3. 照 v6 给 `any`（最快，但会是 `types:size` 与 `types:check` 里第一个刻意的 `any` 空洞）。

**我倾向 2 → 1 兜底**：正因为免鉴权，这 4 条是抖音第一批能进 corpus 的样本，
顺手把 `corpus/douyin/` 开出来，比手写形状更划算。

---

## 六、七项决策（2026-09-06 已拍板）

1. **两个新扩展点：做。** `observe` 响应钩子 + `retryFresh` 重试重建，
   动 `contracts/endpoint.ts` + `runtime/execute.ts` + 三个入口。
2. **secsdk：复合进现有 `'a-bogus'` / `'x-bogus'`**，端点声明零改动。
   依据是 PR #188 自己论证过的「策略表外原样返回，可以无条件套用」。
   不注册第三个签名器名 —— `sign` 是单槽位，`'a-bogus+secsdk'` 那种复合名会越写越多。
3. **重试次数对齐 v7**：`DEFAULT_MAX_RETRIES` 3 次 + 指数退避 1/2/4s。
   **不新增 `maxRetries` 槽位** —— v6 的 5 次 + 线性 0.4s 不迁。真不够再单独提。
4. **4 条全迁，含 `emojiResourceMeta`。** 跨 host + 自定义 UA 在 `build` 里能表达，
   快手 H5 端点（`c.kuaishou.com` + iPhone UA）已经是同型先例；下游又确实在用它。
   而且这 4 条免鉴权，是抖音最容易录进 corpus 的 4 条。
5. **不做主次反转。** `guestMusicInfo` 与 `musicInfo` 并列，各是一条独立端点/路由。
   快手那次（`1548725`）反转的前提是完整版**恒定** 2001 无解；这里补上 secsdk 之后
   主通道就可用，而且 `music/detail` 一次请求就带 mp3 与权威 `user_count`，
   没有降级的理由。三档优先级留给下游自己排（它已经排了）。
6. **空响应保留 `kind: 'auth'`，只换 `code` 与文案。** `code` 从 `COOKIE_EXPIRED`
   改判 `EMPTY_RESPONSE`（那个码全仓一处未用），三种成因的话写进它的兜底文案。
   不改 `kind`：调用方现有的 `kind === 'auth'` 分支行为不变，埋点靠 `code` 就能区分开；
   改成 `parse` 会把「真的 ck 过期」推进一个语义更差的桶。
7. **单数那份 `platform/douyin/API.ts` 的写死 webid：一起删。**
   它从 `douyinUtils.douyinApiUrls` 公开暴露着，留着等于对外仍发写死值。
   会打到 `test/platform/__snapshots__/api-urls.test.ts.snap`，那是 URL 快照不是签名快照，
   可以正常更新。

---

## 七、建议的实施顺序（5 个提交，每个都跑八道门禁）

分开提是为了让每一步都能单独回滚，也让签名快照那条红线在每一步都可验。

| # | 提交 | 内容 | 依赖 |
|---|---|---|---|
| 1 | `fix(douyin): 三处一行的 URL 缺陷` | `www-hj` + 视频页参数、`need_all=true`、`scenes` 双重编码 | 无 |
| 2 | `fix(douyin): judge 认出风控与 Argus` | §四.1 补 `kind`/`code` 分类、§四.2 `searchJudge` 先过 Argus 关键字、（可选）新 code | 无 |
| 3 | `feat(douyin): 四条免鉴权端点` | 4 个 endpoint + api.ts URL + registry + 类型 + openapi + 路由/表面快照 | 无（但撞最多快照） |
| 4 | `feat(douyin): 补 x-secsdk-web-signature` | 搬 `secsdkWebSign.ts` + 复合进签名器 | 无 |
| 5 | `feat(core): 响应观察钩子 + 重试重建，抖音 webid 落地` | 两个扩展点 + `webid.ts` + 删 13 处写死值 + 抖音端点声明 `retryOn`/`retryFresh` | 无（`ANTIBOT_PAGE` 早就判出来了，见 §四.1 的更正） |

提交 1–4 之后「配了 CK 也有概率失败」应该已经明显好转（secsdk 让 `music/detail` 从恒被拦变可用，
judge 让失败原因说得准）；提交 5 才是根治「喜欢列表恒空」那一类。

## 八、风险

- **签名快照**：`sign-douyin.test.ts.snap` 一字不能变。复合签名器时容易顺手改 `a_bogus.ts`
  的入口——不要。
- **`verdictFromNonJsonBody` 是四平台共用的公共前置**（`contracts/error.ts:274`）。
  §四.2 只改 `searchJudge`，别去改那个函数。
- **webid 缓存是进程级**，多 client / 多 cookie 场景靠 ttwid 分键区分。ttwid 缺失时
  （用户没配 cookie）键为空串 → 不缓存、不注入，这与 v6 一致，也是安全的那一侧。
- **`retryFresh` 必须 opt-in**，快手的有状态签名器会被多推一格（`execute.ts:409-410` 已记账）。
- 下游 `kkkkkk-10086` 用的是**能力探针**（`douyinGuest('fetchGuestUserInfo')` 拿不到就降级），
  所以 v7 这边端点名与 `(params, cookie?, requestConfig?)` 三参形状不能变 ——
  v7 的 fetcher 正好是这个签名，不用额外兼容。

---

## 九、实施记录（2026-09-06）

五个提交全部落地，每个都跑完八道门禁 + 文档站三道静态门。

| # | 提交 | 说明 |
|---|---|---|
| 0 | `ba41541` `docs(prd)` | 本文档与七项决策 |
| 1 | `615c9d1` `feat(douyin)` | **真做了 `git merge main`**，见下 |
| 2 | `b8c92c6` `fix(douyin)` | `www-hj` 边缘 + 视频页两个参数 |
| 3 | `faf8644` `fix(douyin)` | judge 认出 Argus；空响应改判 `EMPTY_RESPONSE` |
| 4 | `f5f59ac` `feat(douyin)` | 四条免鉴权端点（19 → 23，合计 61 → 65） |
| 5 | `cabe511` `feat(douyin)` | `x-secsdk-web-signature` 复合进两个签名器 |
| 6 | `949ce01` `feat(core)` | `observe` + `retryFresh` 两个扩展点；webid 落地 |

### 合并那一步：实际比预期干净

本文第一节写的是「不能 cherry-pick」，但**没试过 `git merge`**。试了之后发现只有 6 处冲突，
且都有确定答案：

- 5 处 modify/delete（v7 阶段 6 删掉的那层 v6 机械）→ 保持删除；
- 1 处 content（`model/fetchers/douyin/index.ts`）→ 取 v7 那版；
- `platform/douyin/API.ts` / `validation/douyin.ts` / `types/DouyinAPIParams.ts` /
  `types/ReturnDataType/Douyin/index.ts` / `platform/douyin/sign/index.ts`
  **全部自动合并成功**，`getdata.ts` 里那些改动本来就没法合（文件已删）。

所以走的是真合并 + 按 v7 结构取舍，而不是重打一遍。好处是 `secsdkWebSign.ts`（276 行）
与 `webid.ts` 带着 @OduckO 的 blame 进来，`main` 的 `056ae3a` 在 git 图上也是真被合并过的。

### 与计划不同的六处

1. **`secsdkWebSign.ts` 只留一份**，在 `platforms/douyin/sign/`，legacy 的
   `douyinSign.SecSdk` 反向引它。计划里按 a_bogus / x_bogus 的先例说要复制两份 ——
   但那两份是「阶段 3 原样搬迁」的历史产物，而这是新文件，没有理由复制 276 行。
   依赖方向 `platform/`（legacy）→ `platforms/`（v7）与 `platform/douyin/routes.ts` 一致。
2. **§四.1 的因果是我写错的**，已在那一节留更正：Argus 不走业务码，`retryOn` 从来
   不需要 judge 先分类。所以提交 3 不是提交 6 的前置，两者独立。
3. **`EMPTY_RESPONSE` 不用新增 code** —— `AmagiErrorCode` 里早就有，且全仓一处未用。
   计划里写的「新增一个码」是没查清。
4. **`emojiResourceMeta` 的 15s 超时没迁**：`RequestSpec` 上没有 timeout 槽位，
   超时是「本次调用」的属性而不是端点的属性。要更长由调用方传 `requestConfig`。
5. **响应类型是手写的最小形状，不是 corpus 生成的**（§五 倾向的方案 2 做不到）：
   录样本要真发请求，这一轮没做。四份 JSDoc 都写明「未经 corpus 样本验证」，
   `corpus/seeds.json` 给 `guestUserInfo` 放了种子 —— 这四条免 cookie、免签、
   不过 Argus，是抖音最容易录的四条，**下一轮该先录它们**。
6. **`retryOn` 的范围是 17 个签名类端点**，`emojiList` / `search` 与四条免鉴权
   刻意不声明。v6 是在 `fetchDouyinInternal` 里对所有 methodType 一视同仁，
   那正是「搜索被自己的修复打坏、白重试 5 次」的成因。

### 还没做的

- **corpus 样本与生成的响应类型**（上面第 5 条）。
- **`platform/douyin/webid.ts` 的 v6 版本已随合并被移走**，legacy 树里没有 webid 逻辑 ——
  legacy 的 `douyinUtils.douyinApiUrls` 现在既不带写死值、也不会注入真值。
  它本来就是「只给 URL、签名自己算」的工具集，这个状态是自洽的，但值得记一笔。
- **线上验证**：这一轮全部是 adapter 注入的离线验证。`music/detail` 从恒被拦变可用、
  喜欢列表从恒空变有数据这两条，需要真 cookie 实测才算闭环。
