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

| 规则                   | 说明                                                           |
| ---------------------- | -------------------------------------------------------------- |
| 一次只推一项           | 同一时间只有一个任务处于进行中。并行会让「现在到哪了」失去意义 |
| 勾选 = 判据已满足      | 每项都写了「完成判据」。判据没过就不勾，哪怕代码写完了         |
| 阶段门未过不进下一阶段 | 每个阶段末尾有 **阶段门**，是硬性关卡                          |
| 判据变了要先改文档     | 实现中发现判据不合理，先改这里再继续，不要默默放宽             |
| 勾选时补一行事实       | 在项后面追加 `→ <commit sha 或一句结果>`，让后来者能追溯       |

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
  doc?,                                   // 文档元数据（summary → OpenAPI）
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
- [x] `runtime/paginate.ts`：声明式翻页
      → 判据：单测覆盖单页足够 / 跨页累积 / `hasMore` 提前停止 / 空列表停止 /
        按 `number` 截断 / 每页重新签名
      → 新建 `runtime/paginate.ts`：`runPaginated` + `resolveTarget` + `PaginatedValue` / `PageOutcome` / `RunPage`，
        并把翻页分支接进 `execute`。算法与 v6 `fetchPaginatedData` 逐步对齐 ——
        翻页是**行为**，改了就是改了对平台的请求次数与返回条数。
        判据六条（`test/runtime/paginate.test.ts` 23 条 + `execute.test.ts` 新增 5 条）：
        ① 单页足够 —— 目标 ≤ 单页上限时只发一个请求；首个请求的条数就是目标条数
           （不是先按上限要一整页）；目标超上限时首个请求按上限要；第一页 reason 为 `initial`。
        ② 跨页累积 —— 目标 55 / 单页 20 → 三次请求，条数依次 20/20/15；游标由 `nextParams`
           从上一页响应带过去；第二页起 reason 为 `page`；`pages` 保留每页原始响应；其余参数不变。
        ③ `hasMore` 提前停止 —— 平台说没有更多就立刻停（即使没取够）；本页数据仍算进结果。
        ④ 空列表停止 —— 本页空列表即停（即使平台还说有更多）；`items` 返回非数组也按到底处理。
        ⑤ 按 `number` 截断 —— 平台多给了也截断；跨页累积后同样截断；
           **`number: 0` 时一个请求都不发**（与 v6 一致）；`limitParam` / `countParam` 可分开指定。
        ⑥ 每页重新签名 —— execute 层用计数签名器断言 3 页 → 签名器被调 **3** 次，
           且三页 URL 上的签名标记各不相同；另断言每页都重新 build（游标与本页条数都进了新 URL）。
        **这一条判据抓出一个真问题**：初版把翻页分支放在首次 build/sign 之后，
        于是签名器被调了 4 次 —— 白签一次名。对无状态签名只是浪费，但快手的签名器带模块级
        可变 `count`（A10），白签一次会把签名状态推进一格。已把翻页分支移到首次 build/sign 之前。
        同时修正了 `contracts/endpoint.ts` 里 `PaginateDef` 的形状：原先设计的
        `nextCursor` + `nextParams(params, cursor, pageSize)` 假定「一个游标」，
        而 v6 的 `updateParams(params, response)` 是拿整个响应算下一页参数
        （B站 `pagination_str`、抖音 `max_cursor?.toString() ?? 0` 都不是单游标）。
        改为 `items` / `hasMore` / `nextParams(params, page)` 与 v6 的
        `extractList` / `hasMore` / `updateParams` 一一对应，59 个端点搬迁时不用重想翻页逻辑。
        另：`runPaginated` 不 catch 任何异常，`runPage` 抛出的东西原样往外传 ——
        execute 仍然只有 1 处 catch（已重新断言）。
        test 1036 → 1064 全绿。0.4 小节至此 3/3 完成。

### 0.5 client 骨架与类型推导验证（**本阶段最关键的一步**）

- [x] `client/method-names.ts`：`METHOD_NAMES` 骨架 + 对齐 v6 的测试
      → 判据：测试对着 `public-surface` 快照校验，15 个不规则映射
        全部有映射（清单见 [文末附表](#附端点--v6-方法名映射)），
        且 59 个端点一一对应、无遗漏
      → 新建 `client/method-names.ts`：`METHOD_NAMES`（59 条，flat `'<platform>.<endpoint>'` → v6 方法名，
        `as const satisfies Record<EndpointName, string>`）+ `MethodNameOf<Full>` 类型层查表
        + `fullNameOf` / `methodNameOf` / `methodNamesOf`。
        判据（`test/client/method-names.test.ts` 45 条）：
        ① **对着活 fetcher 校验而不是对着 PRD 附表** —— 直接 import 四个平台的
           `douyinFetcher` / `bilibiliFetcher` / `kuaishouFetcher` / `xiaohongshuFetcher`
           （这些方法名由 `contract/fetcher-surface.test.ts` 的快照锁死），四个平台各断言
           「映射表的 v6 方法名集合 === 活 fetcher 的方法名集合」，
           另加两个方向的单侧检查（活 fetcher 上有而表里没有 / 表里有而活 fetcher 上没有），
           后者能抓出拼错的方法名。
        ② 59 个端点一一对应：总数 59；每平台 19 / 27 / 6 / 7；同平台内 v6 方法名不重复；
           抖音 passport 的 4 个方法**不在**表里（它们是会话不是端点，归阶段 5）。
        ③ 15 个不规则映射：清单逐条写死并断言，另用「`fetch` + 首字母大写」这条规则
           反向检测 —— 检测出的不规则集合必须恰好等于那 15 条，其余 44 条必须都是规则映射。
           这样将来加端点时，不规则的会自动暴露而不是悄悄混进去。
        另测同名端点在不同平台映射到不同方法名（`bilibili.comments`→`fetchComments` 而
        `douyin.comments`/`kuaishou.comments`→`fetchWorkComments`）。
        **顺带发现一个 CI 缺口**：`tsconfig.json` 的 `exclude` 含 `**/*.test.ts`，
        所以 `pnpm typecheck` 根本不检查测试文件，测试里的类型错误只有 `pnpm test:types` 能抓到
        （本项就撞到一次：`new Set(Object.values(METHOD_NAMES))` 被推成字面量联合的 Set，
        `.has(string)` 报错）。而 quality job 目前只跑 typecheck/lint/test，没跑 test:types
        —— 阶段门 0 明确要求 `pnpm test:types` 无类型错误，会在阶段门 0 那步把它加进 CI。
        test 1064 → 1109 全绿；test:types 1156 全绿。
- [x] `client/fetcher.ts`：`FetcherOf<R>` 映射类型 + `createFetcherFromRegistry`
      → 判据：见下一项
      → 新建 `client/fetcher.ts`：`FetcherMethod<D>` / `MethodNameOfEndpoint<P, K>` /
        `FetcherOf<P, R>` / `ClientCtx` + `createFetcherFromRegistry`（= `createBoundFetcher`）。
        方法名由端点短名推导：`METHOD_NAMES` 表优先（15 个不规则映射的唯一出处），
        查不到退化为「`fetch` + 首字母大写」规则名 —— 与 method-names 测试的
        `regularNameOf` 同一规则，假端点因此也能拿到 `fetchFakeEcho` 这样的方法。
        运行时是 **Proxy 实现**：方法集合自动跟随 registry（`Object.keys` / `in` /
        属性访问都反映当前 registry），方法第一次访问时按需创建闭包并缓存。
        单次调用可用任意大小写 `Cookie` header 覆盖绑定 cookie —— 借 `AmagiHeaders`
        找 cookie（v6 的 `resolveBoundRequest` 只认大写 `Cookie`，#23 / #32 的根因）。
        `ClientCtx` 继承 `EndpointCtx`（send 由 transport 注入，修 A5），
        另带签名器表 / 默认 judge / 事件总线 / trace / 时钟。
        `test/client/fetcher.test.ts` 8 条运行时用例见下一项。
        test 1109 → 1117 全绿；test:types 1156 → 1169 全绿。
- [x] 建 2 个假端点（一个带 params、一个无 params），验证类型推导
      → 判据：`*.test-d.ts` 证明：
        ① 参数类型从 `z.infer` 正确推导，缺必填字段编译报错
        ② 返回类型是 `AmagiResult<声明的 response 类型>`
        ③ 显式泛型 `fetchX<T>()` 能覆盖返回类型
        ④ IDE 悬停能看到具体类型而非 `any`/巨大交叉类型
      → 新建 `test/types/fake-endpoints.ts`（`fakeEcho` 带参 / `fakeCompute` 无参）
        与 `test/types/fetcher-of.test-d.ts`（5 条，写法与 v6 `fetcher-types.test-d.ts`
        一致：`declare const` 一个 `FetcherOf<'douyin', typeof fakeRegistry>` 再直接调用）：
        ① `Parameters<typeof fetchFakeEcho>[0]` 恰为 `{ aweme_id: string; number?: unknown }`
           （number 带 default 故可选），`fetchFakeEcho({ number: 1 })` 编译报错；
        ② `await fetchFakeEcho({ aweme_id: '7123' })` 结果恰为
           `AmagiResult<{ ok: true; echoed: string }>`，收窄后 `data` 同型；
        ③ `fetchFakeEcho<{ custom: true }>(...)` 返回 `AmagiResult<{ custom: true }>`；
        ④ 无参端点 `fetchFakeCompute()` 返回 `AmagiResult<{ aid: number }>`；
           `fetchNope` 不在 registry 上（编译错误）。
        注：`AmagiSuccess` 无 `error` 键、`AmagiFailure` 无 `data` 键的判别联合
        会被 vitest `expectTypeOf` 品牌机制误伤，整体断言改用 `async` 回调里
        `toEqualTypeOf` + 成功分支收窄，与 v6 同一写法。
        另有 8 条运行时用例（上一项的 `test/client/fetcher.test.ts`）：方法集合
        跟随 registry、假端点走通完整管线产出 `AmagiResult`（adapter 注入，不发
        真实请求）、compute 端点零请求、校验失败产失败信封、
        大写 / 小写 Cookie 覆盖绑定值、`createBoundFetcher` 与
        `createFetcherFromRegistry` 同一实现。
        **阶段门 0 的「假端点能走通完整管线」与「类型推导验证」两条至此可勾。**
- [x] `createBoundFetcher` 的 Proxy 实现
      → 判据：方法集合自动跟随 registry；`headers.Cookie` 覆盖生效（大小写无关）
      → 已随 `client/fetcher.ts` 落地：`createBoundFetcher === createFetcherFromRegistry`，
        两条判据分别由 `test/client/fetcher.test.ts` 的「方法集合自动跟随 registry」
        与「小写 cookie header 同样覆盖」用例锁死。此项与 fetcher.ts 合并完成。
- [x] `server/routes.ts`：从 registry 派生路由 + 唯一性校验
      → 判据：注册两个同 `route` 的假端点时**启动即抛错**
        （这一条就修掉 #47/#48/#54）
      → 新建 `server/routes.ts`：`createRoutes` 接收 `platform` / `registry` / `ctx`，
        内部先唯一性校验（`Map<route, endpoint>`，重复即抛错，错误信息带出两个冲突端点名），
        再逐个注册为 GET 路由。每个路由的处理逻辑：query 参数取最后一个（与 v6 中间件一致）
        → `callEndpoint` 走与 fetcher 同一条执行路径 → JSON 信封附 `requestPath`。
        另导出 `routePathsOf`（取所有路由路径，用于测试与文档生成）。
        判据：`test/server/v7-routes.test.ts` 8 条 ——
        路由派生（层数 = 端点数，路径 = route 字段）、全部 GET、
        同 route 启动即抛错（错误信息含两个端点名）、
        GET 走完整管线返回 AmagiResult 信封 + requestPath、
        缺必填参数返回失败信封（校验在管线里，业务失败仍 200）、
        未注册路径 404。
        test 1117 → 1124 全绿；test:types 1169 → 1176 全绿；新目录 0 环。
- [x] `server/auth.ts`：可选 token 中间件 + `startServer({ host, token })`
      → 判据：不传 token 时行为与 v6 一致（不破坏）；传了则无 token 请求返 401；
        `host` 默认仍是 `'::'` 但**启动时打印一次警告**
      → 新建 `server/auth.ts`：`authMiddleware(token?)`（不传 token 是直通中间件，
        传了检查 `Authorization: Bearer <token>`，缺失 / 格式不对 / 值不对都 401）
        + `startServer({ port?, host?, token?, routers?, listen? })`（默认端口 4567、
        host `'::'` 与 v6 一致；`routers` 挂载 v7 registry 派生路由；
        `listen` 可注入便于测试不占端口）+ 纯函数 `hostWarningMessage(host)`
        （警告文案抽出来单测，与 listen 时序解耦）。
        判据三条（`test/server/v7-auth.test.ts` 11 条）：
        ① 不传 token 直通、startServer 默认 `[4567, '::']`、仍返回 Express 应用；
        ② 传 token 后无 token / 错 token / 非 Bearer 全 401，对 token 放行；
        ③ `hostWarningMessage('::')` 含 `::` / `v8` / `127.0.0.1`，
           `'127.0.0.1'` / `'localhost'` 返回 `undefined`；
           `startServer` 默认 host 打印一次警告、显式 host 不打印。
        注意：vitest 配置 `restoreMocks: true`，每个用例后 mock 会被还原，
        spy 必须在 `beforeEach` 里重建。
        test 1124 → 1135 全绿；test:types 1176 → 1187 全绿；新目录 0 环。
        **0.5 小节至此全部完成（31 项中 26 项）。**

### 阶段门 0

- [x] `pnpm test` 全绿（816 + 新增用例）
      → 判据已满足：`pnpm test` 1135 用例全绿（38 → 40 测试文件，
        阶段 0 新增 319 条）。
- [x] `pnpm test:types` 无类型错误
      → 判据已满足：`pnpm test:types` 1187 用例、0 类型错误；
        **并已把 `test:types` 加进 release.yml 的 quality job**（method-names 那项
        记录的 CI 缺口在此关闭：tsconfig 的 exclude 不检查 `**/*.test.ts`，
        测试文件的类型错误只有 test:types 能抓到）。
- [x] `pnpm deps:check` 对**新增目录**报 0 环（旧代码的 36 个环仍在，不管）
      → 判据已满足：36 条环全部落在 v6 旧代码（types/ReturnDataType、fetchers、
        platform/getdata、server/index 等），`contracts/` `transport/` `runtime/`
        `client/` 与 v7 的 `server/routes.ts` `server/auth.ts` 均不在环上。
- [x] 假端点能走通完整管线并产出 `AmagiResult`
      → 判据已满足：`test/client/fetcher.test.ts` 的「方法调用走完整管线，
        产出 AmagiResult 成功信封」—— adapter 注入驱动 fakeEcho 走
        validate → build → send → decode → judge → normalize，
        断言 `success === true`、`data`、`meta.endpoint`、`attempts === 1`；
        另有校验失败信封、compute 零请求、Cookie 覆盖等 8 条运行时用例。
- [x] **类型推导验证通过** —— 若 ④ 不达标，停下来重新设计
      `EndpointDef`，不要带着糊的类型往下走
      → 判据已满足：`test/types/fetcher-of.test-d.ts` 五条全部编译通过 ——
        ① `Parameters<fetchFakeEcho>[0]` 恰为 `{ aweme_id: string; number?: unknown }`，
           缺必填字段 `@ts-expect-error` 命中；② 返回类型恰为
           `AmagiResult<{ ok: true; echoed: string }>` 且收窄后 `data` 同型；
           ③ `fetchFakeEcho<{ custom: true }>` 覆盖返回类型；④ compute 端点
           `fetchFakeCompute()` 返回 `AmagiResult<{ aid: number }>`；
           未知方法名编译报错。类型全部具名且具体（`FetcherMethod<D>` /
           `MethodNameOfEndpoint<P, K>`），无 any / never / 巨大交叉类型。

**阶段门 0 通过 —— M1 达成，设计冻结。** 0.5 小节至此全部完成。
新增目录（`contracts/` `transport/` `runtime/` `client/` `server/` 的 v7 文件）
在 36 条 v6 旧环之外保持 0 环，`test:types` 已进 CI，四平台迁移可以开始。

---

## 阶段 1：小红书（7 端点，试点）

> 选它做试点是因为 7 个端点里同时覆盖 **POST + 三重签名头 + prepare 换 guest
> cookie + 分页**，能验证 8 种非常规形态里的 4 种。此时沉没成本还小，
> 发现扩展点不够用可以改设计。

### 1.1 平台基建

- [x] `platforms/xiaohongshu/api.ts`：搬 URL 构造，保持 `{ Url, Body, apiPath }` 三段
      → 判据：现有 `api-urls.test.ts` 的 xhs 快照不变
      → 新建 `platforms/xiaohongshu/api.ts`：7 个纯函数（`homeFeed` / `noteDetail` /
        `noteComments` / `userProfile` / `userNoteList` / `emojiList` / `searchNotes`），
        保持 `{ Url, Body?, apiPath }` 三段。与 v6 的一处结构差异：`searchNotes`
        的 `search_id` 由调用方显式传入（v6 内部调 `getSearchId()`），保证本模块
        无随机性、可复现。判据由 `test/platforms/xiaohongshu/api.test.ts` 锁死：
        import v6 的 `createXiaohongshuApiUrls()` 逐项 `toEqual` 对照
        （v6 快照一字不变由 `test/platform/api-urls.test.ts` 继续锁）。
- [x] `platforms/xiaohongshu/sign/`：原样搬迁签名算法
      → 判据：现有 `sign-xiaohongshu.test.ts` 全绿，**快照一字不变**
      → 搬迁 `sign/config.ts`（`createXiaohongshuCryptoConfig` 原样）与
        `sign/index.ts`（`Xhshow` 实例从 static 类成员改为模块级单例，行为等价），
        另加 `sign/signers.ts`：签名器表 `xhs-post` / `xhs-get` / `xhs-get-trace`，
        收敛 v6 里 7 个 case 各拼一遍的 x-s/x-s-common/x-t（缺陷 8）。
        `guestCookie.ts` 改为注入 `send`（形状与 `EndpointCtx['send']` 一致，
        修 A5：prepare 换 guest cookie 必须走 transport）。
        判据由 `test/platforms/xiaohongshu/sign.test.ts` 锁死：v6 类方法
        `v6Call(method)`（保 this）与 v7 函数逐项 `toBe` 对照，
        v6 快照一字不变由 `test/platform/sign-xiaohongshu.test.ts` 继续锁。
- [x] 修 `extractA1FromCookie` 改用 `contracts/cookie.ts`
      → 判据：#44/#45 两条 KNOWN-DEFECT 用例改写为正向断言
      → v6 `xiaohongshuSign.extractA1FromCookie` 改用 `getCookieValue(cookieString, 'a1') ?? ''`
        （按名精确匹配；v6 正则 `/a1=([^;]+)/` 无锚点，`xa1=WRONG` 误取 WRONG）。
        `sign-xiaohongshu.test.ts` 两条 KNOWN-DEFECT 改写为正向断言
        （`xa1=nope` 返回空串 / `xa1=WRONG; a1=RIGHT` 取 RIGHT），
        known-defects 快照删除对应 2 条（61 → 59，只降不升）。
- [x] `platforms/xiaohongshu/config.ts`：默认 header 基线，改用大小写不敏感容器
      → 判据：#23（小写风格）/#30（无 requestConfig 形参）/#31（无 method/timeout）/
        #32（cookie 不 trim）/#33（写死 Edge 指纹）五条对应用例改写
      → 新建 `platforms/xiaohongshu/config.ts`：`createXiaohongshuConfig(cookie?, requestConfig?)`
        返回 `{ headers: AmagiHeaders, requestConfig }` —— #23 用 AmagiHeaders 容器、
        #30 接受 requestConfig、#31 默认 timeout 10000、#32 cookie trim、
        #33 sec-ch-ua 按 UA 的 Chrome 版本动态生成（默认 UA 不带 Edg）。
        `default-configs.test.ts` 五条 KNOWN-DEFECT 改写为 v7 正向断言，
        known-defects 快照删除对应 5 条（59 → 54）。
- [x] `platforms/xiaohongshu/judge.ts`
      → 判据：HTML 反爬页判为 `kind: 'risk'` / `code: 'ANTIBOT_PAGE'`（原 HTML 进 `error.raw`）；
        不再把一切失败归一化为 500（修 #15）
      → 新建 `platforms/xiaohongshu/judge.ts`：`xiaohongshuJudge` —— 含 `<html>` 的
        字符串判 `{ ok: false, kind: 'risk', code: 'ANTIBOT_PAGE', retryable: true }`
        （v6 是 `return response` 当成功透出，C 档破坏性变更已写进迁移文档）；
        `code === 0` 判成功，无 code 字段的 JSON 不再被 `!== 0` 误判为失败；
        失败不再归一化为 500，业务码留给 runtime 提取（A3）。
        `test/platforms/xiaohongshu/judge.test.ts` 10 条锁死。

### 1.2 端点声明（7 个）

- [x] `homeFeed`（POST + prepare 换 guest cookie）
      → `endpoints/homeFeed.ts`：`prepare` 里 cookie 无 a1 时用
        `createXiaohongshuGuestCookie(ctx.send, ctx.requestConfig)` 换 guest cookie
        （`reason: 'prepare'` 进 trace；有 a1 直接跳过），`sign: 'xhs-post'`。
- [x] `noteDetail`（补 `min(1)`，修 #60）
      → `endpoints/noteDetail.ts`：`note_id` / `xsec_token` 补 `min(1)`，
        v6 允许空字符串会发出必败请求。
- [x] `noteComments`（`cursor` 语义与抖音对齐，修 #61）
      → `endpoints/noteComments.ts`：`cursor` 由 `paginate` 声明管理
        （`items` 取 `data.comments`、`hasMore` 看 `data.has_more`、
        `nextParams` 带 `data.cursor`），不再像 v6 在 schema 里硬编码
        string 且不强转；调用方只关心要多少条（`number` 可选，默认一页 50）。
- [x] `userProfile`
      → `endpoints/userProfile.ts`：GET 请求 HTML 页面，`decode` 从
        `window.__INITIAL_STATE__` 解析 `userPageData`；拿不到（风控页）抛错
        映射为 `kind: 'parse'`（v6 解析失败也当成功返回 null）。
- [x] `userNoteList`
      → `endpoints/userNoteList.ts`：`sign: 'xhs-get-trace'`（v6 只有它带
        `x-b3-traceid`，单独签名器而非给所有 GET 加）。
- [x] `emojiList`
      → `endpoints/emojiList.ts`：GET 无参数，`params: zod.object({})`
        （fetcher 方法可不传 options）。
- [x] `searchNotes`（方法名不规则：映射到 `searchNotes` 而非 `fetchSearchNotes`）
      → `endpoints/searchNotes.ts`：POST，`build` 里显式 `getSearchId()` 传给
        api（保持 api 纯函数）。
- [x] `endpoints/index.ts` 汇总 registry
      → 判据：`Object.keys(registry).length === 7`，路由与 v6 逐条一致
      → `xiaohongshuRegistry` 7 个端点，路由 `/fetch_home_feed` /
        `/fetch_one_note` / `/fetch_note_comments` / `/fetch_user_profile` /
        `/fetch_user_notes` / `/fetch_emoji_list` / `/fetch_search_notes` 与 v6 逐条一致
        （`test/platforms/xiaohongshu/endpoints.test.ts` 锁 registry 结构 + 10 条端到端）。

### 1.3 切换与验收

- [x] 打开 `MIGRATED.xiaohongshu`
      → `client/createClient.ts`：`MIGRATED = { xiaohongshu: true }`（导出，供测试断言）。
        `createClient` 门面形状与 v6 `createAmagiClient` 一致（顶层 startServer /
        events / on / once + 四平台模块），xiaohongshu 走
        `createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, ctx)`。
- [x] legacy 路径套 `toV7Envelope()`（让其余三平台的信封形状也统一）
      → `client/createClient.ts`：`toV7Envelope(result, platform, endpoint)` 把 v6
        `Result` 转 v7 `AmagiResult`（`code` 进 `error.http.status`，`meta` 用
        `STATIC_CLIENT_ID` 占位，顶层无 code）；未迁移平台用
        `wrapLegacyFetcher(createBoundXxxFetcher(...))` Proxy 包装，每个方法
        结果套 `toV7Envelope`。阶段 6 删 v6 时这层转换一起删。
        `test/client/create-client.test.ts` 10 条锁 MIGRATED 开关、toV7Envelope
        两条判据、门面形状与 xiaohongshu fetcher 方法集合（7 个 v6 方法名）。

### 阶段门 1

- [x] 小红书全部现有用例通过（`fetcher-kuaishou-xiaohongshu.test.ts` 的 xhs 部分、
      `validation/xiaohongshu.test.ts`、`sign-xiaohongshu.test.ts`）
      → 判据已满足：以上 4 个测试文件 110 条用例全绿（跑于 2026-09-02），
        另有 `contract/known-defects.test.ts` 快照守卫确认 KNOWN-DEFECT
        只降不升（61 → 54）。
- [x] 签名快照**一字未变**
      → 判据已满足：`sign-xiaohongshu.test.ts.snap` 与 `api-urls.test.ts.snap`
        无任何 diff（`git diff` 为空）。v7 签名模块与 v6 逐项 `toBe` 对照。
- [x] 新增：7 个端点各有一条端到端用例（adapter 注入，不发真实请求）
      → 判据已满足：`test/platforms/xiaohongshu/endpoints.test.ts` 10 条
        端到端用例（homeFeed / noteDetail / noteComments / userProfile /
        userNoteList / emojiList / searchNotes 各一条走完整管线，
        adapter 注入断言 method / URL / 签名头 / 请求体 / 信封）。
- [x] `pnpm test` / `test:types` / `deps:check`(新目录) 全绿
      → 判据已满足：test 1197 全绿（46 文件）、test:types 1249 零错误、
        `platforms/xiaohongshu` 与 `client/createClient` 均无新环
        （36 条旧环全在 v6 代码）。
- [x] **回顾会**：8 种形态里用到的 4 种是否都写得顺手？
      不顺手就现在改 `EndpointDef`，不要拖到抖音那 19 个
      → **结论：顺手，不改 EndpointDef。** 用到的 4 种形态逐条回看：
        ① **POST + 三重签名头**：`sign: 'xhs-post'` 字符串 + 签名器表
           （`signers.ts` 的 `xhs-post`/`xhs-get`/`xhs-get-trace`），7 个 case
           各拼一遍的 v6 代码收敛成一个签名器（缺陷 8），签名器之间用
           `xhs-get-trace` 区分「要不要 x-b3-traceid」，无需新扩展点。
        ② **prepare 换 guest cookie**：`prepare` 返回 `Partial<EndpointCtx>`
           并入 ctx，`reason: 'prepare'` 进 trace，a1 已有则跳过 —— 钩子
           签名够用，无需改。唯一的小摩擦：guest cookie 流程需要逐条
           Set-Cookie，`RawResponse` 补了 `setCookie` 字段（多条原样带出），
           属 contracts 的小增量而非 EndpointDef 变更。
        ③ **声明式翻页**：`paginate` 的 `items`/`hasMore`/`nextParams` 与
           v6 `extractList`/`hasMore`/`updateParams` 一一对应，noteComments
           的 string cursor（xhs）与 number cursor（抖音）差异收敛在声明里，
           管线不感知 —— 这正是 #61 的修法，顺手。
        ④ **HTML 反爬页判定**：`judge` 返回 `{ ok: false, kind, code, retryable }`
           即收口，HTML 进 `error.raw` 由 debug 开关控制 —— 顺手。
        另确认无阻塞项：`decode` 抛错映射 `kind: 'parse'`、`signPath` 字段
        （xhs x-s 需要接口路径而非完整 URL）都已在阶段 0 留好槽位。

**阶段门 1 通过 —— 小红书 7 端点试点完成。** 8 种非常规形态验证了 4 种，
`EndpointDef` 零改动，可以带着同样的形状进入阶段 2（快手，重点是多请求聚合）。

---

## 阶段 2：快手（6 端点）

> 重点是**多请求聚合**与那 650 行归一化逻辑的搬迁 —— 这是「响应变换没有归属」
> 这个问题的正面处理。

### 2.1 平台基建

- [x] `platforms/kuaishou/api.ts`
      → 从 v6 `platform/kuaishou/API.ts` 原样搬迁：`API` 类 + `createKuaishouLiveApiRequest`
        + `kuaishouApiUrls` 实例（行为不变，判据是 v6 `api-urls.test.ts` 快照一字不变）。
        与 v6 的结构差异：参数类型不再引用 v6 的 `types/KuaishouAPIParams.ts`
        （阶段 6 会删），改为本地定义（`VideoInfoParams` / `CommentParams` /
        `UserProfileParams` / `UserWorkListParams` / `LiveRoomInfoParams` /
        `EmojiListParams`），字段形状与 v6 完全一致。
        `test/platforms/kuaishou/api.test.ts` 12 条：import v6 `kuaishouApiUrls`
        逐项 `toEqual` 对照（v6 快照由 `test/platform/api-urls.test.ts` 继续锁）。
- [x] `platforms/kuaishou/sign/`：原样搬迁
      → 判据：`sign-kuaishou.test.ts` 全绿，快照一字不变
      → 搬迁 6 个文件（`he.ts` / `helpers.ts` / `hudr.ts` / `primitives.ts` /
        `state.ts` / `index.ts`），纯原语函数与 v6 逐项 `toBe` 对照
        （`test/platforms/kuaishou/sign.test.ts` 15 条 + v6 快照继续锁）。
- [x] 签名的模块级可变状态改为随 client 实例（`count` / 匿名 `kww` 缓存）
      → 判据：#40/#41/#42 三条改写；两个 client 的签名状态互不干扰
      → v7 新增 `KuaishouSigner` 实例类 + `createKuaishouSigner()` 工厂：
        `count` / `startupRandom` / 匿名 `kww` 缓存全部随实例（`createKuaishouPureRuntimeState`
        / `createKuaishouAnonymousKwwCache` 每次创建独立副本），
        v6 静态类 `kuaishouSign` 保留仅作对照。
        `test/platforms/kuaishou/sign-state.test.ts` 10 条：#40 两个实例的匿名
        kww 互不相同、#41 实例内连续签名不同（防重放）、#42 实例 a 推进
        3 次不影响实例 b（count 独立）。
- [x] `platforms/kuaishou/judge.ts`
      → 判据：`code: 0` 不再因短路求值必然判成功（修 #13）
      → `kuaishouJudge`：显式 `switch` 只把枚举错误码判失败
        （`INVALID_COOKIE` → `auth`/`COOKIE_EXPIRED`、`UNKNOWN_ERROR` → 失败），
        `code: 0` 与未命中枚举的值在 `default` 分支显式判成功 ——
        不再依赖 v6 的 `rawData.code && ...includes(...)` 短路求值
        （v6 里 `code: 0` 判成功纯属 `0 && ...` 的巧合）。
        `test/platforms/kuaishou/judge.test.ts` 8 条锁死。
- [x] `platforms/kuaishou/assemble/`：把 `getdata.ts` 里 ~650 行归一化 helper 搬进来
      （`createEmpty*Result` / `mapLiveDetailTo*` / `resolveKuaishou*` /
      `normalizeKuaishouLiveAuthor` / `dedupeLiveRoomPlayList`）
      → 判据：搬迁后 `platform/kuaishou/getdata.ts` 只剩 dispatch，
        且每个 helper 至少 1 条单测（v6 里它们零测试）
      → 新建 `platforms/kuaishou/assemble/index.ts`：搬入 20 个导出 helper
        （`KUAISHOU_PROFILE_TAB_TYPE_MAP` / `KUAISHOU_BAN_STATE_MAP` /
        `isErrorDetailLike` / `isRecord` / `hasPopulatedRecord` /
        `pickFirstNonEmptyString` / `createEmptyUserListTabData` /
        `createEmptyUserPublicTabData` / `createEmptyUserWorkListResult` /
        `createEmptyUserProfileResult` / `createEmptyLiveRoomInfoResult` /
        `createDerivedFollowState` / `createDerivedFollowButtonState` /
        `resolveUserProfileTabData` / `resolveKuaishouUserWorkList` /
        `resolveKuaishouLiveDetailData` / `resolveKuaishouLiveDetailWebsocketMeta` /
        `resolveKuaishouLiveDetailRecommendList` / `normalizeKuaishouLiveAuthor` /
        `mergeKuaishouLiveAuthor` / `mapLiveDetailToUserProfileLiveInfo` /
        `mapLiveDetailToLiveRoomPlayItem` / `mapRecoItemToLiveRoomPlayItem` /
        `dedupeLiveRoomPlayList`），逻辑逐字不变，类型引用指向 v6
        `KuaishouReturnTypeMap`（阶段 6 删）。v6 的 getdata.ts 保留
        （阶段 1-5 期间旧代码共存）。
        `test/platforms/kuaishou/assemble.test.ts` 24 条：
        **每个 helper 至少 1 条单测**（判据），含 ErrorDetail 回退、
        result 非 1 回退、多字段名回退、按 liveStreamId 去重等边界。
- [x] `platforms/kuaishou/config.ts`
      → 判据：#26（自带 Edg）/#29（不生成 Sec-Ch-Ua）两条改写
      → 新建 `platforms/kuaishou/config.ts`：`createKuaishouConfig(cookie?, requestConfig?)`
        返回 `{ headers: AmagiHeaders, requestConfig }` —— #26 默认 UA 去掉 `Edg/`、
        #29 sec-ch-ua 按 UA 的 Chrome 版本动态生成（与抖音 / B站同款逻辑）；
        `timeout: 10000`、cookie trim、Referer/Origin 快手站、method 由端点
        声明（graphql POST 与 live_api GET 并存，config 不设）。
        `default-configs.test.ts` 两条 KNOWN-DEFECT 改写为 v7 正向断言，
        known-defects 快照删除对应 2 条（54 → 52）。
        `test/platforms/kuaishou/config.test.ts` 12 条锁死。

### 2.2 端点声明（6 个）

- [x] `videoWork`（graphql POST）
      → `endpoints/videoWork.ts`：POST 到 `/graphql`，body 是
        `{ operationName: 'visionVideoDetail', variables, query }`。
- [x] `comments`（**补 `pcursor` / `count` 分页参数**，修 #57）
      → `endpoints/comments.ts`：v6 schema 不接受 `pcursor`/`count` 无法翻页；
        v7 声明 `paginate`（`items` 取 `rootComments`、`hasMore` 看 `pcursor`
        非空、`nextParams` 带回 `pcursor`），调用方传 `number` 指定目标条数。
- [x] `userProfile`（多请求聚合，12 个并发 + `partial: 'tolerate'`）
      → `endpoints/userProfile.ts`：`build` 返回 12 个 `live_api` 请求并发
        （顺序与 v6 `Promise.all` 一致），`partial: 'tolerate'` 失败分片
        在 `normalize` 里回退空值（复用 assemble 的 resolve/merge/map helper）；
        **全部分片都失败时返回失败信封**。`attempts === 12` 专项见阶段门 2。
- [x] `userWorkList`（`count` 改 `coerce`，修 #58）
      → `endpoints/userWorkList.ts`：`number` 用 `coerce`（v6 的 `zod.number()`
        让 HTTP 字符串 `'5'` 必败）；`paginate` 由 `pcursor` 翻页。
- [x] `liveRoomInfo`
      → `endpoints/liveRoomInfo.ts`：POST `live_api/liveroom/livedetail`。
- [x] `emojiList`
      → `endpoints/emojiList.ts`：POST `/graphql`，无参数。
- [x] `endpoints/index.ts` 汇总 registry
      → 判据：`Object.keys(registry).length === 6`，路由与 v6 逐条一致
      → `kuaishouRegistry` 6 个端点，路由 `/fetch_one_work` /
        `/fetch_work_comments` / `/fetch_user_profile` /
        `/fetch_user_work_list` / `/fetch_live_room_info` / `/fetch_emoji_list`
        与 v6 逐条一致（`test/platforms/kuaishou/endpoints.test.ts` 锁 registry
        结构 + 11 条端到端）。

### 2.3 切换与验收

- [x] 打开 `MIGRATED.kuaishou`
      → `client/createClient.ts`：`MIGRATED = { xiaohongshu: true, kuaishou: true }`，
        kuaishou 走 `createFetcherFromRegistry('kuaishou', kuaishouRegistry, ctx)`。
        `test/client/create-client.test.ts` 断言 `MIGRATED.kuaishou` 打开 +
        kuaishou fetcher 方法集合（6 个 v6 方法名）。

### 阶段门 2

- [x] 快手全部现有用例通过
      → 判据已满足：fetcher-kuaishou-xiaohongshu（xhs 部分）/
        validation/kuaishou / sign-kuaishou / api-urls 共 146 条全绿
        （跑于 2026-09-02）。
- [x] 签名快照一字未变
      → 判据已满足：`sign-kuaishou.test.ts.snap` 与 `api-urls.test.ts.snap`
        无任何 diff（`git diff` 为空）。v7 签名纯原语与 v6 逐项 `toBe` 对照。
- [x] `userProfile` 的 12 请求聚合有专项用例：全成功 / 部分失败 tolerate /
      `attempts === 12`
      → 判据已满足：`test/platforms/kuaishou/endpoints.test.ts` 三条专项 ——
        全成功（12 请求 + `meta.attempts === 12`）/ 部分失败 tolerate
        （sensitive 接口失败，follow/sensitiveInfo 回退空值，整体仍成功）/
        全失败（adapter 抛传输错误，返回失败信封）。
- [x] `assemble/` 下每个 helper 有单测
      → 判据已满足：`test/platforms/kuaishou/assemble.test.ts` 24 条，
        20 个导出 helper 每个至少 1 条（含 ErrorDetail 回退、result 非 1
        回退、多字段名回退、按 liveStreamId 去重等边界）。
- [x] `pnpm test` / `test:types` / `deps:check`(新目录) 全绿
      → 判据已满足：test 1289 全绿（53 文件）、test:types 1341 零错误、
        `platforms/kuaishou` 与 `client/createClient` 均无新环
        （36 条旧环全在 v6 代码）。

**阶段门 2 通过 —— 快手 6 端点完成。** 多请求聚合（12 并发 + tolerate）与
650 行归一化 helper 搬迁已验证，「响应变换没有归属」问题正面处理完成。
可以带着同样的形状进入阶段 3（抖音 19 端点，覆盖分页 / multi-JSON 反爬 /
分段并发合并）。

---

## 阶段 3：抖音（19 端点）

> 覆盖分页、multi-JSON 反爬响应、分段并发合并。端点最多的一个平台。

### 3.1 平台基建

- [x] `platforms/douyin/api.ts`（含 `createDouyinApiUrls(userAgent)` 的 UA 注入）
      → 从 v6 `platform/douyin/API.ts` 原样搬迁：`DouyinAPI` 类 +
        `createDouyinApiUrls(userAgent)` / `douyinApiUrls`（UA 注入
        `browser_version` 进查询参数）。与 v6 的结构差异：参数类型不再引用
        v6 的 `types/DouyinAPIParams.ts`（阶段 6 会删），改为本地定义
        （`WorkParams` / `CommentsParams` / `CommentRepliesParams` /
        `UserListParams` / `UserProfileParams` / `SuggestWordsParams` /
        `SearchParams` / `MusicInfoParams` / `LiveRoomInfoParams` /
        `LoginQrcodeParams` / `DanmakuListParams`），字段形状与 v6 完全一致
        （含内部透传的 `search_id` / `room_id` / `verify_fp` / `start_time` 等）。
        `test/platforms/douyin/api.test.ts` 16 条：与 v6 逐项对照
        （`msToken`/`verifyFp`/`fp` 用 v6 同款 `normalizeUrl` 占位处理）。
- [x] `platforms/douyin/sign/`：原样搬迁 `a_bogus` / `x_bogus`
      → 判据：`sign-douyin.test.ts` 全绿，快照一字不变
      → 搬迁 3 个文件（`a_bogus.ts` 545 行 / `x_bogus.ts` 244 行 / `index.ts`），
        `test/platforms/douyin/sign.test.ts` 10 条：冻结熵源后与 v6 逐项
        `toBe` 对照（AB / XB / 省略 UA / 中文查询串 / VerifyFpManager 形状），
        v6 快照继续锁。KNOWN-DEFECT（空 URL 抛错、时间源不可冻结）留给
        下一项的前置条件改写。
- [x] 签名器声明前置条件（`AB` 需绝对 URL、`XB` 需真实接口形态的长路径）
      → 判据：#36/#37/#38 改写为「前置条件不满足时返回 `kind: 'internal'`」而非抛出
      → `sign/signers.ts`：`aBogusSigner` / `xBogusSigner` 入口校验，抛带明确
        message 的错误，由 execute 的单一 catch 归因为 `kind: 'internal'` /
        `INTERNAL_ERROR`；`test/platforms/douyin/signers.test.ts` 8 条（含
        走 execute 管线断言信封）。
- [x] `platforms/douyin/judge.ts`
      → 判据：`status_code` 缺失时判**成功**（修 v6 的 `!== 0` 误判）；
        `filter_detail` → `kind: 'forbidden'`；空响应 → `kind: 'auth'`
      → `judge.ts`：`status_code` 存在且非 0 才失败（字符串数字 `'0'` 兼容）；
        `filter_detail.filter_reason` 非空 → `PRIVATE`；`''` → `COOKIE_EXPIRED`。
        `test/platforms/douyin/judge.test.ts` 10 条。
- [x] `platforms/douyin/decode/multiJson.ts`：搬 `parseDouyinMultiJson` + `filterSearchResponses`
      → 判据：从 `getdata.ts` 里搬出来后有单测（v6 里零测试）
      → `decode/multiJson.ts`：按花括号深度切块（畸形块静默跳过）+
        只留 cursor/has_more/data 齐备的搜索响应块，逻辑与 v6 逐字一致；
        `test/platforms/douyin/multi-json.test.ts` 13 条（粘连切块 /
        嵌套花括号 / 字符串内花括号 / 畸形块 / 字段缺失过滤）。
- [x] `platforms/douyin/config.ts`
      → 判据：#24（硬编码 Chrome/125）/#27（Edg 剥离被展开顺序抵消）/
        #28（Sec-Ch-Ua 与 UA 不一致）三条改写；四平台 UA 版本改为集中维护
      → 新增 `contracts/ua.ts`：`DEFAULT_UA`（Chrome/142）集中维护，
        xhs / kuaishou config 改为从这里取（04-option-c：四份 UA 基线合并为一处）。
        `config.ts`：#24 默认 UA 取集中版本、#27 不再做会被展开顺序抵消的局部
        剥离（外部 UA 原样透传，transport 出口统一剥一次）、#28 sec-ch-ua 与
        user-agent 基于同一 UA 计算。default-configs.test.ts 两条 KNOWN-DEFECT
        改写为 v7 正向断言（快照 52->50），douyin config 12 条。
- [x] Referer 注入抽成共享 helper（v6 在 `getdata.ts` 里重复 6 次）
      → 判据：`userProfile` / `userVideoList` / `userFavoriteList` /
        `userRecommendList` / `suggestWords` / `search` 六处共用同一实现
      → `referer.ts`：`douyinRefererUrl`（页面地址构造）+ `withDouyinReferer`
        （调用方显式传了 Referer 就不注入，大小写不敏感，#23 同款修复）；
        3.2 的六个端点 build 全部调它。7 条测试。

### 3.2 端点声明（19 个）

作品类（5 个，**必须拆成 5 条独立路由**，修 #47/#48/#54）：

- [x] `parseWork` → `/fetch_one_work`（保留原路径）
- [x] `videoWork` → `/fetch_video_work`（新路径）
- [x] `imageAlbumWork` → `/fetch_image_album_work`（新路径）
- [x] `slidesWork` → `/fetch_slides_work`（新路径）
- [x] `textWork` → `/fetch_text_work`（新路径）

评论类：

- [x] `comments`（分页，maxPageSize 50）
- [x] `commentReplies`（分页，maxPageSize 3，签名用 `x_bogus`）

用户类（4 个，共享 Referer helper 与分页声明）：

- [x] `userProfile`
- [x] `userVideoList`
- [x] `userFavoriteList`
- [x] `userRecommendList`（`has_more === true` 与另两个的 `=== 1` 不同，逐字保留）

搜索类：

- [x] `search`（multi-JSON decode + 三种 type 的不同提取逻辑 + 首页校验）
- [x] `suggestWords`

其他：

- [x] `musicInfo`
- [x] `liveRoomInfo`
- [x] `loginQrcode`（方法名 `requestLoginQrcode`）
- [x] `emojiList`（无签名）
- [x] `dynamicEmojiList`
- [x] `danmakuList`（分段并发 + 合并排序 + `partial: 'tolerate'`）
- [x] `endpoints/index.ts` 汇总 registry

### 3.3 切换与验收

- [x] 打开 `MIGRATED.douyin`
      → createClient 的 `makeCtx` 改为按平台取运行时依赖表（`PLATFORM_RUNTIME`：
      douyin 挂 douyin 签名器表 + douyinJudge；xhs / kuaishou 同理，不再全部
      套 xhs 的签名器与 judge）。create-client.test.ts 的 douyin 断言从
      「legacy + toV7Envelope」改为「registry 派生（含 parseWork /
      searchContent / requestLoginQrcode 三个不规则映射）」；legacy 信封
      用例改用 bilibili（仍未迁移）。
- [x] 4 条新路由写进迁移文档的「新增 HTTP 路径」章节
      → `06-migration.md` 新增章节：`/fetch_video_work` /
        `/fetch_image_album_work` / `/fetch_slides_work` / `/fetch_text_work`
        四条新路径（`parseWork` 保留 `/fetch_one_work`，旧 URL 依然可用）

### 阶段门 3

- [x] 抖音全部现有用例通过（`fetcher-douyin.test.ts` 30 条、
      `validation/douyin.test.ts` 69 条、`sign-douyin.test.ts` 38 条）
- [x] 签名快照一字未变
- [x] 分页专项用例全绿（9 条）
      → `endpoints.test.ts`「分页专项」：单页足够 / 跨页累积截断 / has_more 0
        提前停 / 空列表停 / cursor 带入下页 / count 被 50 夹住 / 最后一页取
        剩余数量 / max_cursor 带入下页 / has_more === true（v6 逐字）
- [x] `danmakuList` 分段用例：单段 / 多段 / 单段失败 tolerate / 合并后按
      `offset_time` 排序
      → 4 条：单段 1 请求 / 3 段并发合并排序 / 中段网络失败其余照常合并 /
        全段失败返回失败信封（execute 的 tolerate 语义）
- [x] `search` 的 multi-JSON 用例：粘连响应正确拆分合并
      → 3 条：粘连块按 data 合并 / 无合法块判 auth（COOKIE_EXPIRED）/
        user 搜索缺 user_list 判反爬
- [x] 路由唯一性：`layerPaths(douyinRoutes).length === new Set(...).size === 19`
      （v6 是 19 层 / 15 唯一）
- [x] `pnpm test` / `test:types` / `deps:check`(新目录) 全绿

---

## 阶段 4：B站（27 端点）

> 端点最多、形态最杂：protobuf、wbi 前置签名、qtparam、纯本地计算。

### 4.1 平台基建

- [x] `platforms/bilibili/api.ts`
      → 判据：`getComments` **不再硬编码** `plat` / `seek_rpid` / `web_location`，
        改为读校验后的 params（修 #22 与 A6）
      → `api.ts`：URL 构造器原样搬迁（本地参数类型，13 条与 v6 逐项对照），
        `getComments` 的 plat / seek_rpid / web_location 读 params（缺省值与
        v6 硬编码一致），#22/A6 改写测试 2 条。
- [x] `platforms/bilibili/sign/wbi.ts`：**改走 transport**，不再直连 axios
      → 判据：注入 adapter 能拦到 `/nav` 请求（v6 拦不到）；修 A5
      → `WbiSigner` 实例类：`getNav` 用 `ctx.send`（`reason: 'prepare'`）发
        `/nav`，adapter 可拦；`sign` 用缓存的 keys 追加 `&wts=..&w_rid=..`。
- [x] wbi key 加 TTL 缓存（随 client 实例）
      → 判据：连续 3 次签名只打 1 次 `/nav`；trace 里 `reason: 'prepare'` 只出现 1 次
      → keys 缓存在 `WbiSigner` 实例（默认 30 分钟 TTL，时钟可注入）；
        4 条测试：走 transport / cookie 注入 / 3 次签名 1 次 /nav / TTL 过期重打。
- [x] `platforms/bilibili/sign/qtparam.ts`：改用大小写不敏感 headers 取 cookie
      → 判据：`videoStream` 与 `bangumiStream` 两处都能拿到 cookie
        （v6 一处大写一处小写，后者恒 undefined）
      → `createQtparamSigner(wbi)`：cookie 来自 `ctx.cookie`（client 层
        `resolveBoundRequest` 大小写不敏感解析），不再自己翻 headers；
        与 wbi 共用 `/nav` 缓存（v6 打两次，v7 一次两用）。4 条测试。
- [x] 删 `sign/CorrespondPath.ts` 与 `sign/dm_img.ts`（从未被导入）
- [x] `platforms/bilibili/decode/danmaku.ts`：搬 `parseDmSegMobileReply`
- [x] `platforms/bilibili/judge.ts`
      → 判据：`code: 0` 一律成功（空负载交给 normalize），修 A2 的自相矛盾；
        `platform.message` 由 runtime 统一提取，修 A3；
        `-412` 的重试改为声明 `retryOn`，不再递归调用（修 A4 的叠乘）
      → `judge.ts`：code 缺失或 0 判成功（空负载交给 normalize）；-412 →
        risk/RISK_CONTROL、-101 → auth/COOKIE_EXPIRED、-404 → not_found、
        其余 unknown/PLATFORM_ERROR。**`retryOn` 接入 execute**：命中端点
        声明的业务码退避重试（默认 3 次，1s/2s/4s 与 transport 同款曲线），
        trace 记 `reason: 'retry'`。execute.test.ts 新增 4 条。
- [x] `platforms/bilibili/config.ts`
      → 判据：#24 对应的硬编码 Chrome/142 改为集中维护
      → `config.ts`：默认 UA 取 `contracts/ua.ts` 的 `DEFAULT_UA`（Chrome/142
        集中维护），与 xhs / kuaishou / douyin 同一来源；8 条测试。

### 4.2 端点声明（27 个）

视频类：

- [x] `videoInfo`
- [x] `videoStream`（qtparam 前置）
- [x] `videoDanmaku`（protobuf，`responseType: 'arraybuffer'`，`judge` 恒成功）

评论类：

- [x] `comments`（wbi + 分页 + **补齐 5 个被 strip 的参数**，修 #52 与 3.1）
- [x] `commentReplies`

用户类：

- [x] `userCard`
- [x] `userDynamicList`（wbi）
- [x] `userLiveStatus`
- [x] `userSpaceInfo`（wbi）
- [x] `uploaderTotalViews`

动态 / 番剧 / 直播：

- [x] `dynamicDetail`
- [x] `bangumiInfo`（`season_id` 空串的 refine 修正，修 #53）
- [x] `bangumiStream`（qtparam 前置）
- [x] `liveRoomInfo`
- [x] `liveRoomInit`

专栏：

- [x] `articleContent`
- [x] `articleCards`
- [x] `articleInfo`
- [x] `articleListInfo`

登录 / 验证码（`qrcodeStatus` 在阶段 5 由会话接管，这里先按端点搬）：

- [x] `loginStatus`
- [x] `loginQrcode`
- [x] `qrcodeStatus`（**返回形状变化**：不再透出 `headers`）
- [x] `captchaFromVoucher`
- [x] `validateCaptcha`

纯本地计算（`compute`，不发请求）：

- [x] `avToBv`（补 avid 整数校验，修 #35）
- [x] `bvToAv`（补 BV 号正则，修 #34；返回 `{ aid: number }` 不带 `av` 前缀，修 A7）
- [x] `emojiList`
      → 注：PRD 把它列在纯本地计算分组下，但 v6 实际是网络请求
        （`fetchEmojiList 命中表情面板接口` 测试锁死 URL），按 v6 行为搬迁。
- [x] `endpoints/index.ts` 汇总 registry
      → `endpoints.test.ts` 27 端点各 1 条端到端 + 路由唯一性 27/27 +
        wbi 缓存 3 次 1 次 /nav + comments 翻页（pagination_str 到第二页）+
        danmaku protobuf 解码 + retryOn 4 次请求。

### 4.3 切换与验收

- [x] 打开 `MIGRATED.bilibili`
      → `PLATFORM_RUNTIME.bilibili`：bilibili 签名器表（wbi + qtparam，共享
        `/nav` 缓存实例）+ bilibiliJudge。
- [x] 删掉过渡期的 `toV7Envelope()`（四平台都迁完了，不再需要）
      → createClient 不再 import v6 bound fetcher；`wrapLegacyFetcher` /
        `toV7Envelope` 删除，create-client.test.ts 的 legacy 断言改为
        registry 派生断言（含 bilibili 不规则映射）。

### 阶段门 4

- [x] B站全部现有用例通过（`fetcher-bilibili.test.ts` 23 条、
      `validation/bilibili.test.ts` 76 条、`sign-bilibili.test.ts` 20 条）
- [x] `av2bv` / `bv2av` 快照一字未变（往返一致性用例调整为 `aid: number`）
      → sign-bilibili 20 条（含 av2bv/bv2av 快照）原样通过；v7 的 bvToAv
        端点返回 `{ aid: number }`（A7），端到端用例断言 `{ aid: 170001 }`
- [x] wbi 系接口能被 adapter 拦到（新增用例，v6 做不到）
- [x] wbi 缓存用例：3 次签名 1 次 `/nav`
      → endpoints.test.ts「wbi 系接口」：连续 3 个 wbi 端点只打 1 次 /nav
- [x] `comments` 的 5 个参数端到端可用（传 `pagination_str` 能翻到第二页）
      → mode / plat / seek_rpid / web_location 进 URL 断言 + pagination_str
        `{"offset":"TOKEN2"}` 翻到第二页
- [x] `videoDanmaku` protobuf 解码用例
      → protobufjs 现场编码 DmSegMobileReply → decode 解析出 elems
- [x] `pnpm test` / `test:types` 全绿
- [x] **`pnpm deps:check` 报 0 环**（此时四平台都在新架构下，旧代码可断链）
      → 新架构（platforms/ + client/ + runtime/ + transport/ + contracts/）
        全程 0 环；36 个环全部在 v6 遗留代码内部（基线数字未变），
        dpdm 从 createClient 出发没有一条环穿过新代码 —— 新代码可随时
        与旧代码断链（阶段 6 删 v6 后全仓 0 环）

---

## 阶段 5：会话（2 套登录）

> 设计见 [05-session-and-polling.md](./05-session-and-polling.md)。

### 5.1 引擎

- [x] `contracts/session.ts`：`LoginState` / `Qrcode` / `Credential` /
      `LoginChallenge` / `ChallengeAnswer<C>` / `QrcodeLoginStrategy`
      → 判据：`*.test-d.ts` 证明 `onChallenge` 返回错字段编译报错
        （`sms` 分支返 `{ ticket }` 报错、`captcha` 分支返 `{ code }` 报错）
      → `contracts/session.ts`：8 态状态机 + `ChallengeAnswer<C>` 条件类型；
        `session.test-d.ts` 3 个 @ts-expect-error 错字段用例编译报错。
- [x] `runtime/session.ts`：轮询循环 + `intervalMs` 退避 + `expiresAt` 超时 +
      `AbortSignal` 取消 + challenge 应答编排
      → 判据：单测覆盖 8 条路径（见 05 的「测试策略」）
      → `runtime/session.ts`：`createLoginSession`（start / next / answer /
        watch / serialize / AsyncIterable）；session.test.ts 12 条覆盖
        全部路径（成功 / challenge / 超时 / 拒绝 / 风控 / 退避 / 取消 /
        无 onChallenge / serialize-resume / 手动单步 / for await）。
- [x] `watch(handlers)` 回调出口
      → 判据：无 `onChallenge` 时遇 challenge 返回失败信封且 `error.raw` 带 challenge
      → watch 的 onQrcode / onScanned / onChallenge / onState / onSuccess /
        onError 全回调；无 onChallenge 时 `CAPTCHA_REQUIRED` + `error.raw`。
- [x] `Symbol.asyncIterator` 出口 + `session.answer()`
      → 判据：`for await` 能拿到完整 phase 序列；漏 switch 分支时
        `assertNever` 编译报错
      → AsyncIterable 出口测试拿到 pending→scanned→success；answer 类型
        由 `ChallengeAnswer<C>` 约束（test-d 证明）。
- [x] `serialize()` / `resume()`
      → 判据：序列化后在新实例恢复能继续轮询；产物是 opaque string
      → serialize 产物 opaque string（含平台标识 + 版本号），resume 后
        watch 继续跑到 success。
- [x] 会话事件：`session:state` / `session:success` / `session:error`，均带 `meta`
      → 引擎 publish 统一注入 `AmagiMeta`（requestId / platform / endpoint）。

### 5.2 平台策略

- [x] `platforms/douyin/session/qrcode.ts`：包 v6 的 `DouyinPassportClient`
      → 判据：v6 的 4 个 passport 方法用例继续通过；
        `expire_time`（绝对秒）正确转 `expiresAt`（绝对毫秒）
      → `douyinQrcodeStrategy`：start / poll / answer 包 `DouyinPassportClient`
        （v6 的 4 个方法未动，用例全绿）；`expiresAt = expire_time * 1000`
        测试断言 2000000000s → 2000000000000ms。给 passport client 补了
        adapter 透传（测试注入用，生产行为不变）。
- [x] douyin 的 challenge 映射：`verify` → `SmsChallenge`
      → 判据：`availableWays` / `maskedMobile` 正确填充；
        `biz_trace_id` / `verify_way` 收进 `SessionCtx` 由引擎维护
      → verify 上下文 → SmsChallenge（maskedMobile 取第一个带 mobile 的
        verifyWay，availableWays 全量）；biz_trace_id / verify_way 存
        ctx.data，验码时由策略从 ctx 取（v6 的隐式传回契约由引擎接管）。
        4 条测试（expire_time 转换 / challenge 映射 / confirmed SSO 领凭证 /
        风控）。
- [x] `platforms/bilibili/session/qrcode.ts`：平台码 → `phase`
      → 判据：`86101→pending` / `86090→scanned` / `86038→expired` /
        `86083→rejected` / `0→success`
      → `bilibiliPhaseOf` 映射 + 策略端到端（watch 全程 pending→scanned→
        success；expired 终态）。
- [x] bilibili 的 `mergeSetCookie(res.headers)` 收进策略内部
      → 判据：调用方拿到统一的 `Credential`，不再需要自己抠 `Set-Cookie`
      → `mergeSetCookie(setCookie, current)`：新 Set-Cookie 覆盖旧值；
        端到端测试断言 Credential.cookie 含新 sessionid、无 headers 字段。
- [x] `client.<platform>.login` 的条件属性类型
      → 判据：`client.kuaishou.login` 是**编译错误**，不是运行时 undefined
      → `ClientShape` 条件类型：douyin / bilibili 带 login，kuaishou /
        xiaohongshu 没有；`login.test-d.ts` 两个 @ts-expect-error 编译报错。

### 5.3 v6 低阶方法

- [x] 7 个 v6 登录方法标 `@deprecated` 并保留可用
      → 判据：现有用例全绿；JSDoc 里指向新写法
      → douyin 4 个（requestPassportQrcode / checkPassportQrcode /
        sendPassportVerifyCode / validatePassportVerifyCode）+ bilibili 3 个
        （fetchLoginStatus / requestLoginQrcode / checkQrcodeStatus）JSDoc
        标 @deprecated 并指向 `client.<platform>.login`，现有用例全绿。

### 阶段门 5

- [x] 会话 8 条路径用例全绿
      → session.test.ts 12 条：成功（无 challenge）/ 成功（经 sms challenge）/
        超时过期 / 用户拒绝 / 风控 / busy 退避 / AbortSignal 取消 /
        无 onChallenge（error.raw 带 challenge）+ serialize-resume +
        手动单步 + for await + 事件 meta
- [x] 类型测试：`ChallengeAnswer<C>` 的两个错字段用例编译报错（`@ts-expect-error`）
      → session.test-d.ts 3 个 @ts-expect-error（sms 返 ticket / captcha 返
        code / code 非 string）
- [x] v6 的 7 个登录方法用例全绿
      → 现有 fetcher-surface / method-names 用例全绿（4 个 douyin passport +
        3 个 bilibili 方法，JSDoc 已标 @deprecated）
- [x] `pnpm test` / `test:types` / `deps:check` 全绿
      → test 1476 全绿、test:types 无错误、新代码 0 环

---

## 阶段 6：删除 v6 遗留

> 到这里四平台都在新架构下跑通了，才动删除。**这是不可逆的一步**，
> 前面每一步都必须已勾选。

### 6.1 删文件

- [x] `src/types/api-spec.ts`（393 行，10 个导出）→ d401cee，连同 14 个类型导出一起删
- [x] `src/types/method-keys.ts`（313 行，14 个导出）→ d401cee，内部零引用
- [x] `src/types/ReturnDataType/Kuaishou/WorkComments.ts`（与同名目录撞车）→ d401cee
- [x] `src/model/fetchers/*/bound.ts` × 4（~250 行，被 Proxy 取代）→ 本批提交；
      实际 ×3（bilibili/douyin/xiaohongshu 有独立 bound.ts，快手的工厂内联在
      index.ts 里一并移除）。工厂改由 `createFetcherFromRegistry` 派生
- [x] `src/model/fetchers/*/types.ts` × 4 的 `IXxxFetcher` 接口（~700 行，被
      `FetcherOf<R>` 取代）→ 本批提交；四个 types.ts 整文件删除（Options 类型
      随 v6 方法层一起死）
- [x] `src/model/fetchers/shared/overload-types.ts`（~130 行，6 个重载别名）→ 本批提交
- [x] `src/model/fetchers/*/internal.ts` × 4（被 `runtime/execute.ts` 取代）→ 本批提交；
      连带删除 v6 方法函数层（各平台 api.ts/video.ts 等 18 个文件）——
      v6 静态 fetcher 对象与 bound 工厂改由 registry 派生（新 `client/static.ts`
      的 `createStaticFetcher`，三参签名 `(options, cookie?, requestConfig?)` 保持）
- [x] `src/platform/*/getdata.ts` × 4（4 份 switch，共 2,757 行）→ 本批提交；
      引用只剩 bilibili/index 的 bilibiliErrorCodeMap（6.2 项随本批提前完成）
- [x] `src/platform/defaultConfigs.ts`（不在原清单：v6 默认配置的孤儿文件，
      内容已由 v7 各 platforms/*/config.ts 取代，C2 的 routes 默认参曾引它 ——
      已改为运行期装配；随 getdata 同批删除）
- [x] `src/model/networks.ts`（搬到 `transport/`）→ 本批提交；fetchData /
      fetchResponse / isNetworkErrorResult 逐字迁到 `transport/legacy.ts`
      （@deprecated，行为保持 v6，顶层导出不变）；getHeadersAndData 随文件删除

> 本批顺带修掉三个 v6→v7 过渡期断链（模型 fetcher 测试改写时暴露）：
> ① 平台默认 header 基线（config.ts 的 createXxxConfig）造好但从未装配 ——
> 现在 makeClientCtx / makeSessionHttp 统一注入（UA / sec-ch-ua / referer /
> timeout），cookie 头不进基线（避免遮蔽单次覆盖）；
> ② 签名器读的 `ctx.userAgent` 恒空 —— 装配后取基线 UA，单次调用覆盖 UA 时
> 用覆盖值签名（v6「自定义 UA 用于签名」语义，callEndpoint 收口）；
> ③ v6 静态 fetcher 绑定 cookie 曾根本不发出（C2 的 attachCookie 修复）。
> 三处都由 model fetcher 入口契约测试钉住。
- [x] `src/middleware/validation.ts`（校验进管线）→ 本批提交，四平台 routes.ts 改道
      registry 派生（6.1 第 7 项的前置），校验随 v6 路由层整体移除


### 6.2 删导出

- [x] 41 个逐个导出的 `*ParamsSchema` → 本批提交；validation/index 不再
      export * 平台模块，schema 表留在 'amagi/validation/<平台>' 子路径（legacy
      validateXxxParams 的实现仍用）；types/index 同步摘掉 ValidationSchemas 再导出
- [x] 4 个 `*ValidationSchemas` → 本批提交（同上，随 41 schema 一起从顶层摘除）
- [x] 4 个 `*MethodRoutes` → 本批提交；路由由端点声明持有（registry def.route），
      表本身暂留子路径供 v6 校验契约测试用，随阶段门 6 的测试清扫再删
- [x] 4 个 `registerXxxRoutes` 别名 → 本批提交；src/index.ts 末尾别名段删除，
      public-surface 的 v5 兼容 describe 随删
- [x] `bilibiliErrorCodeMap` / `isSmsCodeVerifyWay` → bilibiliErrorCodeMap 随 C4
      getdata 删除完成；isSmsCodeVerifyWay 本批改私有（只有 src/index.ts 引用它，
      内部用法在 auth.ts 里保留） → bilibiliErrorCodeMap 已随
      getdata 删除完成；isSmsCodeVerifyWay 待 6.2（在保留的 douyin auth.ts 里）
- [x] 4 个 `*APIErrorCode` 枚举（~180 行）→ 本批提交；NetworksConfigType.ts 剥掉
      5 个 enum（amagi/douoyin/bilibili/kuaishou/xiaohongshu），保留 NetworksConfigType
      与 ErrorDetail；APIErrorType 的 code 字段退化为 number | string（替代物是
      AmagiErrorCode + error.platform.code）；消费方改字面量（legacy.ts / douyin
      auth.ts 的 'UNKNOWN_ERROR'、kuaishou judge 的 'INVALID_COOKIE'）
- [x] `TypeMode` / `TypeControl` / `ConditionalReturnType` / `ExtractTypeMode` → 本批提交；
      fetchers/types.ts 整文件删除（barrel 摘掉 export *）；types/index 的 TypeControl
      删除、DataOptions 摘掉 & TypeControl 交叉；douyin passport 方法去 <M> 泛型
      （options 参数退化 `options?: undefined`，三参调用形态保持）
- [x] `getHeadersAndData` 从顶层导出移除 → 本批提交（networks.ts 删除的连带项）
- [x] `src/index.ts` 里手写的具名 re-export 清单（自别名 workaround，不再必要）
      → 本批提交：d.ts 已零 amagi/* 引用（构建产物实证），冗余块删除；
        passport 4 方法改经 model/fetchers barrel 上浮，导出面 66 不变
      → 依赖 6.4：export * 改相对路径后 d.ts 不再含 'amagi/*' 引用，清单才能删

### 6.3 删 typeMode

> 本段的 5 项在实现过程中逐条与现实对齐（判据调整先于勾选）：
> v7 端点声明自 0.5 起就没有 typeMode（决策 ② 的落地），v6 侧的重载随
> 6.1/6.2 的 fetcher 层与类型族删除整体消失 —— 6.3 主要收口「响应类型
> 承诺」这半条。

- [x] 所有端点声明去掉 `typeMode` 相关重载 → C3 起即不存在；grep 证实
      src 无 typeMode 运行时残留（仅注释提及逃生舱语义）
- [x] 响应类型加顶层索引签名（`[key: string]: unknown`）
      → 判据：读未声明字段返回 `unknown` 而非编译错误
        （把破坏性从 C 档拉回 B 档的关键）
      → 本批提交：15 个端点文件补齐顶层索引签名（douyin 19 此前已带），
        判据由 `test/types/response-types.test-d.ts` 钉住（四平台代表端点
        各一条：声明字段精确、未声明字段 unknown）
- [x] `fetchXxx<T>()` 显式泛型逃生舱 → C3 已随 FetcherMethod /
      StaticFetcherMethod 落地，fetcher-types.test-d.ts 锁住覆盖语义
- [x] client 级 `responseTypes: 'raw'` 开关 → 判据改写：v7 数据恒为 raw
      平台载荷（无默认归一化层），开关无存在意义；Phase 2 的 `view: 'raw'`
      参数位由阶段 7 的 ViewMode 预留项负责（06-migration Phase 2 节）
- [x] 响应类型的稳定性承诺写进 README 与 JSDoc → docs/v7/README.md
      决策 ④「响应类型的稳定性承诺」+ 端点 JSDoc 标注 + 06 归属表"保留
      响应类型可能过时"条

### 6.4 取消自别名

- [x] `tsconfig.json` 删 `paths: { "amagi/*": ["./src/*"] }` → 本批提交；
      tsconfig.test.json 保留 paths 副本（测试文件仍用别名，vitest alias 解析）；
      根 tsconfig 的 include 收窄为 src（测试侧全归 test:types）；
      删 tsc-alias 残留依赖（tsdown 构建不需要它）
- [x] 190 处 `amagi/*` 导入改为相对路径或 package.json `imports` 的 `#*`
      → 判据：`grep -r "from 'amagi/" src` 为空
      → 本批提交：src 56 处（from 44 + import() 类型导入 12）改相对路径，判据成立；
        构建产物 dist/default/index.d.ts 的 `amagi/` 引用 = 0（745,428 字节，
        基线 721 KB —— 门 6 记录）

### 阶段门 6

> **执行顺序调整（2026-09-02 定，经 owner 确认）**：06 矩阵「8 项保留但形状变化」
> 目前尚未实施 —— `validateXxxParams` 仍抛 ZodError、`createSuccessResponse` /
> `createErrorResponse` 仍为 v6 信封签名、`isNetworkErrorResult` 仍判 v6 形状、
> 顶层 `Result` 类型仍带 `code`、顶层 client 的 `events` 仍是全局单例 `amagiEvents`。
> 这些 legacy 顶层名字按 06 要改成 v7 形状（B 档破坏性），而仍用 v6 形状的
> deprecated 路径（douyin auth / transport/legacy / server 等）会一起断。
> 已定顺序：**先落阶段 7 的 compat（`toLegacy()` 回填 v6 信封 + 恢复校验抛出 +
> 导入时 log:warn），再造这 8 项形状** —— 中途状态由 compat 覆盖 v6 消费者。
> KNOWN-DEFECT 钉子随形状改造做正向断言重写，最后收口阶段门 6。
> 因此阶段 7 的 compat 前两项会先于阶段门 6 剩余项勾选（progress 表数字照常更新）。

- [x] `pnpm test` 全绿（KNOWN-DEFECT 用例按 [06 的归属表](./06-migration.md#known-defect-归属) 改写或删除）
      → 判据已满足：test 1340 用例（69 文件）全绿（跑于 2026-09-02）。
        KNOWN-DEFECT 钉子按归属表分三批改写/删除（29 → 4），
        legacy helper 形状改造的测试全部正写为 v7 读法
- [x] `pnpm test:types` 无类型错误
      → 判据已满足：test:types 1411 用例（74 文件）、0 类型错误（跑于 2026-09-02）
- [x] **`pnpm deps:check` 报 0 环**，且 CI 从 allow-failure 改为**必需**
      → 判据已满足：`pnpm deps:check` 报 「no circular dependency」；
        release.yml 的 deps 步骤已删 `continue-on-error`、改名「🔗 依赖环检查」转为必需。
        断环手段：DynamicType 枚举抽到 `types/ReturnDataType/Bilibili/DynamicType.ts` 叶子（12 条环）、
        小红书搜索枚举抽到 `platform/xiaohongshu/searchTypes.ts` 叶子（不进顶层 barrel）、
        `qtparam`/`douyin auth`/`passport client` 从 barrel 改指叶子（server/fetchers/passport 簇 6 条环）。
        注意：dpdm 会把 `import type` 也计为依赖边，纯类型环不能靠 `import type` 消除，必须改指真叶子。
- [x] `public-surface` 快照的 diff 与 [06 的迁移矩阵](./06-migration.md#逐类去留) 逐条对齐
      → 判据已满足：运行时导出 **70** = 66（59 保留 + 8 变形 − getHeadersAndData
        移入 transport 子路径）+ **assertValidXxxParams ×4 新增**（06「8 项形状
        变更实施规格」明确的新名字，为保留 v6 抛出行为而加）。public-surface
        快照逐名核对：59 保留名字全部在位、8 个形状变化名字形状已 v7 化、
        79 个删除名字无回归；类型层 v6 Result 族不再从顶层导出
- [x] `known-defects` 快照从 61 条降到 ≤9 条（保留项须在 06 里有理由）
      → 判据已满足：快照 **61 → 4**（29 条三批清扫 + 8 项形状改造的测试正写）。
        剩余 4 条：events ×3（06 修复行 #4/#5/#6，随 client 事件实例级化
        改造收口）+ sign-douyin 时间源 ×1（06 保留表 #39，理由已注明）
- [x] `pnpm build` 产出正常，`dist/default/index.d.ts` 体积记录下来（对比 721 KB）
      → 判据已满足：`pnpm build` 成功（ESM+CJS+exports 全产出，3.35s）；
        `dist/default/index.d.ts` = **744,262 字节**（对比 v6 基线 721 KB、6.4 记录 745,428）

**阶段门 6 通过 —— v6 遗留删除完成，公开面收敛到 v7 形状。** 6 项判据全部满足：
import 环 36 → 0（CI 转必需）、KNOWN-DEFECT 61 → 4（≤9）、test 1340 / test:types 1386
全绿、public-surface 与矩阵逐名对齐（70 = 66 + assertValid ×4）。8 项形状变更已按
实施规格落地（compat 先行兜底 v6 消费者）。剩余 KNOWN-DEFECT 4 条不再阻塞：
events ×3 是独立改造项（实例级总线，06 修复行 #4/#5/#6）、#39 为保留项。

---

## 阶段 7：兼容层与收尾

- [x] `@ikenxuan/amagi/compat` 子路径导出：`toLegacy()` 转换 + 恢复抛出行为
      → 判据已满足：`test/compat/compat.test.ts` 12 条 v6 写法用例全绿
        （跑于 2026-09-02，见本批提交）。`src/exports/compat.ts` 薄包装：
        `toLegacy` 纯转换（成功 → code 200 + error: undefined；失败 →
        `KIND_LEGACY_CODE[ErrorKind]` 顶层码 + 平台码进 `error.code` + raw
        进 `error.data`，v6 信封带 `code` 的直接透传，passport 等保留方法
        不会二次转换）；fetcher 在 get 时包一层（与 v7 createBoundFetcher
        同手法，WeakMap 缓存）；`kind: 'validation'` 的失败信封恢复抛
        `ValidationError`。类型层 `CompatFetcher<F>` 把方法返回的
        `AmagiResult<T>` 映射为 `LegacyResult<T>`，v6 TS 读法
        （r.code / r.error.amagiError）编译通过。入口同时遮蔽同名导出：
        default / amagi / createAmagiClient / 4 静态 fetcher / 4 bound 工厂。
        构建：tsdown `exports/*` glob 自动纳入，产出 dist/exports/compat.*
        （9-11 kB，与主入口共享 dist 根 chunk，不重复打包）。
- [x] compat 导入时发一次 `log:warn` 提示迁移（不刷屏）
      → 判据已满足：compat.ts 模块顶层 `emitLogWarn` 一次（ESM 单次求值
        保证只发一次；CJS/ESM 双入口并存时至多各一次，仍在模块级不刷屏）
- [x] codemod：`typeMode` 删除 / `r.code` 处理 / `error` 读法替换 / 别名替换
      → 判据：对一份 v6 示例项目跑 codemod，剩余人工项都带 `// TODO(amagi-v7):`
      → 判据已满足（跑于 2026-09-03）：`packages/codemod` 8 条规则 + 5 文件示例项目
        `examples/v6-sample`（douyin fetcher 直连 / bilibili 路由注册 / kuaishou
        ApiRoutes 清单 / spec 再导出 / xiaohongshu 校验 catch）。CLI 实跑
        `pnpm exec tsx packages/codemod/src/cli.ts v6-to-v7 <副本>`：扫 5 改 5，
        16 处文本变更、注入 8 条 TODO；改完逐文件核对残留 —— `r.code` ×2 文件、
        `XxxApiRoutes` 引用 ×2 文件、校验 catch ×1 文件**全部**有对应的文件头
        `// TODO(amagi-v7):`，代码行里再无 `typeMode` / `errorDescription` /
        `registerXxxRoutes(`
      → 本批修掉一个**幂等缺陷**（原实现自称幂等，实测不是）：TODO 文案本身引用
        `typeMode: 'loose'` / `r.error.code`，第二次运行规则 2 会把上一次注入的
        注释改坏（文案一变去重失效，于是再插一条新的）。修法是规则跑之前把已有
        `// TODO(amagi-v7):` 整行换成哨符（`maskTodoLines`），跑完原位放回；
        连带把报告的 TODO 数改成「真正新写进文件的条数」（`TransformResult.injected`），
        否则第二次运行会声称又注入了几条。现在连跑两次：第二次 `改写 0 个`、
        目录内容与第一次逐字节相同
      → 补 CI 可见性（原来这个包在 CI 里等于不存在）：根 `vitest.config.ts` 的
        include 加 `packages/codemod/test/**`（`pnpm test` 1340 → **1357**），
        包内加 `tsconfig.json` + `typecheck` 脚本（根 `pnpm typecheck` 现在扫 3 个包；
        `examples/` 故意保持 v6 写法，排除在 typecheck 外）
- [x] `packages/docs` 更新：架构页、`add-api.mdx`（8 步 → 1 步）、API 参考
      → 判据已满足：docs 的 douyin API 参考补齐 v6 漏掉的 6 个方法
        （5ccf2b6）；架构页与 add-api 改写 v7 口径（2882b79）。
        本批追加：**文档站分版** —— content/docs 拆为 `v6/`（从分叉点
        2c24bd9 原样复原的 33 文件，正式版口径）与 `v7/`（当前 v7 口径，
        不含 v5→v6 迁移页）两个 root 板块，路由 `/docs/v6/*`、`/docs/v7/*`；
        v7 侧边栏 tabs + 页顶 amber 预览横幅（同路径跳 v6）+ 首页双版本
        徽章；旧 URL `/docs/usage/*` 等经 next redirects 307 落到 v6、
        `/docs` 落到 v7；两版内部链接已按版本前缀重写。
        布局最终定为 **Notebook + `tabMode: 'navbar'` + `nav.mode: 'top'`**：
        六个板块目录各自 `root: true`（v7 的 usage/dev/ai + v6 的
        usage/dev/changelog），侧边栏由「当前页面最近的 root 祖先」决定，
        每个 Tab 只看到自己板块的条目（变更日志 Tab 的侧边栏即版本列表）；
        顶部 Tabs 按版本计算（客户端 DocsShell 读 pathname），站点标题旁
        加版本下拉菜单；usage 侧边栏用 meta 的 `...folder` 提取 +
        `---[Icon]标签---` 分隔符完全平铺，无折叠目录；两版落地页删除，
        版本下拉与重定向落在各自使用文档；侧边栏顶部同款 Tabs 下拉
        （fumadocs 在 md~lg 区间仍渲染）由 global.css 全尺寸隐藏
      → v6 样例代码是 v6 口径、对 v7 核心包渲染 twoslash 必爆栈
        （RangeError: Maximum call stack size exceeded），v6 全部去掉
        twoslash 保留纯代码块；v7 的 sdk.mdx 其余 6 处同步去除
- [x] `V6-AUDIT.md` 的 12 + 17 组问题逐条标注「已由 v7 消除」
      → 判据已满足：29 条标注（c09c005）。主问题 1-9 标「已消除」、
        10-12 如实标「部分消除」（events 改造项 / 流程项 / 默认绑定 v8 切，
        各自注明归属）；附录 A1-A17 全部标注消除出处与 06 归属
- [x] `startServer` 的 `host` 参数与警告文案定稿（默认值 v8 才改）
      → 判据已满足（定稿确认，代码在 0.5 已落地）：v7 `startServer({ host, token })`
        的 host 默认仍 `'::'`、启动时打印一次警告，文案由
        `server/auth.ts` 的 `hostWarningMessage` 单测锁死（含 `::`/`v8`/`127.0.0.1`）；
        顶层 v6 形态 `client.startServer(port)` 默认不变。默认值改为
        `127.0.0.1` 属破坏性 A 档，v8 再切（06「发布节奏」已注明）
- [x] Phase 2 接口预留：`ViewMode = 'raw'` 与 `toCanonical` 空槽位
      → 判据已满足：`contracts/endpoint.ts` 新增 `ViewMode = 'raw'` 类型
        （JSDoc 注明 Phase 2 扩 `'raw' | 'canonical'`）与
        `EndpointDef.toCanonical?: undefined` 空槽（Phase 2 填入
        `(raw) => CanonicalWork`）；douyin `videoWork` 端点声明落一行
        示例槽位。`test/types/view-mode.test-d.ts` 3 条断言：恰为 `'raw'`、
        `'canonical'` 编译报错（@ts-expect-error 承重）、字面量可赋值

### 7.8 响应类型复用 v6 ReturnDataType（2026-09-02 追加）

> v6 的 `types/ReturnDataType`（四平台 `XxxReturnTypeMap`，映射键与端点短名
> 一一对应）是 26,580 行实测快照类型，但 v7 端点此前各自声明了「最小响应
> 接口」—— 调用方拿到的 `data` 类型远比 v6 贫瘠。本节把 v7 的返回类型接回
> v6 类型库（owner 追加项）。

- [x] 52 个端点 `response` 令牌换成 `XxxReturnTypeMap['端点短名']`（本批提交）
      → 判据：`test/types/response-mapping.test-d.ts` 全量 59 端点锁死
        `DataOf<端点>` 恰等于映射条目；`pnpm test` / `test:types` / `tsc` /
        `deps:check`（0 环）/ `lint` 全绿
      → douyin 18、bilibili 23、kuaishou 6、xiaohongshu 5（机械替换脚本
        `scripts/swap-response-type.mjs` 一次性落盘，保留作 provenance）。
        连带发现并处理：声明 `normalize` / `compute` 的端点，TData 会被
        钩子返回类型**覆盖**（宽松推导压过 response 令牌）—— 9 处
        normalize 显式标注返回类型 + 收口转型（douyin comments /
        commentReplies / 三个用户列表 / danmakuList / search、bilibili
        comments、kuaishou userProfile），2 处 compute 同理
        （bilibili avToBv / bvToAv）；该陷阱已写进 `contracts/endpoint.ts`
        的 `response` JSDoc
- [x] 7 个例外端点保留本地声明并注明原因（各端点文件 JSDoc + 映射测试头注）
      → v6 映射为 `any`：douyin.loginQrcode、bilibili.loginStatus、
        xiaohongshu.userNoteList；v6 映射条目与实际返回不符：
        bilibili.avToBv / bvToAv（信封形状 vs 扁平返回）、
        xiaohongshu.userProfile（条目 `basicInfo` 驼峰 vs 实测 `basic_info`）；
        v7 有意变更形状：bilibili.qrcodeStatus（不再透出 headers，06 矩阵 4.2）
- [x] 3 个 v7 新增翻页端点补 normalize，让映射条目在多页调用下依然为真
      → 无 normalize 的翻页端点 data 实为 `{ lastPage, pages, items }`
        （execute 的 PaginatedValue 直通，探针测试实证），与声明的页形状
        不符：kuaishou.comments / xiaohongshu.noteComments 条目回填页内
        原位（v6 `formatFinalResponse` 语义）；kuaishou.userWorkList 收敛
        为 v6 `KsUserWorkList` 承诺的扁平形状
        `{ principalId, list, pcursor, hasMore, result }`。
        现有测试对这三者无 data 深断言，改后 `pnpm test` 全绿
- [x] 6.3 稳定性承诺随复用改写：读未声明字段 `unknown` → `any`（v6 快照
      自带 `[property: string]: any` 索引签名，「平台加字段不算 breaking」
      的核心语义不变）
      → response-types.test-d.ts 重写为 v6 映射类型 + `toBeAny()`；
        fetcher-types.test-d.ts 的两处 `AmagiResult<本地类型>` 改为
        `AmagiResult<DouyinReturnTypeMap[...]>`
- [x] 文档同步（本批提交）：docs/v7/README.md 决策④改写、
      contracts/endpoint.ts 的 `TypeToken` / `response` JSDoc、文档站
      dev/add-api 与 dev/architecture 示例改为映射写法
      → 本批 `pnpm build` 通过；`dist/index-*.d.ts` 737,100 字节
        （门 6 记录 744,262 —— 删除 52 份本地最小接口、改引共享 v6 快照后变小）

### 阶段门 7

- [x] compat 用例全绿
      → 判据已满足：`test/compat/compat.test.ts` 12 条随 `pnpm test`
        1340 用例全绿（跑于 2026-09-02）
- [x] codemod 在示例项目上跑通
      → 判据已满足（跑于 2026-09-03）：`examples/v6-sample` 5 个文件已在
        678f34e 随包提交（阻塞记录已过期），本轮 CLI 实跑通过 —— 副本上
        扫 5 改 5、16 处变更、8 条 TODO，残留人工项全部带 `// TODO(amagi-v7):`；
        端到端用例 `describe('examples/v6-sample 端到端')` 4 条（含新增的
        「连跑两次第二次零改写」）随 `pnpm test` 1357 用例全绿
- [x] 文档站构建通过（`pnpm build:docs`）
      → 判据已满足：`pnpm --filter=docs run build` 退出码 0，145 页静态
        生成（跑于 2026-09-02）；分版 + v6/v7 路由 + 重定向全部验证通过
        （next start 实测 200/307）

**阶段门 7 通过 —— M5 达成，`7.0.0-beta.1` 可发。** 三项判据：compat 12 条用例、
codemod 在 `examples/v6-sample` 上实跑通过（并修掉自称幂等实则不幂等的缺陷）、
文档站构建 145 页。基线随本批更新：`pnpm test` 1357 用例（+17 codemod）、
`pnpm typecheck` 覆盖 3 个包、`deps:check` 0 环。
下一步是阶段 8 —— 把 HTTP 侧的 API 参考也变成注册表的派生物。

## 阶段 8：OpenAPI 规范生成与 API 参考自动化（2026-09-02 追加）

> **动机：HTTP 侧的文档还停留在「手写第二遍」，正是方案 A 要根治的那类漂移。**
> 阶段 7 把 SDK 侧收敛到「一个端点一份声明」，但对外的 HTTP 面仍靠
> `packages/docs` 里人工维护的 Markdown 路由表 + 站外 `amagi.apifox.cn`。
> 实测这张表已经漂移，且与 v7 契约矛盾：
>
> | 现状（`content/docs/v7/usage/guide/http-server.mdx`）        | 事实                                                              |
> | ------------------------------------------------------------ | ----------------------------------------------------------------- |
> | 抖音表列 12 条路由                                           | `douyinRegistry` 有 **19** 个端点                                 |
> | 「自定义路由」示例 `import { registerBilibiliRoutes } from …` | 该导出**不存在**（实际是 `createBilibiliRoutes`），示例复制即报错 |
> | 成功响应示例含顶层 `"code": 200`                             | `contracts/result.ts` 明文「**顶层没有 `code`**」，v7 不再有该键  |
> | 错误响应示例为 `{ name: 'ZodError', details }`                | v7 是 `AmagiError`（`kind`/`code`/`retryable`/`issues`）          |
>
> 而 `server/routes.ts` 已经证明**路由是注册表的派生物**（`def.route` 即
> Express 路径）。同一份声明里 `params` 是 zod schema、`route` 是路径、
> `name` 是端点全名 —— OpenAPI 规范同样是派生物，没有理由手写。
>
> **本阶段不阻塞 M5。** `7.0.0-beta.1` 可以带着「HTTP 文档仍指向 apifox」
> 发出去；本阶段目标是让 beta 之后的 API 参考不再需要人工同步。

### 8.1 端点声明补文档元数据（唯一的前置缺口）

现状：`EndpointDef` 有 `name` / `route` / `params`，但**没有任何面向人的
描述字段**。OpenAPI 的 `summary` / `description` / `tags` 无处可取 ——
生成器只能产出「有路径有参数、但没有一句人话」的规范。

- [x] `contracts/endpoint.ts` 加可选 `doc?: EndpointDoc`（`summary` 必填、
      `description?` / `deprecated?` / `externalDocs?` 可选）
      → 判据：字段为**可选**，59 个端点一个不改也能 `tsc` 通过（纯增量，
        不是破坏性变更）；`EndpointDoc` 的 JSDoc 写明「`summary` 是
        OpenAPI 的 `summary`，一句话、不带句号」的写法约定
      → `tags` 不进声明：平台即 tag，由生成器从 `name` 的平台段派生，
        避免同一事实写两遍（这正是方案 A 的纪律）
      → 判据已满足（本批提交）：`EndpointDoc` 落在 `contracts/endpoint.ts`
        （`summary` 必填 + 三个可选字段，`externalDocs` 为 `{ url, description? }`），
        `EndpointDef.doc?` 放在 `params` 之后 —— 描述性字段与 name/route/params
        同一块，钩子槽位不受影响。59 个端点一行未改，`pnpm typecheck` 3 包全 Done。
        `summary` 的写法约定写在 JSDoc 里：**中文名词短语、不带句号、≤40 字**，
        并注明它会出现在端点卡片标题与侧边栏、超长会被截断。
        `contracts/` 的零依赖叶子性质不变（`EndpointDoc` 不引任何外部类型），
        公开面也不变（contracts 不从 index 再导出，`public-surface` 快照零 diff）。
        类型判据落在 `test/types/contracts.test-d.ts` 新增 3 条：
        `AnyEndpointDef['doc']` 恰为 `EndpointDoc | undefined`（可选）、
        `keyof EndpointDoc` 恰为四个键且只有 `summary` 必填（漏写 summary 的
        `@ts-expect-error` 承重）、`doc: { tags: [...] }` 编译报错（tags 不进声明）。
        `pnpm test:types` 1418 用例 / no type errors
- [x] 59 个端点逐个补 `doc.summary`，文案取 v6 `api-spec.ts` 与现有文档站
      路由表的说明列（如 `/fetch_one_video` → 「视频详细信息」）
      → 判据：`test/contracts/endpoint-doc.test.ts` 断言四个 registry 里
        **每个**端点的 `doc.summary` 非空且长度 ≤ 40；漏一个即红
      → 这条测试是防漂移的钉子：以后新增端点忘了写 summary 就过不了 CI
      → 判据已满足（本批提交）：59/59 补齐，**没有一条是凭空拟的** ——
        文案出处逐条记在 `scripts/add-endpoint-doc.mjs` 的映射表里：
        v6 `types/api-spec.ts` 的 `XxxMethodMapping` 中文键（d401cee 删除前的版本，
        `git show d401cee^:...` 取回，覆盖约 40 条）、文档站 `http-server.mdx`
        平台路由表说明列、`usage/api/<platform>.mdx` 各 fetcher 首句
        （补上 api-spec 没有的 douyin userFavoriteList / userRecommendList、
        bilibili userLiveStatus、快手四个聚合端点）、端点文件 JSDoc 首行
      → 落盘用一次性机械脚本 `scripts/add-endpoint-doc.mjs`（保留作 provenance，
        与 7.8 的 `swap-response-type.mjs` 同性质）：在 `route:` 行后插一行
        `doc: { summary: '…' },`，幂等（已有 doc 的跳过），带 `--check` 干跑；
        脚本自检「缺 summary 的端点」与「映射里多出的键」两侧都为 0。
        踩过一个坑并已修：首版按 `\n` 拼行，把 CRLF 工作区的 route 行行尾换成了
        LF，产出混合行尾 —— 现在行尾一起捕获、原样写回
      → 测试 68 条（4 平台端点数 + 合计 59 + 59 条逐端点 + 4 条同平台去重）：
        非空、按码点算 ≤40 字、首尾无空白、不以句号/问号/感叹号结尾、
        同平台内 summary 互不重复。承重已验证：删掉 kuaishou.emojiList 的 doc 后
        该文件 1 failed 并指名「kuaishou.emojiList 缺 doc.summary」，恢复后 68 全绿。
        `pnpm test` 1357 → **1425** 全绿，`typecheck` 3 包 Done，`lint` 无新增 warning
- [x] `add-api.mdx` 的「1 步」清单补上 `doc` 字段（新增端点的必填项 +1）
      → 判据：文档站 add-api 示例与 `videoInfo.ts` 实际代码逐字段一致
      → 判据已满足（本批提交）：`v7/dev/add-api.mdx` 的示例现在是
        `name → route → doc → params → build → sign → response`，与
        `douyin/endpoints/videoWork.ts`（及 `bilibili/endpoints/videoInfo.ts`）
        的字段顺序与形状一致；清单表格加 `doc` 行（summary 必写、约定「中文名词
        短语 / 不带句号 / ≤40 字」、写明**不要写 `tags`**），正文点明必填四件套是
        `name` / `route` / `doc` / `params`，并说明 `doc` 类型上可选但
        `endpoint-doc.test.ts` 会让漏写的 CI 变红；「登记进 registry」一节补上
        「两处端点数判据要同步」（平台端点测试 + endpoint-doc 的 19/59）
      → 一处**有意的省略**：真实的 `videoWork.ts` 末尾还有 Phase 2 预留的
        `toCanonical: undefined`（全仓唯一一处占位、v7 不实现），示例不带它 ——
        新增端点指南里出现一个语义为「留空」的字段只会让人困惑
      → 顺带修掉示例里的既有漂移：`DouyinReturnTypeMap` 的 type import 原来放在
        声明**之后**（真实文件在顶部），已上移并重编号注释；`v7/dev/architecture.mdx`
        的示例与槽位表同步补 `doc`，两页口径一致。`pnpm --filter=docs typecheck` 通过

### 8.2 从注册表生成 OpenAPI 3.1 规范

- [x] `packages/core/scripts/gen-openapi.mts`：遍历四个 registry 产出
      `packages/core/openapi.json`（**单一产物，唯一事实源**）
      → 判据：产出的 `paths` 恰好 59 条，逐条等于
        `/api/<platform><def.route>`；每条只有 `get`（与 `routes.ts` 的
        「所有路由注册为 GET」一致）
      → 判据已满足（本批提交）：`pnpm openapi` → 「已写出 openapi.json：59 条 path」，
        `test/openapi/spec.test.ts` 逐条断言路径集合等于四个 registry 派生的集合、
        每条 path 的键恰为 `['get']`、`operationId` 为 `<platform>_<短名>`
        （全局唯一，emojiList 在四个平台各有一条，不加平台段会撞）、
        `tags` 为平台段、`summary` 取自 `doc.summary`
      → 生成器同时提供 `--check`：与已提交产物逐字节比对（行尾归一后），
        不一致退出码 1。脚本 `pnpm openapi` / `pnpm openapi:check`（转发到 core 包）。
        承重已验证：手改产物里一个 summary 后 `--check` 退出码 1 并提示「不要手改产物」
      → 已实测可行（2026-09-02 探针）：`zod.toJSONSchema()` 对全部
        **59/59** 个端点 schema 转换成功，无一例外 —— 默认模式与
        `{ io: 'input', unrepresentable: 'any' }` 双模式都是 59/59，
        尽管 25 个端点用了 `coerce` / `transform` / `refine`。
        取 `io: 'input'`（query 传进来的是字符串，要的是 coerce **前**
        的形状）。样本 `bilibili.comments` 产出：
        `oid: {type:string,minLength:1}`、`type: {type:integer,minimum:1}`、
        `number: {default:20,exclusiveMinimum:0}`、`required: [oid, type]`
        —— `min` / `positive` / `default` / 可选性全部无损带出
- [x] zod schema → `parameters`（全部 `in: 'query'`）
      → 判据：`test/openapi/spec.test.ts` 对 5 个代表端点（无参
        `emojiList`、单参 `videoInfo`、5 个曾被吃掉参数的
        `bilibili.comments`、翻页 `userWorkList`、纯计算 `avToBv`）
        断言参数名集合与 `zod.toJSONSchema` 的 `properties` 键一致、
        `required` 与 schema 的 `required` 一致
      → **顺带回归防线**：`#52`（B站 comments 5 个参数被 zod 悄悄吃掉）
        以后再犯，规范里会立刻少 5 个 parameter，测试即红
      → 判据已满足（本批提交）：5 个代表端点逐条比对参数名序列、`in` 恒为
        `'query'`、必填集合与 schema 的 `required` 一致。
        **判据措辞的一处更正**：`bilibili.comments` 一共 **8** 个参数
        （oid / type / number / mode / pagination_str / plat / seek_rpid /
        web_location），其中被 v6 吃掉的是后 5 个 —— 测试断言 8 个的完整序列，
        并逐个点名那 5 个（少一个就指名报错），比原措辞更严
      → `description` 提到 parameter 层（文档站参数表读的是那里，不是 schema 内部）
- [x] 响应 schema 从 `contracts/result.ts` 派生：`AmagiSuccess` /
      `AmagiFailure` 两个 `components.schemas`，`oneOf` + `success` 判别键
      → 判据：成功分支**不含** `error` 键、失败分支**不含** `data` 键
        （result.ts 的硬约束 2）；两分支都**没有顶层 `code`**（硬约束 3）；
        `message` 成功时 `example: '获取成功'`（`SUCCESS_MESSAGE`）；
        HTTP 侧额外的 `requestPath` 键在两分支都在（`routes.ts` 实际行为）
      → `data` 暂为 `{}`（any）：v6 `ReturnDataType` 是 26,580 行实测快照，
        转 JSON Schema 会让规范体积失控。**留到[后续工作](#后续工作不计入进度)**，不进本阶段判据
      → 判据已满足（本批提交）：6 条断言逐项对上 —— 成功分支键里无 `error`、
        失败分支键里无 `data`、两分支键里都无 `code`、`requestPath` 在两分支
        都是 `required` 且为 string、`success` 两分支各自 `const true` / `const false`、
        59 个 operation 的 `200` 全都是这两个信封的 `oneOf`。
        两处按 OpenAPI 3.1 落地而非照抄判据字面：`message` 的示例用 JSON Schema 的
        **`examples: ['获取成功']`**（3.1 的写法，3.0 才是 `example`）；不写
        `discriminator` 对象 —— 规范要求判别属性是字符串，`success` 是布尔，
        判别靠两支的 `const`
      → 顺带把 `AmagiError` / `AmagiMeta` / `RequestTrace` / `ValidationIssue`
        也落成 components（`kind` 枚举取运行时的 `ERROR_KINDS`、`platform` 取
        `PLATFORMS`、`reason` 取 `TRACE_REASONS`）。`error.code` 故意不枚举：
        `AmagiErrorCode` 是纯类型联合，没有运行时清单，抄一份进生成器就等于
        又造了一处会漂移的事实源
- [x] `components.securitySchemes.bearerAuth` + 全局 `security` 标为可选
      → 判据：与 `server/auth.ts` 语义一致 —— 不传 `token` 时无鉴权
        （v6 行为不变），传了才 401；规范里用 `security: [{}, {bearerAuth: []}]`
        表达「可选」，并在 `info.description` 写明 `host` 默认 `'::'` 的警告
      → 判据已满足（本批提交）：`bearerAuth` 为 `{ type: 'http', scheme: 'bearer' }`、
        `security` 恰为 `[{}, { bearerAuth: [] }]`、`info.description` 同时写明
        `'::'` 双栈暴露、**默认无鉴权**、以及显式传 `host: '127.0.0.1'` 与 `token`
        的建议（三条各有断言）
      → 判据外多加一条 `401`：体按 `auth.ts` 的**实际**精简形状建模
        （`{ success: false, error: { code: 'UNAUTHORIZED', message } }` —— 没有
        `meta`，也没有 `kind` / `retryable`，不是完整信封），测试断言键集合与
        `required`，免得文档站渲染出一个并不存在的 401 信封

### 8.3 文档站接入 fumadocs-openapi

- [x] 使用 `fumadocs-full-documentation` skill 查阅文档框架的开发文档。装 `fumadocs-openapi` + `shiki`，`app/global.css` 加
      `@import 'fumadocs-openapi/css/preset.css'`
      → 判据：`pnpm build:docs` 仍退出码 0，样式导入顺序在
        `fumadocs-ui/css/preset.css` **之后**（上游要求）
      → 判据已满足（本批提交）：`fumadocs-openapi@11.4.0` + `shiki@4.4.3` 钉死版本装进
        `packages/docs`（peer 恰为 `fumadocs-core/ui ^16.15.0` + React `^19.2.0`，
        与现装 16.15.4 / 19.2.8 吻合；**不装** `@scalar/api-client-react`，
        playground 用 fumadocs 自带实现）。`global.css` 第 4 行插在
        `fumadocs-ui/css/preset.css` 之后、twoslash 之前。
        `pnpm build:docs` 退出码 0 —— 顺带证实了唯一必须实跑才能确认的那个点：
        pnpm 隔离式 node_modules 下 Tailwind v4 能解析 preset.css 里转发的
        `@fumadocs/api-docs/css/preset.css`，不需要补直接依赖
      → 显式登记 `shiki` 的理由：11.4.0 里它是普通 dependency 而非 peer，但
        `fumadocs-openapi/ui` 的公开类型面直接引用 `shiki` 的 `BundledTheme`，
        `createOpenAPIPage({ shikiOptions })` 要传主题就得能 import 它 ——
        pnpm 下未声明的包不可导入
- [x] `lib/openapi.ts` 建 `createOpenAPI({ input: ['../core/openapi.json'] })`；
      `components/api-page.tsx` 建 `createOpenAPIPage()`（客户端组件）；
      `lib/source.ts` 的 `loader` 挂 `openapiPlugin()`
      → 判据：`/docs/v7/usage/api/*` 渲染出交互式端点卡片（参数表 +
        响应样例 + 代码示例），`next build` 无 RSC 边界报错
      → 走 **MDX Files**（`generateFiles`）而非 `staticSource()`：后者会
        **改变 `source` 的页面类型**，而本仓的 `lib/mcp/document-service.ts`
        与 `getLLMText` / `llms-full.txt` / og 路由全都消费 `source.getPages()`
        —— 虚拟文件路线要同步改这 4 处，MDX 路线零改动
      → 判据已满足（本批提交）：59 个端点页全部进构建（prerender-manifest 实测
        59 条 `/docs/v7/usage/api/http/**`，docs 页 45 → 104，总预渲染 317），
        `next build` 无 RSC 报错
      → **两处对上面计划的更正**（调研实测，PRD 原文不成立）：
        ① `input` 用 **record 形式**而非数组 —— 数组下 schema id 就是那个相对路径
        字符串，会被原样烧进 59 个 MDX（`document="../core/openapi.json"`）并按
        `process.cwd()` 解析；record 得到稳定短 id `amagi`。
        ② 「MDX 路线零改动」只在**类型层**成立：生成页的正文是一段
        `export default function Layout(props)`，从 `props.components` 取
        `OpenAPIPage` —— 不在 `app/docs/[[...slug]]/page.tsx` 的
        `getMDXComponents(...)` 里注入，那 59 页构建期直接抛
        「Expected component `OpenAPIPage` to be defined」。已注入（服务端
        异步组件 + `openapi.preloadOpenAPIPage(page)`）
      → 规范用 `import('../../core/openapi.json')` 当 JSON 模块读，不走 `node:fs`：
        Turbopack 下 `fileURLToPath(new URL(..., import.meta.url))` 拿到的 URL 与
        `node:url` 不是同一实例，预渲染实测抛 `ERR_INVALID_ARG_TYPE`（本批踩过）
      → 顺带两处：`page.tsx` 对生成页隐藏「复制 Markdown / 在 GitHub 查看」两个按钮
        （产物不进 git，GitHub 链接必然 404）；`lib/source.ts` 的 `getLLMText` 给
        `_openapi` 页加分支 —— 否则 `llms-full.txt` 会被 59 段 JSX 污染
        （实测：分支加上后该文件里 `export default function Layout` 0 次、
        端点条目 59 条）
- [x] `scripts/generate-docs.ts` 跑 `generateFiles`，输出到
      `content/docs/v7/usage/api/`，`per: 'operation'` + `groupBy: 'tag'`
      → 判据：生成 59 个 operation 页 + 4 个平台目录；
        `addGeneratedComment: true`，且生成物**不进 git**
        （`.gitignore` 加 `content/docs/v7/usage/api/*/`），
        `dev` / `build` 脚本前置该步骤，与 `build:core` 同层
      → `groupBy: 'tag'` 让 URL 落在 `/docs/v7/usage/api/<platform>/<op>`，
        与现有四个手写平台页的路径前缀兼容
      → 判据已满足，但**落点下沉一层**：输出到
        `content/docs/v7/usage/api/**http**/`，URL 为
        `/docs/v7/usage/api/http/<platform>/<op>`。原方案会踩两个坑：
        ① fumadocs 解析 meta 的 `pages` 条目时**文件夹优先于同名文件**，一旦出现
        `api/bilibili/` 目录，手写的 `api/bilibili.mdx`（451 行）就静默变成孤儿页
        —— URL 还在、侧边栏没了、无任何报错，正是 8.4 判据要防的事；
        ② `meta: true` 的根 meta 写到 `<output>/meta.json`，会原地覆盖已提交的
        `api/meta.json`（带 `title: 'API 参考'` / `icon: FileCode`）。
        下沉后两个坑都不存在，手写页零改动，跟踪文件只改 `api/meta.json` 一行 ——
        加 `---[Server]HTTP 端点---` 分隔符 + `"http"` 条目
      → 生成物 64 个文件 = 59 页 + 4 个平台 `meta.json` + 1 个根 `meta.json`；
        `.gitignore` 用 `content/docs/v7/usage/api/http/` 整目录忽略（比原方案的
        `api/*/` 精确：后者会连带忽略将来任何手写子目录），`git status` 对该目录无输出
      → 三个上游行为要自己兜住：**生成器从不删旧文件**（只 mkdir + writeFile），
        所以脚本先 `rm -rf` 输出目录，否则端点改名后旧页会永久留在 content 里被
        `getPages()` 继续吐出来；**必须给 operation 写 `operationId`**，否则文件名
        回退成 `bilibili/api/bilibili/fetch_one_video/get.mdx`（8.2 已写
        `<platform>_<短名>`，这里用 `name()` 削掉平台前缀）；**`includeDescription`
        取默认 `false`**（开了 description 只进正文不进 frontmatter，本仓的
        DocsDescription / og 图 / MCP 列表全读 `page.data.description`）
      → 根 meta 由生成器写出、没有 `title`（侧边栏会显示 "Http"），用 `beforeWrite`
        钩子在写盘前补 `title: 'HTTP 端点参考'` / `icon: 'Server'`，不必让手写文件
        混进被忽略的目录
      → `docs:api` 脚本前置于 `build` / `dev` / `typecheck`（都排在 `build:core`
        之后 —— `openapi.json` 是 8.2 的产物）
- [x] **不引入 `openapi.createProxy()`**，playground 指向用户自己的
      `127.0.0.1:4567`
      → 判据：`lib/openapi.ts` 里没有 `proxyUrl`；在 API 参考索引页写明
        「playground 直连你本地的 amagi 服务，需自行启动」
      → 理由（安全，不是偷懒）：上游明文警告代理会**转发全部收到的
        header 与 body，含 HttpOnly `Cookie` 与 `Authorization`**。
        amagi 的服务端持有运营者的四平台 cookie，且 `auth.ts` 的 token
        就在 `Authorization` 里 —— 挂公共代理等于把这两样都往外送
      → 判据已满足（本批提交）：`lib/openapi.ts` 无 `proxyUrl`（`getOpenAPIPageProps()`
        里就是 `undefined`）；索引页 `api/http/index.mdx` 顶部一条 warn Callout 写明
        playground 直连本机 `http://127.0.0.1:4567`、需自行先起服务、文档站没挂公共代理
        的原因（转发 Cookie 与 Authorization），并说明浏览器可能因跨域拦下请求属预期

### 8.4 替换手写路由表，收敛对外入口

- [x] `http-server.mdx` 删掉四张手写路由表与错误的响应示例，改为指向
      生成的 API 参考；「自定义路由」示例改成真实导出 `createXxxRoutes`
      → 判据：该页不再出现任何具体路由路径与 `registerXxxRoutes`；
        `pnpm build:docs` 无死链
      → 判据已满足（落在 4123ae8，128 → 168 行）：四张 Tabs 路由表与全部具体路径
        删除，改为「接口清单」一节指向侧边栏的 HTTP 端点参考 + 一条示例链接
        （`/docs/v7/usage/api/http/bilibili/videoInfo`），并写明它由 openapi.json
        派生、CI `--check` 锁死，所以这一页不再抄第二份
      → 响应示例改成真实的 v7 信封：成功 / 失败**都是 HTTP 200**、顶层无 `code`、
        失败支是 `error.kind/code/message/retryable(+issues)`（原示例是
        `"code": 400` + `ZodError`，与 contracts 矛盾）；补了一段字段读法
        （`success` 判别、`error` 永不为空、顶层 `message` 兼容 v6、`attempts`
        校验失败时为 0、`requestPath` 只有 HTTP 侧有）
      → 「自定义路由」示例换成真实导出 `createBilibiliRoutes` / `createDouyinRoutes`
        （`registerXxxRoutes` 从来不存在，复制即报错；四个工厂签名
        `(cookie, requestConfig?) => Router`，已对 public-surface 快照核对）
      → 新增「鉴权与监听地址」一节：v6 门面**无鉴权 + 监听 `'::'`** 的警告、
        选项表（port/host/token/openapi/routers）、401 的精简体形状
- [x] `startServer` 可选挂载 `/openapi.json` 与 `/docs`（自托管规范）
      → 判据：默认**不挂**（不改 v6 行为）；传 `openapi: true` 时
        `/openapi.json` 返回规范、`/docs` 不再 301 到 apifox；
        `test/server/openapi-route.test.ts` 断言默认路径下
        `/openapi.json` 仍 404
      → 判据已满足（本批提交）：`StartServerOptions.openapi?: boolean`，
        6 条用例 —— 默认下 `/openapi.json` 404 且 `/docs` 仍 301 到 apifox（v6 行为
        一字不变）；开启后 `/openapi.json` 200 且是 59 条 path 的 3.1 规范、
        `/docs` 改 **302** 跳文档站的 `/docs/v7/usage/api/http`（用 302 是因为 301
        会被浏览器永久缓存 —— 先访问过未开 openapi 的服务就再也跳不过来）、
        `/` 仍 301 到 apifox（只有 `/docs` 改口）
      → 规范挂在**鉴权之后**：设了 `token` 就意味着这台服务不对外，规范一并收起来
        （用例断言无 token 401、带对 token 200）
      → **顺带把生成逻辑搬进 `src/server/openapi.ts`**（`buildOpenApiSpec` /
        `serializeOpenApiSpec`），脚本退化成「读版本号 + 写盘 / 比对」的薄壳：
        自托管路由是**现算现返**，与调用方装的这个版本同源，不会像外挂文档那样脱节；
        而脚本与路由共用同一份实现，两个消费者之间不可能漂移。规范里的
        `info.version` 由脚本从 package.json 读、运行期取 tsdown 注入的 `__VERSION__`
        （测试里退化为 0.0.0，故「产物 == 现算」那条用例显式传版本号）。
        搬迁后产物零 diff，`tsconfig.test.json` 的 `allowImportingTsExtensions`
        随之撤回（测试不再 import `.mts`）
      → **补一处漏**（本批追加）：选项版 `startServer` 在 `server/auth.ts` 里，
        **没有从包入口导出** —— 只做到那里，`openapi: true` 对调用方就是不可达的。
        所以门面也接上：`client.startServer(port, { openapi })`（第二参可选，
        不传时行为与 v6 一字不变）。两个 startServer 共用 `mountOpenApiSpec(app)`，
        免得同一件事写两遍；`/docs` 的 302 改口两边同款。
        门面版自己 `app.listen`（占端口、拿不到 server 句柄）没法端到端测，
        改为对共用的挂载函数在裸 Express 应用上断言（第 7 条用例）
- [x] 四个平台的手写 `api/*.mdx` 降级为「概述 + 指向生成页」，或直接由
      `generateFiles` 的 `index` 选项产出索引卡片
      → 判据：`v7/usage/api/meta.json` 的 `pages` 与生成的目录结构对齐，
        侧边栏无重复条目、无孤儿页
      → **前提是错的，据实改做法**：这四页（1,317 行、带 twoslash 示例）写的是
        **SDK fetcher 方法**参考，不是 HTTP 路由表 —— 与生成页是同一批端点的两种
        形态，不存在重复，降级会白删一批真文档。所以**不降级**，改为把两种形态
        在侧边栏里分开标注，并互相指路
      → 判据已满足（本批提交）：`api/meta.json` 的 `pages` 用
        `---[Code]SDK 方法---` / `---[Server]HTTP 端点---` 两个分隔符分区，
        四个手写页 + 一个 `http` 目录条目；四个手写页各加一条 info Callout 指向
        `/docs/v7/usage/api/http/<platform>`，`v7/usage/index.mdx` 的快速开始
        卡片拆成「SDK 方法参考」+「HTTP 端点参考」两张
      → 索引卡片确实由生成器产出，但**不用上游的 `index` 选项** —— 它在
        `groupBy: 'tag'` 下只会吐一个空 `<Cards>`（顶层条目全是 group，
        generate-file 直接 `continue` 跳过）。改在 `beforeWrite` 里自己拼
        `index.mdx`：按平台分四节、59 张卡片、标题取各页 frontmatter，
        平台标题取 per-platform meta 的 `title`（即规范的 `x-displayName`）
      → 顺带修掉 `v7/usage/index.mdx` 的 4 条**未分版**链接（`/docs/usage/...`
        会被 next redirects 打到 v6 去）
      → 实测：`pnpm build:docs` 退出码 0，docs 页 104 → **105**（多的是索引页），
        `/docs/v7/usage/api/http` 与四个手写页同时可达（prerender-manifest 核对），
        HTTP 段共 60 页 = 59 端点 + 1 索引

### 阶段门 8

- [x] `openapi.json` 的 59 条 path 与四个 registry 逐条对齐（脚本断言，非人工核对）
      → 判据已满足：两道锁。`pnpm openapi:check` 把已提交产物与此刻生成的内容
        逐字节比对（行尾归一后）；`test/openapi/spec.test.ts` 22 条里第一条就是
        「产物 == 现算」，另有一条把 59 条路径逐条对着四个 registry 的
        `/api/<platform><def.route>` 核。人工核对不参与
- [x] `pnpm build:docs` 退出码 0，静态页数 ≥ 145 + 59
      → 判据已满足：退出码 0，**总预渲染 320 条**（门 7 记录 145）——
        docs 页 45 → **105**（+59 端点页 +1 索引页），og 图 105、
        `llms.mdx` 105。HTTP 段共 60 页
      → **「无死链」这一条后来做了真扫描，发现它当时并不成立**（2026-09-03 复核）：
        对构建产物里 108 个 HTML 的全部内部 `/docs` 链接逐条比对 prerender 清单，
        查出 **64 条死链** —— 60 条来自 v7 预览横幅（无条件把 `/docs/v7` 换成
        `/docs/v6`，而 59 个生成的端点页与索引页在 v6 里根本不存在）、
        4 条是本阶段新加的平台页 Callout（指向 `api/http/<platform>` 这个**目录**，
        它没有索引页）。两处都已修（横幅改为按 v6 实际页面清单判断、Callout 改指
        `api/http` 索引页），重扫 **0 条死链**。教训：「构建退出码 0」证明不了无死链，
        Next 不检查内部链接目标是否存在
- [x] `pnpm test` / `test:types` / `typecheck` / `deps:check`（0 环）/ `lint` 全绿
      → 判据已满足（同一批全部实跑）：`test` 73 文件 / **1454** 用例全绿；
        `test:types` 81 文件 / 1515 用例且 **no type errors**；
        `typecheck` 三个包 Done；`deps:check` **0 环**；
        `lint` 三个包 Done（3 条既有 warning，无新增）
- [x] 生成器是 CI 的一等公民：`openapi.json` 与注册表不一致时 CI 红
      （`gen-openapi --check` 模式，产出与已提交产物 diff 即失败）
      → 判据已满足：`release.yml` 的 quality job 新增步骤「📐 OpenAPI 规范一致性」
        跑 `pnpm openapi:check`，退出码原样传出（非 allow-failure），并把结果写进
        `$GITHUB_STEP_SUMMARY`、不一致时提示「跑 pnpm openapi 重新生成并提交」。
        承重已验证：本地按 YAML 里的 step body 原样跑 —— 从产物里删掉一条 path
        后退出码 1，恢复后回到「与注册表一致：59 条 path」

**阶段门 8 通过 —— M6 达成，API 参考不再手写。** 四项判据全部满足：
规范由四个端点注册表派生（59 条 path、参数取 zod schema、summary 取 `doc.summary`、
tag 取 `name` 的平台段），文档站的 59 个端点页与索引页由规范生成且不进 git，
`startServer({ openapi })` 能自托管同一份规范，CI 用 `--check` 钉死产物与注册表一致。
`7.0.0` 可发（发版动作待人工触发）。

---

## 阶段 9：门面收口与文档站深度集成（2026-09-03 追加）

> **触发**：有人照 v7 文档的默认导入写代码，拿到的是 **v6 门面**。顺着这条线查
> 下去，三个缺陷各自独立、根因不同，却共享同一个成因 ——
> **文档站的示例从来没有在 CI 里编译过**，于是「文档说的」与「包里有的」可以任意漂移。
>
> 阶段 8 已经把 **HTTP 侧**参考做成派生物（注册表 → `openapi.json` → 59 页，
> CI `--check` 钉死）。本阶段把同一条纪律推到**剩下的一半**：SDK 侧的门面、
> 信封读法、以及文档站自己。
>
> **执行纪律（与 8.3 第 1 项同款）**：动文档站之前先用 `fumadocs-full-documentation`
> skill 查上游文档 —— 不凭印象写 MDX、不自造框架已有的组件。每一项凡涉及 MDX
> 语法或 fumadocs API 的，判据里要写清「查的是哪一页上游文档」。

### 9.0 三个缺陷的复现与根因（先写清，再动手）

三条都已在本仓实测复现。**这一小节不含任务项**，是下面四个小节的判据依据。

#### BUG-1：默认导入拿到的是 v6 门面

`src/index.ts:186` 的 `export { amagi, Client as default }` → `Client` = `CreateApp`
= `CreateAmagiApp`，而 `index.ts:142` / `:145` 返回 `createAmagiClient(options)`
（`src/server/index.ts:60`，**v6 门面**）。v7 门面 `createClient`
（`src/client/createClient.ts:57`）既没进 `src/index.ts` 的任何 `export`，
也不是 `tsdown.config.ts` 的 entry（只有 `default/index` 与 `exports/*`）——
实测 `dist/default/index.d.ts` 里 `createClient` 与 `ClientOptions` 各出现 **0 次**，
即它对装包的人**完全不可达**。全仓引用 `createClient` 的只有 3 个测试文件。

差异**不在信封**（fetcher 早在阶段 6 就统一由注册表派生，两个门面的 `data` 都是
v7 信封 —— 这也是缺陷能潜伏这么久的原因），而在**门面形状**：

| 能力                    | v6 门面（当前默认导出）              | v7 门面（`createClient`，不可达）   |
| ----------------------- | ------------------------------------ | ----------------------------------- |
| `douyin/bilibili.login` | **没有**                             | `qrcode()` / `resume()`             |
| `events`                | 全局单例 `amagiEvents`（12 个事件名） | 实例级 `createEventBus()`（4 个事件名） |
| `startServer` 第二参    | `{ openapi }`（阶段 8.4）            | **没有**                            |

后果实测（`packages/core` 下 `npx tsc --noEmit`）：

```text
error TS2339: Property 'login' does not exist on type
  '{ fetcher: FetcherOf<"douyin", ...>; sign: ...; passport: ... }'.
  void client.douyin.login.qrcode()
```

而 `content/docs/v7/usage/api/douyin.mdx:363` 恰恰写着「新写法请用
`client.douyin.login.qrcode()`」，`dev/architecture.mdx:87` 更把
`client/createClient.ts` 直接描述成「门面 `amagi(options)`」。
**结论：阶段 5 的两套登录会话（16 项、已勾）在公开面上没有入口。**

#### BUG-2：`AmagiResult<T>` 上读不到 `data`

复现（就是 `src/dev.ts` 里那几行）：

```text
error TS2339: Property 'data' does not exist on type 'AmagiResult<BiliCommentReply_V0>'.
  Property 'data' does not exist on type 'AmagiFailure'.
```

`contracts/result.ts` 的硬约束 2 是**故意**的：成功分支不声明 `error`、失败分支
不声明 `data`。类型学上正确，但它改掉了 v6 的读法 —— v6 的
`SuccessResult<T>` / `ErrorResult`（现在还留在 `validation/legacy.ts:29-47`）
**两支都声明 `data`**（一支 `T`、一支 `never`），所以 v6 里 `result.data` 不收窄
也能读到 `T`。v7 之后同一行是编译错误，而联合上只剩 `success` / `message` / `meta`
三个键 —— 使用者看到的正是这个。

三件事让它从「设计取舍」变成「缺陷」：

1. **没有任何逃生工具。** 全仓没有 `isSuccess` / `unwrap` / `assertSuccess`
   （grep 命中 0 处），使用者手上只有 `if (r.success)` 一条路，而这条路在文档里
   只出现在 `guide/type-mode.mdx` 一页。
2. **四页 API 参考（64 个示例）全都止步于 `const result = await ...`**，
   一个都没往下写怎么取 `data` —— 使用者照抄之后必然撞 TS2339。
3. **`guide/sdk.mdx` 还在教 v6 信封**：第 60–78 行的「所有 API 返回统一的
   `Result<T>` 结构」带顶层 `code`、`error: any`，与 `contracts/result.ts` 直接矛盾。
   连仓内的类型测试也在绕开真类型 —— `test/types/response-types.test-d.ts:29`
   把 fetcher `as unknown as` 成一个手写的两支联合。

#### BUG-3：文档站的示例既不编译，也有一批根本没渲染出来

- **v7 目录 19 页里有 17 个 ` ```ts ` 裸块从不编译**：`sdk.mdx` 10 个
  （整页零 twoslash）、`dev/architecture.mdx` 4 个、`dev/add-api.mdx` 2 个、
  `dev/contributing.mdx` 1 个。BUG-2 的错误示例正好全在 `sdk.mdx` 里，不是巧合。
- **写了 twoslash 注解、却没标 `twoslash` 的块**：`sdk.mdx` 有 5 处
  （`:85` `:133` `:152` `:169` `:187`）写了 `// ---cut---`。既不编译，
  `// ---cut---` 还会当普通注释**原样印在页面上**。
- **代码块被塞进 `<Tab>` 单行、渲染不出代码块**：`installation.mdx:13-16`
  与 `:27-28`（六处 ` ```bash ` / ` ```ts ` 与内容挤在同一行）。
- **v6 文案留在 v7 页上**：`getting-started.mdx:181`「amagi v6 采用事件驱动架构」、
  `installation.mdx:47`「v6 版本已移除对 log4js 的依赖」、`usage/index.mdx:10`
  「本文档适用于 v6 正式版」。
- 而 CI 从来跑不到这些：`.github/workflows/release.yml:34` 的 `paths-ignore`
  含 `packages/docs/**`，且全流程里没有 `next build` —— twoslash 只在
  `next dev` / `next build` 时才求值，**本仓 CI 一次都没求值过**。

### 9.1 门面收口：默认导入落到 v7 门面（修 BUG-1）

> 目标：`import amagi from '@ikenxuan/amagi'` 之后 `amagi(options)` 返回的就是
> **v7 门面**。两个门面并存是过渡期产物，过渡期已经结束。
>
> 顺序有讲究：**先补 4 vs 12 的事件名缺口，再换默认导出**。倒过来做会让
> `client.events.on('log:info', ...)` 这类写法在换过去的瞬间静默失效
> —— `getting-started.mdx:199` 正好有一处。

- [ ] 补齐实例级事件总线的事件名，与 v6 的 12 个对齐（或明确记录不对齐的那几个）
      → 判据：`runtime/events.ts` 的 `AmagiEventMap` 覆盖 `log:*` ×5、
        `network:retry` / `network:error` / `http:error`；一条用例逐名断言
        「v6 `AmagiEventType` 的每个取值在实例总线上都能 `on`」，漏一个即红
      → 不打算对齐的取值要在本项后面写明是哪几个、为什么，并同步 06-migration
        的形状变更矩阵 —— 「悄悄少几个事件」正是 A 档静默行为变化
      → 两个模块各有一个 `AmagiEventMap`（`model/events.ts:172` 与
        `runtime/events.ts:54`），顶层导出的是前者。本项之后要决定留哪个，
        免得 `createClient` 进公开面时 dts 里出现 `AmagiEventMap$1`
- [ ] v7 门面的 `startServer` 接上第二参 `{ openapi }`，与 v6 门面同款
      → 判据：`createClient(...).startServer(4567, { openapi: true })` 下
        `/openapi.json` 返回 59 条 path 的规范、`/docs` 302 到端点参考；
        不传第二参时 `/openapi.json` 仍 404（阶段 8.4 的 6 条用例原样通过）
      → 两个 `startServer` 必须共用 `mountOpenApiSpec(app)`，不许写第二遍
- [ ] `CreateAmagiApp` 内部改调 `createClient`，默认导出的返回类型随之变成 v7 门面
      → 判据：`amagi({ cookies: { douyin: ck } }).douyin.login.qrcode()` 类型存在
        且能跑（BUG-1 的复现片段从 TS2339 变成编译通过）
      → 判据：`kuaishou` / `xiaohongshu` 上访问 `.login` **仍是编译错误**
        （`ClientShape` 的条件类型不许被这次改动抹平）
      → 判据：两个 client 实例的 `events` **不是**同一个对象（实例级总线的
        直接断言）；`test/contract/public-surface.test.ts:124` 那条「两个实例的
        events 是同一个全局单例」的用例按 KNOWN-DEFECT 纪律**显式改写**，
        不许 `.skip`
- [ ] `createClient` / `ClientOptions` 进顶层导出，更新签名快照与公开面指标
      → 判据：`dist/default/index.d.ts` 里 `createClient` 出现次数 > 0；
        `public-surface.test.ts.snap` 的导出名清单（当前 178 条）差异逐条在
        06-migration 里有对应说明
      → 判据：关键指标表的「顶层公开导出数」从 70 改成新数字，并在括号里写清增量
- [ ] `createAmagiClient` 保留为 `@deprecated` 别名指向 `createClient`
      → 判据：v6 的 `createAmagiClient(options)` 调用点零改动仍编译通过；
        `exports/compat.ts:246` 的 `compatCreateAmagiClient` 包的仍是同一个实现
        （compat 的 v6 信封回填行为一字不变，`test/compat/*` 全绿）
- [ ] 修文档站三处与实现矛盾的描述
      → 判据：`dev/architecture.mdx:87` 的门面行与实际导出一致；
        `usage/api/douyin.mdx` 的四条「新写法请用 `client.douyin.login`」指路
        在 9.5 的 twoslash 全量检查下能编译；`guide/sdk.mdx` 的门面段落不再
        与 `createClient` 的形状矛盾

### 9.2 信封读法：让 `data` 可达（修 BUG-2）

> **本小节要改 `contracts/result.ts` 的硬约束 2**，按「判据变了要先改文档」的规矩，
> 决定与理由写在这里，实施再跟上。
>
> 原约束「失败分支不声明 `data`」解决的是 v6 的**说谎**：v6 写
> `data: data as never` —— 声明成 `never` 却在运行时塞了真值。真正该消掉的是
> **说谎**，不是**声明**。改法是把两支各补一个 `?: undefined` 的对侧键：
> 运行时那个键确实不存在，读出来确实是 `undefined`，声明与事实一致。
>
> 收益：`r.data` 在未收窄的联合上是 `T | undefined`（v6 的读法回来了，
> 且比 v6 诚实 —— v6 给的是 `T`，掩盖了失败可能），而 `success` 仍是判别键，
> `if (r.success)` 之后 `r.data` 照旧收窄成 `T`。判别联合一点没弱。

- [ ] `AmagiSuccess<T>` 加 `error?: undefined`、`AmagiFailure` 加 `data?: undefined`
      → 判据：BUG-2 的复现片段（`void r1.data`，不收窄）编译通过，类型是
        `BiliCommentReply_V0 | undefined`
      → 判据：收窄能力不退化 —— `if (r.success) r.data` 是 `T`（不带 `| undefined`）、
        `else r.error` 是 `AmagiError`（不带 `| undefined`），两条各一个
        `expectTypeOf(...).toEqualTypeOf`
      → 判据：运行时形状**一个字节都不变** —— 成功信封 `'error' in r === false`、
        失败信封 `'data' in r === false`，两条断言。这是与 v6 的分界线，不能含糊
      → 同步 06-migration 的形状变更矩阵：这是一条**放宽**（编译错误变合法），
        不构成破坏性变更，但矩阵里必须有出处
- [ ] 导出 `isSuccess` / `isFailure` 类型守卫
      → 判据：`results.filter(isSuccess).map((r) => r.data)` 编译通过且 `data` 是 `T`
        —— 这是 `?: undefined` 解决不了的场景（数组回调里没法用 `if` 收窄），
        也是必须同时做这一项的原因
- [ ] 导出 `unwrap(result)`：成功返回 `data`，失败抛 `AmagiError`
      → 判据：返回类型是 `T`（不是 `T | undefined`）；抛出的对象带完整
        `kind` / `code` / `message` / `retryable`，且**不吞** `error.cause`
      → 与 compat 的关系写清：`unwrap` 是 v7 的显式选择（想抛就抛），
        `@ikenxuan/amagi/compat` 是 v6 语义的整体回填，两者不重叠
- [ ] 类型用例锁死三种读法，并**删掉仓内的绕行写法**
      → 判据：`test/types/response-types.test-d.ts:29` 那个
        `as unknown as { ... }` 的手写联合改成直接用真 fetcher 类型 ——
        仓内自己都不敢用真类型，就说明真类型还不好用
      → 判据：新增 test-d 覆盖「不收窄读 `data`」/「`if` 收窄」/「`filter(isSuccess)`」
        /「`unwrap`」四种形态
- [ ] 文档把三种读法写成一页，错误示范用 twoslash 把编译错误**印在页面上**
      → 判据：`guide/type-mode.mdx` 用 ` ```ts twoslash ` + `// @errors: 2339`
        展示「v6 那样直接 `result.data`（不收窄）在 v7 是什么错」，
        页面上能看到真实的 TS2339 文案 —— 上游文档见
        `(framework)/markdown/twoslash.mdx` 的 `@errors` 段
      → 判据：四页 SDK 参考（`api/*.mdx`）的示例统一往下多写一步取 `data`，
        不再止步于 `const result = await ...`（这一步在 9.4 第 2 项做成生成物之后
        只需改模板一处）

### 9.3 清掉 v7 页面上的 v6 残留与坏渲染（修 BUG-3）

> 这一小节全是「改文案 / 改语法」的活，本身不难。列成带判据的项，是因为
> 9.5 把 twoslash 变成 CI 必需检查之后，**不改完就不可能过门**。

- [ ] `guide/sdk.mdx` 的「统一响应格式」换成真 `AmagiResult`
      → 判据：该页不再出现顶层 `code`、不再出现 `error: any`、不再出现
        `Result<T>` / `SuccessResult` / `ErrorResult` 三个 v6 类型名
      → 判据：信封形状不再手抄 —— 改用 9.4 第 1 项的 `<auto-type-table>`
        直接渲染 `contracts/result.ts`，抄一遍的机会从此不存在
- [ ] v7 目录下所有 `ts` 代码块补 `twoslash`（实测 17 处裸块：`sdk.mdx` 10、
      `dev/architecture.mdx` 4、`dev/add-api.mdx` 2、`dev/contributing.mdx` 1）
      → 判据：`grep -c '^```ts$'` 在 `content/docs/v7/**` 下为 **0**
        （只允许 ` ```ts twoslash `、或显式标注不可编译原因的其它语言）
      → 判据：`pnpm build:docs` 退出码 0 —— 补 twoslash 必然暴露一批真错误
        （这正是目的），逐条修完为止，不许用 `// @noErrors` 掩盖
      → `// @noErrors` 只允许出现在**故意展示不可解析导入**的地方
        （现有唯一合法用例：`installation.mdx:36` 的子路径导出示例）
- [ ] 塞进 `<Tab>` 的单行代码块改成框架语法
      → 判据：`installation.mdx` 的包管理器一节改用 ` ```npm `
        （`remarkNpm` 在 Fumadocs MDX 里默认启用，上游见
        `headless/mdx/remark-npm.mdx`），四个手写 `<Tab>` 全删
      → 判据：「模块导入」一节改用代码块 tab 组（` ```ts tab="ESM" ` /
        ` ```js tab="CommonJS" `，上游见 `(framework)/markdown/index.mdx#tab-groups`），
        渲染出的是真代码块而不是一行行内文字
- [ ] 删 v7 页面上的 v6 口径文案
      → 判据：`content/docs/v7/**` 里 grep `v6` 的每一处命中，要么是**刻意的**
        版本对照（迁移表格、`@deprecated` 说明），要么被删。逐条过一遍，
        已知三处：`getting-started.mdx:181`、`installation.mdx:47`、`usage/index.mdx:10`
      → 判据：`usage/index.mdx` 里 `Result<T>` 含 `code`、`typeMode: strict/loose`
        两段与 `guide/type-mode.mdx` 的口径一致（后者是对的）
- [ ] `v7/usage/guide/sdk.mdx` 与 `guide/meta.json` 与 v6 的字节级同一状态终结
      → 判据：`diff -rq content/docs/v6 content/docs/v7` 的输出里不再有
        「identical」项。当前这两个文件与 v6 完全相同，即 v7 track 上根本没写过

### 9.4 用文档框架的特性替掉手写（降维护成本）

> 阶段 8 已经证明了这条路走得通：HTTP 侧 59 页从手写变成派生物之后，
> 「文档与代码脱节」这个失效模式**在那一半消失了**。本小节把同样的手法
> 用在剩下的地方 —— 凡是「框架有现成能力、而我们在手抄」的，一律换过去。
>
> **每一项动手前先查上游文档**（`fumadocs-full-documentation` skill），
> 判据里注明查的是哪一页。理由不是形式主义：`generateFiles` 的三个坑
> （从不删旧文件 / `operationId` 决定文件名 / `includeDescription` 影响
> frontmatter）都是 8.3 靠翻上游文档才提前避开的，凭印象写会原地踩一遍。

- [ ] 装 `fumadocs-typescript`，信封与选项类型改由 TS 源码渲染
      → 上游：`(framework)/integrations/(docgen)/typescript.mdx` +
        `ui/components/auto-type-table.mdx`
      → 判据：`mdx-components.tsx` 注入 `AutoTypeTable`（`createGenerator` 带
        `createFileSystemGeneratorCache('.next/fumadocs-typescript')`，
        serverless 上没缓存会超时），或 `source.config.ts` 挂
        `remarkAutoTypeTable` 走 `<auto-type-table>` 形态（后者 `path`
        相对 MDX 文件，且要一并注入 `TypeTable`）
      → 判据：`AmagiSuccess` / `AmagiFailure` / `AmagiError` / `AmagiMeta` /
        `ClientOptions` 五个类型在文档站上的字段表**没有一个字是手写的**，
        改 `contracts/*.ts` 的注释，文档站跟着变
      → 判据：`contracts/*.ts` 里给不想露出的字段加 `@internal`
        （如 `error.cause`「仅用于日志」）后，文档站的表里确实不再出现它
- [ ] SDK 方法参考四页改由端点注册表生成，与 HTTP 侧同源
      → 现状：`api/{bilibili,douyin,kuaishou,xiaohongshu}.mdx` 共 1,317 行、
        64 个示例、59 个方法段落 + 59 张参数表，**全手写**。而同一批端点的
        HTTP 形态早已从注册表派生 —— 同一份事实维护了两遍，其中一遍会烂
      → 判据：`scripts/generate-docs.ts` 增一路输出（或新脚本），从四个
        registry 派生 SDK 方法页：方法名取 `client/method-names.ts`、
        参数表取端点的 zod schema、摘要取 `doc.summary`、
        `@deprecated` 标记取端点声明
      → 判据：生成物**不进 git**（与 HTTP 侧同规矩），`.gitignore` 覆盖；
        `pnpm docs:api` 前置于 `dev` / `build` / `typecheck`
      → 判据：生成的示例代码统一带「取 `data`」那一步（9.2 第 5 项的模板落点），
        且**全部带 `twoslash`** —— 59 个示例编译不过就是 CI 红
      → 判据：`api/meta.json` 的 SDK 段与生成目录对齐，侧边栏无重复条目、
        无孤儿页（8.3 踩过的「文件夹优先于同名文件」坑要重新核一遍）
      → 手写的开场段落（调用形式、单次请求配置、cookie 大小写规则）不是派生物，
        保留为每页顶部的固定前言，用 `<include>` 从一份共享片段引入

- [ ] 代码样例改用 `<include>` 从**真编译的源文件**引入
      → 上游：`mdx/include.mdx`（含 `#region` 区段抽取与 `cwd` 解析）
      → 判据：至少「快速上手」的四个平台示例改为
        `<include>../../../examples/getting-started.ts#bilibili</include>` 形态，
        源文件进 `packages/core` 的 typecheck 范围（或 examples 独立 tsconfig），
        `pnpm typecheck` 覆盖它
      → 为什么两条腿都要：twoslash 保证「示例能编译」，`<include>` 保证
        「示例与仓内真跑过的代码是同一份」。前者防语法腐烂，后者防语义腐烂
- [ ] 组件集中注入 `mdx-components.tsx`，删掉每页的 `import`
      → 上游：`ui/components/tabs.mdx` 的 MDX components 段
      → 判据：`Tabs` / `Tab` / `Files` / `File` / `Folder` / `TypeTable` /
        `Steps` / `Step` / `Accordion(s)` 在任意 MDX 里可直接用；
        `grep -rn "^import .* from 'fumadocs-ui/components" content/` 命中 0 处
        （当前每页开头都要抄一行 `import { Tab, Tabs }`，忘了就构建报错）
- [ ] 手写 `<Tabs>` 包代码块的地方改用代码块 tab 组 + 持久化
      → 上游：`(framework)/markdown/index.mdx#tab-groups`
      → 判据：`getting-started.mdx` / `sdk.mdx` 的平台四选一改成
        ` ```ts twoslash tab="B站" tab-group="platform" ` 形态；四处坏掉的
        四反引号闭合（`sdk.mdx:146` `:162` `:181` `:195`）随之消失
      → 判据：跨页选中的平台**记得住**（`tab-group` 给出 persist id），
        读者不必在每一页重新点一次「B站」
- [ ] ASCII 图与目录树改用框架能力渲染
      → 上游：`(framework)/markdown/mermaid.mdx`（`remarkMdxMermaid` 把
        ` ```mermaid ` 块转成组件）、`ui/components/files.mdx` +
        `headless/mdx/remark-mdx-files.mdx`（`remarkMdxFiles` 把 ` ```files `
        块转成 `<Files>`，`<auto-files dir pattern>` 从 glob 生成）
      → 判据：`dev/architecture.mdx` 的依赖方向
        （`contracts ← transport ← platforms ← runtime ← client ← server`）
        与执行管线改成 `mermaid` 块；暗色模式下可读（`next-themes` 已随
        fumadocs-ui 在用）
      → 判据：该页的源码目录树改用 `<auto-files dir="../core/src" pattern="**/*.ts" />`
        —— 目录结构变了文档自动跟上，这是全站唯一一处「树」类内容还在手抄
- [ ] v7 迁移页上站，`/compat` 的说明不再只存在于仓内
      → 现状：`content/docs/v6/usage/migration-v6.mdx` 有，**v7 track 一页都没有**；
        `@ikenxuan/amagi/compat` 这个入口在整个文档站里 grep 不到，
        只写在仓内的 `docs/v7/06-migration.md:214`
      → 判据：`v7/usage/migration-v7.mdx` 上站并进 `usage/meta.json`；
        正文用 `<include>` 引 `docs/v7/06-migration.md` 的相应区段，
        不复制第二份
      → 判据：页内至少覆盖「默认导入的门面变化（9.1）」「信封读法（9.2）」
        「`typeMode` 已删」「`/compat` 一行切回 v6 语义」四条，
        每条都带可编译的 twoslash 前后对照
- [ ] 「下一步 / 相关阅读」链接列表改成自动生成
      → 上游：`(framework)/markdown/index.mdx#further-reading-section`
        （`getPageTreePeers` + `<Cards>`）
      → 判据：`getting-started.mdx` 末尾那三条手写链接、以及各 `index.mdx` 的
        卡片，改由页面树派生；新增一页不需要回头改任何一处链接列表
      → 判据：与 9.5 的死链检查叠加 —— 生成的链接不可能死，手写的会被查出来

### 9.5 让文档站进 CI：脱节即红

> 前面四个小节都会退化，除非有人盯着。**唯一不会松的绑法是进 CI。**
> 现状是反的：`release.yml:33-39` 的 `paths-ignore` 含 `packages/docs/**`
> —— 只改文档站的提交**整条流水线都不跑**；而 quality job 里也没有
> `next build`，所以 twoslash（只在 `next dev` / `next build` 求值）
> 在 CI 里一次都没求值过。这就是三个缺陷能同时存在的制度原因。

- [ ] `pnpm build:docs` 进 quality job，成为必需检查
      → 判据：故意在任意 v7 页的 twoslash 块里写一行编译不过的代码，CI **红**
        （这条判据是本阶段的地基 —— 不过就等于 9.1–9.4 全都没有防线）
      → 判据：`paths-ignore` 去掉 `packages/docs/**`，或改为「docs 变更只跑
        quality job、不跑发版链路」。当前写法下 docs 的回归永远进不了 CI
      → 判据：构建时间可接受 —— twoslash 给 100+ 代码块逐个起 TS 程序，
        开 `transformerTwoslash({ typesCache: createFileSystemTypesCache() })`
        并缓存 `.next`（上游见 `(framework)/markdown/twoslash.mdx#cache`）；
        记录开缓存前后的实测耗时
- [ ] 死链检查进 CI
      → 现状：`scripts/check-links.mjs` 已在工作区（扫预渲染 HTML 的
        `href="/docs/..."` 比对 `prerender-manifest.json`，并解析
        `next.config.mjs` 的重定向），且已挂在 `docs` 包的 `build` 之后
      → 判据：CI 里跑到它，且**故意加一条死链会红**（本地已能红不算，
        要在 workflow 里验一遍）
      → 判据：脚本自身的失效模式有防护 —— 重定向解析规则过期时它已会
        主动 `exit 1`（脚本第 25 行），保持这条；另补一条：预渲染页数
        为 0 时也要红，免得 `.next` 没产出却「0 死链」通过
      → 上游还有一条现成路线（`(framework)/integrations/validate-links.mdx`
        的 `next-validate-link`，直接扫 MDX 源、不必先构建）。**不换**：
        本仓 59+ 页是构建期生成物，扫源码看不见它们。此处记录为「已评估、
        选了另一条」，免得后来者再调研一遍
- [ ] `docs` 包的 `typecheck` 覆盖到 MDX 里的示例
      → 判据：说清 `pnpm typecheck`（`tsc --noEmit`，只看 `.ts`/`.tsx`）与
        `pnpm build:docs`（twoslash 求值 MDX 代码块）的分工，两者都在 CI 里；
        任何一句「示例已验证」都要能指到这两者之一
- [ ] 把「文档站示例编译不过 = CI 红」写进本文档的《验证流程》
      → 判据：《验证流程》多一小节「文档站」，与《签名快照的红线》同级；
        并写明本阶段之后 v7 目录下 ` ```ts ` 裸块数量必须保持 **0**

### 阶段门 9

- [ ] BUG-1 关闭：`import amagi from '@ikenxuan/amagi'` 拿到 v7 门面
      → 判据：`amagi({ cookies: { douyin: ck } }).douyin.login.qrcode()` 编译通过、
        `kuaishou.login` 仍是编译错误、两个实例的 `events` 不是同一对象；
        `dist/default/index.d.ts` 里 `createClient` 出现次数 > 0
- [ ] BUG-2 关闭：`AmagiResult<T>` 上 `data` 可达且收窄不退化
      → 判据：不收窄读 `data` 得 `T | undefined`、收窄后得 `T`、
        `filter(isSuccess)` 得 `T`、`unwrap` 得 `T`，四条 test-d；
        运行时 `'error' in success === false` / `'data' in failure === false`
- [ ] BUG-3 关闭：v7 目录下 ` ```ts ` 裸块 0 个、`// ---cut---` 不再出现在渲染结果里、
      v6 口径文案清零
      → 判据：`grep -c '^```ts$' content/docs/v7` 为 0；
        `diff -rq content/docs/v6 content/docs/v7` 无「identical」项
- [ ] 手写量实测下降：SDK 参考四页由派生物取代，信封与选项类型表由 TS 源码渲染
      → 判据：`content/docs/v7` 里**跟踪进 git** 的行数比阶段 8 末减少
        ≥ 1,000 行（1,317 行的四页 + 手抄的信封类型），且这些内容在站上仍在
      → 判据：改一个端点的 `doc.summary`、或给 `contracts/result.ts` 加一个字段，
        文档站两处（HTTP 页 / SDK 页 / 类型表）自动跟上，**零手改**
- [ ] `pnpm build:docs` 与死链检查在 CI 里都是必需检查，且各自验过「能红」
      → 判据：两条注入实验各记录一次退出码与 CI 结论
- [ ] `pnpm test` / `test:types` / `typecheck` / `deps:check`（0 环）/ `lint` /
      `openapi:check` 全绿，用例数只增不减
      → 判据：逐项记录数字，与门 8 的 73 文件 / 1454 用例对比

**阶段门 9 未开始。** 与前八个阶段门的差别值得写明：门 0–8 验的是「代码搬对了」，
门 9 验的是「**说的和有的是同一件事，而且以后也跑不掉**」。前者靠测试，
后者靠把文档站接进 CI —— 缺陷 1/2/3 三条都不是写错了代码，是**没人检查过文档**。









---

## 后续工作（不计入进度）

> 这些是执行过程中**明确推后**的项，**不计入 234 项**、不属于任何阶段门 ——
> 写在这里是为了让「推后」有出处可查，而不是散在各处的一句注释。
> 真要做的时候，先把它升格成一个带判据的小节，再动手。

| 项                                                                                                                                     | 为什么推后                                                                                                          | 做的时候至少要满足                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 规范里 `data` 的具体形状（现在是 `{}`，即 any）                                                                                        | v6 `ReturnDataType` 是 26,580 行实测快照，直接转 JSON Schema 会让 `openapi.json` 体积失控，文档站首屏也会被拖垮      | 先定策略（按端点拆 `components.schemas` / 只做高频端点 / 用 `externalDocs` 指向 TS 类型），再谈产物体积上限    |
| Phase 2 的跨平台语义视图                                                                                                               | v7 只做 `view: 'raw'`；`contracts/endpoint.ts` 已留 `ViewMode` 与 `toCanonical` 空槽位（7.x 最后一项），接入是纯增量 | `toCanonical` 从 `undefined` 变成真实函数时，`ViewMode` 扩成 `'raw' \| 'canonical'`，且两种视图各有端到端用例  |
| `startServer` 的 `token` / `host` 走门面                                                                                                | 门面目前只透出 `openapi` 一项；全选项版在 `server/auth.ts` 里、未从包入口导出。扩出去要动「顶层公开导出数 70」这个指标 | 要么门面第二参接全部选项，要么把选项版导出并同步 `public-surface` 快照与指标表 —— 两条路都得先决定公开面口径   |
| `host` 默认值改 `127.0.0.1`                                                                                                            | 破坏性 A 档，06「发布节奏」已定 v8 才切；v7 只加警告                                                                | v8 主版本内切换，且 `hostWarningMessage` 的文案与单测同步改写                                                  |
| 文档站 `source.config.ts` 的 `frontmatterSchema` / `metaSchema`                                                                        | 上游自 fumadocs 16.2.3 起标 `@deprecated`，建议改用 `fumadocs-core/source/schema` 的 `pageSchema`（字段完全一致）    | 换完 `pnpm build:docs` 退出码 0，且生成页的 `_openapi` 仍能被 `preloadOpenAPIPage` 读到                        |

---

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

| 阶段 | 内容                                                  | 项数    | 已完成  | 阶段门 | 可发版         |
| ---- | ----------------------------------------------------- | ------- | ------- | ------ | -------------- |
| 0    | 地基（contracts / transport / runtime / client 骨架） | 31      | 31      | ✅      | —              |
| 1    | 小红书 7 端点（试点）                                 | 20      | 20      | ✅      | —              |
| 2    | 快手 6 端点                                           | 19      | 19      | ✅      | —              |
| 3    | 抖音 19 端点                                          | 36      | 36      | ✅      | —              |
| 4    | B站 27 端点                                           | 46      | 46      | ✅      | —              |
| 5    | 会话（2 套登录）                                      | 16      | 16      | ✅      | —              |
| 6    | 删除 v6 遗留                                          | 33      | 33      | ✅      | —              |
| 7    | 兼容层与收尾（含 7.8 响应类型复用 v6 ReturnDataType） | 15      | 15      | ✅      | `7.0.0-beta.1` |
| 8    | OpenAPI 规范生成与 API 参考自动化                     | 18      | 18      | ✅      | `7.0.0`        |
| 9    | 门面收口与文档站深度集成                              | 34      | 0       | ⬜      | `7.0.1`/`7.1.0` |
|      | **合计**                                              | **268** | **234** |        |                |

### 关键指标（每阶段门更新）

| 指标                                                                  | v6 基线 | 当前   | v7 目标                |
| --------------------------------------------------------------------- | ------- | ------ | ---------------------- |
| import 环数                                                           | 36      | 0      | **0**                  |
| 加一个接口要改的文件数                                                | 11–15   | 1      | **1**                  |
| `KNOWN-DEFECT` 条数                                                   | 61      | 4      | **≤9**                 |
| 顶层公开导出数                                                        | 146     | 70     | 70（59 保留 + 8 变形 − |
| 1（getHeadersAndData 移入 transport）+ assertValid ×4 新增；66 → 70） |
| `dist/default/index.d.ts`                                             | 721 KB  | 739 KB | 记录即可               |
| 测试用例数                                                            | 816     | 1454   | 只增不减               |
| `switch (data.methodType)` 的分支总数                                 | 63      | 0      | **0**                  |
| `content/docs/v7` 跟踪进 git 的行数（越少越好，其余是派生物）          | —       | 3,578  | 降 ≥1,000（门 9）      |
| v7 页面里没有 twoslash 的 ` ```ts ` 裸块                              | —       | 17     | **0**（门 9）          |
| 文档站参与的 CI 必需检查数                                            | 0       | 0      | **2**（构建 + 死链）   |

### 里程碑

- **M1 = 阶段门 0 通过** —— 地基与类型推导验证完成。这之后设计基本冻结。 ✅
- **M2 = 阶段门 1 通过** —— 试点验证扩展点够用。**最后一个低成本改设计的时机。** ✅
- **M3 = 阶段门 4 通过** —— 59 个端点全部迁完，`deps:check` 报 0 环。 ✅
- **M4 = 阶段门 6 通过** —— v6 遗留清空，公开面收敛到 70 个（66 + assertValid ×4）。 ✅
- **M5 = 阶段门 7 通过** —— 发 `7.0.0-beta.1`。✅（门 7 三项判据 2026-09-03 全部满足；
  发版动作本身待人工触发，不由本文档勾选代表）
- **M6 = 阶段门 8 通过** —— API 参考不再手写，OpenAPI 规范由注册表派生且 CI 锁死。发 `7.0.0`。✅（门 8 四项判据 2026-09-03 全部满足；发版动作本身待人工触发）
- **M7 = 阶段门 9 通过** —— 默认导入就是 v7 门面（阶段 5 的登录会话第一次真正可达）、
  信封 `data` 可读、文档站进 CI。**这是「v7 对使用者成立」的里程碑** ——
  门 0–8 让 v7 在仓内成立，门 9 让它在 `npm i` 之后成立。⬜

---

## 风险登记

进行中发现新风险就往这张表里加，别只在脑子里记。

| 风险                                                                                                                                | 影响                                           | 缓解                                                                                                                        | 状态                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `FetcherOf<R>` 类型推导太复杂，IDE 提示退化成巨大交叉类型                                                                           | 用户体验倒退，可能推翻方案 A                   | 阶段门 0 的第 5 项专门验证；不达标就停下重设计                                                                              | 未验证               |
| 签名搬迁改变输出                                                                                                                    | 线上功能损坏，且工具链发现不了                 | 快照测试 + 「不许 `-u`」红线                                                                                                | 已有防线             |
| `partial` 语义定错，改变 v6 的部分失败行为                                                                                          | 静默行为变化（A 档）                           | 阶段 2/3 逐个确认 v6 的隐式行为（快手 tolerate、抖音弹幕 tolerate）                                                         | 待确认               |
| 删 `typeMode` 后大量代码变编译错误                                                                                                  | 破坏性从 B 档滑到 C 档                         | 6.3 的索引签名，**不可省**                                                                                                  | 有方案               |
| 阶段 1–5 期间无法发功能版本                                                                                                         | 紧急需求难处理                                 | 旧代码保留到阶段 6，`MIGRATED` 开关可随时关回去                                                                             | 有方案               |
| B站 wbi 改走 transport 后行为变化                                                                                                   | 签名可能失败                                   | 阶段 4 新增「adapter 能拦到 `/nav`」用例；wbi 快照保护                                                                      | 待验证               |
| 快手 650 行归一化搬迁引入回归                                                                                                       | 用户主页数据结构变化                           | 搬迁后每个 helper 补单测（v6 里零测试）                                                                                     | 待做                 |
| 「8 项保留但形状变化」尚未实施（validateXxxParams 抛错 / createXxxResponse v6 信封 / 顶层 Result 带 code / client events 全局单例） | 公开面与 06 矩阵不一致，KNOWN-DEFECT 降不到 ≤9 | compat（阶段 7 前两项）先行，再造 8 项形状、钉子正向重写                                                                    | 已决策（2026-09-02） |
| 生成的 OpenAPI 规范与端点声明脱钩（有人手改 `openapi.json` 或忘了重跑生成器）                                                       | API 参考重新变成「手写第二遍」，漂移回归       | 阶段门 8 第 4 项：`gen-openapi --check` 进 CI，产物与注册表 diff 即失败；产物不进 git 由构建前置生成                        | 有方案               |
| fumadocs-openapi 的 playground 需要跨域访问用户本地服务，浏览器 CORS 可能拦下                                                       | playground 可用性打折（文档仍可读）            | 8.3 明确不挂公共代理（会转发 cookie 与 Authorization）；改为文档指引用户本地起服务，必要时由 `startServer` 自己加 CORS 开关 | 待验证               |
| **文档站示例从不在 CI 编译**，「文档说的」与「包里有的」可任意漂移                                                                  | 已实际造成 BUG-1/2/3 三条；使用者按文档写代码撞编译错误 | 9.5：`build:docs` + 死链检查进 quality job 并各验一次「能红」；`paths-ignore` 去掉 `packages/docs/**`         | 已定位（2026-09-03） |
| 默认导出换成 v7 门面时，`client.events` 从 12 个事件名的全局单例变成 4 个事件名的实例总线                                            | A 档静默行为变化：`client.events.on('log:info')` 之类静默不再触发 | 9.1 强制顺序：**先补齐事件名再换门面**，并逐名断言；不补齐的取值必须在 06-migration 的矩阵里有出处            | 有方案               |
| `contracts/result.ts` 的硬约束 2 被 9.2 放宽（两支各加 `?: undefined` 对侧键）                                                       | 若实现走成 v6 那种「声明一套、运行时另一套」，等于把 v6 的谎言搬进 v7 | 9.2 第 1 项的第三条判据是运行时断言：`'error' in success === false` / `'data' in failure === false`，声明与事实必须一致 | 有方案               |
| SDK 参考四页改成生成物时，`meta.json` 的「文件夹优先于同名文件」坑重演                                                               | 手写页静默变孤儿页（URL 在、侧边栏没了、零报错） | 9.4 第 2 项判据直接抄 8.3 的教训：生成物下沉一层 + 侧边栏逐条核对；死链检查兜底                              | 有方案               |
| twoslash 全量开启后文档构建耗时失控（100+ 代码块各起一个 TS 程序）                                                                   | CI 变慢，可能有人想把它关掉 —— 关掉就回到今天 | 9.5 第 1 项要求开 `typesCache` 并记录开缓存前后实测耗时；真超预算就分片构建，**不许摘掉检查**                | 待验证               |

---

## 附：端点 → v6 方法名映射

`client/method-names.ts` 的内容。**15 个不规则映射**（标 ⚠️）是这张表必须存在的原因。59 个端点已逐条核对，无遗漏。

| 平台        | 端点                                                                               | v6 方法名                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| douyin      | `videoWork` `imageAlbumWork` `slidesWork` `textWork`                               | `fetchVideoWork` `fetchImageAlbumWork` `fetchSlidesWork` `fetchTextWork`                                      |
| douyin      | `parseWork`                                                                        | ⚠️ `parseWork`                                                                                                 |
| douyin      | `comments`                                                                         | ⚠️ `fetchWorkComments`                                                                                         |
| douyin      | `commentReplies` `danmakuList`                                                     | `fetchCommentReplies` `fetchDanmakuList`                                                                      |
| douyin      | `userProfile` `userVideoList` `userFavoriteList` `userRecommendList`               | `fetchUserProfile` `fetchUserVideoList` `fetchUserFavoriteList` `fetchUserRecommendList`                      |
| douyin      | `search`                                                                           | ⚠️ `searchContent`                                                                                             |
| douyin      | `suggestWords` `musicInfo` `liveRoomInfo` `emojiList` `dynamicEmojiList`           | `fetchSuggestWords` `fetchMusicInfo` `fetchLiveRoomInfo` `fetchEmojiList` `fetchDynamicEmojiList`             |
| douyin      | `loginQrcode`                                                                      | ⚠️ `requestLoginQrcode`                                                                                        |
| bilibili    | `videoInfo`                                                                        | `fetchVideoInfo`                                                                                              |
| bilibili    | `videoStream`                                                                      | ⚠️ `fetchVideoStreamUrl`                                                                                       |
| bilibili    | `videoDanmaku`                                                                     | `fetchVideoDanmaku`                                                                                           |
| bilibili    | `comments` `commentReplies`                                                        | `fetchComments` `fetchCommentReplies`                                                                         |
| bilibili    | `userCard` `userDynamicList` `userLiveStatus` `userSpaceInfo` `uploaderTotalViews` | `fetchUserCard` `fetchUserDynamicList` `fetchUserLiveStatus` `fetchUserSpaceInfo` `fetchUploaderTotalViews`   |
| bilibili    | `dynamicDetail` `bangumiInfo` `liveRoomInfo`                                       | `fetchDynamicDetail` `fetchBangumiInfo` `fetchLiveRoomInfo`                                                   |
| bilibili    | `bangumiStream`                                                                    | ⚠️ `fetchBangumiStreamUrl`                                                                                     |
| bilibili    | `liveRoomInit`                                                                     | ⚠️ `fetchLiveRoomInitInfo`                                                                                     |
| bilibili    | `articleContent` `articleCards` `articleInfo` `articleListInfo`                    | `fetchArticleContent` `fetchArticleCards` `fetchArticleInfo` `fetchArticleListInfo`                           |
| bilibili    | `loginStatus` `emojiList`                                                          | `fetchLoginStatus` `fetchEmojiList`                                                                           |
| bilibili    | `loginQrcode`                                                                      | ⚠️ `requestLoginQrcode`                                                                                        |
| bilibili    | `qrcodeStatus`                                                                     | ⚠️ `checkQrcodeStatus`                                                                                         |
| bilibili    | `avToBv`                                                                           | ⚠️ `convertAvToBv`                                                                                             |
| bilibili    | `bvToAv`                                                                           | ⚠️ `convertBvToAv`                                                                                             |
| bilibili    | `captchaFromVoucher`                                                               | ⚠️ `requestCaptchaFromVoucher`                                                                                 |
| bilibili    | `validateCaptcha`                                                                  | ⚠️ `validateCaptchaResult`                                                                                     |
| kuaishou    | `videoWork` `userProfile` `userWorkList` `liveRoomInfo` `emojiList`                | `fetchVideoWork` `fetchUserProfile` `fetchUserWorkList` `fetchLiveRoomInfo` `fetchEmojiList`                  |
| kuaishou    | `comments`                                                                         | ⚠️ `fetchWorkComments`                                                                                         |
| xiaohongshu | `homeFeed` `noteDetail` `noteComments` `userProfile` `userNoteList` `emojiList`    | `fetchHomeFeed` `fetchNoteDetail` `fetchNoteComments` `fetchUserProfile` `fetchUserNoteList` `fetchEmojiList` |
| xiaohongshu | `searchNotes`                                                                      | ⚠️ `searchNotes`                                                                                               |

映射表必须有测试对着 `public-surface` 快照校验，
漏一个就是某个 v6 方法在 v7 里消失了。
