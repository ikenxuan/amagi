# 签名参数重构：原子 SignStep 清单 + phase 排序 + 语义预设

> 状态：已实施（2026-09-25）：阶段 0–5/1/7 完成，阶段 6 退役按 D2 保留共存；全门禁通过
> 影响面：`packages/core` 四个平台签名层 + runtime `resolveSigner`
> 结论来源：2026-09 关于「反爬参数如何声明」的设计讨论

## 一、背景与动机

现状三个痛点：

1. **反爬令牌塞在 build 里、且重复**。抖音 `msToken` 由 `douyinSign.Mstoken(len)` 生成，散落在 `platforms/douyin/api.ts` 的 7 个 URL 构造函数里（184 / 116 两种长度），跟业务参数混在一起。`build` 的签名 `(params, ctx) => RequestSpec` 看着是纯函数，实际每次调用产出新随机 token——副作用没有被显式建模。

2. **sign 单槽位、只认名字，逼出组合爆炸**。`SignDecl = TSign | false | SignFn`，字符串分支引用一个预注册签名器名，无法在保留类型收窄的同时传配置。小红书因此注册了 7 个签名器名，其中 3 个（`xhs-post` / `xhs-get-xyw` / `xhs-post-xyw`）当前无端点使用；secsdk 也因「单槽位」只能复合进 a-bogus/x-bogus，无法独立注册。

3. **「要参数1不要参数2」没有出口**。同一套签名的变体（msToken 长度、xys/xyw 协议、带不带 trace/rap）只能靠增注册签名器名或塞进 build 消化。

**目标**：让「一个端点用哪些反爬参数」变成可直接增删的清单声明，同时不丢类型约束、不丢正确性保证。

## 二、目标 / 非目标

目标：

- 反爬参数成为可组合的原子单元，`sign` 直接列出「要哪些」
- 顺序正确性由机制保证，不下放给端点作者
- 四平台声明形态统一
- msToken 生成从 build 下沉、收敛到一处
- 保留写错即报错的能力

非目标：

- 不统一四平台的签名「参数内容」（算法本质不同，不可归约）
- 不改 `EndpointDef` 的其余字段与五个类型参数
- 不引入「按请求部位（get/post/headers）分插槽」的结构（见附录 A）

## 三、核心方案

### 3.1 SignStep 契约（`contracts/endpoint.ts`）

```ts
/** 签名阶段：决定多个反爬参数的执行先后，端点作者不用手排 */
export type SignPhase = 'prepare' | 'token' | 'sign' | 'finalize'

/** 一个原子反爬参数：知道自己在哪个阶段、怎么把自己盖到请求上 */
export interface SignStep {
  phase: SignPhase
  apply: SignFn // (spec, ctx) => RequestSpec | Promise<RequestSpec>
}
```

- `apply` 复用现有 `SignFn`；「参数写进 query / header / 还是重写整条 URL」封装在 `apply` 内部，端点作者不感知。
- `phase` 是唯一的顺序语义；同 phase 内按数组出现顺序执行。

### 3.2 sign 接受 SignStep 清单

`SignDecl` 增加分支（渐进期与老的字符串名 / SignFn 共存）：

```ts
export type SignDecl<TSign extends string = string> = TSign | false | SignFn | SignStep | SignStep[]
```

推荐 `sign` 同时接受单个 `SignStep` 与 `SignStep[]`：单体签名可省数组（`sign: hxfalcon()`），多参数用数组（`sign: [msToken(184), aBogus(), secsdk()]`）。**待定决策 D1**：是否强制一律用数组以求形态绝对统一。

### 3.3 runtime：resolveSigner 按 phase 排序执行

```ts
const PHASE_ORDER: Record<SignPhase, number> = { prepare: 0, token: 1, sign: 2, finalize: 3 }

// resolveSigner 内新增分支：decl 是 SignStep / SignStep[] 时
const steps = (Array.isArray(decl) ? decl : [decl]).slice().sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase])
return async (spec, ctx) => {
  let s = spec
  for (const step of steps) s = await step.apply(s, ctx)
  return s
}
```

护栏效果：`[aBogus(), msToken(184)]` 与 `[msToken(184), aBogus()]` 结果相同——runtime 保证 `token` 先于 `sign`，msToken 一定在 a_bogus 之前进 URL。

### 3.4 语义预设（减重复、不引入错轴）

```ts
export const douyinBogus = (msLen: number): SignStep[] => [msToken(msLen), aBogus(), secsdk()]
// 端点：sign: douyinBogus(184)
// 定制：sign: [...douyinBogus(116), extra()]
```

## 四、任务清单

### 阶段 0 — 契约层

- [ ] `contracts/endpoint.ts` 定义 `SignPhase` / `SignStep`
- [ ] `SignDecl` 增加 `SignStep | SignStep[]` 分支
- [ ] 把 `SignStep` / `SignPhase` 搬上公开面（`SignFn` 已在公开面）

### 阶段 1 — runtime

- [ ] `runtime/execute.ts` 的 `resolveSigner` 增加单步 / 数组分支 + phase 排序 reduce
- [ ] 保持 string / false / SignFn 旧分支不变（渐进共存）
- [ ] 补单测：乱序输入按 phase 排序、空数组、单步、异步 apply、同 phase 保出现顺序

### 阶段 2 — 抖音试点（先跑通一条有序链）

- [ ] 新建 `platforms/douyin/sign/steps.ts`：`msToken(len)` / `aBogus()` / `xBogus()` / `secsdk()`
- [ ] `aBogus` / `xBogus` 内部保留 webid 前置（`withDouyinWebid`），phase = 'sign'
- [ ] `secsdk` 保留策略表判断（表外 no-op，append 恒安全），phase = 'finalize'
- [ ] `msToken` phase = 'token'
- [ ] `videoWork` 改 `sign: [msToken(184), aBogus(), secsdk()]`
- [ ] 从 `api.ts` 的 `getWorkDetail` / `getBaseParams` 移除 `Mstoken(184)`（build 只拼业务 URL）
- [ ] 验证 `retryFresh`：重试重新 build + 重新 sign，每次换新 msToken + 新 a_bogus
- [ ] 用 `test/fixtures/douyin/abogus_browser.json` 校验签名产物与旧路径一致
- [ ] 铺开其余 6 处 msToken：**长度逐个核对 `api.ts` 现值**（184 见 getBaseParams / getUserRecommendList；116 见 getSlidesInfo / getDynamicEmojiList / getMusicInfo / getLiveRoomInfo / getDanmakuList），勿凭记忆
- [ ] 加语义预设 `douyinBogus(msLen)`

### 阶段 3 — 小红书

- [ ] `sign/steps.ts`：`xs(method, protocol)` / `traceId()` / `rap()`
- [ ] 7 个端点迁移（见五、映射表）
- [ ] 校验 x-s / x-s-common / x-t / x-xray-traceid 四头产物不变，trace / rap 叠加正确

### 阶段 4 — B站

- [ ] `sign/steps.ts`：`wbi()`；`qtparam()` 整体封装（**不拆**，见六）
- [ ] 共享 `WbiSigner` 实例闭包进单元（同现状 `createBilibiliSigners`）
- [ ] 5 个端点迁移
- [ ] 校验 wts / w_rid，及 qtparam 的 fnval 档位（VIP 4048+fourk / 非 VIP qn=64+fnval=16 / 未登录 platform=html5）在签名后追加

### 阶段 5 — 快手

- [ ] `sign/steps.ts`：`hxfalcon()`（有状态签名器闭包共享实例）
- [ ] 5 个端点迁移
- [ ] 校验 `__NS_hxfalcon` 产物、及 count / startupRandom 状态推进不变

### 阶段 6 — 清理与退役（全平台迁移完成后）

- [ ] 移除各平台 `createXxxSigners` 表与 `XxxSignerName` 联合（确认无其他消费方）
- [ ] `PLATFORM_RUNTIME.signers` 及 fetcher 装配相应瘦身
- [ ] `SignDecl` 收窄：去掉字符串 / SignFn 分支（**待定决策 D2**：是否全弃字符串名）
- [ ] `defineXxxEndpoint` 的 `TSign` 参数若无用则移除
- [ ] 更新 `test/contracts/endpoint.test.ts`（现用 `sign: 'a_bogus'`）与 `fetcher-surface` 快照

### 阶段 7 — 文档与门禁

- [ ] 更新文档站「端点注册表」「契约与信封」的签名章节
- [ ] 确认签名不进 openapi（已核：sign 不进 openapi / trace / meta，预计无影响）
- [ ] 跑通全部门禁（以 CI 实际执行为准）

## 五、端点映射表

### 抖音（长度以 api.ts 现值为准）

| 端点                                                           | before                                | after                                                            |
| -------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| videoWork / parseWork / imageAlbumWork / slidesWork / textWork | `sign: 'a-bogus'`（msToken 在 build） | `sign: [msToken(184), aBogus(), secsdk()]` 或 `douyinBogus(184)` |
| 其余作品/评论/音乐等                                           | 同上                                  | `[msToken(116 或 184), aBogus(), secsdk()]`                      |

### 小红书

| 端点                                | before              | after                          |
| ----------------------------------- | ------------------- | ------------------------------ |
| emojiList / userProfile             | `xhs-get`           | `[xs('get','xys')]`            |
| noteComments                        | `xhs-get-trace`     | `[xs('get','xys'), traceId()]` |
| userNoteList                        | `xhs-get-xyw-trace` | `[xs('get','xyw'), traceId()]` |
| homeFeed / noteDetail / searchNotes | `xhs-post-rap`      | `[xs('post','xys'), rap()]`    |

### B站

| 端点                                       | before    | after         |
| ------------------------------------------ | --------- | ------------- |
| comments / userDynamicList / userSpaceInfo | `wbi`     | `[wbi()]`     |
| videoStream / bangumiStream                | `qtparam` | `[qtparam()]` |

### 快手

| 端点                                                                 | before     | after          |
| -------------------------------------------------------------------- | ---------- | -------------- |
| comments / liveRoomInfo / userProfile / userWorkList / videoWorkFull | `hxfalcon` | `[hxfalcon()]` |

## 六、关键设计决策

- **phase 而非手排顺序**：抖音 webid → msToken → a_bogus → secsdk 是严格偏序，颠倒即签名失效；phase 把这个不变量收回机制层，端点作者只声明「要哪些」。
- **部位知识封装在单元内**：msToken 进 query、x-s 进 header、secsdk 重写整条 URL，都在 `apply` 内部。
- **qtparam 不拆**：fnval 依赖 vipStatus、且必须加在「基于原始 URL 的 wbi 签名」之后，强耦合，整体封装成一个单元。
- **红利分布不均（已接受）**：抖音 / 小红书吃到组合红利；快手（单参数）、B站 qtparam（单体）退化成单元素数组，仅共享统一形态。

## 七、风险与边界

- 顺序护栏依赖 phase 划分正确；新增单元必须标对 phase（**评审强制关注点**）。
- 有状态签名器（B站 wbi keys 缓存、快手 hxfalcon count / startupRandom）的状态仍靠闭包共享实例，与端点声明形态解耦——迁移时勿把状态误放进声明期求值。
- 渐进期新旧 sign 形态共存，`resolveSigner` 同时认；阶段 6 才收窄。

## 附录 A：已否决方案（勿重开）

- **spec.extra 透传**：`extra: Record<string, unknown>` 弱类型、魔法键名、读处要强转——不自解释、不优雅。
- **按请求部位（get/post/headers）分插槽**：抽象轴错误。get/post 互斥且与 `build.method` 重复；secsdk 重写整条 URL 无处安放；x-s 读 query 写 header 横跨插槽；且把参数固有的「写哪」泄漏给端点作者。
- **纯 signWith(name, options)**：保留为「若决定不弃字符串名（D2）」的备选。统一入口 + 类型化配置，但粒度停在「整签名器」，不如原子清单直接。

## 附录 B：待定决策

- **D1**：`sign` 是否强制一律用数组（形态绝对统一）vs 允许单体省数组（人体工学）。
- **D2**：阶段 6 是否全弃字符串签名器名。弃→形态最纯、查表机制可退役；不弃→保留 signWith 备选，改动更小。

## 实施结果（2026-09-25）

四平台已全部迁移到 SignStep 清单：

- **抖音** `sign/steps.ts`：`msToken` / `aBogus` / `xBogus` / `secsdk` + 预设 `douyinBogus` / `douyinXBogus`；`api.ts` 6 处 build 侧 `Mstoken` 移除下沉到 `msToken()` step（`getSlidesInfo` 死方法那处保留）；免签的 `emojiList` / `search` 因原 build 带 msToken(184)，改 `[msToken(184)]` 保持等价。
- **小红书** `sign/steps.ts`：`xs(method, protocol)` / `traceId` / `rap`（复用现成 SignFn），7 端点迁移。
- **B站** `sign/steps.ts`：`wbi` / `qtparam`（共享模块级 WbiSigner）+ 测试隔离用 `resetSharedWbiCache`；5 端点迁移。
- **快手** `sign/steps.ts`：`hxfalcon`（共享有状态实例）；5 端点迁移。
- **runtime** `resolveSigner` 加 SignStep / SignStep[] 分支，按 phase 稳定排序；契约 `SignPhase` / `SignStep` / `SignDecl` 上公开面。

**门禁**：typecheck / test（3056 passed、3 skipped）/ lint / format:check / openapi:check / deps:check 全过。`execute.test.ts` 新增 3 条 SignStep 排序单测。

**D2 决策**：签名器表（`createXxxSigners` / `XxxSignerName`）**保留、未退役**（渐进共存）—— request 层手动 `amagi: { sign: 'hxfalcon' }`（见 custom-request 教程）继续走字符串查表，无需改动。全弃字符串名留作后续。
