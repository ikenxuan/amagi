# amagi v7 架构设计

> 状态：**设计中**，尚未开始实现
> 基线：`@ikenxuan/amagi@6.6.0`（commit `2c24bd9`）
> 前置阅读：仓库根目录 [`V6-AUDIT.md`](../../V6-AUDIT.md)

## 文档索引

| 文档 | 内容 |
| --- | --- |
| 本文 | 目标与非目标、已定决策、缺陷映射表、破坏性变更预算 |
| [PRD.md](./PRD.md) | **方案 A 执行清单**：211 项任务、阶段门、验收判据、进度看板与风险登记 |
| [01-response-envelope.md](./01-response-envelope.md) | **统一响应体系**（核心） |
| [02-option-a-registry-pipeline.md](./02-option-a-registry-pipeline.md) | 方案 A：声明式端点注册表 + 执行管线 |
| [03-option-b-platform-adapter.md](./03-option-b-platform-adapter.md) | 方案 B：平台适配器类体系 |
| [04-option-c-incremental.md](./04-option-c-incremental.md) | 方案 C：渐进式改造 |
| [05-session-and-polling.md](./05-session-and-polling.md) | 会话与轮询（登录状态机） |
| [06-migration.md](./06-migration.md) | v6 → v7 迁移矩阵 |

三个方案是**互斥的选择**，01 / 05 / 06 三份是三个方案共用的设计。

---

## 目标

按优先级：

1. **一套标准响应体系。** 网络错误、平台业务错误、参数错误、内部异常、成功，
   在四个平台之间共用同一个信封与同一套字段名。
2. **消除臃肿。** 加一个接口从「改 11–15 个文件」降到「改 1 个文件」；
   删掉内部零引用的 706 行公开面（`api-spec.ts` + `method-keys.ts`）。
3. **特殊接口收归架构。** 抖音 passport（1,593 行）与 B站扫码登录统一到
   同一个会话抽象，轮询提供回调 / AsyncIterable / 手动单步三种消费方式，
   类型签名严格到「回调返回错字段编译期报错」。
4. **迁移成本可控。** v6 的 4 种调用形态全部保留，成功分支代码零改动。

## 非目标

- **不做跨平台语义视图。** `Work` / `User` / `Comment` 的统一模型列为 Phase 2，
  v7 的 payload 默认仍是平台原始结构。理由见「已定决策 ③」。
- **不重写签名算法。** `a_bogus` / `wbi` / `x-s` / 快手 hxfalcon 的实现原样搬迁，
  只搬位置、不改逻辑。它们已有逐字节快照测试保护。
- **不追求覆盖率数字。** 测试的作用是行为基线，不是指标。
- **不改 HTTP 服务的路由命名风格。** `/fetch_one_work` 这类 snake_case 路径
  保持不变（改路径是纯粹的破坏性变更，收益只有观感）。

## 已定决策

### ① 信封：保留 `success` / `data` / `message`，重做 `error`，删掉顶层 `code`

```ts
type AmagiResult<T> =
  | { success: true;  data: T;           message: string; meta: AmagiMeta }
  | { success: false; error: AmagiError; message: string; meta: AmagiMeta }
```

v6 的成功分支代码零改动。平台业务码移入 `error.platform.code`，
不再与 HTTP 状态码混用一个字段。详见 [01](./01-response-envelope.md)。

### ② 删掉 `typeMode`，始终返回精确类型

v6 的 `typeMode` 默认 `'loose'` → 返回 `any`，导致 26,580 行手写响应类型
（占全仓 61%）**默认根本不生效**。v7 删掉这个开关。

连带删除 `TypeMode` / `ConditionalReturnType` / `ExtractTypeMode` / `TypeControl` /
`BaseRequestOptions.typeMode`，以及 `shared/overload-types.ts` 里 6 个重载类型别名
（每个 2–4 个签名）—— fetcher 方法退化成单一函数签名。

代价与配套措施见 [01 的「响应类型的维护策略」](./01-response-envelope.md)。

### ③ v7 只做信封统一，语义视图列为 Phase 2

「不管是网络错误、内部错误还是成功，都要有标准响应体系」这个诉求指向的是
**信封**，而信封统一是确定性工作。语义视图要为四个平台各设计一套规范模型加
mapper，字段取舍需要逐个拍板（抖音图集与 B站番剧怎么归到同一个 `Work`），
工作量与响应类型同级，且映射一旦定错很难改。

先把架构立住，`view: 'canonical'` 作为 opt-in 增量再上，接口位在
[06](./06-migration.md) 里预留。

---

## 缺陷 → 设计决策映射

`V6-AUDIT.md` 正文 12 组结构性问题：

| # | 问题 | 由什么消除 | 方案 |
| --- | --- | --- | --- |
| 1 | 36 处循环依赖 | `contracts/` 零依赖叶子 + 单向依赖 + CI 环检查 | A / B / C |
| 2 | 加一接口动 11–15 文件 | 声明式端点注册表，一份声明派生全部 | **仅 A** |
| 3.1 | B站 comments 字段被 zod strip | 参数类型从 schema `infer`，不再手写第二遍 | A / B / C |
| 3.2 | 抖音 5 端点撞同一路由 | 路由唯一性在启动期校验（A 是编译期） | A / B / C |
| 3.3 | 导出的 API 规范与真实服务不符 | 删掉 `api-spec.ts`，路由由 registry 派生 | A（B / C 手动删） |
| 4 | header 大小写导致签名 cookie 恒 undefined | 大小写不敏感的 `Headers` 容器 | A / B / C |
| 5 | 三套并存的错误模型 | 统一信封 + 一张 `judge` 表 | A / B / C |
| 6 | 零测试、CI 只跑 build | 已完成（816 用例）+ CI 加 typecheck/lint/test | 已做 |
| 7 | 61% 代码是默认不生效的响应类型 | 删 `typeMode`（决策 ②） | A / B / C |
| 8 | 四平台四套写法 | 统一 adapter 契约 | A / B |
| 9 | ~700 行死代码与无用公开面 | 直接删（迁移文档列清单） | A / B / C |
| 10 | 事件总线是全局单例、无关联 id | 实例级 bus + `meta.requestId` 贯穿 | A / B / C |
| 11 | 流程摩擦（pre-commit / AGENTS.md / docs 漂移） | 独立的工程化 PR，不属架构 | 另办 |
| 12 | HTTP 服务无鉴权且绑全网卡 | 默认 `127.0.0.1` + opt-in token 中间件 | A / B / C |

附录 A 的 17 组实测缺陷：

| # | 问题 | 由什么消除 |
| --- | --- | --- |
| A1 | `Result.error` 三种形状 | 统一信封，`error` 只有一种形状且非空 |
| A2 | B站空负载判定自相矛盾 | `judge` 是唯一判定点，getdata/internal 双判定消失 |
| A3 | B站平台 `message` 丢失 | `error.platform.message` 保留原文 |
| A4 | `-412` 重试与网络重试叠乘 | 重试策略集中在 transport，端点只声明 `retryOn` |
| A5 | `wbi.ts` 绕过 `fetchData` 直连 axios | 全仓只有 transport 能发请求（架构约束 + 测试） |
| A6 | `getComments` 硬编码三个参数 | `build` 从校验后的 params 取值，无硬编码 |
| A7 | `bv2av` 返回 `'av170001'` 字符串 | 纯计算端点的返回类型显式声明为 `number` |
| A8 | 小红书 a1 正则无锚点 | cookie 解析收敛到 `contracts/cookie.ts` 一处实现 |
| A9 | 小红书失败归一化撞 500 码 | `ErrorKind` 与平台码分离，不再复用数字 |
| A10 | 快手签名的模块级可变状态 | 签名状态随 client 实例，不再是模块单例 |
| A11 | 快手 `count` 不强转 / `comments` 无翻页 | schema 统一用 `coerce`；分页由 `paginate` 声明 |
| A12 | 抖音 AB / XB 对入参形状有隐式假设 | 签名器声明前置条件，`build` 保证满足 |
| A13 | 抖音默认配置的 Edg 剥离被展开顺序抵消 | header 合并收敛到一处，剥离在 transport 出口做 |
| A14 | `fetchData` 就地改写调用方 headers | transport 深拷贝请求描述 |
| A15 | 小红书默认配置签名与另三家不一致 | 四平台共用同一 `defaultConfig` 契约 |
| A16 | 校验文案中英混杂 | 文案集中到一份 message catalog |
| A17 | 其他小项（`error: never`、空串放行、`getSearchId` 拼接 bug 等） | 逐条修，见各方案的迁移清单 |

61 条 `KNOWN-DEFECT` 的逐条归属见 [06-migration.md](./06-migration.md#known-defect-归属)。

---

## 破坏性变更预算

按「用户改动量」分档。目标是让 **A 档为空、B 档可 codemod、C 档有兼容层兜底**。

| 档位 | 含义 | v7 计划 |
| --- | --- | --- |
| A：无声行为变化 | 代码能编译、运行结果变了 | **零容忍**。任何此类变更必须转成编译错误或显式 opt-in |
| B：编译错误但机械可改 | 改名、删字段 | 允许，提供 codemod + 迁移表 |
| C：需要人判断 | 语义变化 | 允许但要少，且必须有兼容层过渡一个大版本 |

已知落点：

- **B 档**：`typeMode` 删除、顶层 `code` 删除、`error` 形状重做、
  `api-spec.ts` / `method-keys.ts` 删除、`registerXxxRoutes` 别名删除。
- **C 档**：`internal.ts` 的 catch-then-throw 删除（v6 里参数校验失败是 `throw`，
  v7 改为返回 `success: false`）。这一条最容易踩，因为 v6 代码里
  `try { await fetch() } catch {}` 的写法在 v7 下不再进 catch。
  → 兼容层 `@ikenxuan/amagi/compat` 保留旧抛出行为一个大版本。
- **A 档**：目前识别为 0。`startServer` 默认绑定地址从 `'::'` 改 `'127.0.0.1'`
  本来属于 A 档，因此改为**启动时打印警告 + 显式 `host` 参数**，v8 再切默认值。

---

## 三个方案的取舍

|  | A：注册表 + 管线 | B：适配器类 | C：渐进式 |
| --- | --- | --- | --- |
| 加一个接口要改 | **1 个文件** | 3–4 个文件 | 11–15 个文件（不变） |
| 循环依赖归零 | 是 | 是 | 是 |
| 统一响应信封 | 是 | 是 | 是 |
| 会话抽象 | 是 | 是 | 是 |
| 删掉 706 行无用公开面 | 自动（registry 派生） | 手动 | 手动 |
| 路由唯一性保证 | 类型层 + 启动期 | 启动期 | 启动期 |
| 新增机械（要自己维护的抽象） | 多（`defineEndpoint` + 执行器 + 类型推导） | 少 | 无 |
| 59 个端点的搬迁量 | 全量重写声明 | 全量搬方法 | 不搬 |
| 单个 PR 可独立发布 | 难 | 中 | **易** |
| 出错时的回退成本 | 高 | 中 | **低** |
| 对贡献者的心智负担 | 需先理解注册表 | 接近 v6 | **无变化** |

选择建议：

- 如果这个库还要长期加平台/加接口 —— **选 A**。第 2 条（加一接口动 11–15 文件）
  是当前最大的维护税，只有 A 能真正消除它，其余两个只是让税变便宜一点。
- 如果希望「先止血、别停更」—— **选 C**，把 A 留给 v8。C 的四个 PR 都能独立发版，
  且不影响正在进行的功能开发。
- B 是折中，但它的问题是「既付了搬迁成本，又没拿到 A 的核心收益」。
  除非明确不喜欢声明式风格，否则不建议单独选 B。

**混搭是可行的**：C 的 ①②④（切环 / 信封 / 会话）与 A 完全兼容，
可以先按 C 走完前三个 PR 稳住地基，再把 ③ 换成 A 的注册表迁移。
这条路径在 [04-option-c-incremental.md](./04-option-c-incremental.md#与方案-a-的衔接) 里单独写了。

---

## 术语

| 术语 | 含义 |
| --- | --- |
| **端点（endpoint）** | 一个可调用的平台接口，如 `douyin.videoWork`。v6 里叫 `methodType` |
| **信封（envelope）** | `AmagiResult<T>`，包裹 data 或 error 的统一外层结构 |
| **判定（judge）** | 把平台原始响应映射为「成功 / 某种 `ErrorKind`」的纯函数 |
| **规范化（normalize）** | 把平台原始响应裁剪/整形为端点声明的返回类型 |
| **会话（session）** | 多步有状态流程，如扫码登录。与单次请求的端点区分开 |
| **凭证（credential）** | 会话成功后产出的登录态，跨平台统一为 `{ cookie, expiresAt?, raw }` |
