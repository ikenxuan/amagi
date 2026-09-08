# Web 控制台工作台 v2 设计

日期：2026-09-08 · 分支：`refactor-v7` · 状态：已与用户确认

## 背景与目标

现有两栏版面合并了响应与类型，但交互动线仍有四个结构性问题：

1. 请求区把「发送」放在参数末尾；用户必须先穿过整张表单才到主动作。
2. 「生成类型」位于请求区，混淆“发请求”与“处理已有样本”两种任务。
3. 样本处理被压成响应底部的一条动作带；长错误会挤占响应阅读空间，也不能单独调高。
4. 请求记录要求贡献者理解英文 `id`，而它同时充当记录主键与产物命名，暴露了内部耦合。

本轮目标是把主循环明确成三步：

> 发送请求 → 检查响应 → 处理样本

每一步有独立、可拖拽的空间；首屏只显示会改变下一步的信息，完整诊断仍可达且可复制。

## 已确认的产品裁决

- 桌面主区默认 **请求 40% / 右侧 60%**。
- 右侧默认 **响应 70% / 样本处理 30%**。
- 两处分隔条都可拖拽，尺寸分别持久化；用户拖过的比例优先于默认值。
- 未发送时也保留样本处理区的 30% 空态，避免首发后版面跳动。
- 参数动作置顶；「生成类型」归入响应区。
- 共享参数时贡献者只填写必填的中文说明，不再填写英文 ID。
- 请求记录的机器主键与产物命名解耦；同参数按哈希幂等更新。
- 不能保存时只常驻摘要；完整脱敏残留按原因分组、逐行滚动展示。

## 版面骨架

桌面 `columns` 档：

```text
┌──────────── 请求 40% ────────────┬────────────── 右侧 60% ──────────────┐
│ [发送] [重置] [连录 N 种组合]      │ 响应 70%                             │
│ ─────────────────────────────── │ [响应][声明][结构][diff] 收据 [生成类型][仓库] │
│ 用哪组参数                        │ JSON / 声明 / 结构 / diff              │
│ 参数网格                          ├───────────────────────────────────────┤
│ …                                │ 样本处理 30%                          │
│ 集合 / 源码 / 本地样本数           │ 判定摘要、保存、共享参数、诊断详情       │
└──────────────────────────────────┴───────────────────────────────────────┘
              ↕ 两侧宽度可拖                         ↕ 右侧高度可拖
```

`rows` 档（64–80rem）：请求区在上，右侧在下；外层拖高度。右侧内部仍按响应/样本处理上下分区并可拖。`stack` 档不锁页面高度，三块按请求 → 响应 → 样本处理顺序自然流动，不加载可拖拽 chunk。

### 尺寸与持久化

`SplitPane` 增加可选的布局提示，而不是在 `SplitLayout` 里按数组下标猜语义：

```ts
interface SplitPane {
  id: string
  node: ReactNode
  defaultSize?: string | number
  minSize?: string | number
}
```

- 外层主区：request `defaultSize=40`，result-stack `defaultSize=60`。
- 右侧嵌套组：response `defaultSize=70`，sample-actions `defaultSize=30`。
- 横向最小宽度：请求 22rem、右侧 28rem；纵向最小高度：响应 12rem、样本处理 9rem。
- localStorage 分开记 `amagi-panes-horizontal` 与 `amagi-result-stack-vertical`，避免两组尺寸互相覆盖。
- `StaticPanes` fallback 与可拖版默认比例逐字一致，懒加载落地时不跳。

## 请求区：动作先于参数

请求区只回答“用什么参数发送”。顺序固定为：

1. 标题与集合入口。
2. 主动作行：`发送`、`重置`；存在多种组合时再显示 `连录 N 种组合`。
3. cookie / 本地计算等会改变发送结果的状态。
4. 已记录参数组选择器。
5. 自适应参数网格。
6. 批量进度、源码路径与辅助信息。

`ParamForm` 不再拥有底部 sticky 动作行。它提供一个稳定的 form id；请求区顶部按钮通过 HTML `form` 属性提交/重置这张表单。这样动作在视觉上置顶，同时仍使用同一张原生表单、同一套 React Aria 校验与 `FormData`，不复制状态、不手动触发表单逻辑。

「连录」仍是端点级动作，但跟发送同属“发请求”，因此留在请求区顶部。执行中跨动作互斥规则不变。

## 响应区：查看与生成

响应区继续保留四个 tab：响应、声明、结构、diff。标题行右侧顺序：

```text
HTTP 收据   [生成类型] [仓库]
```

- 「生成类型」从 `RequestPane` 移入 `ResultPane`，因为它消费已入库样本并写类型产物，不消费当前表单值。
- 没有本地样本时禁用，并通过 tooltip 说明原因。
- 本地计算端点不显示该按钮；行为与当前规则一致。
- 生成完成后继续刷新 generated revision；数据流不变，只移动归属与 props。
- 响应区不再渲染 `ResultActions`，其高度完全用于查看响应与类型。

## 样本处理区

新增独立 `SamplePane`（名称可在实现中沿用 `ResultActions` 内部组件，但对外是一块完整 `Surface`）。它只回答：

> 这份响应能否保存？如果能，样本和可重放参数分别怎么处理？

### 无结果

保留空态：`发送请求后，在这里决定是否保存样本。` 不出现禁用按钮。

### 可保存

顶部显示短判定与证据 Chip；主体显示两条互斥、可理解的路径：

- `只保存样本`：仅落本机 corpus。
- `保存并共享参数`：展开后只填写必填的「参数说明」，参数写入进 git 的请求集合，供其他贡献者重放。

另保留 `丢掉`、复制当前 JSON、复制 diff。复制跟随响应区的原始/样本视图；视图状态由父层持有并传给两块面板。

共享表单不再显示英文 ID、目录名或类型名。提交后：

- 新参数哈希：提示“已新增可重放参数”。
- 已有参数哈希：更新说明、判定、时间和最新样本引用，提示“已更新已有参数记录”。
- 凭证命中或集合文件损坏：样本已写时明确说明；请求记录保持原子写入，待定项留着供修正后重试。

### 不可保存

常驻摘要最多四行：

```text
不能保存样本
平台响应正常 · status_code=0
脱敏检查发现 15 处残留；修复规则后重新发送。
首项：raw.aweme_detail.article_info.article_content
[查看全部 15 处] [复制详情]
```

内部判定词 `store` 不直接展示。业务判定与落盘安全检查分开表达，避免把 `status_code=0` 看成失败原因。

展开详情在面板自己的滚动区中按 `kind` 分组：`id / name / url / token / phone / timestamp / redact`。每个路径一行；“补规则后重新发送”只说一次，不重复拼到每条路径后。`复制详情`复制完整、未截断的路径与原因，但永不包含原始敏感值。

破坏性类型变更继续常驻，因为它直接影响“是否保存”；长清单使用同样的摘要 + 详情模式。

## 请求集合 v2：记录身份与产物命名解耦

### 新模型

```ts
interface RequestEntryV2 {
  paramsHash: string
  label: string
  params: Record<string, JsonValue>
  recordedAt: string
  verdict: RequestVerdict
  sampleHash?: string
  shapeKey?: string
  note?: string
}
```

不变量：

```ts
entry.paramsHash === hashParams(entry.params)
```

身份分工：

- `attemptId` / `pendingId`：一次暂存请求，随机且短期存在。
- `paramsHash`：请求记录主键；成功和被拒记录都有。
- `sampleHash`：本地样本引用；被拒记录没有。
- `shapeKey`：响应形状指纹；无样本时没有。
- `label`：唯一面向贡献者的名称，可修改、可重复。
- 产物名称：继续由端点、响应判别值和 `_V<n>` 规则决定，不从请求记录标签或哈希派生。

### API

`POST /api/store` 不再靠“有没有 id”猜动作：

```ts
{ pendingId, mode: 'sample-only' }
{ pendingId, mode: 'sample-and-params', label }
```

server 从待定样本的真实参数计算/读取 `paramsHash`。`sample-and-params` 按 `paramsHash` upsert。

`POST /api/requests` v2 的 upsert/remove 使用 `paramsHash`；列表仍返回完整条目。被拒请求没有 pending sample 时，使用请求参数直接计算相同的主键，因此 v2 不依赖 `sampleHash`。

响应字段中现有 `requestsReplaced` 可保留兼容，但界面文案改成“同参数记录已更新”，不再说“同 id”。

### v1 兼容与迁移

- 解析器同时接受 version 1 和 2。
- 读取 v1 时对每条 `params` 计算 `paramsHash`；旧 `id` 只作为迁移诊断信息，不进入运行时 v2 模型。
- 若两条 v1 记录得到相同哈希：拒绝静默覆盖，报告冲突并要求人工选择保留的 label/note/verdict。
- 任一次成功写操作都以 version 2 原子重写整个文件；无写操作时不主动刷仓库 diff。
- v2 校验器重算哈希并拒绝不一致，不能信任客户端提交的机器身份。
- README 和文件 `$comment` 改成解释 paramsHash、公开真值与凭证禁入。

## 结构化脱敏诊断

`typegen` 内部已保留结构化 leak；Web 契约不应过早压成字符串。兼容窗口采用：

```ts
interface ScrubFinding {
  path: string
  kind: 'id' | 'name' | 'url' | 'token' | 'phone' | 'timestamp' | 'redact'
  reason: string
}

scrub?: {
  replacements: number
  suspects: string[]
  leaks: string[]             // 旧字段，兼容旧浏览器
  leakItems?: ScrubFinding[]  // 新字段，新前端优先
}
```

新 server 暂时同时返回两份；新前端遇到旧 server 时把旧字符串逐行展示，不尝试解析文案。摘要的 count、首项和分组均从 `leakItems` 派生，不在契约中重复存四份真相。后续兼容窗口结束再删除 `leaks`。

同时增加后端不变量测试：`ok=true` 必有 `pendingId`；`ok=false` 不得有 `pendingId`。长期可进一步把 `RecordOutcome` 改为 `ready | blocked` 判别联合，本轮不扩大范围。

## 组件与数据流

- `App.tsx`：组装 request + result-stack；持有当前响应视图；把 generate props 送到响应区。
- `PaneShell.tsx` / `SplitLayout.tsx`：支持 pane 的显式默认尺寸；右侧嵌套垂直分组。
- `RequestPane.tsx`：顶部动作行；移除 generate。
- `ParamForm.tsx`：只渲字段并接收 form id；移除底部动作行。
- `ResultPane.tsx`：只负责查看结果与生成；移出样本动作。
- `SamplePane.tsx`：新建，承载保存、丢弃、共享参数和诊断详情。
- `Result.tsx`：删除英文 ID 校验与输入；保留/抽取共享参数说明表单。
- `ResultActions.tsx`：拆解后删除，或退化为 `SamplePane` 内的纯动作组件，不再作为响应 footer。
- `shared/contract.ts`、`server/outcome.ts`：增加结构化 leak 兼容字段。
- `typegen/requests.ts`、`server/storage.ts`、`server/index.ts`、`lib/api.ts`：请求集合 v2 与显式 store mode。

## 错误处理

- 样本写入与请求集合写入仍保持“样本先写、集合后写”；集合失败不伪装成样本失败。
- 凭证检查仍在 server/typegen 最终写盘边界，前端提示不是安全边界。
- 盘上集合无法解析时拒绝覆盖，给出路径和修法；详情不吞掉。
- v1 哈希冲突属于迁移冲突，返回 409，不自动选择胜者。
- store mode、label、paramsHash 不合法属于 400。
- 所有长错误均在面板内摘要；全局红色 Alert 仅用于请求本身失败等跨面板错误。

## 测试与验收

### 布局

- 静态 fallback 与可拖版均为 request/result 40:60。
- 右侧 response/sample 70:30；两条 separator 具有正确方向、ARIA 与 localStorage key。
- 未发送与发送后 DOM 骨架相同，不发生整块尺寸跳变。
- rows/stack 三档顺序和滚动契约正确。

### 交互

- 发送/重置按钮在第一参数字段之前，且通过原生 form 关联真正提交/重置。
- generate 只出现在响应标题，不出现在请求区；禁用和 pending 状态不变。
- 样本处理区两条保存路径、丢弃与复制动作可达。
- 切换原始/样本后，复制使用当前视图。

### 数据模型

- 相同 params 的键序不同仍得到同一哈希；不同 params 得到不同哈希。
- v2 upsert 按哈希替换，label 可重复。
- v2 文件中哈希不匹配时拒收。
- v1 正常迁移；v1 哈希冲突返回明确冲突且文件不改。
- 成功与拒绝记录都能获得 paramsHash；拒绝记录不要求 sampleHash。
- 生成类型输出在迁移前后逐字相同，证明产物命名未依赖请求记录 ID。

### 诊断

- 复现 `status_code=0 + scrub leaks`：显示“平台响应正常”，最终不可保存且无 pendingId。
- 常驻区不包含完整 15 条长句；显示准确计数与首项。
- 详情逐行完整、分组计数之和等于总数、复制内容无截断。
- 旧 server 的 `string[]` 回包仍可读，不出现 `[object Object]`。
- 原始敏感值不出现在摘要、详情、toast 或复制文本中。

### 门禁

完成后运行仓库八道门禁：`pnpm typecheck`、`pnpm test`、`pnpm test:types`、`pnpm lint`、`pnpm deps:check`、`pnpm types:size`、`pnpm openapi:check`、`pnpm types:check`，另跑 web build 验证 Tailwind 任意值与嵌套布局 CSS 确实产出。

## 明确不做

- 不用 AI 或拼音从中文说明生成英文类型名。
- 不把参数真值、凭证或原始泄漏值放进诊断。
- 不让 label 成为唯一键；它可改、可重复。
- 不自动解决 v1 中同参数多记录的语义冲突。
- 不在本轮把整个 `RecordOutcome` 重做为判别联合。
- 不改变样本仍只留本地、请求集合与类型产物进 git 的总原则。
