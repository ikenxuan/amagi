# 方案 C：渐进式改造

> 最低风险方案。不动架构形态，四个手术式 PR，每个都能独立发版。
> 代价是「加一个接口动 11–15 个文件」的根因不消除。

## 核心思路

v6 的 12 组问题里，只有第 2 条（加一接口动 11–15 文件）需要重构架构，
其余 11 条都能在**不改目录结构**的前提下修掉。方案 C 就是先把那 11 条修完，
把第 2 条留给 v8。

好处很实际：期间可以继续正常发功能版本，不需要一个长期的 feature 分支。

---

## PR ①：切环 + 契约下沉

**不改任何行为**，纯粹搬位置。

1. 新建 `src/contracts/`，把这些搬进去：
   - `RequestConfig`（从 `server/index.ts` —— 34 个文件值导入它，
     而那个模块里 `new Chalk()` 并建 Express app）
   - `Result` / `SuccessResult` / `ErrorResult`（从 `validation/index.ts`）
   - `ErrorDetail` / 各平台错误码（从 `types/NetworksConfigType.ts`）
   - `Platform` 类型
2. `fetchData` / `fetchResponse` / `getHeadersAndData` 从 `model/networks.ts`
   搬到 `src/transport/`，同时**合并那 50 行逐字重复的代码**。
3. `platform/*/getdata.ts` 改为从 `transport` 直接导入，
   不再走 `amagi/model` barrel —— 这一步切断 model ⟷ platform 的运行时环。
4. 全部跨层导入改成 `import type`（34 处 `RequestConfig` 首当其冲）。
5. `wbi.ts` 改为走 transport，不再直连 axios（A5）。
6. CI 加 `dpdm --exit-code circular:1`。

**验收**：`dpdm` 报 0 环；816 个用例全绿（一个都不该变）。

**发版**：6.7.0，无破坏性变更。

---

## PR ②：统一响应信封

按 [01-response-envelope.md](./01-response-envelope.md) 落地，
这是 C 里唯一有破坏性变更的一步。

1. `contracts/` 里加 `AmagiResult` / `AmagiError` / `ErrorKind` / `AmagiMeta`。
2. 每个平台加一份 `judge.ts`，把 4 个 `internal.ts` 与 4 个 `GlobalGetData`
   里的判定逻辑收敛进去。
3. 4 个 `internal.ts` 合并成一个泛型实现（它们今天是逐字复制 ×4）：

   ```ts
   // model/fetchers/shared/internal.ts
   export const runEndpoint = async <T>(opts: {
     platform: Platform
     methodType: string
     validate: () => ValidateOutcome
     fetch: (params: unknown) => Promise<unknown>
     judge: Judge
   }): Promise<AmagiResult<T>> => { /* 唯一的 try/catch，唯一的信封出口 */ }
   ```
4. 删掉 catch-then-throw；参数校验失败改为返回 `kind: 'validation'`。
5. `middleware/validation.ts` 与 4 个 `routes.ts` 改用 `ErrorKind → HTTP status` 表。
6. 事件负载加 `meta`；补发 `http:request` / `http:response`。
7. 事件总线改为实例级（保留一个全局默认实例给静态 fetcher）。
8. header 容器改为大小写不敏感，修 A13 / A14 / #17 / #19 / #20 / #21。

**验收**：61 条 `KNOWN-DEFECT` 里与错误模型相关的
（#1 #2 #3 #4 #5 #6 #7 #8 #9 #10 #11 #13 #15 #16 #49）全部改写或删除；
其余用例只有 `error` 读法需要跟着改。

**发版**：7.0.0-beta，附 [迁移文档](./06-migration.md)。

---

## PR ③：删死码 + 修剩余缺陷

1. **删除**（对应「不兼容能剔除就剔除」）：
   - `types/api-spec.ts`（393 行，内部零引用，路由表与真实服务不符）
   - `types/method-keys.ts`（313 行，内部零引用，设计前提已失效）
   - `platform/bilibili/sign/CorrespondPath.ts`、`dm_img.ts`
   - `types/ReturnDataType/Kuaishou/WorkComments.ts`（与同名目录撞车）
   - `typeMode` 及其全部配套（`ConditionalReturnType` / `TypeControl` /
     `overload-types.ts` 的 6 个别名）
   - `registerXxxRoutes` 别名
2. **修**：
   - 抖音 5 个 methodType 撞路由 → 拆成 5 条独立路径 + 启动期唯一性校验
   - B站 comments 的 schema 补齐 `mode` / `pagination_str` / `plat` /
     `seek_rpid` / `web_location`，并把 `API.ts` 里的硬编码改成读参数
   - 快手 `count` 改 `coerce`；`comments` 补分页参数
   - 小红书 `extractA1FromCookie` 正则加锚点
   - 四份 UA 基线合并为一处，版本号集中维护
   - 校验文案统一为中文（或统一英文，二选一）
   - 签名模块的模块级可变状态改为随 client 实例
3. 响应类型加索引签名（`extends PlatformPayload`），
   让删 `typeMode` 后读未声明字段返回 `unknown` 而非编译错误。

**验收**：61 条 `KNOWN-DEFECT` 归零或明确保留（保留的要写理由）。

**发版**：7.0.0。

---

## PR ④：会话抽象

按 [05-session-and-polling.md](./05-session-and-polling.md) 落地。

1. `src/sessions/` 下建 `LoginSession` 引擎（回调 / AsyncIterable / 手动单步）。
2. 抖音 passport 的 1,593 行协议实现原样保留在
   `platform/douyin/passport/`，只在外面套一层 `DouyinQrcodeStrategy`。
3. B站扫码登录从 `qrcodeStatus` 端点里抽出来，做一个 `BilibiliQrcodeStrategy`
   —— 顺带删掉「把 `headers` 塞进 `data` 让调用方自己抠 `Set-Cookie`」的做法。
4. 保留 v6 的 4 个 passport 方法与 3 个 B站方法作为低阶 API（deprecated 但可用）。

**验收**：新增会话用例；v6 的 7 个登录方法用例继续通过。

**发版**：7.1.0（新增能力，不破坏）。

---

## 与方案 A 的衔接

**PR ① ② ④ 与方案 A 完全兼容** —— 它们做的是 A 里 `contracts/` /
`transport/` / 信封 / `sessions/` 这几块，位置和形状都一样。

所以有一条混搭路径：

```
PR ①  切环 + 契约下沉        ─┐
PR ②  统一响应信封            ├─ 与 A 共用，先做掉，稳住地基
PR ④  会话抽象               ─┘
                                ↓
PR ③' 用 A 的注册表替代 PR ③   ← 在这里分岔
```

即：先按 C 走完 ①②④（三次可独立发版、风险可控），
再把 ③ 从「手动删死码」换成「用 registry 重新组织 59 个端点」。

这条路径的好处：

- 前三个 PR 每个都能独立发版，不需要长期 feature 分支。
- 走到 ③' 时，`contracts` / `transport` / 信封 / 会话都已就位并有测试保护，
  registry 迁移只需专注端点本身。
- 如果 ③' 中途发现注册表不合适，可以退回手动删死码的 ③，前面的投入不浪费。

**建议采用这条混搭路径**，理由见 [README 的方案取舍](./README.md#三个方案的取舍)。

---

## 代价

| 项 | 说明 |
| --- | --- |
| **第 2 条问题不消除** | 加一个接口仍要动 11–15 个文件。如果 v7 之后还要持续加平台/接口，这笔维护税会一直付 |
| **四套写法仍存在** | 四个平台的 `API.ts` 形态（class / class+factory / 对象字面量）与 `getdata.ts` 密度差（27 case/610 行 vs 6 case/1057 行）不变 |
| **快手 650 行归一化逻辑仍在 getdata.ts 里** | 「响应变换」这个关注点仍然没有归属，只能继续在那个文件里长 |
| **PR ③ 是纯手工活** | 61 条缺陷逐个修，没有结构性保证「以后不再犯同类错误」。而 A 是靠结构消除（如路由冲突启动即失败） |
