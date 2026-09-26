# sign 统一：一份实现 + 对外精细控制

> 承接 `SIGN_REFACTOR_TODO.md`（commit `aff79347`，已实施）。那一轮把端点的 `sign` 改成了原子
> `SignStep` 清单，但**只改了端点这条路**——`client.<平台>.request` 那条路仍走字符串查表的旧签名器，
> 于是同一套签名有了两份实现。本轮做三件事：消掉两份实现、修掉因此漏出的一个 bug、把 step 工厂对外放开。
>
> 分支：`refactor/sign-steps`（直接续在本分支上，不另开）

---

## 一、本轮要解决的问题

### 问题 1：`apiUrls` + `request` 组合时 msToken 丢了（用户可见的 bug）

上一轮把 msToken 从 URL 构造器下沉到了签名 step，`platforms/douyin/api.ts` 删掉了 6 处
`msToken: douyinSign.Mstoken(nnn)`。端点这条路没事（它们的 `sign` 清单里有 `msToken()` step），
但 `client.douyin.request` 的默认签名是字符串 `'a-bogus'`（`client/request/profile.ts:72`），
它解析到 `aBogusSigner`（`platforms/douyin/sign/signers.ts:79-87`）——那个函数做的是
webid → a_bogus → secsdk，**不补 msToken**。

于是用户拿 `client.douyin.apiUrls.*` 造 URL、再交给 `client.douyin.request` 发，得到的链接里没有 msToken。

> 一度想过「把 msToken 加回 api.ts」，已否决：那与剥离的初衷相反。正解就是问题 2 的统一——
> 让 `'a-bogus'` 也指向同一份 step 清单，msToken 由 step 补上，`api.ts` 一个字不动。

### 问题 2：同一套签名有两份实现

| 平台 | 重复的具体形态 |
| --- | --- |
| 抖音 | `isAbsoluteUrl` / `isApiLikePath` 在 `sign/signers.ts:47,50` 与 `sign/steps.ts:16,19` **逐字重复两份**；`aBogusSigner` / `xBogusSigner` 与 `douyinBogus()` / `douyinXBogus()` 是同一条链的两种写法 |
| 小红书 | 表里 7 个注册名，其中 `xhs-get-trace` / `xhs-post-rap` / `xhs-get-xyw-trace` 三个复合签名器（`sign/signers.ts:86,93,113`）在 steps 侧已被拆成 `traceId()` / `rap()` 两个 finalize step |
| B站 | `sign/steps.ts:11-12` 自建 `sharedWbi` + `qtparamSigner`，`sign/signers.ts:35` 又建一个 `createWbiSigner()` → **两份 `/nav` 缓存** |
| 快手 | `sign/steps.ts:11` 自建 `createHxfalconSigner(createKuaishouSigner())`，`sign/signers.ts:90` 默认参数又建一个 → **两个独立 `count` 计数器** |

后果：改一边忘一边，两条路会悄悄签得不一样，而签名错了抖音是**抽样校验**的（大部分请求照样成功，
只是被判高风险概率上升），这类分叉极难发现。

### 问题 3：`refreshDouyinMsToken` 已是空转

`client/request/profile.ts:55-67` 的 `refreshDouyinMsToken` 读 `url.searchParams.get('msToken')`，
取不到就原样返回（`:63-64`）。msToken 既然不再由 build 写进 URL，这个钩子对端点调用恒等于无操作。
`retryFresh` 想要的「每次重试换一套 token」现在由「重新签名 → msToken step 重新生成」提供，钩子是多余的。

### 问题 4：测试里「跳过签名」有四种写法

| 写法 | 位置 | 状态 |
| --- | --- | --- |
| (a) 把 registry 的 `sign` 批量置 `false` | `test/platforms/douyin/endpoints.test.ts:43-50`（`stubbedRegistry`，被引 ~40 处）；单点版 `test/platforms/douyin/webid.test.ts:164` | 有效，是上一轮新加的 |
| (b) 往 `ctx.signers` 注入恒等签名器 | `douyin/endpoints.test.ts:33-36`、`douyin/webid.test.ts:134-136`、`test/runtime/execute.test.ts:933,951`；空表变体 `:294` | **对 SignStep 已失效**（清单不经 `ctx.signers`），代码还留着 |
| (c) per-call `amagi: { sign: false }` | `test/client/request.test.ts:106,117,146,167,177`、`test/client/request-adapter.test.ts:93,180` | 有效，测的就是这条路本身 |
| (d) 刻意**不**跳过、用真表 | `kuaishou/endpoints.test.ts:40-42`、`xiaohongshu/endpoints.test.ts:31`、`bilibili/endpoints.test.ts:40,48,441,449`、`test/helpers/request-ctx.ts:45` | 有效且理由正当，见下 |

最尴尬的是 `douyin/endpoints.test.ts` 一个文件里 (a)(b) 并存：`makeCtx` 里留着已经失效的
passthrough 表，同时又用 `stubbedRegistry` 绕过它。

(d) 那条注释的理由是对的——「桩会让『签名到底有没有发生』重新变成不可观测的（这正是这些端点
长期不签名却没人发现的原因）」——所以**统一辅助不能一刀切成「全部跳过」**，得保留"用真表"这个选择。

### 问题 5：调用方无法精细控制反爬参数（你提的需求）

```ts
// 现在：只能选一个注册名，或干脆不签
client.douyin.request(url, { amagi: { sign: 'a-bogus' } })

// 想要：自己挑要哪些、调参数
client.douyin.request(url, { amagi: { sign: [msToken(200), aBogus()] } })
```

卡点是 `AmagiRequestOptions.sign` 现在只收 `string | false`（`contracts/request.ts:161`），
而那里的注释（`:152-160`）写明「刻意不引 `SignDecl`：`contracts/endpoint.ts` 已经 type-import
了本文件，反向再引会成环，`deps:check` 会红」。

**好消息**：`AmagiRequestOptions` 在 `contracts/request.ts` 里是**孤立的**——同文件内没有任何
其他类型引用它，只被 `client/request/index.ts:4` 与 `client/request/adapter.ts:6` import。
所以整个 interface 搬去一个新文件即可解环，不用抽类型。那句注释预告的「将来要加是纯增量」成立。

---

## 二、目标架构

```
steps.ts   ← 唯一实现（原子 SignStep 工厂 + 语义预设）
   ↑
signers.ts ← 薄壳：只做「注册名 → step 清单」的映射，不含算法
```

**单向规则：`signers.ts` 依赖 `steps.ts`，永不反向。**

现状对照（阶段 2 要把后两个翻过来）：

| 平台 | 现在的方向 | 要做的 |
| --- | --- | --- |
| 抖音 | steps 不引 signers（各自实现） | signers 改为引 steps |
| B站 | steps 不引 signers（各自建实例） | signers 改为引 steps，共用实例 |
| 小红书 | **steps → signers**（`steps.ts:4` 引 4 个签名器） | 翻转：算法搬进 steps |
| 快手 | **steps → signers**（`steps.ts:3` 引 `createHxfalconSigner`） | 翻转：算法搬进 steps |

改完之后：字符串 `sign: 'wbi'` 与清单 `sign: [wbi()]` 指向同一份实现，注册名全部保留
（request 层与用户代码不破坏）。

---

## 三、任务清单（22 项，5 个阶段）

每个阶段独立可验证，按顺序做。阶段 1、2 是「消重 + 修 bug」，阶段 4 是「加能力」——
**阶段 4 必须排在 2 之后**：两套实现并存时对外暴露的 step 与默认签名不同源，用户手挑
`[msToken(), aBogus()]` 和不挑时的行为会对不上。

### 阶段 1：抖音统一（含修 bug）

- [x] **1.1 把 `stepsToSigner` 提到共享位置。**
      现在它是 `runtime/execute.ts` 的模块私有函数（连同 `PHASE_ORDER`）。薄壳要用它把 step 清单
      压成 `SignFn` 才能进注册表，所以搬去 `contracts/endpoint.ts`（紧挨 `SignStep` 定义）。
      contracts 是零依赖叶子层，而这个函数只用到契约类型，方向天然正确；`contracts/endpoint.ts`
      已经导出 `defineEndpoint` 这样的函数，不违反该层的既有性质。
      `runtime/execute.ts` 改为从 contracts import。
      **验收**：`deps:check` 绿（无新增环）；`test/runtime/execute.test.ts` 那 3 个 phase 排序用例不动即过。

- [x] **1.2 抖音 `signers.ts` 退成薄壳。**
      删 `isAbsoluteUrl`（`:47`）、`isApiLikePath`（`:50`）、`withSecsdk`（`:65`）与
      `aBogusSigner` / `xBogusSigner` 的函数体（`:79-106`），全部改由 `steps.ts` 的工厂组合。
      文件头那段长注释（`:7-44`，讲「为什么这两个签名器前后各多一步」）是有价值的知识，
      搬去 `steps.ts` 或改写成指向 steps 的指引，**不要直接删掉**。
      **验收**：`platforms/douyin/sign/signers.ts` 不再出现 `douyinSign.AB` / `douyinSign.XB` /
      `applySecsdkWebSign` 的直接调用。

- [x] **1.3 `'a-bogus'` / `'x-bogus'` 挂上 msToken（修问题 1）。**
      ```ts
      export const createDouyinSigners = () =>
        ({
          'a-bogus': stepsToSigner(douyinBogus(184)),
          'x-bogus': stepsToSigner(douyinXBogus(184))
        }) satisfies Record<string, SignFn>
      ```
      184 是作品详情那档的长度；request 打的是「还没收录的接口」，猜不出该用哪档，统一取 184（已确认）。
      **先确认**：迁移后是否还有端点用字符串 `sign: 'a-bogus'` / `'x-bogus'`（预期没有，全是清单）。
      若有，得先看清那个端点该用哪档长度。
      **验收**：`client.douyin.request` 发出的 URL 带 msToken；`api.ts` 无改动。

- [x] **1.4 删 `refreshDouyinMsToken` 与 `refresh` 接线（修问题 3）。**
      删 `client/request/profile.ts:55-67` 的函数、`:75` 的 `refresh` 字段值。
      `retryFresh: true` **必须保留**——它才是「重试时重新 build + 重新签名」的开关，
      新 msToken 由重新签名产生。
      `PlatformRequestProfile.refresh?`（`:42`）这个字段本身：确认四个平台都不用了再删，
      `client/request/adapter.ts:152` 的 `profile.refresh ? … : spec` 跟着简化。
      **验收**：`retryFresh` 端到端用例仍绿（见 1.5）。

- [x] **1.5 跟改测试。**
      - `test/client/request-profile.test.ts:29-46`：整个 describe（2 个用例）随函数删除。
      - `test/client/request.test.ts:190-220`：**断言要重写**。现在它传一个 184 字符的
        `?msToken=AAAA…`，断言 `sent[0]` 仍是调用方那个、`sent[1]` 换了值。改完之后
        msToken step 会**覆盖**调用方给的值，所以第一次就不是 `MS_TOKEN` 了。
        新断言：两次请求的 msToken 都是 184 长度、且互不相同。
      - `test/platforms/douyin/api.test.ts:14-21`：`normalize` 里的
        `parsed.searchParams.delete('msToken')` 复核——v6 对照那边现在还带 msToken 吗？
        若 v6 带、v7（build 产物）不带，这行删除仍是必要的，注释要说清「删是因为它已下沉到签名」。

**⚠️ 行为变化（阶段 4 提供出口）**：`msToken()` step 会覆盖 URL 里已有的 msToken。
对端点无影响（build 不再写它）；对 request 路径，调用方自己拼的 msToken 会被换掉。
选择「覆盖」而不是「有则不动」，是因为后者会让 `retryFresh` 的重试一直复用调用方那个过期
token（Argus 按单次请求的 token 组判定，重放必然同样被拦）。真要自己掌控的调用方，
阶段 4 之后可以写 `sign: [aBogus(), secsdk()]`——不放 msToken step，URL 里的就留着。
这条要写进文档（任务 5.1）。

**阶段 1 验收**：跑全部 9 道门禁（见第五节）。

### 阶段 2：另外三平台统一

- [ ] **2.1 小红书：翻转依赖 + 删 3 个复合签名器。**
      `sign/steps.ts:4` 现在从 `signers.ts` 引 4 个基础签名器——把这 4 个的实现（含
      `a1Of` / `apiPathOf` / `signParamsOf` / `rapApiOf` / `signHeaders` 这些 helper）搬进 `steps.ts`，
      `signers.ts` 改为从 steps 组合：
      ```ts
      'xhs-get-trace':     stepsToSigner([xs('get', 'xys'), traceId()]),
      'xhs-post-rap':      stepsToSigner([xs('post', 'xys'), rap()]),
      'xhs-get-xyw-trace': stepsToSigner([xs('get', 'xyw'), traceId()]),
      ```
      `xhsGetTraceSigner`（`:86`）/ `xhsPostRapSigner`（`:93`）/ `xhsGetXywTraceSigner`（`:113`）
      三个函数删除。7 个注册名**一个不少**。
      **注意**：`xhsGetTraceSigner` 等是 `export` 的，删前确认没有别处 import。

- [ ] **2.2 B站：两条路共用一个 `WbiSigner`。**
      `sign/signers.ts:35` 的 `createWbiSigner()` 改为复用 `steps.ts:11` 那个 `sharedWbi`，
      方向变成 `signers.ts → steps.ts`。
      `BilibiliSigners.instance` 字段（`:21`）：确认谁在用（`client/runtime.ts:53-56` 装配时
      会把它剥掉），决定保留还是删。
      **语义变化**：`createBilibiliSigners()` 调两次会拿到同一个实例。这与原注释写的
      「每 client 一份」相反——但**实现上本来就已经是一份**（`PLATFORM_RUNTIME` 是模块级 `const`，
      模块求值时只调一次），所以这是「让注释对上实现」，不是新引入的共享。
      跟着改：`sign/wbi.ts:91-92`、`sign/signers.ts:14-15` 那三处「随实例」注释（共 3 处，
      `packages/docs/content/docs/v7/dev/internals/transport.mdx:120-124` 的 Callout 已记录过
      它们与实现不符）。

- [ ] **2.3 快手：翻转依赖 + 共用实例。**
      `sign/steps.ts:3` 现在从 `signers.ts` 引 `createHxfalconSigner`——把它（含 `CAVER_PARAM`、
      `signableBody`）搬进 `steps.ts`，`signers.ts` 改为 `hxfalcon: stepsToSigner([hxfalcon()])`。
      `createKuaishouSigners(signer = createKuaishouSigner())` 的默认参数改成 steps 那个共享实例；
      可注入参数**保留**（测试要用）。
      **注意**：`createHxfalconSigner` 是 `export` 的，搬动前确认引用点。

- [ ] **2.4 给 `KuaishouSigner` 加 `reset()`。**
      对称于 `bilibili/sign/wbi.ts:161-164` 的 `WbiSigner.reset()`。要清的是两份状态：
      `runtimeState`（`count` 回 `KUAISHOU_DEFAULT_COUNT`、`startupRandom` 重取）与
      `anonymousKwwCache`。两个字段是 `private readonly`（`sign/index.ts:52-53`）——
      readonly 只禁止重新赋值字段，改对象内部属性是允许的，先确认
      `KuaishouAnonymousKwwCache`（`sign/helpers.ts:32-43`）的实际形状再写。
      配套在 `sign/steps.ts` 导出 `resetKuaishouSignerState()`，对称于
      `bilibili/sign/steps.ts:23-24` 的 `resetSharedWbiCache()`。

- [ ] **2.5 复核不变量。**
      - 四个平台的注册名一个不少不改：抖音 2、B站 2（+`instance`）、快手 1、小红书 7。
      - `deps:check` 绿——翻转依赖方向最容易在这里出环。
      - 三个平台的端到端测试（`kuaishou` / `xiaohongshu` / `bilibili` 的 `endpoints.test.ts`）
        用的是**真表**，签名行为若有分叉会在这里红，是本阶段最有价值的一道网。

**阶段 2 验收**：9 道门禁 + 确认 `git grep` 找不到第二份签名算法实现。

### 阶段 3：测试辅助统一

- [ ] **3.1 新增 `test/helpers/unsign.ts`。**
      两个导出（命名待定，`unsign*` 只是占位）：
      - `unsignRegistry(registry)` —— 整张表的 `sign` 置 `false`，替换 `stubbedRegistry` 那 8 行样板
      - `unsignEndpoint(registry, name)` —— 单个端点置 `false`，替换 `webid.test.ts:164` 那种写法

      放 `test/helpers/` 与现有 5 个辅助（`adapter` / `deterministic` / `fixtures` / `listen` /
      `request-ctx`）并列。

- [ ] **3.2 收敛写法 (a)。**
      `douyin/endpoints.test.ts` 的 `stubbedRegistry`（`:43-50`）与 `webid.test.ts:164`
      改用辅助。`:43-45` 那段注释（解释为什么 passthrough 拦不住 SignStep）要留着——
      它记的是一个真实的坑。

- [ ] **3.3 删已失效的写法 (b)。**
      `douyin/endpoints.test.ts:33-36`、`douyin/webid.test.ts:134-136` 的恒等签名器表。
      **逐个确认**再删：`webid.test.ts:134-136` 那处的注释说「`signers: undefined` 不行——
      execute 会在 sign 阶段抛『未注册的签名器』」，删掉表可能触发那条路径。
      `runtime/execute.test.ts` 里的（`:294,933,951`）测的是 **execute 自己的字符串查表分支**，
      那是被测行为本身，**不要动**。`:580-587` / `:619-626` 的 `stamp` 计数桩同理保留。

- [ ] **3.4 补快手的状态重置 + 修注释。**
      `kuaishou/endpoints.test.ts` 开头调 `resetKuaishouSignerState()`（对称于
      `bilibili/endpoints.test.ts:275`）。
      `kuaishou/endpoints.test.ts:21` 那句「签名器随实例，避免模块级状态干扰」要改——
      端点声明的是 `sign: [hxfalcon()]`，走模块级实例，注入 `ctx.signers` 的那张表
      **根本不会被端点调用**。同文件 `:40-42` 的注释（「用真表而不是直通桩」）讲的道理仍然对，
      但「注入真表」这个动作对端点已无作用，措辞要跟着调整。
      `sign-state.test.ts:59` 那个 describe 名（「count 随实例，两个 client 的签名状态互不干扰」）
      也要复核：它直接 `createKuaishouSigner()` 造独立实例，用例本身仍绿，但「两个 client
      互不干扰」的说法与真实 client 共享实例的事实不符。

**阶段 3 验收**：9 道门禁；`git grep` 确认跳过签名只剩「统一辅助」与「per-call `sign: false`」两种。

### 阶段 4：对外精细控制

- [ ] **4.1 搬 `AmagiRequestOptions` 解环。**
      从 `contracts/request.ts:146-186` 整体搬到新文件（建议 `contracts/request-options.ts`）。
      新文件可以 type-import `contracts/endpoint.ts`（该目录下没有任何文件反向 import
      `endpoint.ts`，不会成环）。
      改 import 点：`client/request/index.ts:4`、`client/request/adapter.ts:6`；
      re-export 点：`client/request/index.ts:12`、`src/index.ts:168`（公开面路径不变，
      用户侧零破坏）。

- [ ] **4.2 扩 `sign` 类型。**
      `sign?: string | false` → `sign?: SignDecl`。
      `:155-157` 那段「本轮不收自定义签名函数，收函数就得把 `SignFn` / `EndpointCtx` /
      `RequestSpec` 搬上公开面」的注释要重写：`SignStep.apply` 本身就是 `SignFn`，
      暴露 step 等于已经暴露了这三个类型，所以直接用全量 `SignDecl`（含裸 `SignFn` 分支）
      比再切一个窄联合更省事。**这是决策点 D-B，见第四节。**
      注意 `client/request/adapter.ts:155` 的 `sign: amagi.sign ?? resolveDefaultSign(…)`
      与 `profile.ts:107-115` 的 `resolveDefaultSign` 里那处手动断言——类型放宽后
      那段注释的前提变了，要复核。

- [ ] **4.3 新增子入口导出 step 工厂。**
      新建 `src/exports/sign-steps.ts`。tsdown 的 entry 是 glob（`tsdown.config.ts:9`
      `'exports/*': 'src/exports/*.ts'`），**加文件自动出产物，构建配置不用改**；
      但 `packages/core/package.json` 的 `exports` 字段要手加一条（照 `./signing` 那条抄，
      注意四个子入口都没有 `development` 条件）。
      导出内容：抖音 `msToken/aBogus/xBogus/secsdk/douyinBogus/douyinXBogus`、
      小红书 `xs/traceId/rap`、B站 `wbi/qtparam`、快手 `hxfalcon`，
      加类型 `SignStep/SignPhase/SignFn/SignDecl`。
      **命名冲突**：四平台平铺会撞（`msToken` 只属于抖音、`xs` 只属于小红书），
      **这是决策点 D-D，见第四节。**

- [ ] **4.4 补公开面测试。**
      - 从子入口 import step、经 `amagi.sign` 传清单，断言最终 URL / headers 上确实出现了对应参数
      - 断言「不放 msToken step 时，URL 里调用方自己的 msToken 被保留」（阶段 1 那条行为变化的出口）
      - `deps:check` 仍绿（它跑 4 个入口，`--exit-code circular:1`）

**阶段 4 验收**：9 道门禁 + 手工过一遍 `pnpm build:core` 产物里有 `dist/exports/sign-steps.*`。

### 阶段 5：文档订正

- [ ] **5.1 msToken 相关表述（4 处）。**
      - `docs/v7/usage/guide/custom-request.mdx:187`：「抖音 20 个构造器里 14 个的 URL 带
        `msToken`、15 个带 `verifyFp`」——msToken 那半句已经不成立（构造器不再写它），
        改成「由签名 step 补」。同段还写着「`msToken` 由本库现生成（长度是参数的一部分）」，
        要跟着说清现在在哪一层生成。
      - `custom-request.mdx:122`：「重试时**重抽 URL 里已有的 `msToken`**」→ 改成「重新签名生成新的」。
      - `docs/v7/dev/internals/lifecycle.mdx:124`：「重新 `build`（新 `msToken`）+ 重新 `sign`
        （新 `a_bogus`）」——msToken 现在出自 sign 不是 build。
      - `docs/v7/dev/internals/registry.mdx:44`、`transport.mdx:36`：同类表述。

- [ ] **5.2 `transport.mdx:120-124` 的 wbi Callout。**
      它现在写「签名器源码里有三处注释写着『随实例』，与实现不符——以代码为准」。
      任务 2.2 把那三处注释改对了，这段 Callout 要跟着更新（事实不变：仍是进程级共享）。

- [ ] **5.3 新写「精细控制反爬参数」一节。**
      落在 `custom-request.mdx`（那里是裸请求的主场）。内容：子入口怎么 import、
      `amagi.sign` 能收什么、四平台可用的 step 清单、以及阶段 1 那条覆盖行为与它的出口。
      **MDX 陷阱**：描述里的裸 `{}` / `[]` 会被当表达式求值炸掉构建，一律用行内代码包住
      （见 `MEMORY.md` 的 `amagi-docs-mdx-brace-trap`）。
      注意 `packages/docs/scripts/api-extractor.ts` 那套自写抽取器的输入只有
      `packages/core/src/index.ts`，**子入口不在覆盖范围内**（`./signing` 也一样），
      所以这一节的类型说明得手写，不会自动生成。

- [ ] **5.4 字符串注册名的表述复核。**
      `custom-request.mdx:242`（`sign: 'xhs-get-trace'`）、`:277`（`sign: 'hxfalcon'`）、
      `content/partials/sdk-prose.mdx:90`（`sign: 'wbi'` / `'qtparam'`）——注册名全部保留，
      这些**仍然正确**，不用改。可选：补一句「也可以给 step 清单」。

**阶段 5 验收**：`pnpm build:docs`（文档站构建是门禁之一）。

---

## 四、待拍板的决策点

| # | 问题 | 选项 | 倾向 |
| --- | --- | --- | --- |
| **D-A** | msToken step 覆盖调用方 URL 里已有的 msToken？ | (a) 总是覆盖 (b) 有则不动 | **(a)**。(b) 会让 `retryFresh` 一直复用过期 token，Argus 必然再拦。精细控制的出口由阶段 4 给（不放 msToken step 即可） |
| **D-B** | `amagi.sign` 放宽到什么程度？ | (a) 全量 `SignDecl`（含裸 `SignFn`） (b) 只到 `string \| false \| SignStep \| SignStep[]` | **(a)**。`SignStep.apply` 就是 `SignFn`，暴露 step 已经等于暴露它，再切窄联合只是多一层没意义的限制 |
| **D-C** | step 工厂放哪个子入口？ | (a) 新开 `./sign-steps` (b) 塞进现有 `./signing` | **(a)**。`./signing` 的自陈定位是「给『确认签名实现还是对的』这件事用的，不是给日常取数用的」（`src/exports/signing.ts:3-5`），step 工厂恰恰是日常取数用的，语义不合 |
| **D-D** | 四平台 step 工厂如何命名？ | (a) 按平台分命名空间：`douyin.msToken(200)` (b) 平铺 + 平台前缀：`douyinMsToken(200)` (c) 平铺裸名 | **(a)**。(c) 会撞名（`msToken` / `xs` / `wbi` 各属一家）；(a) 读起来平台归属最清楚，也与端点声明里的裸名形成对照 |

D-A / D-B / D-D 我按倾向做，你看到不同意再改；**D-C 上次问过还没回**，也按倾向（新开 `./sign-steps`）做。

---

## 五、门禁（9 道，按 `.github/workflows/ci.yml` 的 `quality` job）

```bash
pnpm typecheck      # tsc --noEmit，全 workspace
pnpm lint           # oxlint
pnpm format:check   # oxfmt --check
pnpm test           # vitest run
pnpm test:types     # vitest run --typecheck.enabled
pnpm openapi:check
pnpm deps:check     # dpdm，4 个入口，circular:1
pnpm types:check
pnpm build:docs     # 文档站构建也是门禁
```

另有 `pnpm --filter @ikenxuan/amagi-web run build`（体积 / 泄漏判据）同在 `quality` job。
`build:core` 在另一个 job（`unified-build`）。

两个容易踩的坑（来自 `MEMORY.md`）：
- **`test:types` 的汇总行会骗人**：源码级类型错误会单独报成 `Unhandled`，只看
  「Type Errors no errors」会整批漏掉（`amagi-vitest-typecheck-misread`）。
- **`pnpm fix` 的覆盖面**：格式化前确认没有把逐字节比对的产物卷进去（`amagi-generated-artifacts-vs-oxfmt`）。

---

## 六、已否决，勿重开

承接 `SIGN_REFACTOR_TODO.md` 的附录，加上本轮新增的：

1. **把 msToken 加回 `platforms/douyin/api.ts`**（本轮新增否决）。它与「把反爬参数从 URL
   构造器剥离」的初衷相反。正解是统一两条路的实现，让 `'a-bogus'` 也走 step 清单。
2. **`spec.extra` 透传反爬参数**（上一轮）。弱类型魔法键。
3. **按 get / post / headers 部位分插槽**（上一轮）。轴错：get/post 互斥且与 `build.method`
   重复、secsdk 重写整条 URL 无处安放、小红书 x-s 读 query 写 header 横跨两个插槽。
4. **回退 SignStep、退回纯字符串注册名**（本轮新增否决）。msToken 下沉与 phase 排序是实打实的
   收益（顺序不变量从「作者自觉」变成机制保证），问题只在落地时留了两份实现——修实现，不回退设计。
