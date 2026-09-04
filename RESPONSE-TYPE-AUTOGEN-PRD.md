# 响应类型自动化：从「贴进在线工具」到「corpus 派生」

目标：新增或改动接口后，不再手动发请求、不再把 JSON 贴进第三方在线转换站点、
不再靠人肉发现「同一接口不同参数返回不同结构」这种变体。

> 本文档未提交，等 review。与 `KUAISHOU-H5-MIGRATION-PRD.md` 是两份独立文档，互不追加。

---

## 结论先讲

**瓶颈不是缺一个 JSON→TS 转换器，是 amagi 从来不留 JSON。**

现在这 26,535 行响应类型是「抓一次响应 → 贴进在线工具 → 把结果拷回仓库 → **把 JSON 扔掉**」
的产物。证据没留下，所以：改一个字段要重新抓一遍；想知道某个字段为什么是可选的，
没人答得上来；发现新变体全靠碰巧遇到。转换这一步本来就只占十分钟，
真正贵的是「重新取得证据」和「确认没漏变体」。

所以方案的核心不是找个更好的转换器，是**把响应样本变成仓库里的一等资产**（corpus），
让类型成为 corpus 的纯函数。这样：

- 生成是确定的、离线的、CI 可跑的——和现在的 `openapi.json` 完全同一个契约
- 变体不再靠人发现，而是「corpus 里出现过几种形状」这个可数的事实
- 平台加字段时，diff 落在 corpus 上，是**可 review 的证据变化**，不是一次盲目的手改

**关于「完全自动，我只提供 cookie」：大部分能做到，但有一处天然做不到。**

不透明 ID 造不出来。`aweme_id` / `bvid` / `photoId` / `note_id` 这些必须从某处来，
程序无法凭空生成合法值。但这件事可以做到「几乎不用管」——先跑入口类端点
（搜索、用户作品列表、推荐流、热榜），从它们的响应里**提取 ID 喂给详情类端点**，
形成一张依赖图。人只需要提供极少数根种子（几个 UID / 几个关键词）。

还有一处更本质的限制：**B站动态的变体不由请求参数决定，由返回内容决定。**
同一个 `host_mid` 同一套参数，返回的动态列表里混着视频、图文、转发、直播推荐……
所以「遍历参数组合」这个思路对它无效，只能靠**大样本 + 判别式发现**。
好消息是这条路反而更彻底：它能告出「哪些变体真实存在」，而现在是「我们碰巧建模了 6 种」。

---

## 一、现状盘点（都是实测数字）

| 项 | 数字 |
|---|---|
| 响应类型文件数 | 150（其中 `index.ts` barrel **78**） |
| 响应类型总行数 | **26,535**（占 `types/` 全目录 27,354 行的 97%） |
| 按平台分 | Bilibili 81 文件 / 10,740 行 · Douyin 42 / 13,875 · Kuaishou 13 / 1,384 · Xiaohongshu 13 / 532 |
| `_V0` 文件 | 62 |
| `_V1` 文件 | **2**（且都不是真变体，见 1.3） |
| 不符合命名约定的文件 | 8（含 Kuaishou 4 个 `#178` 重构漏改的扁平文件） |
| 端点数 / 映射表键数 | 59 / **63**（多的 4 个是抖音 passport 会话方法在借用这张表） |
| 映射表里是 `any` 的键 | 3（`bilibili.loginStatus` / `douyin.loginQrcode` / `xiaohongshu.userNoteList`） |
| 最大单文件 | `Douyin/UserLiveVideos/UserLiveVideos_V0.ts` 2,314 行 |
| 产物 `.d.ts` 体积 | `dist/index-CVdi0rcu.d.ts` **762,734 字节**（745 KB） |
| 仓库里的真实响应样本 | **0** |
| 抓包溯源元数据（时间 / 参数 / 账号态） | **0** |

最后那一行值得单独说：150 个文件里没有一条注释记录「这份类型是什么时候、
用什么参数、什么账号态抓的」。`_V0` 后缀本身也没有任何注释解释它是什么意思。
唯一的时间线索是 v6 文档里曾写过「类型定义时间：2025-02-02」，
而那句话已经随 `typeMode` 一起删掉了。**这就是「证据不留存」最直白的形态。**

`_V<n>` 后缀就是现有的「多变体」机制。62 个 V0、只有 2 个 V1——
而那 2 个都在同一处：B站**转发动态**。

### 1.1 B站动态：一个端点吃掉 20% 的类型代码

```
Bilibili/Dynamic/                                   5,417 行（占全部响应类型的 20%）
├── index.ts                    ← 手写的 MajorType(17) / AdditionalType(10) 两个 enum
├── DYNAMIC_TYPE_ARTICLE/       V0
├── DYNAMIC_TYPE_AV/            V0
├── DYNAMIC_TYPE_DRAW/          V0
├── DYNAMIC_TYPE_LIVE_RCMD/     V0
├── DYNAMIC_TYPE_WORD/          V0
└── DYNAMIC_TYPE_FORWARD/       ← 转发：里面的原动态**又是一个联合**
    └── Forward/
        ├── DYNAMIC_TYPE_AV/        V0, V1
        ├── DYNAMIC_TYPE_DRAW/      V0, V1
        ├── DYNAMIC_TYPE_LIVE_RCMD/ V0
        └── DYNAMIC_TYPE_WORD/      V0
```

三件事值得注意：

1. **判别式字面量已经就是目录名**（`DYNAMIC_TYPE_AV` 等）。也就是说自动生成器的命名规则
   不需要新发明，照抄现有约定即可——这降低了迁移成本，生成前后目录结构可以一致。
2. **它是递归判别联合**：转发动态里嵌一个动态。生成器必须支持自引用，
   不能只做一层平铺。
3. **`index.ts` 里那两个 enum 是人的知识**：`MAJOR_TYPE_NONE` 后面写着「动态失效」、
   `MAJOR_TYPE_UGC_SEASON` 写着「合集更新」——这些中文语义 JSON 里推不出来。
   而且 `MajorType` 声明了 17 个成员、`AdditionalType` 10 个，
   却只有 6 个 `DYNAMIC_TYPE_*` 真的建了模型。**声明的枚举空间远大于已建模的变体**，
   这个缺口现在没人知道有多大——corpus 一上来就能量化它。

### 1.2 仓库里一份真实响应样本都没有

`packages/core/test/` 下 12 个 `.json` / `.snap` 全是**派生产物**的快照
（契约面、API URL 形状、签名输出、config 基线），最大的
`test/validation/__snapshots__/contract.test.ts.snap` 只有 13.9 KB。
没有任何一份「某次真实调用返回了什么」的记录。

作为对比：`D:\GitHub\kuaishou-parser-src-0.4.1` 那个第三方项目有
`test/fixtures/*.json`（video / single_picture / vertical_atlas / horizontal_atlas /
comment / search / danmaku / music_tag_page.html），443 项测试全部离线跑在这些样本上。
它的 `TODO.md` 里能写出「237 条评论里 1 条带 attachments，出现率约 0.4%」这种话，
就是因为样本留着、可以反复数。amagi 现在答不出任何这类问题。

### 1.3 那 2 个 `_V1` 其实不是「变体」，是抓包漂移

这条推翻了我一开始的假设，也是整份 PRD 最有说服力的一条证据。

把 `Forward/DYNAMIC_TYPE_AV` 的 `_V0`（565 行）与 `_V1`（599 行）diff 出来，差异是：

| 字段 | `_V0` | `_V1` |
|---|---|---|
| `editable` | 有 | 没有 |
| `decoration_card`（装扮卡） | 没有 | 有 |
| `topic` | `Topic` | `null` |
| `RichTextNode` | 有 `rid?` | 换成 `jump_url` + `style` |
| `Modal` / `Params` 块 | 有 | 没有 |

**这些全都是「同一个接口、两次抓包，赶上的数据不一样」**，不是参数决定的分支。
换句话说现状的 `_Vn` 机制是「两次抓包结果不一致就再开一个文件」，
它不是有意的多变体建模。

一个基于 corpus 的合并器遇到这两份样本，产出的应该是**一个**类型：
`editable?`、`decoration_card?`、`topic: Topic | null`、`rid?` 与 `jump_url?` 都可选。
现在的做法把「可选字段」误解成了「两个类型」。

所以迁移的净收益不只是省人力：**它会把这类假变体消掉，类型反而变少、变准。**

### 1.4 判别式藏在第三层，而且没有任何测试验证过收窄能工作

B站动态的判别字段是 **`data.item.type`**，不在联合成员的顶层。TS 的判别式联合收窄
只对成员的**直接**属性生效，所以 `BiliDynamicInfoUnion` 这个联合在下游能不能靠
`type` 收窄，是个**未经验证的意图**——`grep DynamicType packages/core/test/`
只命中导出名快照，没有任何 `test-d` 验证过收窄行为。

雪上加霜的是每一层都带 `[property: string]: any`（`DYNAMIC_TYPE_AV_V0.ts` 里有 5 处），
这本身就是收窄失效的经典原因。

但这个索引签名**不能删**：`test/types/response-types.test-d.ts:9-19` 明文用它承诺
「平台加字段不算 breaking，读未声明字段不报错」。所以生成器有一条硬约束——
**必须保留顶层 `[property: string]: any`**，同时得想办法让判别式收窄真的可用
（要么把判别式提到成员顶层，要么提供 `is*` 类型守卫函数）。

这一条要在阶段 0 就验，不然做到最后会发现生成的联合下游根本收窄不了。

---

## 二、为什么现在这么难（四个根因，逐个对应方案）

| # | 根因 | 后果 | 方案里对应 |
|---|---|---|---|
| 1 | 证据不留存 | 每次改动都要重新抓一遍，且无法回归 | 阶段 1 corpus |
| 2 | 变体靠人碰巧发现 | 那 2 个 `_V1` 是遇到了才加的，没遇到的不知道 | 阶段 2 判别式发现 |
| 3 | 生成物与手写语义混在同一个文件 | 一旦自动生成就会覆盖中文注释和 enum | 阶段 2 分文件 + 注释 sidecar |
| 4 | 代码里没有「同一端点多参数」的概念 | 参数矩阵只存在于维护者脑子里 | 阶段 1 参数矩阵声明 |

第 3 条是最容易把 codegen 项目做死的一条：如果生成器会覆盖
`Dynamic/index.ts` 里那两个带中文注释的 enum，那第一次跑完就没人敢再跑第二次。
必须在设计时就把「机器写的」和「人写的」物理分开。

---

## 三、能自动到什么程度（诚实拆解）

| 环节 | 能否自动 | 说明 |
|---|---|---|
| 遍历端点、构造请求、发请求 | **能全自动** | 注册表里已经有 55+ 个端点的 route / params(zod) / build |
| 从 zod schema 推出参数**形状** | **能全自动** | `zod.toJSONSchema()`，`openapi.ts` 已经在用同一招 |
| 枚举/字面量参数的**取值组合** | **能全自动** | `zod.enum` / `zod.literal` 的取值集合可枚举 |
| 可选参数的「带 / 不带」两种情况 | **能全自动** | `.optional()` 可检测，跑两遍即可 |
| 不透明 ID 参数的取值 | **不能凭空生成** | 见下 |
| 由**返回内容**决定的变体 | **不能靠参数枚举** | 见下 |
| JSON → TS 类型 | **能全自动** | 是本方案最简单的一段 |
| 多样本合并成联合 / 判别联合 | **能全自动** | 算法见「五」 |
| 变体的**中文语义命名** | **不能** | 人的知识，走 sidecar 保留 |
| 判断某字段可选是「平台有时不给」还是「这次恰好没有」 | **半自动** | 靠样本量，且要给出置信度 |

### 3.1 不透明 ID：用依赖图把人工降到几个种子

`aweme_id` / `bvid` / `photoId` / `note_id` / `host_mid` 这些程序造不出合法值。
但端点之间有天然的产出关系：

```
人给的根种子（几个 UID、几个关键词）
   ↓
入口端点：search / userVideoList / userDynamicList / hotFeed / slideFeed / recommend
   ↓ 从响应里提取 ID
详情端点：videoInfo / parseWork / videoWork / noteDetail / …
   ↓ 从详情响应里再提取
二级端点：comments（要 aweme_id）→ commentReplies（要 comment_id）
          videoStream（要 bvid + cid）、bangumiStream（要 ep_id）
```

所以「只提供 cookie」这句话可以做到接近字面意思：**cookie + 每平台三五个根种子**。
种子放进一个 `seeds.json`（人可改、可扩），依赖图由生成器从 params 名字推断 + 少量手工声明。

### 3.2 内容驱动的变体：只能靠样本量

B站动态是典型：同一个 `host_mid`、同一套参数，返回列表里混着
`DYNAMIC_TYPE_AV` / `DRAW` / `FORWARD` / `LIVE_RCMD` / `WORD` / `ARTICLE`。
变体来自**数据**而非**请求**，所以参数矩阵对它无能为力。

对策是把它当成采样问题：翻够多的页、覆盖够多的 UP 主，
然后统计「出现过哪些判别式取值、每种出现了多少次」。
产出物除了类型，还应该有一份**覆盖率报告**：

```
bilibili.userDynamicList  样本 1,284 条
  DYNAMIC_TYPE_AV         612 (47.7%)
  DYNAMIC_TYPE_FORWARD    301 (23.4%)
  DYNAMIC_TYPE_DRAW        info…
  DYNAMIC_TYPE_UGC_SEASON   3 (0.2%)   ← 现有类型里没有！
  MajorType 已声明 17 种，实测出现 9 种，未出现 8 种
```

最后那两行是这套方案真正的价值：它让「我们漏了什么」从猜测变成一个数字。

---

## 四、方案骨架：录制与生成两段分离

这是整个设计的承重墙。

```
                  ┌──────────── 有网络、非确定、偶尔手动跑 ────────────┐
   seeds.json ──▶ │ 录制器 record                                      │
   cookie     ──▶ │   遍历端点 × 参数矩阵 → 发请求 → 脱敏 → 落盘        │
                  └────────────────────┬───────────────────────────────┘
                                       ▼
                            corpus/<platform>/<endpoint>/<hash>.json
                                       │
                  ┌──────────── 纯函数、确定、CI 可跑 ─────────────────┐
                  │ 生成器 generate                                     │
                  │   读 corpus → 合并形状 → 发现判别式 → 写 .generated │
                  └────────────────────┬───────────────────────────────┘
                                       ▼
              src/types/ReturnDataType/<Platform>/<Endpoint>/*.generated.ts
```

**类型是 corpus 的函数，不是网络的函数。** 这一条带来四个好处：

1. `pnpm gen:types` 离线可跑、结果确定，能进 CI
2. 平台改了字段 → diff 落在 corpus 上，是可 review 的证据，而不是一次盲改
3. 录制失败（风控、限流、cookie 过期）不会污染类型——corpus 没更新，类型就没变
4. 完全复用仓库已有的产物契约（见下）

### 4.1 直接沿用 `openapi.json` 那套契约

`scripts/gen-openapi.mts` 已经把这套模式跑通了，照抄即可，不要新发明：

- 生成逻辑放 `src/`（可被运行时复用），脚本只负责落盘
- `--check` 模式与已提交产物比对，不一致 `process.exitCode = 1`
- 产物**提交进 git**，CI 跑 `--check`；手改产物没有意义
- 行尾归一（仓库 CRLF 检出、产物按 LF 比对）——这个坑那个脚本已经踩过并注释了

对应新增：`pnpm gen:types` / `pnpm types:check`，挂进根 `package.json`，
与 `openapi` / `openapi:check` 并列。

### 4.2 这条路线仓库里已经写过一半——本文档是它的落地版

`docs/v7/01-response-envelope.md:416-426` 有一节就叫「Phase 2：从样本生成」：

> 手写 26,580 行不可持续。Phase 2 的路线：
> 1. 在 `test/fixtures/<platform>/<endpoint>.json` 存真实响应样本（脱敏）。
> 2. 构建期用 `quicktype` / `json-to-ts` 生成 `.d.ts`，产物纳入版本控制。
> 3. 加一条测试：样本必须能通过生成的类型校验（防止手改类型后与样本脱节）。
> 4. 平台改字段时只需更新样本，类型自动跟随。
>
> 这条路线的前置是 v7 的架构落地（端点声明里有 `response` 槽位可以指向生成的类型），
> 所以不在 v7 范围内，但架构必须为它留位。

`V6-AUDIT.md:436` 也把它列为待办：「**响应类型定方向。** 生成 + 快照，或收敛为 `unknown`。」

**前置条件现在已经满足了**：v7 落地了，`response: type<T>()` 槽位就是当初留的位。
`test/fixtures/` 那个目录至今**不存在**，所以第 1 步一步都没走。

本文档相对那份路线多出来的部分，正是它没细说的四件难事：
参数矩阵与依赖图（3.1）、内容驱动的变体（3.2）、手写语义如何在重新生成中存活（六），
以及它推荐的 `quicktype` 为什么不能直接用（5.4）。

### 4.3 验收网已经存在，不用新建

`packages/core/test/types/response-mapping.test-d.ts`（126 行）已经在逐个端点断言
「端点 `response` 推出的 data 类型 == `XxxReturnTypeMap` 对应条目」，
还在 `:19-23` 登记了 7 个例外及原因。生成类型之后，把断言右侧换成生成产物即可——
它天然就是「生成物与端点声明没有漂移」的哨兵。

同一目录的 `response-types.test-d.ts:9-19` 则是稳定性承诺
（读未声明字段不报错），生成器不能破它，见 1.4。

---

## 五、类型合并算法（核心，要一次设计对）

从 N 份样本合并出一个类型。每条规则都对应一个真实会踩的坑：

| 情况 | 处理 | 为什么 |
|---|---|---|
| 键在全部样本里都有 | 必需 | — |
| 键只在部分样本里有 | `?:` 可选 | — |
| 键存在但值为 `null` | `\| null`，**与可选分开记** | JSON 分不出「缺键」和「键为 null」，必须两个维度各记一份 |
| 同名键在不同样本里是不同原始类型 | 联合 | 真实存在：平台业务码有的接口给 `-412`、有的给 `"12061"` |
| 数组为空 | 从其他样本补元素形状；全空则 `unknown[]` | `[]` 提供不了元素类型 |
| 数组元素形状不一致 | 元素类型取联合（能判别就判别联合） | B站动态列表就是这种 |
| 某字段在所有样本里恒为同一个字面量 | **默认放宽成基础类型**，只在白名单里才收窄 | 单账号采样会让 `userId` 恒等于同一个值，收窄成字面量是错的 |
| 数字看起来像 ID 且超过 `Number.MAX_SAFE_INTEGER` | 标注出来让人决策 | 快手 / B站的 ID 有这个风险 |

### 5.1 判别式发现

找出「取值是有限字面量集合，且不同取值对应的**其余键集合不同**」的字段。
命中就生成判别联合，用现有的目录约定落盘：

```
<Endpoint>/<判别式字面量>/<判别式字面量>_V<n>.ts
```

`_V<n>` 的语义要**重新定义**，因为现状里它的含义和它看起来的含义不一样（见 1.3）。
新语义定为：**同一判别式取值下仍然存在无法合并的形状差异**时才 +1。
所以「V 号」不是版本号，是同判别式下的形状序号——这一句必须写进生成器注释和贡献指南，
否则下一个人一定会理解成 API 版本。

而且按新语义，现存那 2 个 `_V1` **应该在迁移时被合并掉**，不该留下来。

### 5.2 递归

转发动态里嵌动态，生成器要能产出自引用类型而不是无限展开。
判据：某个子树的形状与已生成的某个类型**结构等价**时，引用它而不是重新展开。
这也顺带解决类型体积问题（见「十、风险」里那条）。

### 5.3 两条不能违反的硬约束

1. **必须保留顶层 `[property: string]: any`。**
   `test/types/response-types.test-d.ts:9-19` 用它承诺「平台加字段不算 breaking，
   读未声明字段不报错」。生成器如果输出「干净」的封闭类型，这条承诺立刻破，
   下游一堆读未声明字段的代码会全部变成编译错误。
   代价是索引签名会削弱判别式收窄——这个矛盾要在阶段 0 里解掉，不能两头都想要。

2. **判别式可能在深层嵌套。** B站动态的判别字段在 `data.item.type`（第三层），
   不在联合成员顶层。生成器不能假设判别式一定在根上，
   要能沿路径定位；同时要产出对应的类型守卫，否则下游拿不到收窄能力。

### 5.4 不要直接上 quicktype

`docs/v7/01-response-envelope.md:421` 那份路线建议用 `quicktype` / `json-to-ts`。
仓库里目前没装任何一个（grep 全仓只有那一处提及）。不建议直接用，三个原因都是硬伤：
它不做多样本合并、不认判别式、也不会保留 `[property: string]: any`。
而这三件恰好是这里最关键的。自己写合并器可控得多，工作量也不大——
真正贵的是 corpus 那一半。

---

## 六、手写语义怎么保住（不解决这条，方案就是一次性的）

`Dynamic/index.ts` 里 `MajorType` 17 个成员、`AdditionalType` 10 个成员，
每个都带中文注释。这些是人的知识，生成器推不出来，但又必须活下来。

物理分开：

```
<Endpoint>/
├── index.ts              人写：re-export、语义别名、enum、面向下游的类型名
├── *.generated.ts        机器写：文件头写明「自动生成，勿手改」，随时可删可重生成
└── *.doc.json            人写：注释 sidecar，JSON pointer → 中文说明
```

生成器在写 `.generated.ts` 时把 `.doc.json` 里对应路径的说明合并成 JSDoc。
这样人补一条注释，下次重新生成还在。`.doc.json` 里有而 corpus 里已消失的路径，
生成器要**报告出来**（说明平台删了字段，或者注释写错了路径），不能静默丢弃。

`.generated.ts` 的文件头照 `openapi.json` 的做法写死一句「手改没有意义，CI 会红」。

---

## 七、脱敏（不能跳过，涉及泄漏）

corpus 里必然出现这些东西：用户昵称、UID、头像与视频 CDN URL（**带签名 token**）、
`requestId`、掩码手机号、有些接口会回显部分 cookie 字段。
直接提交进公开仓库就是泄漏——我在上一轮改错误图时就见过 trace 里那种上百字符的签名 URL。

要求：

- **录制即脱敏**，不落原始文件（不给「先存原始再清洗」留窗口）
- **脱敏不能改变类型形状**：URL 还得是 URL、时间戳还得是 13 位数字、
  ID 还得是同样长度的字符串。否则生成出来的类型是错的
- 产出一份「哪些字段被替换了」的清单，跟 corpus 一起提交，便于 review
- 同一个原值在同一份样本里替换成同一个假值（保持样本内的引用一致性，
  否则 `author.id` 与 `photo.userId` 对不上，会误判成两个无关字段）
- **cookie 绝不能进 corpus 的 metadata**。录制器要记参数、时间、HTTP 状态，
  但不能把凭证一起写下来

凭证从哪读：仓库已经有现成约定。`packages/core/src/dev.ts` 里放着真实抖音 cookie
（`sessionid` / `sid_guard` / `passport_csrf_token` / `ttwid` / `odin_tt` / `msToken`），
而它在 `.gitignore:7` 里——**所以那不是已提交的泄漏，而是「真凭证放 gitignore 的本地文件」
这条既有惯例**。录制器的 cookie 输入照这个来（本地文件或环境变量），
不要新发明一套配置，也不要让它出现在任何会被提交的地方。

---

## 八、本地 Web 工具的定位（你提的那个）

不作为终点，作为 **corpus 的策展前端**。三个作用：

1. 填参 → 发请求 → 看响应（替代第三方在线站点这一步）
2. 看到**即将写入的类型 diff**：这次样本会让类型多出/少掉哪些字段
3. 给样本打标：「这是个新变体，入库」/「这次是风控页，丢掉」/「这个字段是脏数据」

第 3 条是纯自动做不了、又非常需要人的一环——把它放在 UI 上，
比让人去改 corpus 的 JSON 文件靠谱得多。

包的形状照 `packages/codemod` 抄：`private: true`、自己一份 `tsconfig.json`
（不 extends 根配置，因为根开了 `composite` / `declaration`，与 `noEmit` 互斥——
codemod 的 tsconfig 注释里已经记了这个坑）、只有 `lint` / `test` / `typecheck` 三个 script。
`packages/*` 已被 `pnpm-workspace.yaml` 通配，不用改 workspace 配置。

**但有两处必须手动加，漏了会静默失效：**

1. **`vitest.config.ts:17` 的 `include` 是显式白名单**，现在只列了
   `packages/core/test/**` 和 `packages/codemod/test/**`。新包不加进去，
   它的测试**在 CI 里等于不存在**。这个坑已经踩过一次——那两行上方的注释就是当时留的：
   「codemod 包也进根 `pnpm test`……不收进来等于这 17 条用例在 CI 里不存在」。
2. **根 `tsconfig.json` 的 `references`** 现在只有 `./packages/core`。
   要让根 `tsc -b` 带上新包就得加一条。

`.release-please-config.json` 只登记了 `packages/core`，新包 `private: true` 不发版就不用管。

---

## 九、todolist

### 阶段 0 · 可行性验证（先用一个端点走通全链路，不要先搭框架）

- [ ] 选 `douyin.videoWork` 做样板：单请求、无分页、响应已有 793 行手写类型可比对
- [ ] 手工录 5~10 份真实响应（不同作品：视频 / 图集 / 长文 / 已删除 / 私密）
- [x] 写最小合并器，跑出 `.generated.ts`
      → 合并器本体完成（`packages/typegen`，49 条测试）：JSON 样本 → 形状树 →
      TypeScript 源码字符串。**落盘那一步还没做** —— 它要照
      `packages/core/scripts/gen-openapi.mts` 的契约来（生成逻辑在 `src/`、脚本只负责
      写、`--check` 与已提交产物比对、行尾 CRLF→LF 归一），归到阶段 2 最后那条
      `pnpm gen:types` 一起做。纯函数性质已经钉住：样本顺序不影响产出（这是能跑
      `--check` 的前提）、不改输入样本、零样本不炸
- [ ] **与现有 `VideoWork_V0.ts`（793 行）逐字段比对**，产出差异清单：
      生成器少了哪些字段、多了哪些、可选性判断哪里不一致
- [ ] 这一步的产出是**决策依据**：如果差异小到可接受，继续；
      如果生成的类型明显不如手写，先解决可读性再往下走
- [x] 同时用 `bilibili.userDynamicList` 试一次判别式发现，确认能识别出 6 种 `DYNAMIC_TYPE_*`
- [x] **拿现存那两个假变体当合并器的第一个用例**：把 `Forward/DYNAMIC_TYPE_AV` 的
      `_V0` + `_V1` 两份类型反推成两份样本喂进去，合并器应该输出**一个**类型
      （`editable?` / `decoration_card?` / `topic: Topic | null`）。
      合不掉就说明合并规则还不对，这个用例比任何新样本都便宜
- [x] **先验判别式收窄到底能不能用**（1.4）：写一条 `test-d`，
      用 `data.item.type` 收窄 `BiliDynamicInfoUnion`，看在保留
      `[property: string]: any` 的前提下 TS 认不认。
      认不出就要在这一步定方案（判别式提顶层 / 生成 `is*` 守卫函数），
      别等做到阶段 5 才发现
      → **验完了：TS 不认**。`test/types/discriminant-narrowing.test-d.ts`（4 条断言）
      锁死结论：嵌套判别式的 `if` 判断不收窄（判别字段在第三层，TS 只认直接属性），
      但类型谓词能收窄，六个 `DynamicType` 取值都 `Extract` 得出非 `never` 成员。
      方案定为「保留索引签名 + 生成 `is*` 守卫函数」，见「十一、待决」第 6 条

### 阶段 1 · corpus 基建

- [x] 新建包 `packages/typegen`（`@ikenxuan/amagi-typegen`，`private: true`），
      形状照 `packages/codemod`
- [x] **把新包加进 `vitest.config.ts` 的 `include` 白名单**，否则测试在 CI 里不存在
- [x] **根 `tsconfig.json` 的 `references` 加一条**，否则根 `tsc -b` 不带它
- [x] corpus 存储格式定稿：路径 `corpus/<platform>/<endpoint>/<paramsHash>.json`，
      每份带 metadata（录制时间、参数、HTTP 状态、amagi 版本、脱敏清单）
      → `packages/typegen/src/corpus.ts` + 39 条测试。`createCorpusSample` 是**唯一**入口，
      判定 / 脱凭证 / 脱敏 / 算哈希 / 拼路径 / 序列化都在里面 —— 每多一个能绕过入库判定的
      入口，就多一个把风控页写进 corpus 的机会。三处细节值得记：
      **① 参数哈希算的是脱敏后的参数**，因为脱敏确定性，文件身份照样稳定，
      而文件名里不留任何真值的哈希（与 scrub 清单同一条理由）；
      **② 像凭证的参数键整个删掉**，只把键名记进 `strippedParams`（PRD 七那条 cookie 禁令）；
      **③ 参数与 payload 共用同一个脱敏 session**，所以 `params.uid` 与响应里那个作者 ID
      换完仍然相等 —— metadata 与 payload 还能对得上，这正是把参数也存下来的理由
- [x] 录制器：遍历注册表 → 参数矩阵 → 发请求 → 脱敏 → 落盘
      → `packages/core/scripts/record-corpus.mts`（`pnpm record:corpus`，带 `--dry-run` /
      `--platform` / `--endpoint`）。cookie 从环境变量读，照 `src/dev.ts` 那条既有惯例。
      原始响应靠**包一层 `ctx.send`** 拿到 —— decode / normalize 之前的 body 在那里，
      每发都覆盖，留下的是最后一发（prepare 的内部请求排在前面，重试时最后一发才是被放过的那发）。
      三件事刻意不做：**不重试**（风控由入库判定拒掉并打印理由，自动重试只会把 IP 级冷却
      拖成分钟级封锁）、**不并发**（并发是最快触发风控的方式，省下几分钟不值一次冷却）、
      **不猜参数**（必填参数没种子就跳过并报出来）。
      实跑发现并修掉的三处，都是只有真响应才暴露的：
      **① 依赖图里把端点名写成了 `userVideoList`**（真名 `userWorkList`）—— `danglingEdges` 抓到的；
      **② `execute` 读的是 `options.signers` 而不是 `ctx.signers`**，漏传会让签名端点在
      sign 阶段报「未注册的签名器」；**③ 脱敏规则漏掉一整类字段**（见下条）
- [x] **必须拿到未经 `normalize` / `decode` 的原始响应**，同时也记录归一化后的值
      ——类型描述的是 fetcher 返回的 `data`（归一化后），但排查要看原始
      → `raw` 必填、`normalized` 可选。**端点没有 normalize 步骤时那个键整个不存在**，
      与「normalize 返回了 null」是两件事，而 JSON 里区分它们的唯一办法就是缺键
- [x] 参数矩阵：从 zod schema 自动展开（`zod.enum` / `zod.literal` 的取值、
      `.optional()` 的带与不带），复用 `openapi.ts` 里已经在用的 `zod.toJSONSchema`
      → `packages/typegen/src/matrix.ts` + 22 条测试。吃的是 **JSON Schema 而不是 zod schema**：
      `zod.toJSONSchema({ io: 'input' })` 那一步留给录制器（core 侧，`server/openapi.ts`
      已经这么用），typegen 这半边因此不依赖 zod，测试拿手写小对象就能跑。
      展开策略默认**一次只变一个轴**（1-wise 覆盖，`1+Σ(kᵢ-1)` 组）而不是全交叉：
      corpus 要的是「每个已声明取值至少录到一次」，不是验证取值间的交互 ——
      平台不会因为 `page=2` 且 `order=hot` 才多返回一个字段，而全交叉在 5 个枚举上就炸到几百组。
      最要紧的一条是**不猜**：必填的不透明 ID 没种子就一组都不录、进 `unseeded`，
      因为编一个假 ID 发出去只会换回错误页，而错误页混进 corpus 是静默的
- [x] `seeds.json`：每平台几个根种子（UID / 关键词），人可改
      → `corpus/seeds.json`（+ `parseSeedFile` 校验 + 一条测试盯着这份文件本身合法）。
      只放**链条起点**，其余 ID 靠依赖图从上游响应长出来。`$comment` 当注释键（JSON 没注释），
      而**除它以外的未知键一律报错** —— 把 `params` 拼成 `parms` 却被静默当成「没给种子」
      是最难查的那种错。空着的平台是「还没人填」而不是「漏了」：录制器会报 unseeded 并跳过
- [x] 依赖图：入口端点 → 从响应提取 ID → 喂给详情端点。先手工声明，别急着自动推断
      → `packages/typegen/src/deps.ts` + 26 条测试。`DependencyEdge` 手工声明（含 `note`
      字段记「这条边为什么这么走」），`collectSeedsFromSamples` 按路径约定跨数组摊开取值、
      去重、按 `limit` 截断。`planRecordingOrder` 排顺序并**把环报出来**：
      环不是理论情形（列表要 uid、详情的作者又能给 uid），报出来才知道「这一组里得有一个
      端点在 seeds.json 里有根值」。自环不算环（翻页游标就是从自己的响应里取）
      → 实跑打通了一条真链：`videoInfo` → `data.aid` / `data.cid` →
      `videoStream` / `comments`，再 `comments` → `data.replies[].rpid` → `commentReplies`。
      B站那条评论链只靠一个 `bvid` 种子就长出了 4 个端点的样本。
      顺带补上一件只有真数据才暴露的事：**种子与依赖图给的值要先掰成 schema 声明的类型** ——
      `data.aid` 是 number 而 `comments.oid` 声明成 string，不掰的话请求在 validate 阶段
      就被打回、一发都发不出去。掰的方向不对称：number → string 无条件做，
      string → number 只在来回转换一字不差时做（超过 `MAX_SAFE_INTEGER` 的 ID 串掉了精度
      就是在问一个不存在的 ID）
- [x] 脱敏器 + 一致性映射（同一原值 → 同一假值）+ 替换清单
      → `packages/typegen/src/scrub.ts` + 51 条测试。七种替换策略（`id` / `name` / `url` /
      `token` / `phone` / `timestamp` / `redact`），假值一律从**原值的 sha256 派生**而不是
      随机数 —— 否则同一份响应每录一遍都刷 diff，`--check` 就没法用。三件事被测试钉住：
      **① 超界整数换完仍然超界**（16 位横跨 `MAX_SAFE_INTEGER`，安全那一侧也钉了，
      否则脱敏会顺手把 `unsafe-integer` 那条报告项抹掉）；
      **② 清单里连原值的哈希都不留** —— 清单要跟 corpus 一起提交，而短值的截断哈希能爆破，
      review 需要的只是「哪些路径换了、换了几处、几个不同原值」；
      **③ 白名单压过规则且连子树都不进** —— 判别字段被换掉的后果是分组、`is*` 守卫、
      字面量收窄全线报废，成本不对称，所以默认白名单先保住 `type` / `kind` / `code` / `status`。
      规则没命中的一律原样通过、不猜，漏掉的那批交给 `manifest.suspects`（**只报路径**）
      → 实录三轮之后加了两道**不按键名**的防线，因为按键名追永远追不完：
      **① 残留检查（`manifest.leaks`）** —— 换完回头扫一遍产物，报出「某处已被换掉的原值
      仍以子串形式留在别处」。快手 `share_info` / `serverExpTag` 里都嵌着作品 ID，
      而它们的键名跟任何规则都不像。残留非空时录制器与策展工具**都不让入库**。
      **② 值形状优先于键名** —— 一个以 `https://` 或 `//` 开头的字符串**就是** URL，
      不用猜。B站 `userCard` 一次撞上七个没命中的名字（`path` / `s_img` / `l_img` /
      `pc_web` / `img_label_uri_hans_static`…），而 `mobile` 那个还被手机号规则抢走、
      按「保留所有非数字字符」处理，于是整条 URL 原样留下。现在值像 URL 就按 URL 换，
      只有 `redact` 例外（cookie 字段装什么都得清空）
- [x] 录制失败的处理：风控 / 限流 / cookie 过期要**明确报错并跳过**，
      绝不把错误页当成响应入库（快手 `result=2`、B站 `-412` 都会长得像正常 JSON）
      → `classifyResponse` 三分：`store` / `store-as-error` / `reject`。
      **不是 judge 的复制品** —— 两边问的是不同问题：`code=-404 稿件不存在` 在 judge 眼里是失败，
      但它正是 PRD 点名要收的「已删除」样本；`result=11` 字段全 null 在 judge 眼里可重试，
      而入库会把每个字段变成可 null。判定顺序也是有意的：**先 HTTP、再通用风控特征、
      最后才查业务码**，因为风控页经常同时带一个成功的业务码（快手空壳就是 `result=1`），
      顺序反了它会被放进去。没登记过的码一律拒收，方向选安全那一侧。
      被拒的响应在**类型上**就拿不到 `sample`，「跳过」是唯一出路，不靠调用方记得判 if
- [x] corpus 年龄告警：样本超过 N 天就在生成时提示「证据可能过期」
      → `assessCorpusAge`，默认 90 天（≈ 一个季度，平台改字段大致是这个节奏）。
      `now` 由调用方传（纯函数，测试不用冻时间）；**录制时间解析不了时当过期处理** ——
      不能因为 metadata 坏了就默认「证据还新鲜」
- [x] **按形状截断数组**（这条原来没在清单里，第一次实录才发现必须做）
      → `packages/typegen/src/trim.ts` + 16 条测试。列表端点一次返回上百条同形元素，
      实测 `danmakuList` 一份样本 204 KB、四份合计 600 KB —— 而 corpus 要提交进 git 并被
      review，那个体积等于把 `contributing.mdx` 那条「只提交精简代表」作废。
      截断保留**每一种不同的元素形状**（含「超界整数」单独算一种，否则那种数只出现在
      第 50 条时会被截掉、`unsafe-integer` 那条报告项跟着消失），于是有一条能直接断言的性质：
      **截断前后 `generateTypes` 的产物逐字节相同** —— 不是「大概不影响」，是钉死的。
      实效：`danmakuList` 204 KB → 4 KB，`comments` 92 KB → 24 KB
- [x] **映射形状的对象要收成索引签名**（第一次实录发现的第二件事）
      快手 `emojiList` 的 `iconUrls` 是「键是数据」的映射表（几百个 emoji 名 → URL），
      生成器照常一个键一个属性，于是一个端点产出 665 行、占这一批产物的 64%，
      而那些属性名全是噪音（索引签名本来就覆盖了它们）。
      → `render.ts` 的 `asMapNode`（6 条测试）。判据里**最要紧的是「键不像标识符」**，
      不是「值形状都一样」：一个有十几个字符串字段的普通响应对象值形状也全一样，
      收掉它等于把真字段名全删了。代价不对称，所以拿不准就保持原样 ——
      漏收一个映射表只是多几行，误收一个普通对象是删信息。
      门槛：≥12 个键、≥80% 的键不是合法标识符、值形状完全一致。
      实效：`emojiList` **665 → 21 行**，这一批产物 1,037 → 393 行。
      顺带这也是上一轮那个破坏性变更检测的第一次实战 —— 它当场报出
      「`IconUrls` 类型没了」「`iconUrls` 的类型从 `IconUrls` 变成 `{ [property: string]: string }`」，
      两条都对

### 阶段 2 · 生成器

- [x] 形状树构造 + N 份样本合并，按「五」的规则表逐条实现
- [x] `null` 与「缺键」分两个维度记录（这条最容易偷懒合并掉）
- [x] 字面量收窄的白名单机制（默认放宽，避免单账号采样把 UID 收成字面量）
- [x] 判别式发现 + 按现有目录约定落盘（`<字面量>/<字面量>_V<n>.ts`）
- [x] `_V<n>` 的语义写进生成器注释：**同判别式下的形状序号，不是版本号**
- [x] 递归/结构等价复用，避免自引用类型无限展开
- [x] `.doc.json` 注释 sidecar 合并成 JSDoc；孤立 pointer 要报告
      → `packages/typegen/src/docs.ts` + 20 条测试。**这一条不做整套方案就是一次性的**：
      现存手写类型里真正有价值的是语义（「`type` 是判别式，它决定 `modules` 下有哪些键」），
      重新生成会把它冲掉，于是人又会往产物里手写注释 —— 产物从此不可重新生成。
      两处判断值得记：
      **① 孤立 pointer 的判据是「路径在形状树里存不存在」，不是「渲染时走没走到」** ——
      结构等价复用会让 `b.x` 直接引用从 `a.x` 生成的类型，按渲染访问判会把 `b.x` 误报成孤立的；
      **② 注释不参与结构等价判定** —— 否则加一条注释就多出一份重复类型，人就不敢写注释了。
      代价是共用类型上只能挂一份注释，挂不上的那条报 `conflict` 并指出「那个位置留的是谁的」，
      不静默丢掉（静默丢一条注释，下次生成时人会以为它还在）。
      注释里的注释结束符会被转义 —— 这个函数自己的文档注释就差点栽在这上面
- [x] `.generated.ts` 文件头写死「自动生成，手改无意义」
- [x] 覆盖率报告：每个判别式取值的样本数与占比、已声明但未出现的枚举成员
      （报告框架已在，`report.ts` 现在产 mixed-primitives / 全空数组 / 大整数 /
      枚举 token 常量四类项，并把「需要人决策」与「告知性质」分开；判别式相关的
      那两类等 5.1 做完再补）
- [x] `pnpm gen:types` / `pnpm types:check`，行尾归一照 `gen-openapi.mts`
      → `packages/typegen/scripts/gen-types.mts` + `src/plan.ts`（21 条测试）。
      接缝与 `buildOpenApiSpec` / `gen-openapi.mts` 完全一致：**生成逻辑全在 `src/plan.ts`**
      （纯函数，corpus → 「相对路径 → 源码」），脚本只剩读盘 / 写盘 / 比对。
      两处与 gen-openapi 不同，都因为这里是一棵目录树而不是单文件：
      **① `--check` 还要认出多出来的残留文件** —— 端点删掉、判别式取值改名之后旧文件会留在
      树里，而只比对「生成的每个文件对不对」永远发现不了它，那种文件会被下游 import
      然后描述一个已经不存在的响应；**② 写盘前先清空整棵 `generated/` 树**（所以那底下
      不能放手写文件）。corpus 现在是空的，两条命令都跑得通：生成报「还没有样本」、
      `--check` 报「0 个文件一致」
      顺带修掉一个真缺陷：`pickDiscriminant` 以前会在「每个取值只出现一次」时也挑一个判别式，
      于是两份样本能产出一棵一份样本一个类型的假目录树。现在这类候选一个都不选 ——
      方向选安全那一侧，宁可先产一个合并类型（欠采样的事实报告里说清）

### 阶段 3 · 本地 Web 工具（corpus 策展前端）

- [x] 在 `packages/typegen` 里起一个本地 HTTP 服务（默认只监听 `127.0.0.1`）
      → `packages/core/scripts/curate-corpus.mts` + `curate-page.mts`（`pnpm curate:corpus`）。
      **落在 core 的 scripts 而不是 typegen，这条与 PRD 原文不一致，理由是包依赖方向**：
      typegen 是纯函数那半边（不发请求不落盘），而这个服务两件都要做 —— 它得用 core 的
      注册表与执行管线发请求。core 依赖 typegen，反过来 import 就成了包级环（`deps:check` 会红）。
      与 `record-corpus.mts` 同一个安置理由：有网络、非确定的那一半归 core 的脚本
- [x] 端点列表由注册表派生，参数表单由 zod schema 派生（不手写表单）
      → `/api/endpoints` 把四个注册表摊平，每个端点带 `zod.toJSONSchema({ io: 'input' })`
      的结果；前端按 schema 生成控件（有 `enum` / `const` 给下拉，其余给输入框，
      必填打星号，`seeds.json` 里的值预填）。**一个表单都没手写**
- [x] 三块面板：响应 JSON、**即将写入的类型 diff**、样本打标（入库 / 丢弃 / 标记脏字段）
      → 前两块加脱敏面板都做了。类型 diff 是真的：拿「已入库样本」与「已入库 + 这份待定样本」
      各跑一遍 `planCorpusTypes` 再行级比对，并把 `detectBreakingChanges` 里会让下游编译红的
      那些单独列出来。打标做了**入库 / 丢弃**两个；
      **「标记脏字段」故意没做** —— 现在没有任何一层会消费这个标记，做了就是一个写进文件
      却没人读的 UI。要做得先定「脏字段」影响什么（进 `keep`？进 sidecar？让生成器跳过？），
      那是另一个决定
- [x] 「一键补样本」：对当前端点按参数矩阵批量录一轮
      → `/api/record-batch`，按 `expandParamMatrix` 的组合逐组录、每组间隔 1.5 秒。
      **批量录制不等于批量入库**：每组都只到待定为止，要不要留还是人一组一组看 ——
      这正是这个工具存在的理由
- [x] 安全：默认不绑局域网；要绑必须同时给口令
      （这条抄对照项目 `ks serve` 的做法，它连「不设口令就绑局域网直接拒绝启动」都实现了）
      → 同样是**拒绝启动**而不是告警：`--host` 不是回环地址且没有 ≥8 位的 `--token` 时直接
      `process.exit(1)`。给了口令之后每个请求都验（query 或 `x-curate-token` 头）。
      实跑验过两种拒绝：不给口令、口令太短
- [x] **不要**把 cookie 回显到页面上
      → 接口只回 `hasCookie: true/false`，页面上没有任何地方能读到 cookie 值。
      实跑 `curl /api/endpoints | grep` 过一遍，`AMAGI_COOKIE` / `sessionid` / `passport`
      一个都搜不到

### 阶段 4 · 迁移现有 26,535 行

- [ ] 逐平台推进，顺序按风险从低到高（括号是映射表键数）：
      Kuaishou(6) → Xiaohongshu(7) → Douyin(23) → Bilibili(27)
- [ ] 每个端点迁移时产出「生成 vs 手写」的字段差异清单，人过一遍再切换
- [ ] 手写类型里那些**语义命名**（不是形状，是名字和注释）搬进 `.doc.json`
- [ ] 迁移一个端点就把旧的 `_V0.ts` 删掉，不留两份（留着就一定会漂移）
- [ ] **合并掉那 2 个假变体 `_V1`**（见 1.3），它们应该塌成一个带可选字段的类型
- [ ] 顺手清 3 类历史债（都在这一阶段最省事）：
      - [x] **12 处双写** → **已清，实际是 13 处**（写这份 PRD 时快手弹幕端点还不存在）。
        根因不在那 12 个端点，而在契约：`EndpointDef<TParams, TData>` 让 `normalize`
        的返回类型也参与 `TData` 推导，于是钩子的宽松推导会**静默覆盖** `response`
        令牌，绕法只能是在钩子上重复标注同一个映射条目 —— 忘写不报错，只是类型变宽。
        修法是把 `normalize` 的返回类型包成 `NoInfer<TData>`：推导只认 `response`
        令牌，钩子返回值改为**被检查**。于是 13 处标注全部删掉，且钩子返回错形状从
        「静默变宽」变成「立刻编译报错」，错误还落在 `normalize` 那一行而不是令牌上。
        `compute` **刻意保留**推导能力（`avToBv` 那类可以只写 `compute` 不写
        `response`，它不需要与映射条目对齐，没有被覆盖的问题）。
        判据是现成的：`test/types/response-mapping.test-d.ts` 逐端点断言
        `Data<R['x']> === Map['x']`，删完仍全绿就证明 `TData` 没变宽。
      - [x] **8 个不合命名约定的文件** → **已清**（2026-09-04，提前做掉：生成器的落盘路径
        因此不用处理例外）。6 个改名（Kuaishou 4 个 `#178` 漏改的扁平文件各自变成
        `<Name>/<Name>_V0.ts` + `index.ts`；`Bilibili/ArticleContent/ArticleContent.ts`
        与 `Bilibili/Login/NewLoginQrcode/NewLoginQrcode.ts` 补上 `_V0`），全部走 `git mv`
        让 diff 认得出是重命名。**对外类型名与映射键一个都没变**，改的只是文件位置。
        2 个刻意豁免、只在文件头补了说明：`Bilibili/DynamicType.ts`（枚举，本就不是响应
        类型）、`Douyin/PassportLogin/PassportLogin.ts`（手写归一化类型，将来生成器也要豁免）
      - [x] **3 个 `any` 空洞** → **已填**（2026-09-04）。`bilibili.loginStatus` /
        `douyin.loginQrcode` / `xiaohongshu.userNoteList` 三个映射键原先是 `any`，
        **但形状其实早就有了** —— 三个端点各自在本地写了精确的 interface，还在 JSDoc 里
        注明「不复用映射表：此键为 `any`」。所以问题不是缺类型，是类型**放错了地方**：
        住在 `platforms/` 里，映射表却留着 `any`，于是公开面上凭空三个洞。
        形状原样搬进 `types/ReturnDataType/<Platform>/<Endpoint>/`（`BiliLoginStatus` /
        `DyLoginQrcode` / `XiaohongshuUserNoteList`），映射表与端点共用同一份声明，
        `response-mapping.test-d.ts` 里那三条「例外」改回常规断言（bilibili 例外
        3 → 3 保持 `avToBv` / `bvToAv` / `qrcodeStatus`，xiaohongshu 2 → 1）。
        索引签名统一用 `any` 而不是本地声明里的 `unknown` —— 与 `types/ReturnDataType/`
        下其余快照一致，那条「读未声明字段结果是 `any`」的承诺由
        `response-types.test-d.ts` 的 `toBeAny()` 断言着。
        **这条不需要等生成器**，与「生成后立刻有类型」那句话相比，它更像是把已有的东西
        摆回该在的位置。
        `xiaohongshu.userNoteList`——这三个是最快见效的：现在是 `any`，生成后立刻有类型
- [ ] 7 个用本地 `interface` 而非映射条目的端点要单独判断（`avToBv` / `bvToAv` /
      `qrcodeStatus` / `loginStatus` / `loginQrcode` / `userNoteList` /
      xiaohongshu `userProfile`）——它们的 JSDoc 里都写了不复用的原因，
      其中 xiaohongshu `userProfile` 是「v6 类型写成驼峰 `basicInfo`、实测是 `basic_info`」，
      **正是生成器该自动纠正的那类错误**
      → 进行中：`loginStatus` / `loginQrcode` / `userNoteList` 三个正在填成真类型
      （形状本来就在端点本地，只是放错了地方）。
      **xiaohongshu `userProfile` 查完了，刻意不修**：整棵 `data` 都是驼峰
      （`basicInfo` / `extraInfo` / `ipLocation` / `redId` / `tabPublic` / `verifyInfo`），
      不是漂了一个键；而且这些键声明成**必需**的，所以类型不是不全，是在说谎 ——
      读 `data.basicInfo` 编译期毫无问题，运行时永远 `undefined`。
      不修的理由：**只有一处证据**（端点那份本地声明覆盖 3 个字段），没有整份真实响应。
      凭猜逐个改名等于用一份新猜测替换旧猜测，而「已知有问题且写明了问题」的类型
      比「看起来对但没人验过」的类型安全。已在类型文件头写了警告与正确修法。
      顺带一条观察值得记住：**驼峰化的字段名就是「贴进 JSON→TS 在线工具」留下的指纹**，
      而证据被扔掉了，所以没人能说清它当初抓到的到底是什么。
- [ ] 全程盯 `test:types` 与下游 kkk 的 `typecheck`——类型变了下游立刻会红

### 阶段 5 · B站动态专项（最后做，因为最难）

- [ ] 大样本采集：多 UP 主 × 多页，目标覆盖 `MajorType` 已声明的 17 个成员
- [ ] 递归判别联合生成，验证与现有 `Dynamic/` 6 个变体 + 2 个 `_V1` 的对齐情况
- [ ] `MajorType` / `AdditionalType` 两个 enum 保持手写（放 `index.ts`），
      但用覆盖率报告告出「声明了却从未出现」的成员，决定是删还是留
      → **静态那半已经数出来了，而且答案分两笔**：
      - **amagi 内部**：那 27 个成员（17 + 10）被已建模的类型引用 **0 次** —— 没有
        `MajorType.ARCHIVE` 这样的引用，也没有 `'MAJOR_TYPE_ARCHIVE'` 这样的字面量，
        两个 enum 在 `src/` 里除了自己的声明文件之外没有任何 import。而它们本该描述的
        `modules.module_dynamic.major.type` 类型是裸 `string`。
      - **下游确实在用 `MajorType`**：实测 kkk 里用到 3 个成员（`LIVE_RCMD` ×2、
        `OPUS`、`DRAW`）。所以它**不是死代码**，是给消费方按动态类型分支用的 ——
        只是 amagi 自己的类型声明没接上。`AdditionalType` 则是 amagi 与下游**都零引用**。
      于是「删还是留」有了不同答案：**`MajorType` 必须留**（删了下游立刻红），
      `AdditionalType` 那 10 个才是真正的删除候选，但要等样本证明线上到底有没有这些取值。
      「把 `major.type` 收窄到 `MajorType`」两者都得先有样本 —— 收窄会拒绝平台返回的新
      取值，与索引签名那条「平台加字段不算 breaking」的承诺冲突。
      `test/types/dynamic-enum-coverage.test.ts` 把这个账记住了（4 条断言，数字一变就红），
      所以「缺口有多大」从没人知道变成一个被盯着的数。
- [ ] 这一节的验收标准是**发现现有类型漏掉的变体**——找不到就说明采样量不够

### 阶段 6 · 门禁

- [x] `types:check` 进 CI（与 `openapi:check` 同级）—— 等生成器的落盘那层做完。
      **体积门禁那条已经进了**：`.github/workflows/release.yml` 的质量门禁 job 里
      新增「📏 响应类型体积」一步，照 `openapi:check` / `deps:check` 同一个形状写
      （`set +e` 取退出码、结果进 `$GITHUB_STEP_SUMMARY`、超预算时给出该改哪个
      `BUDGET`），所以 `types:check` 到位时照抄那一步即可。
      顺手修了那个 job 里两处过期数字（HTTP 端点页 59 → 61、twoslash 块 117 → 123）
      → 落盘层做完了，「🧬 响应类型与 corpus 一致性」也照那个形状加进同一个 job。
      corpus 现在是空的，所以这一步现在恒绿（0 个文件一致）。**它不是占位**：
      录进第一份样本的那一刻它就开始有效，而那时才想起加门禁就已经晚了 ——
      第一份产物会带着「没人验过」的状态进仓库
- [x] 破坏性变更检测：生成的类型相比已提交版本**删字段 / 收窄类型**时要显著警告，
      因为这两种改动会直接让下游编译红
      → `packages/typegen/src/breaking.ts` + 15 条测试，接在 `gen:types` / `types:check`
      两条路上都报。**方向是这条的全部难点，而且直觉上容易反**：这些是响应类型，
      下游主要**读**它们，所以
      「联合里**加**一个成员」（`string` → `string | null`）是破坏性的（多出来的情况得处理），
      而「联合里**减**一个成员」不是（收窄对读的一侧安全）—— 后者照样报出来，
      但标成不影响读，因为它通常意味着这一轮没录到那种取值，那是另一件要人看的事。
      报出来但**不改退出码**：平台真删了字段时这些告警全是对的，拦住反而是错的；
      这道提醒要解决的是「悄无声息」，不是「不许发生」。
      比的是源码文本而不是形状树 —— 已提交的那一份只有 `.ts`，
      想比形状就得再往仓库里塞一份会与源码脱节的形状快照
- [x] 类型体积门禁：总行数 / 单文件行数上限，超了要报（防止全自动把 26k 行变成 10 万行）
      → `packages/core/scripts/check-type-size.mts`，`pnpm types:size`。基线就是预算：
      156 文件 / 27,130 行 / 最大单文件 2,315 行（`Douyin/UserLiveVideos_V0.ts`），
      预算留的余量刻意小（总量 +10%、单文件 +8%）—— 余量给大了门禁就形同虚设。
      超了不是直接拒绝，是要求「改预算 + 在提交信息里写清为什么涨」。
      刻意**不**检查 `dist/*.d.ts`（那已经 790 KB）：那要求先跑 build，而门禁应该
      不构建也能跑；源码行数与产物体积单调相关，卡源码就够。
- [x] `deps:check` 确认新包没引入循环依赖 → 根 `deps:check` 的入口加上 `packages/typegen/src/index.ts`（原先只跟 core 的图，新包等于没被查过），实跑 0 环

### 阶段 7 · 文档与收尾

- [x] `packages/docs` 加一节「新增端点的完整流程」，把「贴在线工具」那套彻底删掉
      → `dev/add-api.mdx` 的第 1 步下新增「响应类型：**把样本留下来**」一节。写清历史
      做法为什么不划算（转换只占十分钟，贵的是重新取得证据与确认没漏变体，而证据每次
      都被扔掉），要求新增/改动响应类型时把脱敏后的真实响应放进
      `test/fixtures/<平台>/` 并写一条离线断言，参照快手那批样本。脱敏两条不能省的规则
      （同值同假值、位数与字符集同形）与「结构和字段名一字不改」都写进去了。
      末尾一个 Callout 说明这一步正在被 `packages/typegen` + corpus 自动化，
      但**样本从现在起就该留** —— 它是那件事的输入，也是眼下唯一能离线验出
      「类型声明与平台实际返回对不上」的东西
- [x] `.doc.json` 的写法写进贡献指南（等 sidecar 实现）；**`_V<n>` 语义已写**：
      `dev/internals/contracts.mdx` 新增「文件名里的 `_V<n>` 不是 API 版本号」一节 ——
      这个后缀长期没有任何注释解释，而它看起来的含义和实际含义不一样。那节写明真正的
      语义（同判别式取值下无法合并的形状序号）、现存那 2 个 `_V1` 是抓包漂移而非真变体、
      以及「接口真改了就直接改 `_V0`，旧形状留在 git 历史里」
      → sidecar 实现完了，`dev/contributing.mdx` 新增「`.doc.json`：注释与形状分开存」一节：
      带一份真实例子，写清路径写法、孤立 pointer 为什么是告警而不是静默忽略、
      共用类型上为什么只能挂一份注释，以及 `discriminantPath` 这个逃生口什么时候用。
      同一节顺手把脱敏那段的 Callout 接上 `scrubSample`（手工规则现在有实现了）
- [x] corpus 提交策略写清楚（见「十一、待决」第 1 条的结论）→ 写进 `dev/contributing.mdx`
      新增的「响应样本（fixtures）要提交进 git」一节：提交脱敏后的精简代表（每变体 1~3 份）、
      全量留本地、以及**主要**理由是「不提交就等于放弃 `--check`」而不是体积。
      同一次顺手把 PR 检查清单从 6 项补到 11 项 —— 它原先漏了 `test` / `test:types` /
      `openapi:check` / `deps:check` / `types:size` 五道 CI 必需门禁，照着它走仍会红

---

## 十、风险

- **采样偏差**。只有一个账号、一个地区、一个时间点的数据，会让某些字段恒为同一个值。
  对策是字面量收窄默认关闭 + 白名单，但根治不了——覆盖率报告要把「样本数少于 N」标出来。
- **类型体积失控**。现在 26,535 行源码编译出来的 `dist/index-CVdi0rcu.d.ts` 已经是
  **762,734 字节（745 KB）**，直接影响下游 `tsc` 速度。`openapi.ts:92` 的注释也记着
  「转 JSON Schema 会让规范体积失控」，所以 `openapi.json` 里 `AmagiSuccess.data`
  至今只有一句 description、没有 schema。全自动 + 多变体很容易把这个数字翻几倍。
  结构等价复用（5.2）和体积门禁（阶段 6）都是为这个准备的。
  *附带机会*：`openapi.ts:92-93` 那行注释后面写着「留到 8.5」——生成的类型如果有
  中间表示（IR），可以顺便把 `data` 的 schema 填上，但要先定体积策略。
- **判别式收窄可能本来就不工作**（1.4）。如果阶段 0 验出「按 `type` 收窄」在下游
  从来没真正生效过，那这次迁移会暴露一个既有问题，下游可能要额外改动
  （加类型守卫或改判别式位置）。这不是新增风险，但会由这次改动引爆。
- **corpus 过期而无人知**。平台改了字段，但没人重新录，类型就一直是旧的。
  年龄告警只是提醒，真正的保障是「改端点时必须重录」写进流程。
- **可读性回退**。生成的类型字段顺序、命名、注释密度都可能不如手写。
  阶段 0 的比对就是为了在投入之前先看清这一点——如果差得多，先解决再往下。
- **错误页被当成响应入库**。快手 `{result: 2}`、B站 `-412` 都是合法 JSON，
  混进 corpus 会污染类型。阶段 1 那条「明确报错并跳过」不是可选项。
- **脱敏改变形状**。替换值时长度 / 格式变了，生成的类型就是错的。要有针对脱敏器本身的测试。

---

## 十一、待决（需要你拍板）

1. ~~**corpus 提交进 git，还是 gitignore？**~~ **按「提交精简代表」执行了**，
   理由从「倾向」升级成两条硬证据 —— 要改口说一声，改回去只是删文档加一行 gitignore。
   - **体积不是问题**（原先估的「几 MB 到几十 MB」偏高）：快手第一批 6 份脱敏样本
     合计 **60 KB**，按这个密度铺满 61 个端点约 1~2 MB。
   - **不提交等于放弃 `--check`**：类型是样本的纯函数，而 `--check` 要在 CI 里从样本
     重新生成再逐字节比对。样本不在仓库里，CI 就只能校验「类型没被手改」，
     没法校验「类型与证据一致」—— 那和现在没区别，整个方案的性质就变了。
     所以这条是**主要**理由，体积只是次要考量。
   - 落地形态：每个变体留 1~3 份脱敏代表进 git，全量样本留本地（它对采样统计有用，
     但进仓库会让 diff 没法 review）。策略写进了 `dev/contributing.mdx`。

2. ~~**类型描述哪一层？**~~ **按倾向做了，而且有实物可看。** fetcher 返回的 `data` 是
   归一化后的值，但 `normalize` 是端点自己写的代码，形状由我们决定而不是平台决定。
   落地：`plan.ts` 的 `payloadOf` —— **`normalized` 优先，端点没有 normalize 步骤时才退回
   `raw`**；corpus 两份都存（`raw` 必填、`normalized` 可选，而且「没有 normalize」与
   「normalize 返回 null」用缺键区分开）。
   实物：`corpus/kuaishou/comments/` 那份样本里两份都在，而生成的 `Comments_V0`
   描述的是归一化那一层（所以它有 `rootComments[].author_name` 这种 amagi 自己的
   snake_case 字段，没有平台信封的 `result`）。
   要改口的成本是**一行**：把 `payloadOf` 改成恒取 `raw`，重跑 `pnpm gen:types`。

3. **迁移时旧的 `_V0.ts` 立刻删还是并存一段？**
   倾向立刻删——并存必然漂移，而且下游只有 kkk，一起改成本可控。
   → 这条**仍然要你拍板**，但两件让「立刻删」变安全的东西已经就位：
   产物落在**独立的 `types/generated/` 树**里（手写树不会被覆盖，见第 7 条），
   而 `types:check` 会认出「多出来的残留文件」—— 端点删掉之后旧产物留在树里会被下游
   import 然后描述一个不存在的响应，这是只比对文件内容永远发现不了的一类。

4. ~~**参数矩阵要不要全自动展开？**~~ **展开了，但收敛成 1-wise，而且不猜 ID。**
   原先担心的组合爆炸是真的（全交叉在 5 个枚举上就几百组），所以
   `expandParamMatrix` 默认**一次只变一个轴**：组合数 `1+Σ(kᵢ-1)` 是线性的，
   而「每个已声明取值至少录到一次」这个目标照样达成 —— corpus 要的不是取值之间的交互。
   不透明 ID 一律不生成，拿不到就进 `unseeded` 让端点整个跳过（编个假 ID 只会换回错误页）。
   录制器那半也照要求做了：**固定间隔、不并发、不重试**，撞上**整机级**风控立刻停整个平台。
   一处按实测改了口：**验证码不算整机级**。同一出口同一 did 下快手 `photo/info` 稳定
   `result=2001` 而同样签名带 body 的 `comment/list` 正常返回 —— 那是端点级行为反作弊，
   把它当整机风控会让本来能录的端点全被跳过。
   「每个端点手工声明采样计划」这一半没做，也不需要了：`seeds.json` 的端点级覆盖
   就是那个声明位置，而且它同时被参数矩阵与依赖图共用。

5. **本地 Web 工具的优先级。** 你最初是把它当主方案提的，我在这份文档里降到阶段 3，
   理由是它解决的是「不去第三方站点」，而真正的痛点是「不留证据」。
   如果你更想先拿到那个工具的即时便利，可以把阶段 3 提到阶段 1 之前——
   代价是它得先按「手动填参」跑一段，之后再接上 corpus。这条听你的。
   → 阶段 1 与 2 现在整条都通了（`record:corpus` → 截断 → 脱敏 → 入库判定 →
   `gen:types` → `types:check`），所以「先做工具」的代价已经不存在了：
   它现在只是给这条链加一个人工策展的前端。**这是清单里唯一纯粹等你拍板的一条。**

6. ~~**索引签名与判别式收窄，二者取舍。**~~ **已验完，走 (a)。**
   `test/types/discriminant-narrowing.test-d.ts`（2026-09-04 新增）实测：
   `if (info.data.item.type === DynamicType.AV)` **完全不收窄** `info` ——
   判别字段在第三层嵌套，而 TS 的判别式收窄只对联合成员的直接属性生效
   （索引签名只是雪上加霜，不是唯一原因）。同一份测试也验了类型谓词
   （`info is Extract<Union, { data: { item: { type: T } } }>`）**能**收窄，
   且六个 `DynamicType` 取值都能从联合里 `Extract` 出非 `never` 的成员。
   所以：保留 `[property: string]: any`（不动既有承诺），生成器**额外**产
   `isDynamicTypeAV()` 这类守卫函数。那条「if 不收窄」的断言是故意写成
   「等于整个联合」的 —— 它锁的是「TS 现在做不到」这个事实，哪天 TS 支持了
   会红，那时该简化守卫函数而不是删断言。

   顺带定死一件事：**全仓此前没有任何测试验证过按 `type` 收窄能工作**，
   现有判别联合只是「结构上的意图」。现在它是被验证过的行为了。

7. ~~**手写归一化类型要不要豁免生成。**~~ **不需要豁免清单了 —— 目录布局把它变成了空问题。**
   `Douyin/PassportLogin/PassportLogin.ts` 是全仓唯一一个「不是服务端原始 JSON 的映射，
   而是登录状态机归一化之后的结果」，而且是唯一注明了来源的、每个分支都带 JSDoc 的真正
   判别式联合——它是手写类型的样板，不该被生成器覆盖。同理映射表里那 4 个被抖音 passport
   会话方法借用的键（`passportQrcode` / `passportQrcodeStatus` / `passportSendCode` /
   `passportValidateCode`）不对应任何端点，录制器也走不到。
   → 原先的倾向是「建一份显式豁免清单」。实现完之后发现那份清单是多余的，两条机制已经管住：
   - **产物只写 `types/generated/`**，手写树（`types/ReturnDataType/`）生成器一个字节都不碰。
     「被覆盖」这件事在布局上就不可能发生。
   - **录制器完全由注册表派生**，不对应端点的映射表键根本不会被遍历到 —— 实跑 `--dry-run`
     确认过：抖音 19 个端点里没有那 4 个 passport 键。
   少一份要维护的清单，就少一处会与真实情况脱节的地方。
