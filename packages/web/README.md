# `@ikenxuan/amagi-web` —— 响应类型控制台

本地开发工具，不发版。做一件事：**把「发请求 → 看清响应形状 → 决定要不要」这条路变顺手。**

填参数 → 发请求 → 同屏看到「这份样本会让类型变成什么样」→ 决定留下还是丢掉 → 就地生成类型。
参数与结论记进**请求集合**（那个文件进 git），响应样本只留在本地。

## 一条命令起两个进程

```bash
pnpm console
```

前后端是**两个进程**，这不是选择：`packages/core` 是 Node-only（axios / express /
protobufjs / node:crypto），打不进浏览器包。所以上面那条命令做的是「一个父进程看着两个
子进程」（`scripts/console.mts`）—— 合并的是你要敲的命令，不是进程本身。

它顺手解决三件事：`build:core` 只跑一次（原先两条命令各跑一遍，而那是最慢的一步）；
**同生共死**（`tsx watch` 因为语法错误退出之后 Vite 还在跑、界面照常打开而每个请求 500，
这种骗人的状态没了）；输出带 `[server]` / `[web]` 前缀，「端口被占」是谁在说分得清。

参数原样透传给 Node 侧（需要参数的只有它）：

```bash
pnpm console --port 7346 --token <至少 8 位>
```

两侧也可以分开起（想单独重启一边、或者只要其中一个时）：

```bash
pnpm console:server   # Node 侧（发请求、算 diff、写盘）。默认只监听 127.0.0.1:7345
pnpm console:web      # 浏览器侧（Vite dev server，把 /api/* 代理到上面那个）
```

分开起时**两个都要起**。只起浏览器侧的话界面能打开，但每个请求都会失败 ——
而且失败的样子会骗人：Vite 的代理打到一个空端口时报 `Failed to fetch`，
打到**另一个在监听的服务**上时（比如 core 的 `pnpm dev` 占着 4567）会回那个服务的
404 HTML。所以 `lib/api.ts` 里专门有一层 `readableError`，
认出「这是 HTML 不是 server 的响应」并直接告诉你去起 server。

`build:core` 是两侧都要的前置 —— core 的 `exports` 里那个 `development` 条件
（指向 `src/index.ts`）在 Node 与 tsx 下默认不启用，所以它得先构建出 `dist`。
`packages/docs` 的 `dev` / `build` / `typecheck` 三个 script 也都是这么开头的。

### 端口被占用时

不会只说一句「被占用了」——它会查出占用者 PID，并给一条能直接粘贴执行的命令
（Windows 是 `taskkill /PID <pid> /F`，macOS / Linux 是 `kill -9 <pid>`），
四周画框、上下留空行，这样它不会被前面几十行构建日志推着滚过去。判定在
`server/port.ts`（`describePortInUse` 与 `killCommandFor` 是纯函数，14 条测试）。

**最常见的成因不是「你起了两遍」，是幽灵进程**：VSCode 的 auto attach 会给终端里的
node 注入 `--inspect`，这种进程收到终止信号后会先打一句
`Waiting for the debugger to disconnect...` 并**继续占着端口**，而在 VSCode 里
「停止调试」只断开调试器、不结束它。它在任务管理器里只是一个普通的 `node.exe`，认不出来
—— 所以提示里必须带上真实 PID。

检查跑在 `build:core` **之前**：构建要几秒、刷几十行日志，而端口被占是必然失败的。

## cookie 在界面里配，写进 `.env`

右上角「Cookie」抽屉里填，保存后写进仓库根的 `.env` 并**立刻对当前进程生效**，不用重启。
`.env.example` 是模板（进 git），`.env` 本身被 gitignore 挡着。

也可以直接写 `.env` 或用 shell 的环境变量 —— 与 `record-corpus.mts` 同一条既有惯例：

```bash
AMAGI_COOKIE_DOUYIN=...
AMAGI_COOKIE_BILIBILI=...
AMAGI_COOKIE_KUAISHOU=...
AMAGI_COOKIE_XIAOHONGSHU=...
```

**进程环境变量压过 `.env`**（所有 dotenv 实现的一致行为）。所以 shell 里 export 过之后，
在界面上改那一项不会生效 —— 抽屉里会标出「来自进程环境变量」并说清这件事。

三条纪律：

- **值一个字都不回给前端。** 接口只回「有没有、多长、从哪来」。长度有用
  （`sessionid=…` 少一截时看得出来），值本身在页面上没有任何用途、只是多一个泄漏面。
- **写之前先确认 `.env` 真被 git 忽略。** 判据是 `.gitignore` 里有一条光秃秃的 `.env`；
  找不到就拒绝写并说清原因（server 端拦，curl 也绕不过去）—— 往一个会被提交的文件里写
  cookie 是不可撤销的。
- **重写时保留文件里其它的行**（包括注释）。`.env` 是人手改的文件，整体覆盖会吃掉别人写的东西。

没有某个平台的 cookie 也能用——那些端点大多会拿回登录页或风控页，而入库判定会把它们拒掉，
界面上会说清是哪一类。

## 绑在回环上**不等于**别人碰不到

三道闸，正常使用永远不会碰到，但它们拦的东西是真的。判定全在 `server/guard.ts` 的
`checkRequest` 里（纯函数，22 条测试盯着）：

- **DNS rebinding**：任何网页都能把自己控制的域名解析到 `127.0.0.1`，然后从那个页面往
  `http://攻击者域名:7345/api/record` 发请求 —— 浏览器认为同源（域名没变），
  而请求真的打到了本机这个服务上。于是那个页面能用**你的 cookie** 发请求、
  能让服务往 `corpus/` 与 `packages/response-types/` 写文件。
  所以回环模式下只认回环 `Host`（`127.0.0.1` / `localhost` / `[::1]`），别的一律 403。
- **跨站写请求**：`POST` 带了 `Origin` 且主机名不是回环时拒绝。无 `Origin` 的放过 ——
  那是 curl 与本机脚本，浏览器发跨站请求时一定带它。
  **有口令时这道闸让路**：口令不是 cookie，浏览器不会替攻击者页面带上它，那道闸更强
  （这也是绑局域网时界面能用的原因 —— Vite 的 `changeOrigin` 只改 `Host` 不改 `Origin`，
  所以从另一台机器打开时 `Origin` 是那台机器看到的局域网地址）。
- **免预检的跨站写**：写接口只收 `content-type: application/json`，别的一律 415。
  这一条补的是 `Origin` 闸的漏洞：`Origin` 只比得了主机名、比不了端口
  （合法前端在 Vite 的 5173，本来就与 API 端口不同源），于是本机任何一个
  `http://localhost:<别的端口>` 的页面都能过那道闸 —— 而 `text/plain` 属于 CORS
  安全列表值，**不触发预检**，请求会真的打出去。要求 JSON 之后跨源请求必须先预检，
  而这个服务从不回 CORS 头，浏览器自己就拦了。
  用 curl 打写接口时记得带上这个头。

绑局域网时第一条不适用（那时 Host 就是那个局域网地址），改由口令把关。

## 绑局域网必须给口令，否则拒绝启动

```bash
pnpm --filter @ikenxuan/amagi-web server --host 0.0.0.0 --token <至少 8 位>
```

这是**硬拒绝**而不是告警：这个服务能拿本机 cookie 发请求，裸奔在局域网上等于把账号借出去。
给了口令之后每个请求都验（query 参数 `token` 或请求头 `x-amagi-token`）。

口令**不会打进启动日志** —— 那会让它进终端回滚、进截图、进任何贴出来的日志。

## 就地生成：它做什么、不做什么

「生成这个端点的类型」只碰**这一个端点**的目录（`packages/response-types/src/generated/<平台>/<Endpoint>/`）。
两件事要知道：

- **它会清掉那个目录里的残留。** 补一份样本让判别式忽然可发现之后，布局会从
  `Comments/Comments_V0.ts` 翻成 `Comments/guards.ts` + `Comments/<取值>/…` ——
  旧文件留着的话平台 barrel 仍然导出它，`tsc` 全绿而下游拿到的是**旧类型**。
  清理范围只有那个端点目录、只删 `.ts`、路径至少三段（所以根 barrel 与平台 barrel
  在判据上就碰不到）。清掉了什么会在结果里列出来。
- **两层 barrel 的完整性只有全量 `pnpm gen:types` 能保证。** 这个动作不重写它们 ——
  `planCorpusTypes` 只喂了一个端点，它产的 barrel 描述的是「这棵树只有这一个端点」，
  写下去会把别的端点整个抹掉。所以录完一轮之后仍然要跑一次全量。
  这句话每次都在结果里，不是只在没有告警时才说。

界面上另有一块「已有类型」面板，显示的是另一件事：`packages/response-types/` 里**当前提交**的
那一份（`GET /api/generated`，高亮由 server 渲好）。它回答「我是不是在重复劳动」——
界面原先对「这个端点已经有类型了」一无所知，只能靠翻文件树。注意它与刚录出来那份不可直接比：
单份样本跑出来的类型比合并的更严（可选性、空数组、`null`、大对象四处），面板顶上有一句话说这件事。

`corpus/seeds.json` 写坏了（一个尾逗号就够）会在界面上说清楚，不再退化成
「所有端点都缺种子 · 0 组」—— 那是**当时**界面上的原文，那个标签现在叫「缺少参数」
（它说的是「必填参数没有可用取值」，而不是「`seeds.json` 里没写」）。
那份文件的解析错误原先被整段吞掉了，而它恰好报得出「`params` 拼成了 `parms`」这类最难查的手误。

## 接口一览

全部在 `server/index.ts` 的 `handle` 里，一条路由一段。前三条是只读的，写在
`method !== 'POST'` 那道判断**之前** —— 副作用是 `PUT /api/generated` 也能拿到那份数据
（只读、不是安全问题，但将来加 REST 风格路由时得记着这个先后，`server/index.ts:466-468`）。

| 接口 | 做什么 |
|---|---|
| `GET /api/endpoints` | 注册表 → 端点清单：schema、种子、已入库样本数、缺哪些参数 |
| `GET /api/cookies` | cookie 状态：有没有、多长、从哪来。**一个字节的值都不回** |
| `GET /api/generated` | 这个端点**已提交**的类型产物，高亮由 server 渲好。一份都没有回空数组而不是 404 |
| `POST /api/cookies` | 写 `.env`。唯一会把凭证写到盘上的一条路 |
| `POST /api/record` | 发一次请求 → 入库判定 + 脱敏统计 + 类型 diff + 高亮好的响应（`payloadHighlight`） |
| `POST /api/record-batch` | 按参数矩阵连录，每组之间隔 1.5 秒（给风控留的余量） |
| `POST /api/store` | 待定样本落盘；**给了 `id` 的话还往请求集合追加一条** |
| `POST /api/discard` | 丢掉待定样本。未知 id 也回 200 —— 这个动作在语义上是幂等的 |
| `POST /api/requests` | 请求集合的读写，`op` 三档：`list` / `upsert` / `remove` |
| `POST /api/compare` | 两个 `sampleHash` 的**字段级**对比（路径级、名字无关，不是行差） |
| `POST /api/generate` | 就地生成这一个端点的类型 |

三处值得单独记：

- **`/api/store` 现在做两件事。** 先写样本、后追加集合条目：`sampleHash` 是指向样本的指针，
  反过来的顺序会造出指向不存在文件的指针。没给 `id` 不算失败（只写样本，并在
  `requestsIssues` 里明说「集合没动、因为没给 id」—— 静默跳过会让人以为参数已经进 git）；
  而追加没成时**待定条目留着**，因为样本已经落盘，`id` 写错只该花人一次点击。
- **读集合也走 POST**（`op: 'list'`），不新加 GET —— 上面那个「GET 在 POST 判断之前」的既有
  顺序这一轮不碰。代价只是多两道闸（`Origin`、`Content-Type`），而这条路只有界面在走。
- **状态码分两档，这个区分是有用的**：`400` = 改你的输入（凭证命中、`id` 不合法、`verdict`
  不认识、两个下拉框选了同一份样本）；`409` = 先去修盘上那个文件（集合是坏 JSON 或有坏条目）。
  后者不是调用方的错，修法也完全不同。`404` 留给「没有这个端点 / 没有这份样本」。

## 包里两个半边

```
server/     Node 侧。依赖 core（注册表 + 执行管线）与 typegen（纯函数生成）
  index.ts      HTTP 路由、命令行、内存里的待定队列
  record.ts     唯一非纯的地方：发一次请求，拿未经 decode/normalize 的原始响应
  outcome.ts    拿到响应之后的**全部判断**（纯函数，有测试）
  compare.ts    两份样本的字段级对比（纯函数，有测试）
  batch.ts      批量录制的循环（纯函数，有测试）
  guard.ts      三道闸与口令的判定（纯函数，有测试）
  port.ts       端口被占用时那段提示（纯函数，有测试）
  highlight.ts  shiki 高亮。**只在这一侧**，浏览器包因此一个字节都不涨（理由在文件头）
  endpoints.ts  注册表 → 前端能渲染的端点清单
  storage.ts    读写样本、请求集合与产物
  env.ts        读写 `.env`（唯一会把凭证写到盘上的地方）

scripts/
  console.mts   `pnpm console` 的父进程：起两个子进程、同生共死、输出加前缀

shared/     两边唯一共享的东西
  contract.ts   线上契约。**一个 import 都没有，必须保持这样**（见下）

src/        浏览器侧。Vite + React + Tailwind CSS v4 + @heroui/react
  App.tsx                    版面 + 动作编排
  lib/urlState.ts            界面状态 ↔ URL（见下）
  lib/api.ts                 HTTP 客户端，含「后端没起」的可读诊断
  lib/theme.ts               主题三档的判定（纯函数，有测试；见下）
  components/EndpointList     左栏：搜索 + 按平台折叠
  components/ParamForm        由 JSON Schema 派生的表单（逐字段错误；数字只给有界的上步进器）
  components/OutcomeCard      判定 / 脱敏 / 响应 / diff 四块面板 + 留下丢掉
  components/RequestTable     这个端点的请求集合。四档 verdict 同一等，删除要确认
  components/ComparePanel     并排对比：同端点两组参数各自的类型 + 逐字段差异
  components/GeneratedPanel   「已有类型」：这个端点已提交的产物
  components/CodeBlock        server 渲好的高亮 HTML 的唯一落点（连同「截断了」那句话）
  components/ThemeSwitch      深色 / 浅色 / 跟随系统
  components/CookieDrawer     cookie 配置
```

<!-- 这一条值得单独记：它让整个界面白屏，而控制台一条错误都没有 -->

### `Toast.Provider` 必须自闭合，不能包住界面

HeroUI v3 的 `Toast.Provider` **只渲染 toast 那一小块区域**，它的 `children` 类型是
`ReactNode | ((props: { toast }) => ReactNode)` —— 那是「一条 toast 长什么样」的插槽，
不是提供 context 的包装层。把 `<main>` 塞进去的后果是：队列为空时 children 一次都不被调用，
整个页面渲染成**零字节**，而且**控制台一条错误都没有**（它不认为出了错，它认为没东西要渲染）。

正确写法是让它当自闭合的兄弟节点（`App.tsx` 里就是这么写的）。`toast(...)` 走的是
模块级全局队列、不依赖 React context，所以调用点不需要在它的树里。

### 主题三档：判定有两份，改一处要改两处

深色 / 浅色 / 跟随系统，走 `@heroui/react` 自带的 `useTheme`（不引 `next-themes`）。
`localStorage` 里存的是**意图**、可以是 `system`（存解析结果的话系统偏好变了它不跟），
键名 `heroui-theme` 不是我们能选的 —— `useTheme` 把它写死了。

判定（`resolveTheme`）在 `src/lib/theme.ts`，而 `index.html` 里那段 pre-paint 内联脚本
**照抄了一份**：它必须在 bundle 下载之前跑完，否则设了深色偏好的人首帧会闪一下白，
而 import 那个文件就等于又要等 bundle。两份必须逐字一致 —— 脚本先给 `<html>` 加一个主题类、
`useTheme` 随后又加一个别的，就会叠成 `class="light dark"`（`applyThemeToDOM` 只移除
「**它自己**上一次加的那个」，首次执行时那个 ref 是 `undefined`）。同理 `<html>` 上
**刻意没有**写死的主题 class，`src/index.css` 里也**刻意不再**声明 `dark` 变体
（HeroUI 自己那份更完整，重新声明会把它收窄成只剩 `.dark *`，于是 `<html class="dark">`
**自身**上的 `dark:` 工具类不生效）。

## 界面状态存在 URL 里

选中的端点（`?endpoint=bilibili/comments`）、左栏开合（`?nav=off`）、
折叠的平台分组（`?collapsed=douyin,kuaishou`）都在查询参数里。

理由很实在：这个工具的日常动作里**刷新很频繁**（改了 `seeds.json`、换了 cookie、
想看新的样本数），而每次刷新都把这些清空等于每次都要重新点一遍。
进了 URL 才有三件事：刷新后还在、能分享给别人、浏览器前进后退能用。

用 `replaceState` 而不是 `pushState` —— 折叠一个分组不该在历史里留一条记录，
否则「后退」就变成「逐个撤销我的折叠操作」。

左栏还能用 `[` 键收起（输入框里按不触发）。

`shared/contract.ts` 为什么不能有 import：试过让前端直接 `import type` server 的类型
（声明处只有一处，看着更好），不行。`import type` 运行时确实被擦掉，但 **tsc 仍要编译整条
import 图**，于是浏览器侧的 tsconfig（没有 `types: ["node"]`，那正是它存在的理由）会去编译
core 的签名算法，报几十条「Cannot find name 'Buffer'」。契约必须独立成一层。

同理 `tsconfig.app.json` 与 `tsconfig.node.json` 分成两份也不是洁癖：合成一份就等于允许
前端代码读 `process.env` / `Buffer`——**编译期绿、浏览器里炸**。反方向的代价小得多
（server 误用 `document` 在 Node 里第一行就 ReferenceError），所以 Node 侧的 `lib` 里
反而留着 DOM（core 用了 fetch 的 DOM 类型）。

## 样本落在哪

`corpus/<平台>/<端点>/<12位参数哈希>.json`，**不进 git**（`.gitignore:50-55` 那条
`corpus/**/*.json`）。三条例外都是「人或机器一条条维护、要给别人看」的东西：人写的
`corpus/seeds.json`、注释 sidecar `corpus/<平台>/<端点>.doc.json`，以及请求集合
`corpus/<平台>/<端点>.requests.json`（下一节）。样本本身是本地缓存：跨会话累积，
供重新生成与排查。

**别清掉它**：生成器是「N 份样本一次性进去」，没有 TS → 形状树的反解析。
样本丢了就只能重录，而重录不一定能撞回同一批变体。

类型产物落在 `packages/response-types/src/generated/`，**进 git**。
界面上「生成这个端点的类型」只写这个端点的产物；整棵树的一致性仍然要跑 `pnpm gen:types`
（那条命令会先清空整棵树再全量写，barrel 的完整性只有它能保证）。

## 请求集合：参数进 git

`corpus/<平台>/<端点>.requests.json`（与样本目录同级，同 `*.doc.json` 那条约定）。
它回答样本回答不了的那个问题：**别人拿什么参数才能重放出这份响应。**

样本给不出这个答案，两条原因都不小：**样本不进 git**，所以它那份 `metadata.params`
（这一轮起也是真值了，凭证键仍然连值带键整棵子树删掉）只有录它的那台机器看得见；
而且只有成功的那几发才有样本 —— 被拒的请求压根没生成，而那恰恰是最该给下一个人看的记录。
所以集合是**另一个文件**、另一套真值观：

- **进 git，值是真值、不脱敏。** 于是只放公开内容：公开作品、公开账号、搜索关键词。
  这三句话也写在文件自己的 `$comment` 里 —— 改这个 JSON 的人手上通常只有那个 JSON。
- **凭证永不进。** 判据在校验器内部（`typegen/src/requests.ts` 的 `findCredentialKeys`，
  嵌套对象与数组一起下钻，命中就整条不收），不靠界面自觉：这个文件进 git，提交出去收不回来。
  报错里只有**路径**（`headers.cookie` 这种），从不回值。
- **被拒的那几条一样留着，而且与 `ok` 同一等。** `verdict` 四档 `ok` / `reject:risk-control` /
  `reject:login` / `reject:empty`（`typegen/src/requests.ts:42`）—— 「我试过这组参数，
  拿回的是风控页」正是这个文件里最有用、而今天一个字都不留的那部分。那几条没有 `sampleHash`
  是正常状态而不是缺失：被拒的请求压根没生成样本。
- **不扩 `seeds.json`。** 那个文件的约束是「一律用公开账号与公开作品」，而集合必然含依赖图
  长出来的中间 ID（`cid` / `aid` / `oid`）。「值要不要进 git」这道决策得能单独拍，所以是两个
  文件、两个校验器（详细权衡在 `typegen/src/requests.ts` 的文件头与 PRD 三）。

今天往它写有两条路：**手写这个文件**，或者拿 `POST /api/requests`（`op: 'upsert'`）送一条。
界面上那颗「留下」按钮**还没送 `id`**（`storeSample()` 只送 `pendingId`），而 `/api/store` 是
「给了 `id` 才追加」—— 所以现在点「留下」只落样本、集合不动，`requestsIssues` 里会把这句话
明说出来。「另存为…」那颗按钮是下一轮的事；在那之前，「请求集合」与「并排对比」两块面板
列得出的只有手写进去的那些（对比面板会拿本地样本数与列得出的份数比，把这个缺口写在界面上，
而不是显示成「这个端点没有样本」）。

剩下几条纪律全是从「它进 git」推出来的：

- **要么整条写进去，要么一个字节都不动**（`server/storage.ts` 的 `appendRequest`）。
  校验的是**即将写盘的那些字节**（序列化 → `JSON.parse` → 校验器），所以凭证那道闸真的生效
  而不靠调用方自觉。盘上那份有任何问题一律不写 —— 写回去等于替人改文件（坏 JSON 会把人手写的
  那几条整个抹掉），先去修它（那就是 `409` 那一档）。
- **幂等按 `id`**，同 `id` 已存在就整条替换、不追加第二条。而文件里真躺着两个同名的 `id` 时，
  校验器把后一条**整条拒收**并让人改名（不自动补后缀）—— 理由在 `id` 的双重身份上：
  它会变成产物的目录名与类型名，自动补后缀的话产物叫什么由「谁先被读到」决定。它的字符集
  也因此比路径段严一条 —— 首尾必须是字母数字，否则 `-x` 与 `x` 会拼出同一个类型名，
  而撞名检查看不出来。
- **坏条目分两档**：`id` / `label` / `params` / `recordedAt` / `verdict` 错了整条不收；
  `sampleHash` / `shapeKey` / `note` 只丢那个字段、条目留着 —— 这个文件最有价值的部分是
  「什么参数 + 什么结论」，为一个多余的哈希把那句结论整条丢掉是本末倒置。
- **`shapeKey` 由 server 算，客户端给的一律忽略**（`server/index.ts:604-638`）。它是「这组参数
  渲出来的类型的指纹」（`sk1-` + 16 位，`typegen/src/shape.ts`），用途是「同指纹 ⇒ 类型逐字节
  相同 ⇒ 可以建议合并」：算它要跑生成器，客户端手上没有、拿到一个值也无从验证，而算错的代价
  是最贵的那种 —— 人照着「可以合并」去合，丢掉的是一份真实响应，重放一次也换不回来。
  当场算不出来时会沿用盘上同 `id` 那条的值，前提是它还指着同一份样本：**样本不进 git 而集合
  进 git**，新克隆一份仓库的人手上有指纹却没有样本，不留这一档他在界面上改一句 `label`
  就把一个已提交的指纹静默删掉了。
- `recordedAt` 是 ISO 8601 UTC **到秒**（`2026-09-05T06:11:00Z`）。毫秒没有信息量，
  而同一件事两种写法会让这个进 git 的文件在 diff 里多出一堆无意义的行。

## 前端产物不提交

`pnpm --filter @ikenxuan/amagi-web build` 产的 `dist/` 已被 gitignore 覆盖。
这是个本地工具，不发版也不部署——谁用谁自己构建。
