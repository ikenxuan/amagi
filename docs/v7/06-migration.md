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

事件发射器的负载新增 `meta` 字段（加字段，不算破坏性）；
`emitHttpRequest` / `emitHttpResponse` 从「声明了但从不调用」变成真实发出。

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
| 2, 3 | 失败分支不声明 `data`、成功分支不声明 `error`；`AmagiError` 非空 |
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
