# B站动态详情：判别联合接入（需求 + TODO）

> 生成于 2026-09-11。任务源：本文件。做完了这份文件就该删掉或归档。

## 目标

`bilibili/dynamicDetail` 目前是**三个形状序号**（`DynamicDetail_V0/V1/V2`）的无判别式联合：
三份样本各自对应 `DYNAMIC_TYPE_FORWARD` / `DYNAMIC_TYPE_AV` / `DYNAMIC_TYPE_DRAW`，
但判别值只躺在响应体里，没被生成器用上。结果是下游拿到的 `type` 是 `string`，
`major` 是 `Major | Major | null`，`orig` 直接是 `any` —— 想按动态类型分支就得自己写判断。

要做的是：让这个端点走**判别联合**（生成器里叫「判别式布局」，`emitDiscriminatedUnion`），
判别路径为 `data.item.type`，并为将来可能出现的新动态类型留一个**宽松兜底支**。

## 已拍板的决策（2026-09-11，用户确认）

| 决策                               | 选定               | 含义                                                                                 |
| ---------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| 索引签名 `[property: string]: any` | **保留**           | 平台加字段不算 breaking，读未声明字段不报错（现状即如此，零改动）                    |
| 未知动态类型                       | **给兜底支**       | 跟不上 B站更新速度也不能让下游编译红                                                 |
| 兜底支的判别字段写法               | **`type?: never`** | 唯一能同时满足「宽松」与「裸 `if`/`switch` 能收窄」的写法（实测）                    |
| 类型守卫                           | **不要求**         | 下游用裸 `if` / `switch` + 枚举。生成器顺带产的 `guards.ts` 保留但不作为使用方式推荐 |

实测依据（`type?: never` 为什么是这个写法，换成 `type: string` 会怎样）见本次会话的探针结论，
落成测试的地方在 `packages/core/test/types/`（见 TODO D2）。

## 范围

**做**：

1. corpus 侧：三份样本并回同一形状槽；新建 `.doc.json` 钉判别路径
2. 生成器：**开放联合**（产兜底支）
3. 文档 / 测试口径跟上，门禁全绿

**本次没做**：

- **转发支内层判别**（`orig` 按 `orig.type` 再分）：只有 1 份转发样本，做出来没有东西可验证 ——
  详见下面 TODO 的 C 段。补样本之后再做。这也意味着 `report.ts` 里「次级判别式子目录」那条
  NOT_IMPLEMENTED **仍然成立**，别提前勾掉。
- **自引用折叠**（`orig` 递归引用回自身，而不是逐层展开）：`render.ts:318-337` 已经论证过，
  判据有两条路且**都需要真样本才能选**（严格占位符相等在真转发动态上不命中；
  放宽成「深层可少掉浅层的可选键」正是 PRD 1.3 栽过的坑）。这条要单独拍板。
- 另外三个动态类型（`DYNAMIC_TYPE_WORD` / `LIVE_RCMD` / `ARTICLE`）的样本：需要人来录，
  不是代码问题。没录的部分走**兜底支**，下游不会因此编译红。

## TODO

### A. corpus（数据）

- [x] A1 三份样本的 `metadata.shapeIndex` 并回 0
      （`b3ed2ce2d6a6` 转发 / `f58b19d9254d` 视频 / `c33b45e4cd2c` 图文）
- [x] A2 新建 `corpus/bilibili/dynamicDetail.doc.json`：`discriminantPath: "data.item.type"`，
      `declaredValues` 只列已录到的三个取值（列了没录到的会刷"声明了却从未出现"的漂移告警）
- [x] A3 确认 `plan.ts` 只把 shapeIndex 0 的样本喂给判别发现（`plan.ts:154-163`），
      序号不并回 0 的话三份样本进不了同一个联合

### B. 生成器：开放联合（兜底支）

- [x] B1 `render.ts`：渲染选项新增 `neverOptionalPaths`（`options.ts` 里定义并写明取舍）
- [x] B2 `emit.ts`：`emitFallback` —— 形状从合并树剪到判别容器；信封的原始类型字段留着，
      容器内部只留判别字段，渲染成 `?: never`
- [x] B3 兜底成员进 `XxxUnion`（`DynamicDetailUnknown`）；不为它产 `is*` 守卫；
      可用 `openUnion: false` 关掉
- [x] B4 测试：`packages/typegen/test/discriminant.test.ts` 的「兜底支（开放联合）」5 条

### C. 生成器：转发支内层判别 —— **本次没做，见下**

- [ ] C1 判别成员内部若还存在可用判别式（`orig.type`），把该子树按内层取值再分
- [ ] C2 内层取值的类型名带上取值（`OrigAv` 而不是 `Orig` / `Orig2`）
- [ ] C3 `EmittedMember.nested` 的检出结果要用上

**为什么没做**：只有 **1 份**转发样本（转发→视频）。内层判别至少要两份**不同内层形态**的转发样本
才能分出第二支 —— 现在做出来是「只有一个成员的内层联合」，产物与现状逐字相同，**没有任何东西可验证**。
补样本之后再做，收益立刻可见（`orig.type` 变成字面量联合，转发套娃内部能继续 `if`）。
这是**数据缺口**，不是代码缺口。

### D. 文档与测试口径

- [x] D1 `core/test/types/discriminant-narrowing.test-d.ts`：结论改准 ——
      信封不收窄是事实，但 `data.item` **会**收窄；并补了一条断言钉住后者
- [x] D2 新增 `core/test/types/dynamic-detail-union.test-d.ts`：六条，锁住
      「判别字段是字面量」「裸 if / switch 精确」「兜底支让 else/default 分支可读」
      「兜底支是 `?: never`」—— 把兜底支改成 `type: string` 会红一片
- [x] D3 生成文件头那句「判别式不在成员顶层，`if` 判断不收窄，请用 guards」改成准确说法
      （成员文件头 / `guards.ts` 的联合与守卫注释、`renderGuard` 的函数注释三处）
- [x] D4 `report.ts` 的 `NOT_IMPLEMENTED`：**保持原样** —— C 没做，那条就还不成立

### E. 接入与验收

- [x] E1 `pnpm gen:types` → `pnpm --filter @ikenxuan/amagi-response-types build`
- [x] E2 确认 `packages/core` **一行都不用改**（`response:` 那行仍是
      `type<BilibiliDynamicDetailResponse>()`，公开导出名三个都没变）
- [x] E3 产物检查：`DynamicDetail/DYNAMIC_TYPE_{AV,DRAW,FORWARD}/…` + `Unknown.ts` + `guards.ts`
- [x] E4 门禁：`typecheck` / `test` / `test:types` / `lint` / `deps:check` / `openapi:check` /
      `types:check` 全绿（本仓没有 `types:size` 这条脚本）

## 验收标准

下游这段代码能编译且类型精确：

```ts
const item = resp.data.item
if (item.type === DynamicType.AV) item.modules.module_dynamic.major.archive // 精确到视频支
if (item.type === DynamicType.FORWARD) item.orig // 仍是 any 也无妨
item.未来某天新加的字段 // 不报错
```

## 遗留（可选，不在本次范围）

- **控制台交互**：这个端点在控制台里仍然挂着通用的「合并进现有类型 / 单独建新形状（`_V<n>`）」开关。
  默认是「合并」（对的），但点「单独建新形状」会产出 `DynamicDetail_V1.ts` 旁支、把该取值挤出
  判别联合（实测过）。规矩已写进 `contributing.mdx`；要不要在界面上加提示/默认值，是后续的取舍。
- **转发的内层判别** 与 **自引用折叠**：见上面 C 段与「本次没做」。

## 本次顺带发现（不在上面范围内）

- **`douyin/UserProfile` 的产物与本地样本漂移**：重跑 `gen:types` 时它跟着变了
  （`UserProfile_V1.ts` 不再产、`UserProfile_V0.ts` 里一批字段从必需变可选，2 份样本合成一个类型）。
  这是**本地 corpus 的既有漂移**，不是这次改动引起的 —— 本仓的规矩是重跑生成并提交那份漂移。
  提交时要么单独一个 commit，要么在提交信息里说清。
- `douyin/search` 本地有一份录坏的样本（chunked 传输体被截断，解不成 JSON），
  `types:check` 会点名要求重录。
- 本仓没有 `types:size` 这条脚本（旧笔记里有，已过期）。
