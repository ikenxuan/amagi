# v7 重构执行文档（方案 A）

> **这是执行与对齐文档，不是设计文档。** 设计见
> [README](./README.md) / [01](./01-response-envelope.md) /
> [02](./02-option-a-registry-pipeline.md) / [05](./05-session-and-polling.md) /
> [06](./06-migration.md)。
>
> 已定方案：**A —— 声明式端点注册表 + 执行管线**。目标是最小维护代价，
> 接受前期投入大。

---

## 怎么用这份文档

**核心纪律：完成一步，勾一项。** 不批量勾、不预勾、不跳着勾。

| 规则 | 说明 |
| --- | --- |
| 一次只推一项 | 同一时间只有一个任务处于进行中。并行会让「现在到哪了」失去意义 |
| 勾选 = 判据已满足 | 每项都写了「完成判据」。判据没过就不勾，哪怕代码写完了 |
| 阶段门未过不进下一阶段 | 每个阶段末尾有 **阶段门**，是硬性关卡 |
| 判据变了要先改文档 | 实现中发现判据不合理，先改这里再继续，不要默默放宽 |
| 勾选时补一行事实 | 在项后面追加 `→ <commit sha 或一句结果>`，让后来者能追溯 |

示例（仅示意，**不是任务**）：

```text
[x] 建 contracts/result.ts → a1b2c3d，AmagiResult 与 12 个 ErrorKind 就位
[ ] 建 contracts/error.ts  ← 当前进行中
[ ] 建 contracts/meta.ts
```

**进度总览**在文末，每次勾选后同步更新那张表的数字。

---

## 架构总览

### 目标目录

```
packages/core/src/
  contracts/              零依赖叶子。谁都能依赖它，它不依赖任何人
    result.ts             AmagiResult / AmagiSuccess / AmagiFailure
    error.ts              AmagiError / ErrorKind / AmagiErrorCode / Judge
    meta.ts               AmagiMeta / RequestTrace / TraceReason
    request.ts            RequestSpec / RawResponse / RequestConfig / AmagiHeaders（大小写不敏感）
    cookie.ts             cookie 解析与序列化（全仓唯一实现）
    platform.ts           Platform 联合类型
    endpoint.ts           EndpointDef / defineEndpoint / Registry 类型

  transport/              全仓唯一能发 HTTP 请求的地方
    client.ts             HttpClient.send(spec) -> RawResponse
    retry.ts              退避策略
    trace.ts              RequestTrace 收集

  platforms/<platform>/
    api.ts                URL 构造（纯函数）
    sign/                 签名算法（纯函数，从 v6 原样搬迁）
    judge.ts              平台响应判定 -> ErrorKind
    config.ts             默认 header 基线
    decode/               protobuf / multi-JSON / HTML 等特殊解码
    assemble/             多请求聚合的归一化（快手的 650 行搬到这里）
    session/              登录会话策略（仅 douyin / bilibili）
    endpoints/*.ts        每端点一份声明
    endpoints/index.ts    registry

  runtime/
    execute.ts            执行管线
    paginate.ts           声明式翻页
    events.ts             事件总线（实例级）

  client/
    createClient.ts       门面
    fetcher.ts            从 registry 派生 fetcher
    method-names.ts       端点名 -> v6 方法名（唯一一处手写映射）

  server/
    routes.ts             从 registry 派生路由
    auth.ts               可选 token 鉴权
```

### 依赖方向（单向，CI 钉死）

```
contracts ← transport ← platforms ← runtime ← client ← server
```

任何反向或跨越都是错误。`dpdm` 必须报 **0 环**。

### 端点声明契约

```ts
defineEndpoint({
  name, route, params,                    // 必填
  prepare?, build?, sign?, decode?,       // 请求侧
  paginate?, partial?,                    // 多请求 / 翻页
  judge?, normalize?, compute?,           // 响应侧
  response?, retryOn?                     // 元信息
})
```

每个槽位对应的非常规形态见
[02 的「8 种非常规端点形态怎么落地」](./02-option-a-registry-pipeline.md#8-种非常规端点形态怎么落地)。

---

## 增量迁移策略（新旧共存）

59 个端点不可能一次搬完，所以阶段 1–4 期间新旧两套必须共存。做法：

```ts
// client/createClient.ts
const MIGRATED: Partial<Record<Platform, true>> = {
  xiaohongshu: true,     // 阶段 1 之后打开
  // kuaishou:  true,    // 阶段 2 之后打开
}

const platformModule = (p: Platform, ctx: Ctx) =>
  MIGRATED[p]
    ? { fetcher: createFetcherFromRegistry(registryOf(p), ctx), ...utilsOf(p) }
    : { fetcher: legacyBoundFetcher(p, ctx), ...utilsOf(p) }     // v6 原路径
```

规则：

- **一个平台是一个原子单位。** 不允许某平台一半端点走新路径、一半走旧路径
  —— 那会让信封形状在同一平台内不一致。
- **切换开关就是阶段验收动作。** 打开 `MIGRATED[p]` 后跑该平台全部用例，
  绿了才算这个阶段完成。
- **旧代码在阶段 6 才删。** 阶段 1–5 期间 `platform/*/getdata.ts` 原样留着，
  随时可以把开关关回去。

信封形状在过渡期的处理：v6 的 `Result` 与 v7 的 `AmagiResult` 不同。
过渡期让 legacy 路径也套一层 `toV7Envelope()`，这样**调用方看到的信封从阶段 2
起就是统一的**，与该平台是否已迁移无关。这层转换在阶段 6 随旧代码一起删。

---

## 阶段 0：地基

> 目标：`contracts` / `transport` / `runtime` / `client` 骨架就位，
> 用一个假端点把 `defineEndpoint` 的类型推导验证到位。
> **本阶段不碰任何真实平台代码。**

### 0.1 工程化前置

- [x] CI 加 `typecheck`（`pnpm typecheck`）为必需检查
      → 判据：故意引入一个类型错误，CI 红
      → release.yml 新增 `quality` job（`unified-build` 的 needs 前置），步骤「🔎 类型检查」跑 `pnpm typecheck`；
        本地注入 `export const probe: number = 'not a number'` 后 `pnpm typecheck` 退出码 2，红。
- [x] CI 加 `lint`（`pnpm lint`）为必需检查
      → 判据：故意引入一个 lint 错误，CI 红
      → quality job 新增步骤「🧹 代码规范检查」跑 `pnpm lint`；
        根 `lint` 脚本从 `oxlint packages/*/src`（Windows 下 glob 不展开、恒报 no files）
        改为 `pnpm -r --filter=./packages/* run lint`，与 `typecheck` / `fix` 同构，覆盖 core + docs；
        本地注入未使用变量后 `pnpm lint` 退出码 1，红；移除后回到 Done。
- [x] CI 加 `test`（`pnpm test`）为必需检查
      → 判据：故意改坏一个断言，CI 红
      → quality job 新增步骤「✅ 单元测试」跑 `pnpm test`；
        基线 23 文件 / 816 用例全绿；把 errors.test.ts 的 `expect(e.code).toBe(500)` 改成 999 后
        `pnpm test` 报 1 failed | 815 passed 并以非 0 退出，红；改回后恢复 816 绿。
- [x] 修 `packages/docs` 的脚本名：`types:check` → `typecheck`、`format` → `fix`
      → 判据：`pnpm typecheck` 与 `pnpm fix` 的输出里出现 docs 包
      → `packages/docs/package.json`：`types:check` → `typecheck`、`format` → `fix`（并按 sort-package-json 归位）。
        `pnpm typecheck` 输出出现 `packages/docs typecheck$ fumadocs-mdx && next typegen && tsc --noEmit` 且 Done；
        `pnpm fix` 输出出现 `packages/docs fix$ oxfmt`（33 files）。
        注：首次覆盖到 docs 后 `pnpm fix` 会改动全仓 294 个文件（core 也从未跑过当前 oxfmt 版本）；
        这轮**只做改名、不落地全仓重排版**，以免格式噪音掩盖后续签名搬迁的 diff。
- [x] 装 `dpdm`，加 `pnpm deps:check` = `dpdm --exit-code circular:1 packages/core/src/index.ts`
      → 判据：命令能跑，且**当前会报 36 个环**（记下基线数字）
      → 根 devDependencies 装 `dpdm@4.3.0`（钉死版本），根 scripts 新增
        `deps:check` = `dpdm --exit-code circular:1 packages/core/src/index.ts`。
        基线：`pnpm deps:check` 退出码 1，**Circular Dependencies 恰好 36 条**（与 V6-AUDIT 一致）。
        环的分布：types/ReturnDataType/Bilibili/Dynamic 递归 index 13 条、
        fetchers/types.ts ↔ 各平台 types.ts 9 条、server ↔ platform/*/routes ↔ fetchers/*/internal 8 条、
        platform/*/getdata ↔ model/index 4 条、其余 2 条。
- [x] CI 加 `deps:check`，但先设为 **allow-failure**
      → 判据：CI 里能看到环的数量，但不阻塞
      → quality job 新增步骤「🔗 依赖环检查（allow-failure）」，带 `continue-on-error: true`；
        步骤保留 dpdm 的真实退出码（UI 显示为 ⚠️ 已容忍），并把环数写进 `$GITHUB_STEP_SUMMARY`。
        本地按 YAML 里抽出的 step body 原样跑了一遍：退出码 1，摘要输出
        「当前 import 环数：**36**（v6 基线 36 / v7 目标 0）」——数量可见、不阻塞。
        阶段门 6 只需删掉 `continue-on-error` 即转为必需检查。

### 0.2 contracts

> **执行顺序说明（不改判据、不改项数）**：本小节按依赖顺序落地 ——
> `result.ts` 引用 `AmagiError` / `AmagiMeta`，`meta.ts` 又引用 `AmagiErrorCode`，
> 因此实际顺序是 platform → error → meta → result → request → cookie → endpoint。
> 这样每次提交都能保持 typecheck / test 全绿，不需要先落一个编译不过的中间态。

- [x] `contracts/platform.ts`：`Platform` 联合类型
      → 判据：`'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'`
      → 新建 `packages/core/src/contracts/platform.ts`：`PLATFORMS` 常量数组 +
        `Platform = (typeof PLATFORMS)[number]` + `isPlatform` 类型守卫。
        类型由数组推导，联合与运行时清单不可能漂移。
        `test/types/contracts.test-d.ts` 断言 `Platform` 恰等于
        `'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'`；
        `test/contracts/platform.test.ts` 4 条运行时用例（清单/顺序、无重复、守卫正反例）。
        test 816 → 820 全绿，test:types 843 全绿且 no type errors。
- [x] `contracts/result.ts`：`AmagiResult` / `AmagiSuccess` / `AmagiFailure`
      → 判据：类型测试证明成功分支无 `error` 键、失败分支无 `data` 键
      → 新建 `contracts/result.ts`：`AmagiSuccess<T>` / `AmagiFailure` / `AmagiResult<T>` + `SUCCESS_MESSAGE`。
        成功分支不声明 `error` 键、失败分支不声明 `data` 键（v6 是
        `error: undefined as never` / `data: data as never`，键留在运行时）；顶层无 `code`。
        判据落在 test:types：`keyof AmagiSuccess<T>` 恰为 `success|data|message|meta`、
        `keyof AmagiFailure` 恰为 `success|error|message|meta`，两条
        `@ts-expect-error ... toHaveProperty(...)` 断言反向键不存在；
        `keyof AmagiResult<T>` 恰为 `success|message|meta`（顶层无 code）。
        这两条 `@ts-expect-error` 已验证是**承重**的：把 `AmagiSuccess` 的 `'error'`
        改成 `'data' `后 test:types 报「Unused '@ts-expect-error' directive」1 failed。
        另有 4 条运行时用例断言键集合里确实没有 `error` / `data`。
        test 841 → 845 全绿；test:types 879 全绿。
- [x] `contracts/error.ts`：`AmagiError` / 12 个 `ErrorKind` / `AmagiErrorCode` / `Judge` / `ValidationIssue`
      → 判据：`kind → retryable` 默认推导有单测，12 个 kind 全覆盖
      → 新建 `contracts/error.ts`：`ErrorKind`（12 个）/ `AmagiErrorCode`（22 个）/
        `AmagiError` / `ValidationIssue` / `Judge` + `JudgeVerdict`，外加 `ERROR_KINDS` 与 `isRetryableKind`。
        `kind → retryable` 用 `as const satisfies Record<ErrorKind, boolean>` 落表，漏一个 kind 即编译错误。
        `test/contracts/error.test.ts` 17 条：12 个 kind 逐条断言 retryable、清单顺序与无重复、
        「可重试恰好是 rate_limit/risk/unavailable/network/timeout 五类」、期望表与 ERROR_KINDS 互为覆盖。
        test 820 → 837 全绿；test:types 864 全绿（补 ErrorKind 联合、AmagiError 必填字段、Judge 签名断言）。
- [x] `contracts/meta.ts`：`AmagiMeta` / `RequestTrace` / `TraceReason`
      → 判据：`TraceReason` 覆盖 `initial | retry | page | segment | prepare`
      → 新建 `contracts/meta.ts`：`AmagiMeta` / `RequestTrace` / `TraceReason` + `TRACE_REASONS` + `STATIC_CLIENT_ID`。
        `TRACE_REASONS` 用 `as const satisfies readonly TraceReason[]` 钉住取值集合。
        `test/contracts/meta.test.ts` 4 条：五个取值与顺序、无重复、
        与「请求来源」映射表互为覆盖、静态 fetcher 的 clientId 固定 `'static'`。
        test:types 补断言 `TraceReason` 联合、`AmagiMeta` 仅 `trace` 可选、
        `RequestTrace.reason` 必填而 `status`/`retryOf` 可选。
        test 837 → 841 全绿；test:types 871 全绿。
- [x] `contracts/request.ts`：`RequestSpec` / `RequestConfig` / 大小写不敏感 `Headers`
      → 判据：`h.get('user-agent')` 与 `h.get('User-Agent')` 返回同一值；
        单测覆盖大写 / 小写 / 混合三种写入
      → 新建 `contracts/request.ts`：`HttpMethod` / `RequestConfig` / `AmagiHeaders` / `RequestSpec` / `RawResponse`。
        `RequestConfig` 形状与 v6 完全一致（`Omit<AxiosRequestConfig, 'url'|'method'|'data'>`），只换住处，
        调用方 `amagi({ request: { timeout } })` 零改动；从 `server/index.ts` 搬出来正是为了断开
        「34 个文件为一个类型去 import 那个 new Chalk() + 建 Express app 的模块」这条环源。
        命名偏差（已同步改上面的目标目录）：大小写不敏感容器叫 **`AmagiHeaders`** 而非 `Headers`，
        避免遮蔽 Node/undici 的全局 `Headers`；另外把 `RawResponse` 也放这里，因为
        `endpoint.decode(raw, res)` 需要它而 contracts 不能反向依赖 transport。
        判据：`test/contracts/request.test.ts` 14 条 —— 大写 / 小写 / 混合三种写入下
        `h.get('user-agent') === h.get('User-Agent')`，另覆盖 has/delete 不敏感、
        同名不同大小写只留一条（后写覆盖值与显示大小写）、数字转串、`undefined`/`null` 不写入、
        merge 跨大小写覆盖（修「写 Cookie 覆盖不上小写 cookie」）、clone 深拷贝（A14 防线）。
        test 845 → 859 全绿；test:types 898 全绿。
- [x] `contracts/cookie.ts`：`parseCookie` / `serializeCookie` / `getCookieValue`
      → 判据：`getCookieValue('xa1=WRONG; a1=RIGHT', 'a1') === 'RIGHT'`
        （修 A8 的锚点缺失）
      → 新建 `contracts/cookie.ts`：`parseCookie` / `getCookieValue` / `serializeCookie`，全仓唯一实现。
        判据通过：`getCookieValue('xa1=WRONG; a1=RIGHT', 'a1') === 'RIGHT'`。
        对照 v6 的 `/a1=([^;]+)/`（无锚点）实测：同一输入拿到 `'WRONG'`，
        且 `'xa1=nope'` 还会「取到」`'nope'` —— 这就是 A8。
        `test/contracts/cookie.test.ts` 19 条：前缀干扰在前/在后、后缀干扰（`a1x=`）、
        只有干扰项时返回 `undefined`、名字大小写敏感（RFC 6265，与 header 不敏感相对）、
        按第一个 `=` 分割使值可含 `=`、名值两端 trim（修 #32）、同名后者覆盖、
        不做 URL 解码（签名依赖原始字节）、空输入安全、与 `serializeCookie` 往返一致。
        注：`getCookieValue` 未命中返回 `undefined`（v6 的 `extractA1FromCookie` 返回空串），
        阶段 1.1 改造调用点时用 `?? ''` 承接。
        test 859 → 878 全绿；test:types 无类型错误。
- [x] `contracts/endpoint.ts`：`EndpointDef` / `defineEndpoint` / `Registry`
      → 判据：见 0.5 的类型推导验证
      → 新建 `contracts/endpoint.ts`：`EndpointDef` / `defineEndpoint` / `Registry`，另含
        `TypeToken<T>` + `type<T>()`、`EndpointName`（`` `${Platform}.${string}` ``）、
        `EndpointCtx`、`SignDecl` / `SignFn`、`PaginateDef`、`PartialPolicy`、
        `AnyEndpointDef` 与 `ParamsSchemaOf` / `InputOf` / `ParsedOf` / `DataOf` 四个取值助手。
        两处设计要点：
        ① `EndpointCtx.send` 是依赖倒置点 —— contracts 只声明「能发一次请求」的形状，
           transport 去实现，这样 `prepare` 里取 wbi key 也必须走 transport（修 A5）。
        ② `RawResponse` 已在 `contracts/request.ts`，因此 `decode(raw, res)` 不需要反向依赖 transport。
        类型推导已提前验证（0.5 会再做完整一轮）：`test:types` 断言
        `ParsedOf` = `{ aweme_id: string; number: number }`（`build` 形参同型）、
        `InputOf` 是 coerce 前形状（`number` 可省）、`TData` 由 `response` 令牌推导、
        无 `response` 时由 `compute` 返回类型推导、`name: 'weibo.nope'` 是编译错误、
        `response` 与 `normalize` 类型冲突是编译错误、具体端点可赋值给 `AnyEndpointDef` / `Registry`。
        `test/contracts/endpoint.test.ts` 9 条运行时用例：`defineEndpoint` 是恒等函数、
        `type<T>()` 零运行时值、params 校验行为不被包装改变、registry 可遍历出 name/route。
        test 878 → 887 全绿；test:types 934 全绿；`dpdm packages/core/src/contracts/*.ts` 报 0 环。

### 0.3 transport

- [x] `transport/retry.ts`：退避策略（可恢复 errno + 429 + 5xx）
      → 判据：单测覆盖 1s/2s/4s 指数退避、不可恢复错误不重试、`maxRetries: 0`
      → 新建 `transport/retry.ts`，纯策略模块（不 import axios、不做 I/O）：
        `RECOVERABLE_ERROR_CODES`（与 v6 逐字一致的 9 个 errno）/ `DEFAULT_MAX_RETRIES=3` /
        `RETRY_DELAY_BASE_MS=1000` / `isRecoverableErrno` / `isRetryableStatus` /
        `backoffDelayMs` / `retryReasonCode` / `decideRetry`。
        与 v6 的唯一行为差异：**429 与 5xx 现在也退避**。v6 给 axios 传
        `validateStatus: () => true`，这两类根本不抛错，所以从不重试 —— 限频与平台过载
        在 v6 里是「一次就放弃」。退避数值与节奏保持不变，避免改变对平台的压力特征。
        判据：`test/transport/retry.test.ts` 40 条 ——
        ① 1s/2s/4s：`backoffDelayMs(1|2|3)` = 1000/2000/4000，并断言 `decideRetry`
           给出的 `delayMs` 就是这条曲线；另覆盖 8s/16s、`attempt<1` 不产生负指数、自定义基数；
        ② 不可恢复不重试：5 种非可恢复 errno、errno 缺失、9 个不可重试状态码
           （200/204/301/400/401/403/404/412/418）逐条断言 `{ retry: false }`；
        ③ `maxRetries: 0` 一次都不重试（errno 与 429 两条路径都测）；
           另测默认 3 次下 attempt 1~3 重试、第 4 次停（总 4 个请求）、`maxRetries: 1` 只重一次。
        另断言 `retryOf` 归因：ETIMEDOUT→TIMEOUT、其余 errno→NETWORK_ERROR、
        429→RATE_LIMITED、5xx→PLATFORM_UNAVAILABLE。
        test 887 → 927 全绿。
- [x] `transport/trace.ts`：`RequestTrace` 收集器
      → 判据：`attempts` 与 `trace.length` 一致；`reason` 正确标注
      → 新建 `transport/trace.ts`：`TraceCollector` 类 + `TraceEntryDraft` / `TraceEntryOutcome`。
        `begin(draft)` 登记即计数并返回收尾函数，`attempts` 就是登记条数 ——
        **不变式由构造保证**，所以 A4 式的重试叠乘不可能再被藏起来。
        关键设计：`enabled` 只控制 `snapshot()` 是否把明细带出信封，
        **计数与登记始终发生**；否则关掉 trace 后 `attempts` 就会和明细对不上。
        判据：`test/transport/trace.test.ts` 12 条 ——
        ① `attempts === trace.length`：空收集器、收尾与否、
           prepare+initial+retry+page+segment 混合 6 条、
           文档口径「分页 3 页 + 1 次重试 = 4」、关闭 trace 时仍计数（`snapshot()` 为 `undefined`）；
        ② reason 正确标注：五种 reason 顺序保持、`countByReason` 汇总、
           retry 记录带 `retryOf` 而非 retry 记录不带这个键。
        另覆盖单条字段：url/method 原样、status 由收尾补上、请求未发出时不写 `status` 键、
        收尾前 `durationMs` 为 0 收尾后为真实耗时（注入时钟）、`snapshot()` 是副本。
        test 927 → 939 全绿。
- [x] `transport/client.ts`：`HttpClient.send(spec) -> RawResponse`
      → 判据：**不再用 `validateStatus: () => true`**，状态码原样带出；
        深拷贝请求描述（修 A14，单测断言调用方 headers 未被改写）；
        发出 `http:request` / `http:response` 事件（修 KNOWN-DEFECT #5）
      → 新建 `transport/client.ts`：`HttpClient` / `TransportError` / `TransportEvent` / `TransportEmitter`。
        判据逐条落地（`test/transport/client.test.ts` 31 条）：
        ① **不再设 `validateStatus`**，用 axios 默认的 2xx 判定。断言实际发出的 config 上
           `validateStatus(200)===true` 而 `(429|404|500)===false`；2xx 与非 2xx 都返回
           `RawResponse` 且 `status` 原样（400/401/403/404/412/418 逐条），非 2xx 不抛错 ——
           平台常在非 2xx 响应体里放业务码（B站 `-412`、小红书风控页），judge 需要看到它。
           代价是 429/5xx 现在会进退避（v6 恒真 → 从不重试）。
        ② 深拷贝：4 条用例分别断言 `spec.headers`、`requestConfig.headers`、
           同一 spec 复用两次、重试路径下调用方对象都未被改写（A14）。
        ③ 事件：成功一对 `http:request`→`http:response`；每次重试各一对且 reason 从
           `initial` 转 `retry`；非 2xx 也发 response 且带状态码；传输层彻底失败也发
           （无状态码）；不注入 `emit` 时静默。事件出口用 `TransportEmitter` 注入，
           负载只有 `trace`，`AmagiMeta` 由 runtime 在闭包里补 —— 保持 contracts ← transport ← runtime 单向。
        另：`TransportError` 带 `kind`/`code`/`errno`/`attempts`/`url`/`cause`，
        让传输失败映射成 `network`/`timeout` 而不是落进 execute 的兜底 `internal`；
        非 `AxiosError` 原样上抛。
        **测试基建上的一个发现**（后续阶段都会用到）：axios 只在内置 adapter 里调 `settle`，
        自定义 adapter 一旦 resolve 就被当成成功、`validateStatus` 根本不执行。
        所以注入式 adapter 必须自己复刻 `settle`，否则 429/500 会绕过整条失败分支
        —— 这也是 v6 那些「HTTP 500 被当作成功」用例能通过的原因之一。
        test 939 → 970 全绿。
- [x] `transport/client.ts` 的 UA 清理：出口处统一剥 `Edg/x`，大小写无关
      → 判据：小写 `user-agent` 也被清理（修 #17）
      → 在 `buildAxiosConfig` 出口处统一调 `stripEdgeToken(headers)`：借 `AmagiHeaders`
        的大小写不敏感查找定位 UA，再用**原本的大小写**写回，所以平台各自的 header 风格
        （`User-Agent` / `user-agent`）都保留，但「剥 Edg」只发生一次、只有一种行为。
        `cleanUserAgent` 的正则与 v6 逐字一致（`/\s+Edg\/[\d.]+/g`），改它会改变实际发出的指纹；
        v7 只改**在哪儿用** —— v6 写的是 `if (headers['User-Agent'])`，只认这一种大小写，
        于是小红书那份全小写的默认配置从来没被清理过、快手那份大写的却被清理了，
        同一个策略在四个平台上行为不一致，这就是 #17。
        判据：`test/transport/client.test.ts` 新增 9 条 ——
        小写 / 大写 / 全大写 / 混合四种 header 名都被清理（判据本身）、
        平台基线与 `requestConfig.headers` 两个来源的 UA 同样被清理、
        清理后不会多出一条同名 header（只保留调用方原本的大小写）、
        清理不改写调用方持有的对象（与 A14 同一条防线）、
        无 Edg 标识原样透传、没有 UA 头时不凭空造一个、正则行为与 v6 一致。
        test 970 → 981 全绿。0.3 小节至此 4/4 完成。

### 0.4 runtime

- [x] `runtime/events.ts`：实例级事件总线 + 一个全局默认实例
      → 判据：两个 client 的 bus 互相隔离；静态 fetcher 用全局实例；
        所有负载带 `meta`
      → 新建 `runtime/events.ts`：`EventBus` 类 + `createEventBus()` + `defaultEventBus`（id 为 `'global'`）
        + 四个负载类型 + `AMAGI_EVENT_NAMES` + `createTransportEmitter`。
        判据三条（`test/runtime/events.test.ts` 12 条）：
        ① 两条总线互相隔离 —— 各自持有独立 `EventEmitter`：监听器收不到对方事件、
           `listenerCount` 各自统计、清空一条不影响另一条；另测 `emit` 返回值、`once`/`off`。
        ② 静态 fetcher 用全局实例 —— `defaultEventBus` 唯一且 `createEventBus()` 每次造新的；
           并断言全局与 client 实例总线互不串扰。
        ③ 所有负载带 `meta` —— 四个事件的负载逐个断言 `requestId`/`clientId`/`endpoint`/
           `platform`/`attempts` 齐全（修缺陷 10：v6 的 `api:*` 负载没有任何关联 id）。
        `createTransportEmitter(bus, () => meta)` 是「所有负载带 meta」的落点：
        transport 只发 `trace`，`meta` 在这层补，从而保持 contracts ← transport ← runtime 单向。
        meta 用惰性取值，专门测了重试场景下 `attempts` 随调用推进从 1 变到 2。
        事件名这一轮只定四个调用相关事件（`http:request`/`http:response`/`api:success`/`api:error`），
        以保证「所有负载带 meta」严格成立；`log:*` 不是调用作用域的，留到阶段 7 compat 需要时再加。
        **顺带修掉一个真 bug**：`removeAllListeners(event?)` 直接把 `undefined` 转给 Node 时，
        Node 按 `arguments.length` 判断，会当成「清空名为 undefined 的事件」而不是清空全部
        —— 由「清空一条总线不影响另一条」这条用例抓出来。
        test 981 → 993 全绿。
- [x] `runtime/execute.ts`：管线 `validate → prepare → build → sign → send → decode → judge → normalize`
      → 判据：**唯一一处 catch**；任何异常映射为 `kind: 'internal'` 且 `cause` 保留；
        永不 reject（单测：让每个环节各抛一次）
      → 新建 `runtime/execute.ts`：`execute()` + `ExecuteStage` / `ExecuteOptions` +
        导出的纯函数 `extractPlatformMessage` / `extractPlatformCode` / `classifyThrown`。
        判据三条（`test/runtime/execute.test.ts` 43 条）：
        ① **唯一一处 catch** —— 两条用例直接读源码断言：`/\}\s*catch\s*\(/` 恰好 1 处，
           且剥掉注释后没有任何 `.catch(`（`.catch()` 也是一处 catch）。
           `partial: 'tolerate'` 用 `Promise.allSettled` 而不是 `.catch()`，就是为了守住这条。
        ② 异常归因 + `cause` 保留 —— 单一 catch 靠 `stage` 变量知道自己在哪炸的：
           `decode` 阶段 → `parse`/`DECODE_FAILED`；`TransportError` → 它自带的 `network`/`timeout`
           （不落进兜底 internal）；其余一律 `internal`/`INTERNAL_ERROR`，message 里带阶段名。
        ③ **永不 reject** —— validate / compute / prepare / build / sign / decode / judge /
           normalize 八个环节各抛一次，逐条断言收口成失败信封且 `cause` 是原对象；
           另测抛非 Error（字符串）、端点既无 build 也无 compute、未注册的签名器名。
        顺带落地的设计点：
        - **A3 根治**：`extractPlatformMessage` 依次试 `message`/`status_msg`/`msg`，
          由 runtime 统一提取，平台文案优先、缺失才用兜底 catalog；`platform.code` 同理试
          `code`/`status_code`/`statusCode`。为此在 `contracts/error.ts` 补了
          `DEFAULT_ERROR_MESSAGES`（22 个错误码全覆盖，`satisfies` 保证不漏）与 `errorMessageFor`。
        - HTTP 状态进 `error.http`，平台业务码进 `error.platform.code`，两者分开放（顶层无 `code`）。
        - 多请求聚合：`build` 返回数组即并发，`reason` 记为 `segment`，`normalize` 收到数组；
          `partial: 'tolerate'` 失败分片留 `undefined`；**全部分片都失败时仍返回失败信封**
          （这条是新定的语义，阶段 2/3 对着 v6 逐个确认，风险登记里已有对应条目）。
        - `prepare` 产物并入 ctx 且不改写原 ctx 对象。
        - `meta.attempts` 来自 trace 收集器；trace 未开启时信封里没有 `trace` 键；
          `clientId` 为空串时退化为 `'static'`。
        **本项不含 `paginate` 分支**（依赖 0.4 第 3 项的 `runtime/paginate.ts`），
        翻页接入放在下一项，届时 execute 只加一个分支。
        test 993 → 1036 全绿。
- [ ] `runtime/paginate.ts`：声明式翻页
      → 判据：单测覆盖单页足够 / 跨页累积 / `hasMore` 提前停止 / 空列表停止 /
        按 `number` 截断 / 每页重新签名

### 0.5 client 骨架与类型推导验证（**本阶段最关键的一步**）

- [ ] `client/method-names.ts`：`METHOD_NAMES` 骨架 + 对齐 v6 的测试
      → 判据：测试对着 `public-surface` 快照校验，15 个不规则映射
        全部有映射（清单见 [文末附表](#附端点--v6-方法名映射)），
        且 59 个端点一一对应、无遗漏
- [ ] `client/fetcher.ts`：`FetcherOf<R>` 映射类型 + `createFetcherFromRegistry`
      → 判据：见下一项
- [ ] 建 2 个假端点（一个带 params、一个无 params），验证类型推导
      → 判据：`*.test-d.ts` 证明：
        ① 参数类型从 `z.infer` 正确推导，缺必填字段编译报错
        ② 返回类型是 `AmagiResult<声明的 response 类型>`
        ③ 显式泛型 `fetchX<T>()` 能覆盖返回类型
        ④ IDE 悬停能看到具体类型而非 `any`/巨大交叉类型
- [ ] `createBoundFetcher` 的 Proxy 实现
      → 判据：方法集合自动跟随 registry；`headers.Cookie` 覆盖生效（大小写无关）
- [ ] `server/routes.ts`：从 registry 派生路由 + 唯一性校验
      → 判据：注册两个同 `route` 的假端点时**启动即抛错**
        （这一条就修掉 #47/#48/#54）
- [ ] `server/auth.ts`：可选 token 中间件 + `startServer({ host, token })`
      → 判据：不传 token 时行为与 v6 一致（不破坏）；传了则无 token 请求返 401；
        `host` 默认仍是 `'::'` 但**启动时打印一次警告**

### 阶段门 0

- [ ] `pnpm test` 全绿（816 + 新增用例）
- [ ] `pnpm test:types` 无类型错误
- [ ] `pnpm deps:check` 对**新增目录**报 0 环（旧代码的 36 个环仍在，不管）
- [ ] 假端点能走通完整管线并产出 `AmagiResult`
- [ ] **类型推导验证通过** —— 若 ④ 不达标，停下来重新设计
      `EndpointDef`，不要带着糊的类型往下走

---

## 阶段 1：小红书（7 端点，试点）

> 选它做试点是因为 7 个端点里同时覆盖 **POST + 三重签名头 + prepare 换 guest
> cookie + 分页**，能验证 8 种非常规形态里的 4 种。此时沉没成本还小，
> 发现扩展点不够用可以改设计。

### 1.1 平台基建

- [ ] `platforms/xiaohongshu/api.ts`：搬 URL 构造，保持 `{ Url, Body, apiPath }` 三段
      → 判据：现有 `api-urls.test.ts` 的 xhs 快照不变
- [ ] `platforms/xiaohongshu/sign/`：原样搬迁签名算法
      → 判据：现有 `sign-xiaohongshu.test.ts` 全绿，**快照一字不变**
- [ ] 修 `extractA1FromCookie` 改用 `contracts/cookie.ts`
      → 判据：#44/#45 两条 KNOWN-DEFECT 用例改写为正向断言
- [ ] `platforms/xiaohongshu/config.ts`：默认 header 基线，改用大小写不敏感容器
      → 判据：#23（小写风格）/#30（无 requestConfig 形参）/#31（无 method/timeout）/
        #32（cookie 不 trim）/#33（写死 Edge 指纹）五条对应用例改写
- [ ] `platforms/xiaohongshu/judge.ts`
      → 判据：HTML 反爬页判为 `kind: 'risk'` / `code: 'ANTIBOT_PAGE'`（原 HTML 进 `error.raw`）；
        不再把一切失败归一化为 500（修 #15）

### 1.2 端点声明（7 个）

- [ ] `homeFeed`（POST + prepare 换 guest cookie）
- [ ] `noteDetail`（补 `min(1)`，修 #60）
- [ ] `noteComments`（`cursor` 语义与抖音对齐，修 #61）
- [ ] `userProfile`
- [ ] `userNoteList`
- [ ] `emojiList`
- [ ] `searchNotes`（方法名不规则：映射到 `searchNotes` 而非 `fetchSearchNotes`）
- [ ] `endpoints/index.ts` 汇总 registry
      → 判据：`Object.keys(registry).length === 7`，路由与 v6 逐条一致

### 1.3 切换与验收

- [ ] 打开 `MIGRATED.xiaohongshu`
- [ ] legacy 路径套 `toV7Envelope()`（让其余三平台的信封形状也统一）

### 阶段门 1

- [ ] 小红书全部现有用例通过（`fetcher-kuaishou-xiaohongshu.test.ts` 的 xhs 部分、
      `validation/xiaohongshu.test.ts`、`sign-xiaohongshu.test.ts`）
- [ ] 签名快照**一字未变**
- [ ] 新增：7 个端点各有一条端到端用例（adapter 注入，不发真实请求）
- [ ] `pnpm test` / `test:types` / `deps:check`(新目录) 全绿
- [ ] **回顾会**：8 种形态里用到的 4 种是否都写得顺手？
      不顺手就现在改 `EndpointDef`，不要拖到抖音那 19 个

---

## 阶段 2：快手（6 端点）

> 重点是**多请求聚合**与那 650 行归一化逻辑的搬迁 —— 这是「响应变换没有归属」
> 这个问题的正面处理。

### 2.1 平台基建

- [ ] `platforms/kuaishou/api.ts`
- [ ] `platforms/kuaishou/sign/`：原样搬迁
      → 判据：`sign-kuaishou.test.ts` 全绿，快照一字不变
- [ ] 签名的模块级可变状态改为随 client 实例（`count` / 匿名 `kww` 缓存）
      → 判据：#40/#41/#42 三条改写；两个 client 的签名状态互不干扰
- [ ] `platforms/kuaishou/judge.ts`
      → 判据：`code: 0` 不再因短路求值必然判成功（修 #13）
- [ ] `platforms/kuaishou/assemble/`：把 `getdata.ts` 里 ~650 行归一化 helper 搬进来
      （`createEmpty*Result` / `mapLiveDetailTo*` / `resolveKuaishou*` /
      `normalizeKuaishouLiveAuthor` / `dedupeLiveRoomPlayList`）
      → 判据：搬迁后 `platform/kuaishou/getdata.ts` 只剩 dispatch，
        且每个 helper 至少 1 条单测（v6 里它们零测试）
- [ ] `platforms/kuaishou/config.ts`
      → 判据：#26（自带 Edg）/#29（不生成 Sec-Ch-Ua）两条改写

### 2.2 端点声明（6 个）

- [ ] `videoWork`（graphql POST）
- [ ] `comments`（**补 `pcursor` / `count` 分页参数**，修 #57）
- [ ] `userProfile`（多请求聚合，12 个并发 + `partial: 'tolerate'`）
- [ ] `userWorkList`（`count` 改 `coerce`，修 #58）
- [ ] `liveRoomInfo`
- [ ] `emojiList`
- [ ] `endpoints/index.ts` 汇总 registry

### 2.3 切换与验收

- [ ] 打开 `MIGRATED.kuaishou`

### 阶段门 2

- [ ] 快手全部现有用例通过
- [ ] 签名快照一字未变
- [ ] `userProfile` 的 12 请求聚合有专项用例：全成功 / 部分失败 tolerate /
      `attempts === 12`
- [ ] `assemble/` 下每个 helper 有单测
- [ ] `pnpm test` / `test:types` / `deps:check`(新目录) 全绿

---

## 阶段 3：抖音（19 端点）

> 覆盖分页、multi-JSON 反爬响应、分段并发合并。端点最多的一个平台。

### 3.1 平台基建

- [ ] `platforms/douyin/api.ts`（含 `createDouyinApiUrls(userAgent)` 的 UA 注入）
- [ ] `platforms/douyin/sign/`：原样搬迁 `a_bogus` / `x_bogus`
      → 判据：`sign-douyin.test.ts` 全绿，快照一字不变
- [ ] 签名器声明前置条件（`AB` 需绝对 URL、`XB` 需真实接口形态的长路径）
      → 判据：#36/#37/#38 改写为「前置条件不满足时返回 `kind: 'internal'`」而非抛出
- [ ] `platforms/douyin/judge.ts`
      → 判据：`status_code` 缺失时判**成功**（修 v6 的 `!== 0` 误判）；
        `filter_detail` → `kind: 'forbidden'`；空响应 → `kind: 'auth'`
- [ ] `platforms/douyin/decode/multiJson.ts`：搬 `parseDouyinMultiJson` + `filterSearchResponses`
      → 判据：从 `getdata.ts` 里搬出来后有单测（v6 里零测试）
- [ ] `platforms/douyin/config.ts`
      → 判据：#24（硬编码 Chrome/125）/#27（Edg 剥离被展开顺序抵消）/
        #28（Sec-Ch-Ua 与 UA 不一致）三条改写；四平台 UA 版本改为集中维护
- [ ] Referer 注入抽成共享 helper（v6 在 `getdata.ts` 里重复 6 次）
      → 判据：`userProfile` / `userVideoList` / `userFavoriteList` /
        `userRecommendList` / `suggestWords` / `search` 六处共用同一实现

### 3.2 端点声明（19 个）

作品类（5 个，**必须拆成 5 条独立路由**，修 #47/#48/#54）：

- [ ] `parseWork` → `/fetch_one_work`（保留原路径）
- [ ] `videoWork` → `/fetch_video_work`（新路径）
- [ ] `imageAlbumWork` → `/fetch_image_album_work`（新路径）
- [ ] `slidesWork` → `/fetch_slides_work`（新路径）
- [ ] `textWork` → `/fetch_text_work`（新路径）

评论类：

- [ ] `comments`（分页，maxPageSize 50）
- [ ] `commentReplies`（分页，maxPageSize 3，签名用 `x_bogus`）

用户类（4 个，共享 Referer helper 与分页声明）：

- [ ] `userProfile`
- [ ] `userVideoList`
- [ ] `userFavoriteList`
- [ ] `userRecommendList`

搜索类：

- [ ] `search`（multi-JSON decode + 三种 type 的不同提取逻辑 + 首页校验）
- [ ] `suggestWords`

其他：

- [ ] `musicInfo`
- [ ] `liveRoomInfo`
- [ ] `loginQrcode`（方法名 `requestLoginQrcode`）
- [ ] `emojiList`（无签名）
- [ ] `dynamicEmojiList`
- [ ] `danmakuList`（分段并发 + 合并排序 + `partial: 'tolerate'`）
- [ ] `endpoints/index.ts` 汇总 registry

### 3.3 切换与验收

- [ ] 打开 `MIGRATED.douyin`
- [ ] 4 条新路由写进迁移文档的「新增 HTTP 路径」章节

### 阶段门 3

- [ ] 抖音全部现有用例通过（`fetcher-douyin.test.ts` 30 条、
      `validation/douyin.test.ts` 69 条、`sign-douyin.test.ts` 38 条）
- [ ] 签名快照一字未变
- [ ] 分页专项用例全绿（9 条）
- [ ] `danmakuList` 分段用例：单段 / 多段 / 单段失败 tolerate / 合并后按
      `offset_time` 排序
- [ ] `search` 的 multi-JSON 用例：粘连响应正确拆分合并
- [ ] 路由唯一性：`layerPaths(douyinRoutes).length === new Set(...).size === 19`
      （v6 是 19 层 / 15 唯一）
- [ ] `pnpm test` / `test:types` / `deps:check`(新目录) 全绿

---

## 阶段 4：B站（27 端点）

> 端点最多、形态最杂：protobuf、wbi 前置签名、qtparam、纯本地计算。

### 4.1 平台基建

- [ ] `platforms/bilibili/api.ts`
      → 判据：`getComments` **不再硬编码** `plat` / `seek_rpid` / `web_location`，
        改为读校验后的 params（修 #22 与 A6）
- [ ] `platforms/bilibili/sign/wbi.ts`：**改走 transport**，不再直连 axios
      → 判据：注入 adapter 能拦到 `/nav` 请求（v6 拦不到）；修 A5
- [ ] wbi key 加 TTL 缓存（随 client 实例）
      → 判据：连续 3 次签名只打 1 次 `/nav`；trace 里 `reason: 'prepare'` 只出现 1 次
- [ ] `platforms/bilibili/sign/qtparam.ts`：改用大小写不敏感 headers 取 cookie
      → 判据：`videoStream` 与 `bangumiStream` 两处都能拿到 cookie
        （v6 一处大写一处小写，后者恒 undefined）
- [ ] 删 `sign/CorrespondPath.ts` 与 `sign/dm_img.ts`（从未被导入）
- [ ] `platforms/bilibili/decode/danmaku.ts`：搬 `parseDmSegMobileReply`
- [ ] `platforms/bilibili/judge.ts`
      → 判据：`code: 0` 一律成功（空负载交给 normalize），修 A2 的自相矛盾；
        `platform.message` 由 runtime 统一提取，修 A3；
        `-412` 的重试改为声明 `retryOn`，不再递归调用（修 A4 的叠乘）
- [ ] `platforms/bilibili/config.ts`
      → 判据：#24 对应的硬编码 Chrome/142 改为集中维护

### 4.2 端点声明（27 个）

视频类：

- [ ] `videoInfo`
- [ ] `videoStream`（qtparam 前置）
- [ ] `videoDanmaku`（protobuf，`responseType: 'arraybuffer'`，`judge` 恒成功）

评论类：

- [ ] `comments`（wbi + 分页 + **补齐 5 个被 strip 的参数**，修 #52 与 3.1）
- [ ] `commentReplies`

用户类：

- [ ] `userCard`
- [ ] `userDynamicList`（wbi）
- [ ] `userLiveStatus`
- [ ] `userSpaceInfo`（wbi）
- [ ] `uploaderTotalViews`

动态 / 番剧 / 直播：

- [ ] `dynamicDetail`
- [ ] `bangumiInfo`（`season_id` 空串的 refine 修正，修 #53）
- [ ] `bangumiStream`（qtparam 前置）
- [ ] `liveRoomInfo`
- [ ] `liveRoomInit`

专栏：

- [ ] `articleContent`
- [ ] `articleCards`
- [ ] `articleInfo`
- [ ] `articleListInfo`

登录 / 验证码（`qrcodeStatus` 在阶段 5 由会话接管，这里先按端点搬）：

- [ ] `loginStatus`
- [ ] `loginQrcode`
- [ ] `qrcodeStatus`（**返回形状变化**：不再透出 `headers`）
- [ ] `captchaFromVoucher`
- [ ] `validateCaptcha`

纯本地计算（`compute`，不发请求）：

- [ ] `avToBv`（补 avid 整数校验，修 #35）
- [ ] `bvToAv`（补 BV 号正则，修 #34；返回 `{ aid: number }` 不带 `av` 前缀，修 A7）
- [ ] `emojiList`
- [ ] `endpoints/index.ts` 汇总 registry

### 4.3 切换与验收

- [ ] 打开 `MIGRATED.bilibili`
- [ ] 删掉过渡期的 `toV7Envelope()`（四平台都迁完了，不再需要）

### 阶段门 4

- [ ] B站全部现有用例通过（`fetcher-bilibili.test.ts` 23 条、
      `validation/bilibili.test.ts` 76 条、`sign-bilibili.test.ts` 20 条）
- [ ] `av2bv` / `bv2av` 快照一字未变（往返一致性用例调整为 `aid: number`）
- [ ] wbi 系接口能被 adapter 拦到（新增用例，v6 做不到）
- [ ] wbi 缓存用例：3 次签名 1 次 `/nav`
- [ ] `comments` 的 5 个参数端到端可用（传 `pagination_str` 能翻到第二页）
- [ ] `videoDanmaku` protobuf 解码用例
- [ ] `pnpm test` / `test:types` 全绿
- [ ] **`pnpm deps:check` 报 0 环**（此时四平台都在新架构下，旧代码可断链）

---

## 阶段 5：会话（2 套登录）

> 设计见 [05-session-and-polling.md](./05-session-and-polling.md)。

### 5.1 引擎

- [ ] `contracts/session.ts`：`LoginState` / `Qrcode` / `Credential` /
      `LoginChallenge` / `ChallengeAnswer<C>` / `QrcodeLoginStrategy`
      → 判据：`*.test-d.ts` 证明 `onChallenge` 返回错字段编译报错
        （`sms` 分支返 `{ ticket }` 报错、`captcha` 分支返 `{ code }` 报错）
- [ ] `runtime/session.ts`：轮询循环 + `intervalMs` 退避 + `expiresAt` 超时 +
      `AbortSignal` 取消 + challenge 应答编排
      → 判据：单测覆盖 8 条路径（见 05 的「测试策略」）
- [ ] `watch(handlers)` 回调出口
      → 判据：无 `onChallenge` 时遇 challenge 返回失败信封且 `error.raw` 带 challenge
- [ ] `Symbol.asyncIterator` 出口 + `session.answer()`
      → 判据：`for await` 能拿到完整 phase 序列；漏 switch 分支时
        `assertNever` 编译报错
- [ ] `serialize()` / `resume()`
      → 判据：序列化后在新实例恢复能继续轮询；产物是 opaque string
- [ ] 会话事件：`session:state` / `session:success` / `session:error`，均带 `meta`

### 5.2 平台策略

- [ ] `platforms/douyin/session/qrcode.ts`：包 v6 的 `DouyinPassportClient`
      → 判据：v6 的 4 个 passport 方法用例继续通过；
        `expire_time`（绝对秒）正确转 `expiresAt`（绝对毫秒）
- [ ] douyin 的 challenge 映射：`verify` → `SmsChallenge`
      → 判据：`availableWays` / `maskedMobile` 正确填充；
        `biz_trace_id` / `verify_way` 收进 `SessionCtx` 由引擎维护
- [ ] `platforms/bilibili/session/qrcode.ts`：平台码 → `phase`
      → 判据：`86101→pending` / `86090→scanned` / `86038→expired` /
        `86083→rejected` / `0→success`
- [ ] bilibili 的 `mergeSetCookie(res.headers)` 收进策略内部
      → 判据：调用方拿到统一的 `Credential`，不再需要自己抠 `Set-Cookie`
- [ ] `client.<platform>.login` 的条件属性类型
      → 判据：`client.kuaishou.login` 是**编译错误**，不是运行时 undefined

### 5.3 v6 低阶方法

- [ ] 7 个 v6 登录方法标 `@deprecated` 并保留可用
      → 判据：现有用例全绿；JSDoc 里指向新写法

### 阶段门 5

- [ ] 会话 8 条路径用例全绿
- [ ] 类型测试：`ChallengeAnswer<C>` 的两个错字段用例编译报错（`@ts-expect-error`）
- [ ] v6 的 7 个登录方法用例全绿
- [ ] `pnpm test` / `test:types` / `deps:check` 全绿

---

## 阶段 6：删除 v6 遗留

> 到这里四平台都在新架构下跑通了，才动删除。**这是不可逆的一步**，
> 前面每一步都必须已勾选。

### 6.1 删文件

- [ ] `src/types/api-spec.ts`（393 行，10 个导出）
- [ ] `src/types/method-keys.ts`（313 行，14 个导出）
- [ ] `src/types/ReturnDataType/Kuaishou/WorkComments.ts`（与同名目录撞车）
- [ ] `src/model/fetchers/*/bound.ts` × 4（~250 行，被 Proxy 取代）
- [ ] `src/model/fetchers/*/types.ts` × 4 的 `IXxxFetcher` 接口（~700 行，被 `FetcherOf<R>` 取代）
- [ ] `src/model/fetchers/shared/overload-types.ts`（~130 行，6 个重载别名）
- [ ] `src/model/fetchers/*/internal.ts` × 4（被 `runtime/execute.ts` 取代）
- [ ] `src/platform/*/getdata.ts` × 4（4 份 switch，共 2,757 行）
- [ ] `src/model/networks.ts`（搬到 `transport/`）
- [ ] `src/middleware/validation.ts`（校验进管线）

### 6.2 删导出

- [ ] 41 个逐个导出的 `*ParamsSchema`
- [ ] 4 个 `*ValidationSchemas`
- [ ] 4 个 `*MethodRoutes`
- [ ] 4 个 `registerXxxRoutes` 别名
- [ ] `bilibiliErrorCodeMap` / `isSmsCodeVerifyWay`
- [ ] 4 个 `*APIErrorCode` 枚举（~180 行）
- [ ] `TypeMode` / `TypeControl` / `ConditionalReturnType` / `ExtractTypeMode`
- [ ] `getHeadersAndData` 从顶层导出移除
- [ ] `src/index.ts` 里手写的具名 re-export 清单（自别名 workaround，不再必要）

### 6.3 删 typeMode

- [ ] 所有端点声明去掉 `typeMode` 相关重载
- [ ] 响应类型加索引签名（`extends PlatformPayload`）
      → 判据：读未声明字段返回 `unknown` 而非编译错误
        （这一条是把破坏性从 C 档拉回 B 档的关键，**不能省**）
- [ ] `fetchXxx<T>()` 显式泛型逃生舱
- [ ] client 级 `responseTypes: 'raw'` 开关
- [ ] 响应类型的稳定性承诺写进 README 与 JSDoc

### 6.4 取消自别名

- [ ] `tsconfig.json` 删 `paths: { "amagi/*": ["./src/*"] }`
- [ ] 190 处 `amagi/*` 导入改为相对路径或 package.json `imports` 的 `#*`
      → 判据：`grep -r "from 'amagi/" src` 为空

### 阶段门 6

- [ ] `pnpm test` 全绿（KNOWN-DEFECT 用例按 [06 的归属表](./06-migration.md#known-defect-归属) 改写或删除）
- [ ] `pnpm test:types` 无类型错误
- [ ] **`pnpm deps:check` 报 0 环**，且 CI 从 allow-failure 改为**必需**
- [ ] `public-surface` 快照的 diff 与 [06 的迁移矩阵](./06-migration.md#逐类去留) 逐条对齐
      → 判据：59 保留 / 8 形状变化 / 79 删除，数字对得上
- [ ] `known-defects` 快照从 61 条降到 ≤9 条（保留项须在 06 里有理由）
- [ ] `pnpm build` 产出正常，`dist/default/index.d.ts` 体积记录下来（对比 721 KB）

---

## 阶段 7：兼容层与收尾

- [ ] `@ikenxuan/amagi/compat` 子路径导出：`toLegacy()` 转换 + 恢复抛出行为
      → 判据：一份 v6 写法的用例在 compat 入口下全绿
- [ ] compat 导入时发一次 `log:warn` 提示迁移（不刷屏）
- [ ] codemod：`typeMode` 删除 / `r.code` 处理 / `error` 读法替换 / 别名替换
      → 判据：对一份 v6 示例项目跑 codemod，剩余人工项都带 `// TODO(amagi-v7):`
- [ ] `packages/docs` 更新：架构页、`add-api.mdx`（8 步 → 1 步）、API 参考
      → 判据：docs 的 douyin API 参考补齐 v6 漏掉的 6 个方法
- [ ] `V6-AUDIT.md` 的 12 + 17 组问题逐条标注「已由 v7 消除」
- [ ] `startServer` 的 `host` 参数与警告文案定稿（默认值 v8 才改）
- [ ] Phase 2 接口预留：`ViewMode = 'raw'` 与 `toCanonical` 空槽位

### 阶段门 7

- [ ] compat 用例全绿
- [ ] codemod 在示例项目上跑通
- [ ] 文档站构建通过（`pnpm build:docs`）
- [ ] 发 `7.0.0-beta.1`

---

## 验证流程

### 每次提交（本地 + CI 都跑）

```bash
pnpm lint          # oxlint，0 warning
pnpm typecheck     # tsc --noEmit，0 error
pnpm test          # vitest，全绿
pnpm deps:check    # dpdm，新目录 0 环（阶段 6 后全仓 0 环）
```

### 每个端点搬迁完成时

1. 该端点原有用例通过，**一条都不改**（除已声明要修的 KNOWN-DEFECT）。
2. 新增一条端到端用例：adapter 注入，断言 URL / 关键 query / 签名参数存在。
3. 若涉及签名：**快照必须一字不变**。变了就是搬错了，不是「更新快照」。
4. 若涉及分页：断言 `attempts` 与请求次数一致。

### 每个阶段门

阶段门是硬关卡。任一项不过就不进下一阶段 —— 尤其是**阶段门 0 的类型推导验证**
和**阶段门 1 的回顾会**，这两处是唯一还能低成本改设计的时机。

### 签名快照的红线

`sign-*.test.ts` 的快照是 v7 最重要的一条防线：

> **签名快照发生变化 = 线上功能损坏**，且类型检查与 lint 都发现不了。
> 任何情况下都不要用 `vitest -u` 更新签名快照。
> 如果快照变了，先假设是自己搬错了。

### KNOWN-DEFECT 的处理纪律

修一条缺陷 → 对应用例必然失败 → **必须显式改写或删除那个用例**，
不允许注释掉或加 `.skip`。`known-defects` 快照的数字只能降不能升。

---

## 进度总览

> **每次勾选后同步这张表。** 它是唯一一眼能看出「现在到哪了」的地方。

| 阶段 | 内容 | 项数 | 已完成 | 阶段门 | 可发版 |
| --- | --- | --- | --- | --- | --- |
| 0 | 地基（contracts / transport / runtime / client 骨架） | 31 | 19 | ⬜ | — |
| 1 | 小红书 7 端点（试点） | 20 | 0 | ⬜ | — |
| 2 | 快手 6 端点 | 19 | 0 | ⬜ | — |
| 3 | 抖音 19 端点 | 36 | 0 | ⬜ | — |
| 4 | B站 27 端点 | 46 | 0 | ⬜ | — |
| 5 | 会话（2 套登录） | 16 | 0 | ⬜ | — |
| 6 | 删除 v6 遗留 | 32 | 0 | ⬜ | — |
| 7 | 兼容层与收尾 | 11 | 0 | ⬜ | `7.0.0-beta.1` |
| | **合计** | **211** | **19** | | |

### 关键指标（每阶段门更新）

| 指标 | v6 基线 | 当前 | v7 目标 |
| --- | --- | --- | --- |
| import 环数 | 36 | 36 | **0** |
| 加一个接口要改的文件数 | 11–15 | 11–15 | **1** |
| `KNOWN-DEFECT` 条数 | 61 | 61 | **≤9** |
| 顶层公开导出数 | 146 | 146 | 67（59 保留 + 8 变形） |
| `dist/default/index.d.ts` | 721 KB | 721 KB | 记录即可 |
| 测试用例数 | 816 | 816 | 只增不减 |
| `switch (data.methodType)` 的分支总数 | 63 | 63 | **0** |

### 里程碑

- **M1 = 阶段门 0 通过** —— 地基与类型推导验证完成。这之后设计基本冻结。
- **M2 = 阶段门 1 通过** —— 试点验证扩展点够用。**最后一个低成本改设计的时机。**
- **M3 = 阶段门 4 通过** —— 59 个端点全部迁完，`deps:check` 报 0 环。
- **M4 = 阶段门 6 通过** —— v6 遗留清空，公开面收敛到 67 个。
- **M5 = 阶段门 7 通过** —— 发 `7.0.0-beta.1`。

---

## 风险登记

进行中发现新风险就往这张表里加，别只在脑子里记。

| 风险 | 影响 | 缓解 | 状态 |
| --- | --- | --- | --- |
| `FetcherOf<R>` 类型推导太复杂，IDE 提示退化成巨大交叉类型 | 用户体验倒退，可能推翻方案 A | 阶段门 0 的第 5 项专门验证；不达标就停下重设计 | 未验证 |
| 签名搬迁改变输出 | 线上功能损坏，且工具链发现不了 | 快照测试 + 「不许 `-u`」红线 | 已有防线 |
| `partial` 语义定错，改变 v6 的部分失败行为 | 静默行为变化（A 档） | 阶段 2/3 逐个确认 v6 的隐式行为（快手 tolerate、抖音弹幕 tolerate） | 待确认 |
| 删 `typeMode` 后大量代码变编译错误 | 破坏性从 B 档滑到 C 档 | 6.3 的索引签名，**不可省** | 有方案 |
| 阶段 1–5 期间无法发功能版本 | 紧急需求难处理 | 旧代码保留到阶段 6，`MIGRATED` 开关可随时关回去 | 有方案 |
| B站 wbi 改走 transport 后行为变化 | 签名可能失败 | 阶段 4 新增「adapter 能拦到 `/nav`」用例；wbi 快照保护 | 待验证 |
| 快手 650 行归一化搬迁引入回归 | 用户主页数据结构变化 | 搬迁后每个 helper 补单测（v6 里零测试） | 待做 |

---

## 附：端点 → v6 方法名映射

`client/method-names.ts` 的内容。**15 个不规则映射**（标 ⚠️）是这张表必须存在的原因。59 个端点已逐条核对，无遗漏。

| 平台 | 端点 | v6 方法名 |
| --- | --- | --- |
| douyin | `videoWork` `imageAlbumWork` `slidesWork` `textWork` | `fetchVideoWork` `fetchImageAlbumWork` `fetchSlidesWork` `fetchTextWork` |
| douyin | `parseWork` | ⚠️ `parseWork` |
| douyin | `comments` | ⚠️ `fetchWorkComments` |
| douyin | `commentReplies` `danmakuList` | `fetchCommentReplies` `fetchDanmakuList` |
| douyin | `userProfile` `userVideoList` `userFavoriteList` `userRecommendList` | `fetchUserProfile` `fetchUserVideoList` `fetchUserFavoriteList` `fetchUserRecommendList` |
| douyin | `search` | ⚠️ `searchContent` |
| douyin | `suggestWords` `musicInfo` `liveRoomInfo` `emojiList` `dynamicEmojiList` | `fetchSuggestWords` `fetchMusicInfo` `fetchLiveRoomInfo` `fetchEmojiList` `fetchDynamicEmojiList` |
| douyin | `loginQrcode` | ⚠️ `requestLoginQrcode` |
| bilibili | `videoInfo` | `fetchVideoInfo` |
| bilibili | `videoStream` | ⚠️ `fetchVideoStreamUrl` |
| bilibili | `videoDanmaku` | `fetchVideoDanmaku` |
| bilibili | `comments` `commentReplies` | `fetchComments` `fetchCommentReplies` |
| bilibili | `userCard` `userDynamicList` `userLiveStatus` `userSpaceInfo` `uploaderTotalViews` | `fetchUserCard` `fetchUserDynamicList` `fetchUserLiveStatus` `fetchUserSpaceInfo` `fetchUploaderTotalViews` |
| bilibili | `dynamicDetail` `bangumiInfo` `liveRoomInfo` | `fetchDynamicDetail` `fetchBangumiInfo` `fetchLiveRoomInfo` |
| bilibili | `bangumiStream` | ⚠️ `fetchBangumiStreamUrl` |
| bilibili | `liveRoomInit` | ⚠️ `fetchLiveRoomInitInfo` |
| bilibili | `articleContent` `articleCards` `articleInfo` `articleListInfo` | `fetchArticleContent` `fetchArticleCards` `fetchArticleInfo` `fetchArticleListInfo` |
| bilibili | `loginStatus` `emojiList` | `fetchLoginStatus` `fetchEmojiList` |
| bilibili | `loginQrcode` | ⚠️ `requestLoginQrcode` |
| bilibili | `qrcodeStatus` | ⚠️ `checkQrcodeStatus` |
| bilibili | `avToBv` | ⚠️ `convertAvToBv` |
| bilibili | `bvToAv` | ⚠️ `convertBvToAv` |
| bilibili | `captchaFromVoucher` | ⚠️ `requestCaptchaFromVoucher` |
| bilibili | `validateCaptcha` | ⚠️ `validateCaptchaResult` |
| kuaishou | `videoWork` `userProfile` `userWorkList` `liveRoomInfo` `emojiList` | `fetchVideoWork` `fetchUserProfile` `fetchUserWorkList` `fetchLiveRoomInfo` `fetchEmojiList` |
| kuaishou | `comments` | ⚠️ `fetchWorkComments` |
| xiaohongshu | `homeFeed` `noteDetail` `noteComments` `userProfile` `userNoteList` `emojiList` | `fetchHomeFeed` `fetchNoteDetail` `fetchNoteComments` `fetchUserProfile` `fetchUserNoteList` `fetchEmojiList` |
| xiaohongshu | `searchNotes` | ⚠️ `searchNotes` |

映射表必须有测试对着 `public-surface` 快照校验，
漏一个就是某个 v6 方法在 v7 里消失了。
