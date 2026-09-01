# v6 架构审计 —— v7 重构前期探测

> 探测日期：2026-09-02 ｜ 基线版本：`@ikenxuan/amagi@6.6.0`（commit `2c24bd9`）
> 探测范围：`packages/core`，259 个 `.ts` 文件 / 43,533 行
> 基线状态：`tsc --noEmit` 通过（0 error）、`oxlint` 通过（0 warning）。**下述问题全部不被现有工具链拦截。**

本文是 `refactor-v7` 的问题清单与验收依据。
**基于本文的 v7 架构设计见 [`docs/v7/`](./docs/v7/README.md)，执行清单见 [`docs/v7/PRD.md`](./docs/v7/PRD.md)。**每条结论都标注了可复现的证据，
「实测」= 在本机运行代码验证过，「静态」= 通过代码/配置交叉比对得出。

---

## 目录

| # | 问题 | 严重度 | 类别 |
| --- | --- | --- | --- |
| 1 | 分层名存实亡，36 处循环依赖 | 高 | 架构 |
| 2 | 加一个接口要动 11–15 个文件，无单一事实来源 | 高 | 架构 |
| 3 | 双源已导致线上 bug（B站翻页失效、抖音 4 路由不可达） | 高 | 正确性 |
| 4 | header 大小写无规范，签名 cookie 恒为 undefined | 高 | 正确性 |
| 5 | 三套并存的错误模型 | 高 | 架构 |
| 6 | 零测试，CI 只跑 build，聚合脚本静默空跑 | 高 | 工程 |
| 7 | 61% 代码是手写响应类型，而默认路径返回 any | 中 | 设计 |
| 8 | 四个平台四套写法 | 中 | 一致性 |
| 9 | 死代码与无用公开面 ~700 行 | 中 | 维护 |
| 10 | 事件系统是全局单例，无关联 id | 中 | 可观测性 |
| 11 | 流程摩擦（pre-commit、AGENTS.md 悬空引用、docs 漂移） | 低 | 工程 |
| 12 | HTTP 服务默认无鉴权且绑定全部网卡 | 安全 | 安全 |

---

## 1. 分层名存实亡：36 处循环依赖

`platform / model / server / validation` 四层看起来分得很干净，实际是一团环。

**实测**：静态分析出 36 个不同的 import 环，其中包含真正的运行时环：

```
platform/index.ts
  -> platform/bilibili/index.ts
  -> platform/bilibili/getdata.ts
  -> model/index.ts
  -> model/fetchers/index.ts
  -> model/fetchers/bilibili/index.ts
  -> model/fetchers/bilibili/article.ts
  -> server/index.ts
  -> platform/index.ts        (环闭合)
```

成因：

- **model 与 platform 互为依赖。** `platform/*/getdata.ts:11` 从 `amagi/model`
  barrel **值导入** `fetchData` / `emitLog*`；而 `model/fetchers/*/internal.ts:11`
  又值导入 `platform/*/getdata.ts` 的 `DouyinData` / `fetchBilibili`。
- **纯类型住在最重的模块里。** `RequestConfig` 定义在 `server/index.ts`
  —— 同一个模块里 `new Chalk()`、建 Express app。**34 个文件**以
  `import { RequestConfig } from 'amagi/server'`（非 `import type`）把它拉进来。
- **已有的规避是无效的。** `platform/douyin/getdata.ts:6` 注释写着
  「注意：为避免循环依赖，此文件直接从具体模块导入」，但同文件第 11 行
  又导入了 `amagi/model` barrel，环原样回来。

**附带**：190 处 `amagi/*` 自别名导入（tsconfig `paths` 映射到 `./src/*`，
而真实包名是 `@ikenxuan/amagi`）。`src/index.ts:76` 的注释承认这个别名会让
`export *` 生成的 `.d.ts` 对下游不可解析，于是那里手写了一整段具名 re-export
清单兜底 —— 每新增一个导出都必须记得同步。

### v7 验收标准

- 0 个 import 环，CI 用 `dpdm` / `import/no-cycle` 钉住。
- `RequestConfig`、`Result`、错误类型下沉到零依赖的 contracts 模块。
- 取消 `amagi/*` 自别名，或改为 package.json `imports` 的 `#*` 子路径。

---

## 2. 加一个接口要动 11–15 个文件

**实测**：单个接口涉及的文件数 —— `userFavoriteList` 11 个，`userSpaceInfo` 15 个。

同一份**参数**被定义三遍：

| 位置 | 形式 |
| --- | --- |
| `types/*APIParams.ts` | 手写 interface（含 `methodType`） |
| `validation/*.ts` | zod schema |
| `model/fetchers/*/types.ts` | 对外 `*Options` interface |

同一份**名字 / 路由**被声明五处：

- `validation/*.ts` 的 `*MethodRoutes`（真正被 Express 使用）
- `types/api-spec.ts` 的 `*ApiRoutes`（对外导出，内部零引用）
- `types/api-spec.ts` 的 `*MethodMapping` + `*MethodReverseMapping`
- `types/method-keys.ts` 的 `*InternalMethods` / `*FetcherMethods` / `*MethodToFetcher`

**漂移已经发生**：`userFavoriteList`、`userRecommendList` 存在于 fetcher，
但不在 `api-spec.ts`、不在 `method-keys.ts`、不在 docs。

项目自己的 `docs/dev/add-api.mdx` 列了 8 步，还漏了 `bound.ts`、
`api-spec.ts`、`method-keys.ts`。

### v7 验收标准

- 每个 endpoint 一份声明式描述（methodType / zod schema / URL 构造 / 签名需求 /
  分页策略 / 路由路径 / 响应类型），其余全部由它派生或生成。
- 参数类型从 zod `infer` 得出，禁止手写第二遍。
- 新增一个接口只需改 1 个文件 + 1 份响应类型。

---

## 3. 双源已导致线上 bug

### 3.1 B站评论的翻页游标与排序模式实际不可用

`types/BilibiliAPIParams.ts` 的 `CommentParams` 声明了
`mode` / `pagination_str` / `plat` / `seek_rpid` / `web_location`（还带
`@defaultValue 3`、`@defaultValue 1`、`@defaultValue 1315875` 的文档），
`platform/bilibili/getdata.ts` 也确实解构并使用它们 ——
但 `validation/bilibili.ts:28` 的 `BilibiliCommentParamsSchema` 里
**这五个字段一个都没有**。zod object 默认 strip 未知键。

**实测**：

```
validateBilibiliParams('comments', {
  oid: '170001', type: 1, number: 20,
  mode: 2, pagination_str: 'TOKEN', plat: 3, seek_rpid: 'x', web_location: '999999'
})

--> 保留的键: methodType, number, oid, pn, type
--> mode / pagination_str / plat / seek_rpid / web_location  全部 undefined
```

后果：`pagination_str` 是懒加载翻页游标，调用方按公开类型传进来会被静默丢弃，
**翻页永远从第一页重新开始**；`mode`（排序方式）同样被忽略，恒回落到 3。
schema 里反而多出一个 `pn`（默认 1），而 `getdata.ts` 从不读它 —— 纯死参数。

**为什么 `tsc` 不报**：schema 标注为
`zod.ZodType<BilibiliMethodOptionsMap['CommentParams']>`，只校验输出类型可
赋值给该类型；那五个字段都是可选的，缺失照样通过。多出的 `pn` 也不触发
超额属性检查（泛型位置不生效）。

### 3.2 抖音 5 个 methodType 撞同一条路由，4 个 HTTP 不可达

`validation/douyin.ts:187-191`：`parseWork` / `textWork` / `videoWork` /
`imageAlbumWork` / `slidesWork` 全部映射到 `/fetch_one_work`。
`platform/douyin/routes.ts` 遍历该表逐个 `router.get(path, ...)`。

**实测**：router 注册了 19 层，但只有 15 个唯一路径，`/fetch_one_work` 挂了 5 层。
`middleware/validation.ts` 在校验失败时直接 `res.status().json()` 而**不调
`next()`**，所以只有第一个注册的 `parseWork` 能命中，其余 4 个方法
通过 HTTP 完全不可达。

### 3.3 对外宣称的 API 规范与真实服务不是一回事

`types/api-spec.ts:203` 导出的 `DouyinApiRoutes` 写的是 RESTful 风格
`parseWork: '/work'`，而 `validation/douyin.ts:187` 真实注册的是
`parseWork: '/fetch_one_work'`。整张表都对不上，且 `getApiRoute()` 等
5 个 helper 内部零引用 —— 它只是一份对外导出的、错误的文档。

### v7 验收标准

- 参数只有一个来源（zod），类型由它 `infer`。schema 与实现使用的字段
  必须由测试保证一致（见 `test/validation/*.schema-contract.test.ts`）。
- 路由表禁止重复路径，由测试断言。
- 删除或修正 `api-spec.ts`，不允许存在第二份路由真相。

---

## 4. header 大小写无规范，签名 cookie 恒为 undefined

- **B站 wbi 签名拿不到 cookie。** `getBilibiliDefaultConfig` 写入
  `Cookie`（大写 C），而 `platform/bilibili/getdata.ts:94,162,179,223`
  读的是 `headers?.cookie`（小写）。**实测** `headers['cookie']` 为
  `undefined`，即 `wbi_sign` / `qtparam` 永远收到 `undefined`，
  `getWbiKeys` 于是匿名去打 `api.bilibili.com/x/web-interface/nav`。
  三处还带 `as string` 把这事从类型检查里藏掉了。
- **小红书的 UA 不被清理。** `getXiaohongshuDefaultConfig` 全部用小写
  header，而 `model/networks.ts:86` 的 `cleanUserAgent` 只看
  `headers['User-Agent']` —— 于是小红书默认 UA 里的 `Edg/141` 不会被剥掉，
  另外三个平台会。既然实现认为这个标识需要清理，小红书就是意外地在走另一套行为。
- **绑定 fetcher 的 cookie 覆盖只认大写。** `shared/request-config.ts:35`
  的 `resolveBoundRequest` 用 `hasOwnProperty(headers, 'Cookie')` 判断。
  用户按小红书自身约定传 `{ headers: { cookie } }`，签名身份覆盖被静默忽略。

**附带（性能 / 风控）**：wbi key 无任何缓存，`getWbiKeys` 每次签名都发一次
`/nav` 请求；而 `comments` 分支的 `wbi_sign` 位于 `while` 循环内部，
`maxRequestCount = 100`。

### v7 验收标准

- 统一到一个大小写不敏感的 header 容器（或全程规范化为小写），
  由测试覆盖大写 / 小写 / 混合三种写法。
- wbi key 带 TTL 缓存。

---

## 5. 三套并存的错误模型

- `model/networks.ts:94,157` 用 `validateStatus: () => true`
  —— **HTTP 4xx/5xx 全部算成功**，直接返回 `response.data`，上层只能靠猜
  payload 形状判断成败。重试也只认 errno（`ECONNRESET` 等），
  429 / 503 永不重试。
- 四个 `internal.ts` 各写一套判定，互不兼容：

  | 平台 | 判定 |
  | --- | --- |
  | douyin | `rawData.data === '' \|\| rawData.status_code !== 0` |
  | bilibili | `rawData.code !== 0` |
  | kuaishou | `rawData.code && Object.values(kuaishouAPIErrorCode).includes(rawData.code)` |
  | xiaohongshu | 同上，换枚举 |

- 四个 `internal.ts` 声明返回 `Result<T>`（不抛的结果类型），
  catch 里却 `throw new Error(...)`（`internal.ts:64/67/59/73`）把结构化
  错误丢掉。调用方必须同时处理「返回错误」和「抛错误」两条路径。
- 路由层语义不一致：业务错误走 `res.json` 恒 200；抛出的错误走
  `res.status(errorResponse.code)`。
- 错误码枚举本身不可用：
  - `bilibiliAPIErrorCode` 的值是字符串 `'-101'`，而 B站返回数字。
    **实测** `Object.values(bilibiliAPIErrorCode).includes(-101)` 为 `false`。
    该枚举全仓只有一处硬编码使用。
  - `xiaohongshuAPIErrorCode` 是混合枚举（字符串 + 数字），**实测**
    `Object.values()` 会泄漏反向映射键：
    `['ILLEGAL_REQUEST','ACCOUNT_ABNORMAL',...,500,300011,...]`。
  - `amagiAPIErrorCode.UNKNOWN = 'UNKNOWN_ERROR'` 但
    `bilibiliAPIErrorCode.UNKNOWN = 'UNKNOWN'`。

### v7 验收标准

- 一个 `Result<T, E>`；声明不抛就真的不抛。
- HTTP 状态码进入结果（不再全量放行），平台业务码由表驱动判定。
- 错误码统一为字符串常量联合，禁用混合 enum。

---

## 6. 零测试，CI 只跑 build

- 全仓 **0 个** test / spec 文件，无 vitest / jest 配置（v7 分支已开始补）。
- 根 `test` 与 `clean` 脚本递归到**没有该脚本的包** —— pnpm 静默成功。
  即 `pnpm test` 一直是绿的，因为它什么都没跑。
- 根 `typecheck` / `fix` **漏掉 docs 包**：docs 定义的是
  `types:check` / `format`，名字不匹配，聚合脚本永远不会执行它们。
- CI（`.github/workflows/release.yml:133` 的 `unified-build`）只有
  `pnpm build:core`，不跑 typecheck、不跑 lint、不跑 test。
- pre-commit 也不跑 typecheck / lint。
- oxlint 只启用了 `correctness: 'warn'` 一个 category。非类型定义代码中
  `any` 出现 53 处，其中 19 处集中在 `platform/douyin`。
- 目前唯一的验证手段是 `src/dev.ts`（已 gitignore，未提交 ——
  已确认仓库中无泄漏凭据），需要塞真实 cookie 手工跑。
  `dev:js` 脚本指向不存在的 `src/dev.js`。

### v7 验收标准

- CI 必须跑 `typecheck` + `lint` + `test`，全部为必需检查。
- 修正 docs 包脚本名，让聚合脚本真正覆盖两个包。
- 签名算法、schema 契约、路由表、错误映射全部有测试。

---

## 7. 61% 的代码是手写响应类型，而默认路径把它丢掉

- 43,533 行中 **26,580 行**位于 `types/ReturnDataType/`（61%）。
- `model/fetchers/types.ts:20`：

  ```ts
  export type ConditionalReturnType<T, M extends TypeMode> = M extends 'strict' ? T : any
  ```

  而所有 fetcher 的 `M` 默认为 `'loose'` —— **默认返回 `any`**。
  那两万六千行必须显式传 `typeMode: 'strict'` 才生效。
- 产物 `dist/default/index.d.ts` 为 721 KB，拖慢下游 TS server。
- `TypeControl.typeMode` 的文档写着「类型定义时间：2025-02-02」，
  即这批类型本身就是某一时刻的快照，没有更新机制。

### v7 验收标准

- 决定一个方向并执行到底：(a) 从真实响应样本生成 + 快照回归；
  (b) 收敛为 `unknown` 让调用方自行收窄。不要保留「写了但默认不用」的中间态。
- 若保留 `typeMode`，默认值必须改为 `strict`（属于 breaking，需迁移说明）。

---

## 8. 四个平台四套写法

| 平台 | `API.ts` 形态 | `getdata.ts` |
| --- | --- | --- |
| bilibili | `class BilibiliAPI` + 单例 | 27 case / 610 行 |
| douyin | `class DouyinAPI` + 单例 + factory | 23 case / 829 行 |
| kuaishou | `class API`（未命名语义） + 单例 | 6 case / **1057 行** |
| xiaohongshu | 对象字面量 + factory | 7 case / 261 行 |

- **kuaishou 的 1057 行里约 650 行是响应归一化 helper**
  （`createEmpty*Result` / `mapLiveDetailTo*` / `resolveKuaishou*` /
  `normalizeKuaishou*` / `dedupeLiveRoomPlayList`）。
  「响应变换」这个关注点在架构里没有位置，只能往 `getdata.ts` 里长。
- **xiaohongshu 的 7 个 case 各自重复同一段** `x-s` / `x-t` / `x-s-common`
  签名拼装，无共享 helper。
- **douyin 的 referer 覆盖模式**
  （`(!requestConfig?.headers || !('Referer' in requestConfig.headers)) && {...}`）
  在 `getdata.ts` 中重复 6 次。
- bilibili 没有 `sign/index.ts`，另外三个平台都有。
- `defaultConfigs.ts` 四份硬编码 UA，Chrome 版本分别
  **125 / 142 / 130 / 141** 各自漂移；`getXiaohongshuDefaultConfig`
  的签名还少了 `requestConfig` 参数、不设 method / timeout。

### v7 验收标准

- 四个平台实现同一个 adapter interface：
  `buildRequest(params) -> RequestSpec`、`sign(spec) -> spec`、
  `paginate(...)`、`normalize(raw) -> T`。
- UA / header 基线单一来源，版本号集中维护。

---

## 9. 死代码与无用公开面（约 700 行）

- **`types/method-keys.ts`（313 行）内部零引用**，只经 barrel 对外导出。
  且文件开头写的设计前提「底层 getdata.ts 和 API.ts 仍使用中文 key」
  **已经是假的** —— getdata 早已改用英文 `methodType`。
- **`types/api-spec.ts`（393 行）** 的映射表与
  `getApiRoute` / `getEnglishMethodName` / `getChineseMethodName` /
  `isEnglishMethodName` / `isChineseMethodName` 全部内部零引用，
  且路由表内容与真实服务不符（见 3.3）。
- **从未被任何文件导入**：
  - `platform/bilibili/sign/CorrespondPath.ts`
  - `platform/bilibili/sign/dm_img.ts`
  - `types/ReturnDataType/Kuaishou/WorkComments.ts`
    （与同名目录撞车，`index.ts` 只能写 `./WorkComments/index` 消歧义）
- **声明但从未发射的事件**：`http:request` / `http:response` / `http:error`
  三个事件类型，以及 `emitHttpRequest` / `emitHttpResponse` 两个函数。
- `model/networks.ts` 的 `fetchData` 与 `fetchResponse` 约 50 行逐字重复。
- `fetchData<T>(config: AxiosRequestConfig<T>)` 把 `T` 绑成了 axios 的
  **请求体**类型，却当作响应类型返回。

### v7 验收标准

- 删除上述死代码。对外导出面需要一份显式清单并有测试守护（见
  `test/contract/public-surface.test.ts`）。

---

## 10. 事件系统是全局单例

`amagiEvents` 是模块级单例，`emitLog*` 是自由函数直写该单例。

- 两个 `createAmagiClient` 实例**共享同一条 bus**，事件负载里没有任何
  request / client 关联 id，无法归因。
- 没人挂 listener 时警告静默消失 —— 而「你的 cookie 失效了」这类关键信息
  只通过 `emitLogWarn` 上报。
- 事件负载无 `requestId`，`HttpRequestEventData` 也没有。

### v7 验收标准

- 事件 bus 随 client 实例创建（保留一个全局默认实例做 v6 兼容）。
- 所有事件带 `requestId` + `clientId`。

---

## 11. 流程摩擦

- **pre-commit 每次改写** `packages/core/package.json` 的 `timestamp` 字段
  并 `git add` —— 每个 commit 都动这一行，并行分支必冲突，
  且发布包内容哈希每次提交都变。
- **`AGENTS.md` 引用的 5 个路径全部不存在**：
  `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`、
  `docs/agents/domain.md`、`CONTEXT.md`、`docs/adr/`
  （根目录连 `docs/` 目录都没有）。
- **docs 漂移**：docs 的 API 参考漏了 23 个抖音方法中的 6 个 ——
  `fetchUserFavoriteList`、`fetchUserRecommendList`，以及 6.6.0 刚发布的
  整套 passport 登录（`requestPassportQrcode` / `checkPassportQrcode` /
  `sendPassportVerifyCode` / `validatePassportVerifyCode`），
  仅在 changelog 页出现。

---

## 12. 安全：HTTP 服务默认无鉴权且绑定全部网卡

`server/index.ts:94`：

```ts
app.listen(port, '::', () => { ... })
```

- 绑定所有网卡（IPv6 any，通常双栈）。
- **没有任何鉴权、没有限流、没有 CORS 配置、没有请求体大小限制**
  （仅 express 默认）。
- 而这个服务是**拿运营者的平台 cookie** 去代理请求的 ——
  同网段任何人都能以运营者的账号身份调 `/api/douyin/*`。
- `app.listen` 的返回值被丢弃，只返回了 `app`，因此无法干净地关闭服务
  —— 这同时也是可测试性障碍。

### v7 验收标准

- 默认绑定 `127.0.0.1`，暴露到 `0.0.0.0` 必须显式 opt-in 且要求 token。
- `startServer` 返回 `http.Server`（或带 `close()` 的句柄）。
- 提供可选的 token 鉴权中间件与限流。

---

## v7 重构建议顺序

依赖关系决定顺序，前两项决定后面所有事。

1. **切环 + 契约下沉。** `RequestConfig` / `Result` / 错误类型移入零依赖
   `contracts`；`fetchData` 移入独立 transport 层；依赖方向固定为
   `contracts <- transport <- platform <- model <- server`；
   禁止 barrel 跨层导入；CI 加环检查。
   *不改变任何行为，可独立验证，是后续一切的前提。*
2. **建立单一事实来源。** 每个 endpoint 一份声明式注册表，
   参数类型从 zod `infer`；删掉 `api-spec.ts` / `method-keys.ts` /
   重复路由表。同时消除第 2、3 条。
3. **统一错误模型。** 一个 `Result`，一处 HTTP 状态判定，
   一处表驱动的平台业务码判定。
4. **响应类型定方向。** 生成 + 快照，或收敛为 `unknown`。
5. **平台 adapter 统一形状。** kuaishou 的 650 行归一化逻辑与
   xiaohongshu 重复 7 遍的签名拼装各自归位。
6. **服务层加固。** 绑定地址、鉴权、限流、可关闭句柄。

---

## v6 -> v7 迁移成本控制

`test/` 下的测试套件是**为迁移服务的行为基线**，不只是回归网。
它们把 v6 的可观测行为钉死，使 v7 的每一处偏离都变成一次显式的
snapshot diff，而不是用户上线后才发现的意外。

三条硬约束：

1. **公开导出面**（`test/contract/public-surface.test.ts`）
   —— v6 的每个导出名在 v7 必须仍然存在，或在迁移文档中有对应条目。
2. **签名算法**（`test/platform/sign/*.test.ts`）
   —— 固定 `Math.random` / `Date.now` 后输出必须逐字节一致。
   签名一旦变化就是线上功能损坏。
3. **参数契约**（`test/validation/*.test.ts`）
   —— 每个 methodType 接受的键集合、默认值、强制转换行为、
   拒绝规则全部锁定。已知缺陷（如 3.1）以
   `KNOWN-DEFECT` 标注并断言当前行为，v7 修复时必须显式改测试。

标注为 `KNOWN-DEFECT` 的测试是「v7 应当修掉」的清单；
其余测试是「v7 不得破坏」的清单。

---

# 附录 A：编写测试基线时新发现的缺陷

以下问题在初次静态审计中未被发现，是在为 `refactor-v7` 建立行为基线
（`packages/core/test/`，816 个用例）的过程中由测试暴露出来的。
全部已在测试里以 `KNOWN-DEFECT:` 标注并钉死当前行为。

## A1. `Result.error` 有三种互不兼容的形状

同一个声明为 `error: APIErrorType` 的字段，实际可能是三种东西：

| 触发条件 | `error` 实际形状 | 读取方式 |
| --- | --- | --- |
| 平台返回非 0 `status_code` | **`undefined`** | 无法读取，直接崩 |
| `getdata` 自己造的错误（空响应 / 内容过滤） | `ErrorDetail` | `error.errorDescription` |
| `networks` 造的错误（网络失败） | `APIErrorType` | `error.amagiError.errorDescription` |

**实测**：后两种形状**没有任何公共字段**，调用方无法用统一写法读取错误信息。
而第一种情况下 `error` 是 `undefined`，任何 `result.error.xxx` 都会抛
`TypeError`。

## A2. B站「无有效负载」的判定自相矛盾

`platform/bilibili/getdata.ts` 的 `GlobalGetData` 认为 `data: {}` 与
`data: null` 都是错误并抛出，但两者最终结论相反：

- `data: {}` → 抛出的对象带 `code: 0` → `internal.ts` 的
  `rawData.code !== 0` 判定为 **成功**，`Result.data` 里装的是错误信封
  （含 `amagiError`）。
- `data: null` → `isEmptyObjectPayload` 里的 `Object.keys(null)` 抛
  `TypeError`，被外层 catch 兜住，返回的对象没有 `code` → 判定为 **失败**。

**实测**：同一类「接口返回空」在两种写法下一个 `success: true` 一个
`success: false`。

## A3. B站平台返回的 `message` 被丢弃

`GlobalGetData` 把响应重新包装成 `{ code, data, amagiError }`，
原始 `message` 被埋进 `data` 里。而 `internal.ts` 读的是 `rawData.message`，
拿到的永远是 `undefined`，于是恒定回落到兜底文案「B站数据获取失败」。

**实测**：请求返回 `{ code: -404, message: '啥都木有' }`，
`Result.message` 是「B站数据获取失败」，原始文案只能从
`error.errorDescription` 里挖。

## A4. B站 `-412` 重试与网络层重试叠乘

`GlobalGetData` 内部对 `code === -412` 递归重试 3 次，
而 `networks.fetchData` 自己还有 3 次 errno 重试。
**实测**：一次 `-412` 会产生 4 次请求；若同时叠加网络抖动，
单次调用最坏可发出 16 次请求 —— 对风控接口是雪上加霜。

## A5. `wbi.ts` 绕过 `fetchData` 直连 axios

`platform/bilibili/sign/wbi.ts` 是全仓唯一直接调用 `axios()` 的业务模块。
后果：

- 不走重试、不发事件、不做 UA 清理
- **无法被调用方的 `requestConfig` 拦截** —— 用户配置的 proxy / agent /
  超时对它完全无效
- 每次签名都重新拉 `/nav`，无缓存（见正文第 4 节）

这也是测试无法端到端覆盖 B站 wbi 系接口的原因。

## A6. B站 `getComments` 硬编码了三个参数

即使 schema 补上了 `plat` / `seek_rpid` / `web_location`（见正文 3.1），
也仍然无效：`API.ts` 里这三个值是写死的 `'1'` / `''` / `'1315875'`。
**实测**：传 `plat: 9, web_location: '111'`，URL 上仍是 `plat=1` 与
`web_location=1315875`。

## A7. `bv2av` 返回带前缀的字符串

`fetchBilibili('bvToAv')` 返回 `{ data: { aid: 'av170001' } }`
—— 是字符串且带 `av` 前缀，而 `av2bv` 的入参是 `number`。
往返转换需要调用方自己剥前缀。

## A8. 小红书 `extractA1FromCookie` 的正则没有锚点

实现是 `cookieString.match(/a1=([^;]+)/)`，键名两侧都无边界。
**实测**：

- `'xa1=nope'` → 返回 `'nope'`
- `'xa1=WRONG; a1=RIGHT'` → 返回 `'WRONG'`

小红书的 `x-s` / `x-s-common` 全部依赖 a1，取错值等于签名必然失败，
而失败表现只是接口返回风控页面，很难定位到这里。

## A9. 小红书把一切失败归一化为 `code 500`，与 `ILLEGAL_REQUEST` 撞码

`xiaohongshu/getdata.ts` 的 catch 一律返回 `code: 500`，
而 `xiaohongshuAPIErrorCode.ILLEGAL_REQUEST` 恰好也是 `500`。
于是「非法请求」这个具体错误码与「任意内部异常」无法区分。

## A10. 快手签名带模块级可变状态

- `getKuaishouPureRuntimeState().count` 每次签名递增，
  **实测**：相同 payload 连续两次 `generateHxfalconFromPayload` 结果不同。
  签名不可重放，也无法在测试里稳定断言。
- `deriveKuaishouAnonymousKww` 的结果被缓存在模块级变量里，
  **实测**：`deriveKuaishouKww('did=x')`、`deriveKuaishouKww('other=1')`、
  `deriveKuaishouKww(undefined)` 三者返回同一个值，且进程内无法重置。
- `kuaishouSign` 读取 `globalThis.document?.scripts?.length`，
  Node 环境下恒为 0 —— 与浏览器侧的签名输入不一致。

## A11. 快手参数的两处可用性问题

- `userWorkList.count` 用的是 `zod.number()` 而非 `zod.coerce.number()`。
  HTTP query 一律是字符串，**实测**传 `count: '20'` 直接校验失败
  —— 这个参数通过 HTTP 不可用。
- `comments` 的 schema 只有 `photoId`，没有任何翻页参数，
  **实测** `pcursor` / `count` 都被 strip —— 快手评论无法翻页。

## A12. 抖音两个签名函数对入参形状有隐式假设

- `douyinSign.AB('')` 抛 `TypeError: Invalid URL`；
  任何非绝对 URL（`'not-a-url'`、`'/relative/path'`）同样抛错。
- `douyinSign.XB()` 更严格：**实测**短路径 URL（`https://www.douyin.com/x?q=1`、
  `https://www.douyin.com/`）一律抛 `Invalid MD5 character`，
  只有形如真实抖音接口的长路径才能签名成功。
  也就是说它不能当通用工具对外导出。

## A13. `getDouyinDefaultConfig` 的 Edg 剥离被展开顺序抵消

实现先算出剥掉 `Edg/x` 的 `finalUserAgent` 放进 `defHeaders`，
随后 `{ ...defHeaders, ...requestConfig.headers }` 又用**原始值**覆盖回去。

**实测**：外部传入带 `Edg/140` 的 UA 时，

- `User-Agent` 头仍含 `Edg/140`
- 而 `Sec-Ch-Ua` 是基于剥离后的值算的，声明 `"Google Chrome";v="140"`

两个头描述的浏览器不一致 —— 这正是反爬最容易识别的特征。

## A14. `fetchData` 就地改写调用方的 headers 对象

`const cleanedConfig = { ...config }` 只是浅拷贝，`headers` 仍是同一引用，
随后 `cleanedConfig.headers['User-Agent'] = cleanUserAgent(...)` 直接写回。
**实测**：调用方持有的 `headers` 对象在调用后被修改。
复用同一份 config 对象的调用方会观察到副作用。

## A15. `getXiaohongshuDefaultConfig` 与另外三个平台签名不一致

**实测**：

- `length === 1` —— 不接受 `requestConfig` 参数（另外三个都接受）
- 不设置 `method` 与 `timeout`（另外三个都设）
- 不对 cookie 做 `trim`（另外三个都做）
- `sec-ch-ua` 写死为 Microsoft Edge 指纹

## A16. 校验文案分裂为两种语言

douyin / bilibili 的 zod 错误文案是中文（「视频ID必须是字符串」），
kuaishou / xiaohongshu 是英文（`photoId must be a string`）。
对外暴露的错误信息不一致。

## A17. 其他已钉死的小项

- `createSuccessResponse` 声明 `error: never`，运行时该键存在且为 `undefined`。
- `createErrorResponse(undefined)` 不报错，产出 `error: undefined` 的失败结果。
- 小红书 `noteDetail` 的 `note_id` / `xsec_token` 允许空字符串（缺 `min(1)`）。
- 小红书 `cursor` 是纯 `string` 且不强转，而抖音 `cursor` 是 `coerce.number`
  —— 同名参数语义不同。
- `douyinSign.VerifyFpManager` 用 `new Date().getTime()` 而非 `Date.now()`，
  无法通过 `vi.spyOn(Date, 'now')` 冻结。
- `xiaohongshuSign.getSearchId` 的实现是
  `(BigInt(Date.now()) << 64n) + BigInt(...).toString(36)`
  —— 右侧先 `toString` 变成字符串，整个表达式退化为字符串拼接，
  而非预期的位运算。
- `bilibiliApiUrls.getComments` 未传 `mode` 时默认 3、未传 `pagination_str`
  时 offset 为空串（已快照）。

---

# 附录 B：测试基线现状

```
packages/core/test/     23 个文件 / 816 个用例 / 全绿
类型层用例              pnpm test:types（tsc，0 error）
KNOWN-DEFECT 标注       61 条，汇总于 test/contract/known-defects.test.ts
```

约定见 `packages/core/test/README.md`：

- **普通标题** = v7 不得破坏
- **`KNOWN-DEFECT:` 标题** = v7 应当修掉；修好后用例必然失败，
  需显式删除或改写，因此这个数字只应下降

测试全程不发真实网络请求：`RequestConfig` 会原样透传给 axios，
所以注入自定义 `adapter` 就能驱动
`fetcher -> internal -> getdata -> networks -> axios` 的完整链路。
唯一例外是 `wbi.ts`（见 A5）。
