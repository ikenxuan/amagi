#!/usr/bin/env node
/**
 * 从 amagi 文档站取 Markdown 源文件 —— v7 开发技能专用的一组页面。
 *
 * 只读：不写仓库、不改文件，唯一的落盘是 tmpdir 里的响应缓存。
 *
 * 用法：
 *   node scripts/fetch_docs.mjs list              本技能关心的页面在站上是否真的存在
 *   node scripts/fetch_docs.mjs get <主题|路径>    取一页 Markdown 打到 stdout
 *   node scripts/fetch_docs.mjs bundle [主题...]   按顺序取一组页面拼成一份
 *   node scripts/fetch_docs.mjs search <关键词>    在站点索引的标题与路径里找页
 *   node scripts/fetch_docs.mjs doctor            只探活：Node、站点可达性、索引条数
 *
 * 选项：--raw 不在输出里插 `<!-- 出处 -->` 注释；--no-cache 绕过缓存。
 *
 * **内容走 stdout，诊断走 stderr**，所以 `... get sdk > sdk.md` 拿到的是干净 Markdown。
 *
 * 退出码：0 成功｜1 用法错误｜2 页面不存在（含「该版本尚未部署」）｜3 网络或服务端失败。
 *
 * 环境变量：AMAGI_DOCS_BASE / _TIMEOUT / _RETRIES / _CONCURRENCY / _CACHE_TTL。
 *
 * 这个文件与 `amagi-v6-to-v7-migration` 技能里的同名脚本是**有意的孪生**：请求引擎逐行相同，
 * 差异只有三处 —— 下面那张 TOPICS 表、`dieOnUnresolved` 与 `provenance` 里那两句
 * 面向本技能的提示。技能要能被单独安装，不能共享代码。
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ─────────────────────────────── 配置 ───────────────────────────────

/** @param {string|undefined} value @param {number} fallback @returns {number} */
const int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const BASE = (process.env.AMAGI_DOCS_BASE || 'https://amagi-docs.vercel.app').replace(/\/+$/, '')
const TIMEOUT_MS = int(process.env.AMAGI_DOCS_TIMEOUT, 20_000)
const RETRIES = int(process.env.AMAGI_DOCS_RETRIES, 3)
const CONCURRENCY = Math.max(1, int(process.env.AMAGI_DOCS_CONCURRENCY, 4))
/** 0 = 关缓存。`--no-cache` 也走这里置 0（在入口解析参数时） */
let cacheTtlMs = int(process.env.AMAGI_DOCS_CACHE_TTL, 15 * 60 * 1000)
const UA = 'amagi-docs-skill/1.0 (+https://github.com/ikenxuan/amagi)'

/** 站点约定：任意文档页地址后加 `.mdx` 即得该页 Markdown 源文件（见站上 /llms.txt） */
const MD_SUFFIX = '.mdx'
/** 站点索引：一行一个 `- [标题](/路径)` */
const INDEX_PATH = '/llms.txt'

// ───────────────────── 本技能关心的页面（v7 开发视角） ─────────────────────

/**
 * 逻辑主题 → 候选路径，按优先级排。
 *
 * 为什么是「候选」而不是一条写死的路径：文档站正在分版（`/docs/v6/*` 与 `/docs/v7/*`），
 * 而**分版可能尚未上线**——线上仍是不带版本前缀的旧结构，那批页面是 v6 口径。
 * 写死 v7 路径的脚本在分版上线前全 404，写死旧路径的脚本等分版上线后又会静默变成 v6 内容。
 * 所以路径一律在运行时对着站点索引解析，并且每个候选都标注它的版本口径。
 *
 * `fallback: true` 的候选是**跨版本降级**：内容不是 v7 口径。命中它时脚本会在
 * stderr 大声警告、并在 stdout 的出处注释里写明——按 v6 文档写 v7 代码会得到
 * 编译不过或行为不符的结果（`typeMode` 已删、信封改成判别联合、事件总线改成实例级）。
 */
const TOPICS = {
  start: {
    title: '使用文档首页',
    why: '总览：两种使用姿势、统一响应形状、能力清单。不知道从哪读起就读它',
    candidates: [
      { path: '/docs/v7/usage', version: 'v7' },
      { path: '/docs/usage', version: 'v6', fallback: true }
    ]
  },
  install: {
    title: '安装',
    why: '包名、包管理器、Node 版本要求',
    candidates: [
      { path: '/docs/v7/usage/installation', version: 'v7' },
      { path: '/docs/usage/installation', version: 'v6', fallback: true }
    ]
  },
  'getting-started': {
    title: '快速上手',
    why: '第一个可运行的例子：建实例、取数据、读返回值',
    candidates: [
      { path: '/docs/v7/usage/getting-started', version: 'v7' },
      { path: '/docs/usage/getting-started', version: 'v6', fallback: true }
    ]
  },
  sdk: {
    title: 'SDK 使用指南',
    why: '写业务代码最常读的一页：实例、门面、请求配置',
    candidates: [
      { path: '/docs/v7/usage/guide/sdk', version: 'v7' },
      { path: '/docs/usage/guide/sdk', version: 'v6', fallback: true }
    ]
  },
  types: {
    title: '响应类型（AmagiResult 信封）',
    why: '返回值以 `success` 判别，成功读 `data`、失败读 `error`；三条放宽类型的逃生舱在这里',
    candidates: [
      { path: '/docs/v7/usage/guide/type-mode', version: 'v7' },
      { path: '/docs/usage/guide/type-mode', version: 'v6', fallback: true }
    ]
  },
  http: {
    title: 'HTTP 服务',
    why: '`startServer` 的参数、路由结构、鉴权与 host 默认值的注意事项',
    candidates: [
      { path: '/docs/v7/usage/guide/http-server', version: 'v7' },
      { path: '/docs/usage/guide/http-server', version: 'v6', fallback: true }
    ]
  },
  events: {
    title: '事件系统',
    why: '实例级事件总线：日志、监控、请求生命周期',
    candidates: [
      { path: '/docs/v7/usage/guide/events', version: 'v7' },
      { path: '/docs/usage/guide/events', version: 'v6', fallback: true }
    ]
  },
  utilities: {
    title: '工具集',
    why: '签名算法、URL 拼接、AV/BV 转换等各平台工具函数',
    candidates: [
      { path: '/docs/v7/usage/guide/utilities', version: 'v7' },
      { path: '/docs/usage/guide/utilities', version: 'v6', fallback: true }
    ]
  },
  'api-http': {
    title: 'HTTP 端点参考（索引）',
    why: '四平台全部 HTTP 端点的总览；单个端点页从这一页的链接里取',
    candidates: [{ path: '/docs/v7/usage/api/http', version: 'v7' }]
  },
  'sdk-douyin': {
    title: '抖音 SDK 方法',
    why: '抖音平台的方法清单与参数表，由端点注册表派生',
    candidates: [
      { path: '/docs/v7/usage/api/sdk/douyin', version: 'v7' },
      { path: '/docs/usage/api/douyin', version: 'v6', fallback: true }
    ]
  },
  'sdk-bilibili': {
    title: 'B站 SDK 方法',
    why: 'B站平台的方法清单与参数表',
    candidates: [
      { path: '/docs/v7/usage/api/sdk/bilibili', version: 'v7' },
      { path: '/docs/usage/api/bilibili', version: 'v6', fallback: true }
    ]
  },
  'sdk-kuaishou': {
    title: '快手 SDK 方法',
    why: '快手平台的方法清单与参数表',
    candidates: [
      { path: '/docs/v7/usage/api/sdk/kuaishou', version: 'v7' },
      { path: '/docs/usage/api/kuaishou', version: 'v6', fallback: true }
    ]
  },
  'sdk-xiaohongshu': {
    title: '小红书 SDK 方法',
    why: '小红书平台的方法清单与参数表',
    candidates: [
      { path: '/docs/v7/usage/api/sdk/xiaohongshu', version: 'v7' },
      { path: '/docs/usage/api/xiaohongshu', version: 'v6', fallback: true }
    ]
  },
  architecture: {
    title: '项目架构',
    why: '给贡献者：目录布局、分层与依赖方向',
    candidates: [
      { path: '/docs/v7/dev/architecture', version: 'v7' },
      { path: '/docs/dev/architecture', version: 'v6', fallback: true }
    ]
  },
  'add-api': {
    title: '新增接口',
    why: '给贡献者：v7 里加一个平台接口只要一份端点声明',
    candidates: [
      { path: '/docs/v7/dev/add-api', version: 'v7' },
      { path: '/docs/dev/add-api', version: 'v6', fallback: true }
    ]
  },
  contributing: {
    title: '贡献指南',
    why: '给贡献者：提交规范与 PR 流程',
    candidates: [
      { path: '/docs/v7/dev/contributing', version: 'v7' },
      { path: '/docs/dev/contributing', version: 'v6', fallback: true }
    ]
  },
  ai: {
    title: 'AI 代理（LLMs.txt 与 MCP Server）',
    why: '让编码助手直接读文档或调接口的两条通路',
    candidates: [
      { path: '/docs/v7/ai', version: 'v7' },
      { path: '/docs/ai/llms-txt', version: 'v6', fallback: true }
    ]
  }
}

/** `bundle` 不带参数时的默认顺序：写业务代码需要的那几页，不含 dev 与平台方法表 */
const DEFAULT_BUNDLE = ['start', 'install', 'getting-started', 'sdk', 'types', 'http', 'events']

// ─────────────────────────── 输出与退出码 ───────────────────────────

const EXIT = { ok: 0, usage: 1, missing: 2, network: 3 }

/**
 * 诊断信息一律走 stderr。Windows 控制台默认代码页不是 UTF-8，中文经 console 会花屏，
 * 所以自己写 Buffer，绕开 console 的再编码。
 * @param {string} line - 一行文本
 */
const note = (line) => process.stderr.write(Buffer.from(`${line}\n`, 'utf8'))
/** @param {string} text - 正文（不自动换行） */
const out = (text) => process.stdout.write(Buffer.from(text, 'utf8'))

/**
 * @param {number} code - 退出码
 * @param {string} message - 给人看的原因
 * @returns {never}
 */
const die = (code, message) => {
  note(`✗ ${message}`)
  process.exit(code)
}

// ─────────────────────────────── 前置检查 ───────────────────────────────

/**
 * 环境自检。`fetch` 与 `AbortSignal.timeout` 都是 Node 18 才稳定的全局量，
 * 缺了它们的报错（`fetch is not defined`）对使用者毫无提示价值，这里先换成人话。
 */
const preflight = () => {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10)
  if (!Number.isFinite(major) || major < 18) {
    die(EXIT.usage, `需要 Node 18 或更高（当前 ${process.versions.node}）—— 全局 fetch 与 AbortSignal.timeout 在更早的版本上不可用`)
  }
  if (typeof fetch !== 'function') die(EXIT.usage, `当前 Node（${process.versions.node}）没有全局 fetch，请升级到 18+`)
}

// ─────────────────────────────── 缓存 ───────────────────────────────

const CACHE_DIR = join(tmpdir(), 'amagi-docs-skill-cache')

/**
 * 读缓存。任何异常都当未命中 —— 缓存是加速手段，不该成为失败来源
 * （tmpdir 不可写、上次写到一半、JSON 损坏，都走同一条路）。
 * @param {string} key - 缓存键（URL）
 * @returns {{status:number,body:string,contentType:string,finalUrl:string}|undefined} 命中的响应
 */
const cacheGet = (key) => {
  if (cacheTtlMs === 0) return undefined
  try {
    const file = join(CACHE_DIR, `${createHash('sha1').update(key).digest('hex')}.json`)
    const entry = JSON.parse(readFileSync(file, 'utf8'))
    if (typeof entry?.ts !== 'number' || Date.now() - entry.ts > cacheTtlMs) return undefined
    return entry.res
  } catch {
    return undefined
  }
}

/**
 * 写缓存，同样吞掉一切异常
 * @param {string} key - 缓存键（URL）
 * @param {object} res - 要缓存的响应
 */
const cacheSet = (key, res) => {
  if (cacheTtlMs === 0) return
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    const file = join(CACHE_DIR, `${createHash('sha1').update(key).digest('hex')}.json`)
    writeFileSync(file, JSON.stringify({ ts: Date.now(), res }), 'utf8')
  } catch {
    /* 缓存写不进去不影响结果 */
  }
}

// ─────────────────────────────── HTTP ───────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
/** 4xx（除 408/429）是「请求本身不对」，重试多少次都一样，只有这几类值得再试 */
const retryable = (status) => status === 0 || status === 408 || status === 429 || status >= 500

/**
 * 带超时 / 重试 / 退避的 GET。
 *
 * 边缘情况都在这里兜：
 * - 超时用 `AbortSignal.timeout`，避免挂死在无响应的连接上；
 * - 429 与 5xx 退避重试，服务端给了 `Retry-After` 就听它的（秒数或 HTTP 日期都认）；
 * - 退避带抖动，免得多个页面的重试挤在同一毫秒；
 * - DNS / TLS / 断网这类抛异常的失败当 status 0 处理，与 5xx 同一条重试路径；
 * - 跟随重定向（站点把旧路径 307 到分版路径），但把最终地址带回去 —— 调用方需要知道
 *   自己拿到的到底是哪一版，静默跟随会让「读到的是 v6 还是 v7」变成一件不可见的事。
 * @param {string} url - 完整地址
 * @returns {Promise<{status:number,body:string,contentType:string,finalUrl:string,error?:string}>} 响应
 */
const httpGet = async (url) => {
  const cached = cacheGet(url)
  if (cached) return cached

  let last = { status: 0, body: '', contentType: '', finalUrl: url, error: '未发起请求' }
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    if (attempt > 0) {
      const hinted = Number.parseInt(last.retryAfter ?? '', 10)
      const wait = Number.isFinite(hinted) && hinted > 0 ? Math.min(hinted * 1000, 15_000) : 2 ** (attempt - 1) * 500 + Math.random() * 250
      note(`  ↻ 第 ${attempt}/${RETRIES} 次重试（等 ${Math.round(wait)}ms）：${last.error ?? `HTTP ${last.status}`}`)
      await sleep(wait)
    }
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/markdown, text/plain, */*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      last = {
        status: res.status,
        body: res.ok ? await res.text() : '',
        contentType: res.headers.get('content-type') ?? '',
        finalUrl: res.url || url,
        retryAfter: res.headers.get('retry-after') ?? undefined,
        error: res.ok ? undefined : `HTTP ${res.status} ${res.statusText}`
      }
      if (res.ok) {
        cacheSet(url, last)
        return last
      }
      if (!retryable(res.status)) return last
    } catch (error) {
      // AbortError（超时）、TypeError（DNS/TLS/连接被拒）都落这里
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      last = { status: 0, body: '', contentType: '', finalUrl: url, error: reason }
    }
  }
  return last
}

/**
 * 把 HTTP 失败翻译成使用者能直接行动的一句话。
 * @param {{status:number,error?:string}} res - 失败的响应
 * @param {string} url - 请求地址
 * @returns {never}
 */
const dieOnHttp = (res, url) => {
  if (res.status === 404) die(EXIT.missing, `站上没有这一页：${url}\n  先跑 \`node scripts/fetch_docs.mjs list\` 看实际可用的路径`)
  if (res.status === 0) {
    const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy
    const hint = proxy
      ? `\n  检测到 HTTPS_PROXY=${proxy}：Node 的 fetch 默认不读代理环境变量，Node 24+ 可用 NODE_USE_ENV_PROXY=1 打开`
      : '\n  看着像网络不通：确认能访问该域名，或用 AMAGI_DOCS_BASE 指到可达的镜像/本地 next dev'
    die(EXIT.network, `请求失败（重试 ${RETRIES} 次后仍失败）：${url}\n  ${res.error}${hint}`)
  }
  die(EXIT.network, `站点返回 ${res.status}：${url}\n  ${res.error ?? ''}`)
}

// ───────────────────────── 站点索引与主题解析 ─────────────────────────

/**
 * 取站点索引。`/llms.txt` 是文档站自己生成的全站页面清单（`- [标题](/路径)` 一行一个），
 * 它是唯一能在运行时回答「这个路径到底存不存在」的权威来源。
 *
 * 拿到 0 条就直接失败，不返回空表：空索引会让后面每一次「路径不存在」的判断
 * 都变成平凡真，脚本会一路报「该页面未部署」，而真实原因是索引没解析出来。
 * @returns {Promise<{title:string,path:string}[]>} 页面清单
 */
const fetchIndex = async () => {
  const url = `${BASE}${INDEX_PATH}`
  const res = await httpGet(url)
  if (res.status === 404) {
    die(EXIT.usage, `${url} 返回 404 —— AMAGI_DOCS_BASE 指的地方不像 amagi 文档站（它必须提供 /llms.txt 索引）。\n  当前 BASE：${BASE}`)
  }
  if (res.status !== 200) dieOnHttp(res, url)
  const pages = [...res.body.matchAll(/^-\s*\[([^\]]+)]\((\/[^)\s]*)\)\s*$/gm)].map((m) => ({
    title: m[1],
    path: m[2].replace(/\/+$/, '')
  }))
  if (pages.length === 0) {
    die(
      EXIT.network,
      `${url} 解析出 0 个页面 —— 索引格式变了或返回的不是索引本身（Content-Type: ${res.contentType || '无'}）。\n  先修脚本的解析规则，别把空索引当成「站上什么都没有」`
    )
  }
  return pages
}

/**
 * 解析一个主题到实际可取的路径。
 * @param {string} name - 主题名
 * @param {{title:string,path:string}[]} index - 站点索引
 * @returns {{topic:object,hit?:object,tried:string[]}} 命中的候选（没有则 hit 为空）
 */
const resolveTopic = (name, index) => {
  const topic = TOPICS[name]
  if (!topic) return { topic: undefined, tried: [] }
  const known = new Set(index.map((page) => page.path))
  const hit = topic.candidates.find((candidate) => known.has(candidate.path))
  return { topic, hit, tried: topic.candidates.map((candidate) => candidate.path) }
}

/** 站上是否已经有分版结构（`/docs/v7/*`）—— 决定「取不到」该怎么解释 */
const hasVersionedPaths = (index) => index.some((page) => page.path.startsWith('/docs/v7/'))

/**
 * 主题取不到时的解释。分不分版是两种完全不同的处境，说错了会把人引到错误的方向。
 * @param {string} name - 主题名
 * @param {string[]} tried - 试过的路径
 * @param {{title:string,path:string}[]} index - 站点索引
 * @returns {never}
 */
const dieOnUnresolved = (name, tried, index) => {
  const lines = [`主题 \`${name}\` 在站上找不到对应页面，试过：${tried.join('、')}`]
  if (!hasVersionedPaths(index)) {
    lines.push(
      '  站点索引里没有任何 `/docs/v7/*` 路径 —— **分版文档尚未部署**，线上仍是不带版本前缀的旧结构（v6 口径）。',
      '  v7 独有的页面（HTTP 端点参考、按平台派生的 SDK 方法表、v7 的 dev 与 ai 板块）现在取不到，',
      '  等 refactor-v7 上线后同一条命令即可生效。其余主题会自动降级到 v6 页面，`list` 里标了「降级」。',
      '  要立刻拿到 v7 原文：本地跑 `pnpm --filter docs dev` 后设 AMAGI_DOCS_BASE=http://127.0.0.1:3000。'
    )
  } else {
    lines.push('  站上已有分版结构，但这几个路径都不在索引里 —— 页面可能改名或下线了，跑 `search` 找现在的名字。')
  }
  die(EXIT.missing, lines.join('\n'))
}

// ─────────────────────────── 取一页 Markdown ───────────────────────────

/**
 * 取一页 Markdown 源文件。
 *
 * 两个 200 也不能信的情况在这里挡掉：
 * 1. **Content-Type 不是 markdown/plain**：说明拿到的是渲染后的 HTML 页面（rewrite 失效、
 *    或被某个边缘节点的错误页顶掉）。把一整篇 HTML 当 Markdown 交给上层，比直接失败更糟；
 * 2. **正文为空或以 `<` 开头**：同上，且能挡住 0 字节的成功响应。
 * @param {string} path - 文档页路径（不带 `.mdx`）
 * @returns {Promise<{markdown:string,url:string,finalUrl:string,redirected:boolean}>} 页面内容与出处
 */
const fetchPage = async (path) => {
  const url = `${BASE}${path}${MD_SUFFIX}`
  const res = await httpGet(url)
  if (res.status !== 200) dieOnHttp(res, url)

  const type = res.contentType.toLowerCase()
  const looksHtml = res.body.trimStart().startsWith('<')
  if (looksHtml || !(type.includes('markdown') || type.includes('text/plain'))) {
    die(
      EXIT.network,
      `${url} 返回了 200，但内容不是 Markdown（Content-Type: ${res.contentType || '无'}${looksHtml ? '，正文以 `<` 开头' : ''}）。\n  站点的 \`/docs/*.mdx\` → \`/llms.mdx/docs/*\` 重写可能失效了；换 AMAGI_DOCS_BASE 或稍后再试`
    )
  }
  if (res.body.trim() === '') die(EXIT.network, `${url} 返回了 200 但正文是空的 —— 当失败处理，别把空文档交上去`)

  return { markdown: res.body, url, finalUrl: res.finalUrl, redirected: res.finalUrl !== url }
}

/**
 * 出处注释。用 HTML 注释而不是 Markdown 引用块：渲染后不可见，但读文本的人和模型都看得到，
 * 而 `--raw` 想要的「干净源文件」也只差这一行。
 * @param {object} info - 出处信息
 * @returns {string} 一段 HTML 注释
 */
const provenance = ({ title, version, fallback, url, finalUrl, redirected }) => {
  const lines = [`来源：${url}`, `页面：${title}`, `口径：${version}`]
  if (redirected) lines.push(`注意：请求被重定向到 ${finalUrl} —— 实际读到的是这个地址的内容`)
  if (fallback) {
    lines.push(
      '警告：这是**跨版本降级**内容，不是 v7 口径。按它写 v7 代码会出错（typeMode 已删、信封改判别联合、事件总线改实例级），只能当参考读。'
    )
  }
  return `<!--\n${lines.map((line) => `  ${line}`).join('\n')}\n-->\n\n`
}

/**
 * 并发取多页，保持入参顺序。并发压到个位数是对站点的基本礼貌，
 * 也避免 Vercel 那边把一串并发请求判成异常流量后返回 429。
 * @param {object[]} items - 待取条目
 * @param {(item:object)=>Promise<object>} worker - 取单条
 * @returns {Promise<object[]>} 与入参同序的结果
 */
const mapLimit = async (items, worker) => {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}

// ─────────────────────────────── 子命令 ───────────────────────────────

const USAGE = `用法：node scripts/fetch_docs.mjs <命令> [参数] [--raw] [--no-cache]

  list                 列出本技能关心的主题，以及它们在站上的实际可用状态
  get <主题|路径>       取一页 Markdown（路径形如 /docs/usage/guide/sdk，不带 .mdx）
  bundle [主题...]      按顺序取一组页面拼成一份；不给主题则取默认那一组
  search <关键词>       在站点索引的标题与路径里找页
  doctor               只探活：Node 版本、站点可达性、索引条数、分版是否已上线

主题：${Object.keys(TOPICS).join('、')}
站点：${BASE}（改 AMAGI_DOCS_BASE 可指向本地 next dev）`

/** list：一眼看清哪些主题现在真的能取 */
const cmdList = async () => {
  const index = await fetchIndex()
  note(`站点索引 ${index.length} 页${hasVersionedPaths(index) ? '（已分版）' : '（未分版：线上仍是旧结构，v6 口径）'}`)
  const rows = Object.keys(TOPICS).map((name) => {
    const { topic, hit } = resolveTopic(name, index)
    const state = hit
      ? hit.fallback
        ? `降级 → ${hit.path}（${hit.version}）`
        : `可取 → ${hit.path}（${hit.version}）`
      : '不可取（该版本未部署）'
    return `${name.padEnd(14)} ${state}\n${' '.repeat(15)}${topic.title} —— ${topic.why}`
  })
  out(`${rows.join('\n')}\n`)
}

/**
 * get：取一页。参数既可以是主题名，也可以是站点路径 —— 索引里的路径可以直接抄进来用。
 * @param {string} target - 主题名或 `/docs/...` 路径
 * @param {boolean} raw - 是否省掉出处注释
 */
const cmdGet = async (target, raw) => {
  if (target.startsWith('/')) {
    const page = await fetchPage(target.replace(/\.mdx$/, '').replace(/\/+$/, ''))
    out(raw ? page.markdown : provenance({ title: target, version: '按路径直取，未判定口径', ...page }) + page.markdown)
    return
  }
  const index = await fetchIndex()
  const { topic, hit, tried } = resolveTopic(target, index)
  if (!topic) die(EXIT.usage, `没有这个主题：${target}\n\n${USAGE}`)
  if (!hit) dieOnUnresolved(target, tried, index)
  if (hit.fallback) note(`⚠ 主题 ${target} 降级到 ${hit.path}（${hit.version} 口径），不是 v7 内容 —— 出处注释里已标注`)
  const page = await fetchPage(hit.path)
  out(raw ? page.markdown : provenance({ title: topic.title, version: hit.version, fallback: hit.fallback, ...page }) + page.markdown)
}

/**
 * bundle：一次取一组。**取不到的主题不让整条命令失败** —— 分版没上线时
 * `migration` 必然缺席，若因此整个 bundle 报错，剩下五页可用内容就一起拿不到了。
 * 缺席的主题在末尾列清楚，退出码仍为 0；一页都没取到才算失败。
 * @param {string[]} names - 主题名
 * @param {boolean} raw - 是否省掉出处注释
 */
const cmdBundle = async (names, raw) => {
  const index = await fetchIndex()
  const wanted = names.length > 0 ? names : DEFAULT_BUNDLE
  const unknown = wanted.filter((name) => !TOPICS[name])
  if (unknown.length > 0) die(EXIT.usage, `没有这些主题：${unknown.join('、')}\n\n${USAGE}`)

  const resolved = wanted.map((name) => ({ name, ...resolveTopic(name, index) }))
  const available = resolved.filter((item) => item.hit)
  const missing = resolved.filter((item) => !item.hit)
  if (available.length === 0)
    dieOnUnresolved(
      wanted[0],
      resolved.flatMap((item) => item.tried),
      index
    )

  note(`取 ${available.length}/${wanted.length} 页（并发 ${CONCURRENCY}）`)
  const degraded = available.filter((item) => item.hit.fallback)
  if (degraded.length > 0) {
    note(`⚠ ${degraded.length} 个主题降级到 v6 页面：${degraded.map((item) => item.name).join('、')} —— 不是 v7 口径，出处注释里已逐页标注`)
  }
  const pages = await mapLimit(available, async (item) => ({ item, page: await fetchPage(item.hit.path) }))

  const parts = pages.map(({ item, page }) => {
    const head = raw ? '' : provenance({ title: item.topic.title, version: item.hit.version, fallback: item.hit.fallback, ...page })
    // 小节标题用 `#`：各页正文自己的标题从 `##` 起（页标题在 frontmatter 里），
    // 用同级的 `##` 会和正文混在一层，读的人分不清哪一行是「这是哪一页」
    return `${head}# ${item.topic.title}\n\n${page.markdown.trim()}\n`
  })
  if (missing.length > 0) {
    const list = missing.map((item) => `- \`${item.name}\`（${item.topic.title}）：试过 ${item.tried.join('、')}`).join('\n')
    parts.push(
      `# 本次未取到的页面\n\n${list}\n\n站上${hasVersionedPaths(index) ? '已分版，这些路径可能改名或下线' : '尚未部署分版文档，v7 专属内容暂不可取'}。\n`
    )
    note(`⚠ ${missing.length} 个主题未取到：${missing.map((item) => item.name).join('、')}（详情见输出末尾）`)
  }
  out(`${parts.join('\n---\n\n')}`)
}

/**
 * search：在索引里按关键词找页。标题与路径都匹配，大小写不敏感
 * @param {string} keyword - 关键词
 */
const cmdSearch = async (keyword) => {
  const index = await fetchIndex()
  const needle = keyword.toLowerCase()
  const hits = index.filter((page) => page.title.toLowerCase().includes(needle) || page.path.toLowerCase().includes(needle))
  if (hits.length === 0) die(EXIT.missing, `索引 ${index.length} 页里没有匹配「${keyword}」的 —— 用 \`list\` 看全部主题，或换个词`)
  out(`${hits.map((page) => `${page.path}\t${page.title}`).join('\n')}\n`)
}

/** doctor：只回答「现在能不能取、站上是什么形态」，不取正文 */
const cmdDoctor = async () => {
  note(`Node ${process.versions.node}｜站点 ${BASE}｜超时 ${TIMEOUT_MS}ms｜重试 ${RETRIES}｜并发 ${CONCURRENCY}｜缓存 ${cacheTtlMs}ms`)
  const index = await fetchIndex()
  const versioned = hasVersionedPaths(index)
  const ready = Object.keys(TOPICS).filter((name) => resolveTopic(name, index).hit)
  out(
    [
      `站点可达：${BASE}${INDEX_PATH} → 200，解析出 ${index.length} 页`,
      `分版结构：${versioned ? '已上线（存在 /docs/v7/* 路径）' : '未上线（线上是不带版本前缀的旧结构，v6 口径）'}`,
      `可取主题：${ready.length}/${Object.keys(TOPICS).length}${ready.length > 0 ? ` —— ${ready.join('、')}` : ''}`
    ].join('\n') + '\n'
  )
}

// ─────────────────────────────── 入口 ───────────────────────────────

const main = async () => {
  preflight()
  const argv = process.argv.slice(2)
  const raw = argv.includes('--raw')
  if (argv.includes('--no-cache')) cacheTtlMs = 0
  const rest = argv.filter((arg) => !arg.startsWith('--'))
  const [command, ...args] = rest

  switch (command) {
    case 'list':
      return cmdList()
    case 'get':
      if (!args[0]) die(EXIT.usage, `get 需要一个主题名或路径\n\n${USAGE}`)
      return cmdGet(args[0], raw)
    case 'bundle':
      return cmdBundle(args, raw)
    case 'search':
      if (!args[0]) die(EXIT.usage, `search 需要一个关键词\n\n${USAGE}`)
      return cmdSearch(args[0])
    case 'doctor':
      return cmdDoctor()
    default:
      die(EXIT.usage, command ? `未知命令：${command}\n\n${USAGE}` : USAGE)
  }
}

await main()
