/**
 * 控制台的 Node 侧。**本地开发工具**：填参 → 发请求 → 看即将写入的类型 diff →
 * 决定留下还是丢掉 → 就地生成类型。
 *
 *   pnpm --filter @ikenxuan/amagi-web server          默认只监听 127.0.0.1:7345
 *   pnpm --filter @ikenxuan/amagi-web server --port 8080
 *   pnpm --filter @ikenxuan/amagi-web server --host 0.0.0.0 --token <口令>
 *
 * 浏览器侧是另一个进程（`pnpm dev`，Vite dev server 把 `/api/*` 代理到这里）。
 * 分成两个进程不是选择：core 是 Node-only（axios / express / protobufjs / node:crypto），
 * 打不进浏览器包。
 *
 * 三条安全约定，都不是可选项：
 *
 * 1. **默认只绑 `127.0.0.1`**。要绑别的地址必须同时给 `--token`，否则直接拒绝启动 ——
 *    这个服务能拿本机 cookie 发请求，暴露在局域网上等于把账号借出去。
 * 2. **cookie 一个字都不回显**。接口只回「已提供 / 未提供」，页面上没有任何地方能读到它。
 * 3. **录制与入库分开两步**。录完先留在内存里，人看过类型 diff 再决定写不写盘 ——
 *    这正是这个工具存在的理由：那个决定纯自动做不了。
 */

import { createServer, type IncomingMessage } from 'node:http'

import { createScrubSession, expandParamMatrix, type JsonValue, planCorpusTypes, resolveSeeds } from '@ikenxuan/amagi-typegen'

import type { AnyEndpointDef } from '../../core/src/contracts/endpoint'
import type { Platform } from '../../core/src/contracts/platform'
import { buildEndpointList, PLATFORMS, REGISTRIES, schemaOf } from './endpoints'
import { buildOutcome, isEndpointOwnedFile, type PendingSample, type RecordOutcome } from './outcome'
import { captureRaw } from './record'
import { readAmagiVersion, readSamples, readSeeds, writeGenerated, writeSample } from './storage'

/** Vite 那边的代理目标写死了这个端口（见 `vite.config.ts`） */
const DEFAULT_PORT = 7345

/** 批量录制的组间隔。固定间隔、不并发、不重试 —— 并发是最快触发风控的方式 */
const BATCH_INTERVAL_MS = 1500

/* ------------------------------------------------------------------ 命令行与安全 */

const argOf = (name: string): string | undefined => {
  // 同时认 `--host x` 与 `--host=x`：后者是更常见的手感，原先那版只认前者、
  // 写成等号形式会静默回落到默认值（绑局域网时那是个安全问题）
  const withEquals = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (withEquals !== undefined) return withEquals.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index < 0 ? undefined : process.argv[index + 1]
}

const host = argOf('host') ?? '127.0.0.1'
const rawPort = argOf('port')
const port = rawPort === undefined ? DEFAULT_PORT : Number(rawPort)
const token = argOf('token')

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  // `Number('abc')` 是 NaN，而 `server.listen(NaN)` 会抛 ERR_SOCKET_BAD_PORT ——
  // 那个报错读起来完全不像「你把端口写错了」
  console.error(`--port 要是 1..65535 的整数，收到的是 ${JSON.stringify(rawPort)}`)
  process.exit(1)
}

// 绑非回环地址必须给口令。这条是硬拒绝而不是告警：这个服务能拿本机 cookie 发请求
if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1' && (token === undefined || token.length < 8)) {
  console.error(`绑定 ${host} 必须同时给 --token（至少 8 位）—— 这个服务能拿本机 cookie 发请求，裸奔等于把账号借出去`)
  process.exit(1)
}

/** cookie 从环境变量读，与 `record-corpus.mts` 同一条惯例。**永不回显** */
const cookieOf = (platform: Platform): string => process.env[`AMAGI_COOKIE_${platform.toUpperCase()}`] ?? ''

const amagiVersion = readAmagiVersion()

/**
 * 同一次会话共用一个脱敏 session：同一个人在这一批样本里换完还是同一个假身份。
 *
 * **按平台各一个**，不是全局一个 —— 抖音样本与 B 站样本共用一张假值映射表没有意义，
 * 而且会让两个平台的样本产生虚假的关联。`record-corpus.mts` 就是每平台一份。
 */
const sessions = new Map<Platform, ReturnType<typeof createScrubSession>>()
const sessionOf = (platform: Platform) => {
  const existing = sessions.get(platform)
  if (existing !== undefined) return existing
  const created = createScrubSession()
  sessions.set(platform, created)
  return created
}

/**
 * 录完先放这儿，等人看过 diff 再决定写不写盘。
 *
 * 键是随机 id 而不是参数哈希 —— 同一组参数可以录多次（那正是「这次是风控页，重录一次」
 * 这个动作）。进程重启即全丢，唯一的补救是 `/api/store` 那条 404。
 */
const pending = new Map<string, PendingSample>()

let idCounter = 0
const newId = (): string => `${Date.now().toString(36)}${(idCounter++).toString(36)}`

/* ------------------------------------------------------------------ 录一发 */

const recordOne = async (platform: Platform, endpoint: string, params: Record<string, JsonValue>): Promise<RecordOutcome> => {
  const def = REGISTRIES[platform]?.[endpoint] as AnyEndpointDef | undefined
  if (def === undefined) return { ok: false, verdict: { kind: 'reject', reason: `没有这个端点：${platform}.${endpoint}` } }

  const captured = await captureRaw({ def, platform, cookie: cookieOf(platform), params, clientId: 'amagi-web' })
  if (captured.raw === undefined) {
    return {
      ok: false,
      verdict: { kind: 'reject', reason: '一发请求都没打出去' },
      ...(captured.message === undefined ? {} : { message: captured.message })
    }
  }

  const { outcome, pending: entry } = buildOutcome({
    platform,
    endpoint,
    params,
    raw: captured.raw,
    ...(captured.normalized === undefined ? {} : { normalized: captured.normalized }),
    http: captured.http,
    amagiVersion,
    stored: readSamples(platform, endpoint),
    now: new Date(),
    newId,
    scrub: { session: sessionOf(platform) }
  })
  // 有残留就没有 pendingId，也就没有 entry —— 「入库」这条路在前后端同时不存在
  if (entry !== undefined && outcome.pendingId !== undefined) pending.set(outcome.pendingId, entry)
  return outcome
}

/* ------------------------------------------------------------------ HTTP */

const readBody = async (request: IncomingMessage): Promise<Record<string, JsonValue>> =>
  new Promise((resolve) => {
    let raw = ''
    request.on('data', (chunk: unknown) => {
      raw += String(chunk)
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(raw) as Record<string, JsonValue>)
      } catch {
        resolve({})
      }
    })
  })

/** 一个平台是否合法。`body.platform` 是外部输入，不能直接 `as Platform` */
const asPlatform = (value: unknown): Platform | undefined =>
  typeof value === 'string' && (PLATFORMS as string[]).includes(value) ? (value as Platform) : undefined

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

interface Reply {
  status: number
  type: string
  body: string
}

const json = (body: unknown, status = 200): Reply => ({
  status,
  type: 'application/json; charset=utf-8',
  body: JSON.stringify(body)
})

const text = (body: string, status: number): Reply => ({ status, type: 'text/plain; charset=utf-8', body })

/** 端点清单。`hasCookie` 与 `storedCount` 在这里注入 —— `endpoints.ts` 那层不碰 IO */
const endpointList = () =>
  buildEndpointList({
    // **每次都重读 seeds.json**：改了种子再录一次是这个工具的日常动作，不该要求重启
    seeds: readSeeds(),
    hasCookie: (platform) => cookieOf(platform) !== '',
    storedCount: (platform, endpoint) => readSamples(platform, endpoint).length
  })

/**
 * 就地生成某个端点的类型 —— PRD 阶段 3 缺的那个动作。
 *
 * **只写这个端点的产物，不清空整棵树**：`pnpm gen:types` 会先 `rmSync` 再全量写，
 * 那是「产物必须与全部证据一致」的做法；而这里是「我刚录完这个端点，先看到它的类型」。
 * 所以它不能替代 `gen:types`，回给前端的话里也这么说。
 */
const generateOne = (platform: Platform, endpoint: string): { written: string[]; warnings: string[]; summary: string[] } => {
  const samples = readSamples(platform, endpoint)
  const plan = planCorpusTypes({ endpoints: [{ platform, endpoint, samples }], now: new Date() })
  const written: string[] = []
  for (const [path, source] of plan.files) {
    // 根 barrel 与平台 barrel 由全量生成负责 —— 判据与 diff 那边共用同一个函数
    if (!isEndpointOwnedFile(path)) continue
    writeGenerated(path, source)
    written.push(path)
  }
  return { written, warnings: plan.warnings, summary: plan.summary }
}

const handle = async (request: IncomingMessage, url: URL): Promise<Reply> => {
  if (url.pathname === '/api/endpoints') return json(endpointList())

  if (request.method !== 'POST') return text('没有这个接口', 404)
  const body = await readBody(request)

  if (url.pathname === '/api/record') {
    const platform = asPlatform(body.platform)
    if (platform === undefined) return text(`platform 不认识：${JSON.stringify(body.platform)}`, 400)
    return json(await recordOne(platform, String(body.endpoint), (body.params ?? {}) as Record<string, JsonValue>))
  }

  if (url.pathname === '/api/store') {
    const entry = pending.get(String(body.pendingId))
    if (entry === undefined) return text('这份待定样本已经不在了（服务重启过？重录一次）', 404)
    writeSample(entry.path, entry.json)
    pending.delete(String(body.pendingId))
    return json({ written: entry.path })
  }

  if (url.pathname === '/api/discard') {
    // 未知 id 也回 200：「丢掉」这个动作在语义上是幂等的
    const existed = pending.delete(String(body.pendingId))
    return json({ discarded: true, existed })
  }

  if (url.pathname === '/api/generate') {
    const platform = asPlatform(body.platform)
    if (platform === undefined) return text(`platform 不认识：${JSON.stringify(body.platform)}`, 400)
    const endpoint = String(body.endpoint)
    if (REGISTRIES[platform]?.[endpoint] === undefined) return text('没有这个端点', 404)
    return json(generateOne(platform, endpoint))
  }

  if (url.pathname === '/api/record-batch') {
    const platform = asPlatform(body.platform)
    if (platform === undefined) return text(`platform 不认识：${JSON.stringify(body.platform)}`, 400)
    const endpoint = String(body.endpoint)
    const def = REGISTRIES[platform]?.[endpoint] as AnyEndpointDef | undefined
    if (def === undefined) return text('没有这个端点', 404)

    const matrix = expandParamMatrix(schemaOf(def), { seeds: resolveSeeds(readSeeds(), platform, endpoint) })
    const outcomes: RecordOutcome[] = []
    for (const [index, params] of matrix.combinations.entries()) {
      outcomes.push(await recordOne(platform, endpoint, params))
      // 最后一组之后不用睡 —— 原先那版睡了，白等 1.5 秒
      if (index < matrix.combinations.length - 1) await sleep(BATCH_INTERVAL_MS)
    }
    return json({ unseeded: matrix.unseeded, notes: matrix.notes, outcomes })
  }

  return text('没有这个接口', 404)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`)
  // 给了口令就每个请求都验（绑局域网时才有口令，回环下不打扰人）
  if (token !== undefined && url.searchParams.get('token') !== token && request.headers['x-amagi-token'] !== token) {
    response.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('口令不对')
    return
  }
  try {
    const reply = await handle(request, url)
    response.writeHead(reply.status, { 'content-type': reply.type, 'x-content-type-options': 'nosniff' })
    response.end(reply.body)
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(error instanceof Error ? error.message : String(error))
  }
})

server.listen(port, host, () => {
  console.log(`控制台 API：http://${host}:${port}`)
  // **口令不打进日志**：原先那版把它拼在启动地址里，于是它进了终端回滚、进了截图、
  // 也进了任何贴出来的日志。要用就自己拿命令行里那个值
  if (token !== undefined) console.log('已启用口令校验（query 参数 `token` 或请求头 `x-amagi-token`）')
  console.log('浏览器界面另一个进程：pnpm --filter @ikenxuan/amagi-web dev')
  const missing = PLATFORMS.filter((platform) => cookieOf(platform) === '')
  if (missing.length > 0) console.log(`没有 cookie 的平台：${missing.join(' / ')}（设 AMAGI_COOKIE_<平台大写>）`)
})
