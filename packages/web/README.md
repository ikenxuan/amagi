# `@ikenxuan/amagi-web` —— 响应类型控制台

本地开发工具，不发版。做一件事：**把「发请求 → 看清响应形状 → 决定要不要」这条路变顺手。**

填参数 → 发请求 → 同屏看到「这份样本会让类型变成什么样」→ 决定留下还是丢掉 → 就地生成类型。

## 两个进程，各起一个

前后端是**两个进程**，这不是选择：`packages/core` 是 Node-only（axios / express /
protobufjs / node:crypto），打不进浏览器包。

```bash
# 终端 1 —— Node 侧（发请求、算 diff、写盘）。默认只监听 127.0.0.1:7345
pnpm console:server

# 终端 2 —— 浏览器侧（Vite dev server，把 /api/* 代理到上面那个）
pnpm console
```

**两个都要起。** 只起浏览器侧的话界面能打开，但每个请求都会失败 ——
而且失败的样子会骗人：Vite 的代理打到一个空端口时报 `Failed to fetch`，
打到**另一个在监听的服务**上时（比如 core 的 `pnpm dev` 占着 4567）会回那个服务的
404 HTML。所以 `lib/api.ts` 里专门有一层 `readableError`，
认出「这是 HTML 不是 server 的响应」并直接告诉你去起 `pnpm console:server`。

两条命令也可以用完整写法：`pnpm --filter @ikenxuan/amagi-web server` / `... run dev`。

两条命令都会先跑 `pnpm build:core` —— core 的 `exports` 里那个 `development` 条件
（指向 `src/index.ts`）在 Node 与 tsx 下默认不启用，所以它得先构建出 `dist`。
`packages/docs` 的 `dev` / `build` / `typecheck` 三个 script 也都是这么开头的。

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

## 绑局域网必须给口令，否则拒绝启动

```bash
pnpm --filter @ikenxuan/amagi-web server --host 0.0.0.0 --token <至少 8 位>
```

这是**硬拒绝**而不是告警：这个服务能拿本机 cookie 发请求，裸奔在局域网上等于把账号借出去。
给了口令之后每个请求都验（query 参数 `token` 或请求头 `x-amagi-token`）。

口令**不会打进启动日志** —— 那会让它进终端回滚、进截图、进任何贴出来的日志。

## 包里两个半边

```
server/     Node 侧。依赖 core（注册表 + 执行管线）与 typegen（纯函数生成）
  index.ts      HTTP 路由、命令行、内存里的待定队列
  record.ts     唯一非纯的地方：发一次请求，拿未经 decode/normalize 的原始响应
  outcome.ts    拿到响应之后的**全部判断**（纯函数，有测试）
  endpoints.ts  注册表 → 前端能渲染的端点清单
  storage.ts    读写样本与产物
  env.ts        读写 `.env`（唯一会把凭证写到盘上的地方）

shared/     两边唯一共享的东西
  contract.ts   线上契约。**一个 import 都没有，必须保持这样**（见下）

src/        浏览器侧。Vite + React + Tailwind CSS v4 + @heroui/react
  App.tsx                    版面 + 动作编排
  lib/urlState.ts            界面状态 ↔ URL（见下）
  lib/api.ts                 HTTP 客户端，含「后端没起」的可读诊断
  components/EndpointList     左栏：搜索 + 按平台折叠
  components/ParamForm        由 JSON Schema 派生的表单
  components/OutcomeCard      判定 / 脱敏 / 响应 / diff 四块面板 + 留下丢掉
  components/CookieDrawer     cookie 配置
```

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

`corpus/<平台>/<端点>/<12位参数哈希>.json`，**不进 git**（`.gitignore` 里 `corpus/**/*.json`，
两条例外是人写的 `seeds.json` 与 `*.doc.json`）。它是本地缓存：跨会话累积，供重新生成与排查。

**别清掉它**：生成器是「N 份样本一次性进去」，没有 TS → 形状树的反解析。
样本丢了就只能重录，而重录不一定能撞回同一批变体。

类型产物落在 `packages/response-types/src/generated/`，**进 git**。
界面上「生成这个端点的类型」只写这个端点的产物；整棵树的一致性仍然要跑 `pnpm gen:types`
（那条命令会先清空整棵树再全量写，barrel 的完整性只有它能保证）。

## 前端产物不提交

`pnpm --filter @ikenxuan/amagi-web build` 产的 `dist/` 已被 gitignore 覆盖。
这是个本地工具，不发版也不部署——谁用谁自己构建。
