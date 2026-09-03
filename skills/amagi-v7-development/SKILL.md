---
name: amagi-v7-development
description: "用 @ikenxuan/amagi v7 写代码或给它提 PR。用于：装包与建实例、按 AmagiResult 信封读返回值（`success` 判别，成功读 data、失败读 error）、调抖音/B站/快手/小红书的 SDK 方法或 HTTP 端点、启 startServer 本地服务、接实例级事件总线做日志与监控、用各平台工具函数，以及贡献者要看的分层架构、一份端点声明加接口、提交与 PR 规范。文档不写在技能里，由内置 Node 脚本从 amagi-docs.vercel.app 现取 Markdown 源文件，所以永远是站上的最新口径。关键词：amagi, @ikenxuan/amagi, amagi v7, AmagiResult, startServer, 端点注册表, douyin bilibili kuaishou xiaohongshu API。"
metadata:
  author: ikenxuan
  version: "1.0.0"
---

# amagi v7 开发

`@ikenxuan/amagi` v7 的开发参考。这个技能**不复述文档** —— 它把文档站上的原文取回来，所以不会出现「技能里的说法比站上旧一个版本」这种事。

## 先做这一步

```bash
node scripts/fetch_docs.mjs doctor
```

它一次回答三件事：Node 版本够不够、文档站能不能连上、**站上现在是不是已经有 v7 文档**。第三件事决定你接下来拿到的是 v7 还是 v6 口径，见下面「版本状态」。

## 取文档

```bash
# 全部主题，以及每一页现在能不能取
node scripts/fetch_docs.mjs list

# 取一页（主题名，或直接给 /docs/... 路径）
node scripts/fetch_docs.mjs get sdk
node scripts/fetch_docs.mjs get /docs/usage/guide/utilities

# 写业务代码要读的那一组，一次取完
node scripts/fetch_docs.mjs bundle

# 只要其中几页
node scripts/fetch_docs.mjs bundle types http events

# 不确定页面叫什么就搜
node scripts/fetch_docs.mjs search 快手
```

**内容走 stdout，诊断走 stderr**，所以 `node scripts/fetch_docs.mjs bundle > amagi.md` 得到的是干净 Markdown。加 `--raw` 去掉输出顶部的 `<!-- 出处 -->` 注释，加 `--no-cache` 绕过 15 分钟的响应缓存。

不要凭印象拼文档地址 —— 站点正在分版，路径会变。脚本每次都对着站点自己的 `/llms.txt` 索引解析，`list` 打出来的就是当下真实存在的路径。单个 HTTP 端点页（四平台共 59 个）不在主题表里，先取 `api-http` 索引，再从它列出的链接里 `get <路径>`。

## 主题

**上手与日常开发**

| 主题 | 页面 | 什么时候读 |
| --- | --- | --- |
| `start` | 使用文档首页 | 总览：两种使用姿势、统一响应形状、能力清单 |
| `install` | 安装 | 包名、包管理器、Node 版本要求 |
| `getting-started` | 快速上手 | 第一个能跑的例子 |
| `sdk` | SDK 使用指南 | 写业务代码最常读的一页 |
| `types` | 响应类型 | `AmagiResult` 信封怎么读、三条放宽类型的逃生舱 |
| `http` | HTTP 服务 | `startServer` 参数、路由结构、host 默认值的注意事项 |
| `events` | 事件系统 | 实例级事件总线：日志、监控、请求生命周期 |
| `utilities` | 工具集 | 签名算法、URL 拼接、AV/BV 转换 |

**接口参考**

| 主题 | 页面 |
| --- | --- |
| `api-http` | HTTP 端点参考索引（单个端点页从它的链接里取） |
| `sdk-douyin` / `sdk-bilibili` / `sdk-kuaishou` / `sdk-xiaohongshu` | 各平台 SDK 方法清单与参数表 |

**给贡献者**

| 主题 | 页面 |
| --- | --- |
| `architecture` | 项目架构：目录布局、分层与依赖方向 |
| `add-api` | 新增接口：v7 里加一个平台接口只要一份端点声明 |
| `contributing` | 贡献指南：提交规范与 PR 流程 |
| `ai` | AI 代理：LLMs.txt 与 MCP Server |

`bundle` 不带参数时取 `start → install → getting-started → sdk → types → http → events`，也就是写业务代码需要的那几页，不含 dev 与平台方法表。

## 版本状态：这一条会影响结论，别跳过

文档站正在把 `content/docs` 拆成 `/docs/v6/*` 与 `/docs/v7/*`，而**分版可能还没部署**。两种情况脚本都能跑，但你拿到的东西不一样：

- **已分版**（`doctor` 报「已上线」）：全部主题取到 v7 原文，正常干活。
- **未分版**（`doctor` 报「未上线」）：线上仍是不带版本前缀的旧结构，那批页面是 **v6 口径**。`api-http` 取不到（v7 才有），其余主题**降级**到 v6 页面。

降级内容在 stderr 有警告、在 stdout 的出处注释里也标了「跨版本降级」。**按降级页面写 v7 代码会出错**，这不是理论风险：v7 删了 `typeMode`、返回值改成以 `success` 判别的联合类型、事件总线从全局单例改成实例级。照 v6 文档写出来的代码要么编译不过，要么行为不符。

命中降级时的正确做法是**说明当前拿到的是 v6 口径**，而不是把它当 v7 讲。需要 v7 原文有两条路：本地把文档站跑起来（`pnpm --filter docs dev`）再设 `AMAGI_DOCS_BASE=http://127.0.0.1:3000`，或者直接读仓库里 `packages/docs/content/docs/v7/` 下的源文件。

## 退出码

`0` 成功｜`1` 用法错误或 `AMAGI_DOCS_BASE` 不对｜`2` 页面不存在（含「该版本尚未部署」）｜`3` 网络或服务端失败。

`bundle` 是例外：只要至少取到一页就返回 `0`，取不到的主题列在输出末尾 —— 否则缺一页会连带丢掉其余可用内容。

## 环境变量

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `AMAGI_DOCS_BASE` | `https://amagi-docs.vercel.app` | 换站点，比如指向本地 `next dev` |
| `AMAGI_DOCS_TIMEOUT` | `20000` | 单次请求超时（毫秒）；本地 dev server 首次编译很慢，可调大 |
| `AMAGI_DOCS_RETRIES` | `3` | 重试次数（只对超时、429、5xx 生效） |
| `AMAGI_DOCS_CONCURRENCY` | `4` | `bundle` 的并发上限 |
| `AMAGI_DOCS_CACHE_TTL` | `900000` | 响应缓存有效期（毫秒），`0` 关闭 |

## 脚本已经处理掉的边缘情况

不用替它兜这些：超时中断、429/5xx 的退避重试（服务端给了 `Retry-After` 就听它的）、DNS/TLS/断网、跟随重定向并把最终地址写进出处（旧路径会被 307 到分版路径，静默跟随会让「读到哪一版」变成隐形的）、200 却返回 HTML 或空正文（一律当失败，不把渲染后的页面当 Markdown 交出去）、索引解析出 0 页（当失败，避免「站上什么都没有」这种平凡结论）、Node < 18、tmpdir 不可写、缓存文件损坏、Windows 控制台的中文编码。

`HTTPS_PROXY` 是唯一需要你配合的：Node 的 `fetch` 默认不读代理环境变量，Node 24+ 加 `NODE_USE_ENV_PROXY=1` 即可，脚本在网络失败时会提示这一点。
