---
name: amagi-v6-to-v7-migration
description: "把项目从 @ikenxuan/amagi v6 升级到 v7。用于：迁移 amagi 依赖、修 v7 破坏性变更（默认导入的门面、AmagiResult 信封读法、typeMode 已移除、事件总线从全局单例改为实例级）、决定要不要走 /compat 兼容层、或需要 v6 与 v7 的行为对照。文档不写在技能里，由内置 Node 脚本从 amagi-docs.vercel.app 现取 Markdown 源文件，所以永远是站上的最新口径。关键词：amagi, @ikenxuan/amagi, amagi v7, amagi 迁移, migration-v7, AmagiResult, typeMode, /compat, 抖音 B站 快手 小红书 API。"
metadata:
  author: ikenxuan
  version: "1.0.0"
---

# amagi v6 → v7 迁移

`@ikenxuan/amagi` 从 v6 到 v7 有一批破坏性变更。这个技能不复述它们 —— **它把文档站上的权威原文取回来**，因为迁移最怕的就是照着一份过期的二手描述改代码。

## 先做这一步

```bash
node scripts/fetch_docs.mjs doctor
```

它会一次性回答三件事：Node 版本够不够、文档站能不能连上、以及**站上现在是不是已经有 v7 文档**。最后一件事决定了你接下来能拿到什么，见下面「版本状态」。

## 取文档

```bash
# 本技能关心的页面，以及每一页现在能不能取
node scripts/fetch_docs.mjs list

# 取一页（主题名，或直接给 /docs/... 路径）
node scripts/fetch_docs.mjs get migration
node scripts/fetch_docs.mjs get /docs/usage/guide/sdk

# 迁移要读的那一组，一次取完拼成一份
node scripts/fetch_docs.mjs bundle

# 不确定页面叫什么就搜
node scripts/fetch_docs.mjs search 事件
```

**内容走 stdout，诊断走 stderr**，所以 `node scripts/fetch_docs.mjs bundle > migration.md` 得到的是干净 Markdown。加 `--raw` 去掉输出顶部的 `<!-- 出处 -->` 注释，加 `--no-cache` 绕过 15 分钟的响应缓存。

不要凭印象拼文档地址 —— 站点正在分版，路径会变。脚本每次都对着站点自己的 `/llms.txt` 索引解析，`list` 打出来的就是当下真实存在的路径。

## 主题

| 主题 | 页面 | 迁移时为什么要读 |
| --- | --- | --- |
| `migration` | v6 → v7 迁移指南 | 主文档：四处必改、`/compat` 一行切回 v6 语义、完整迁移矩阵 |
| `envelope` | 响应类型 | `typeMode` 已删，返回值改成以 `success` 判别的联合类型 —— 最容易漏的一处 |
| `sdk` | SDK 使用指南 | 默认导入的门面变化与实例创建方式 |
| `events` | 事件系统 | 全局单例事件总线改为实例级，负载多了 `meta` |
| `http` | HTTP 服务 | `startServer` 的参数形态与路由前缀 |
| `v6-baseline` | v6 使用文档首页 | 「改之前长什么样」的基线 |
| `v5-to-v6` | v5 → v6 迁移指南 | 还停在 v5 的项目要先走这一步 |

`bundle` 不带参数时按 `migration → envelope → sdk → events → http → v6-baseline` 的顺序取。

## 版本状态：这一条会影响结论，别跳过

文档站正在把 `content/docs` 拆成 `/docs/v6/*` 与 `/docs/v7/*`，而**分版可能还没部署**。两种情况脚本都能跑，但你能得到的东西不一样：

- **已分版**（`doctor` 报「已上线」）：七个主题全部取到 v7 原文，正常干活。
- **未分版**（`doctor` 报「未上线」）：线上仍是不带版本前缀的旧结构，那批页面是 **v6 口径**。此时 `migration` 主题取不到（脚本退出码 2 并说明原因），其余主题会**降级**到 v6 页面。

降级内容在 stderr 有警告、在 stdout 的出处注释里也标了「跨版本降级」。**降级页面只能当基线读，不能当 v7 指导引用。** 把 v6 文档说成 v7 行为，是这个技能唯一不可接受的失败方式 —— 拿不到 v7 原文时，宁可告诉用户「站上还没有」，也不要推测 v7 的行为。

需要立刻拿到 v7 原文而分版还没上线时，有两条路：在本地把文档站跑起来（`pnpm --filter docs dev`）然后 `AMAGI_DOCS_BASE=http://127.0.0.1:3000`，或者直接读仓库里 `packages/docs/content/docs/v7/` 下的源文件。

## 退出码

`0` 成功｜`1` 用法错误或 `AMAGI_DOCS_BASE` 不对｜`2` 页面不存在（含「该版本尚未部署」）｜`3` 网络或服务端失败。

`bundle` 是例外：只要至少取到一页就返回 `0`，取不到的主题列在输出末尾 —— 否则分版没上线时会因为缺一个 `migration` 而丢掉另外五页。

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
