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
 * 四条安全约定，都不是可选项：
 *
 * 1. **默认只绑 `127.0.0.1`**。要绑别的地址必须同时给 `--token`，否则直接拒绝启动 ——
 *    这个服务能拿本机 cookie 发请求，暴露在局域网上等于把账号借出去。
 * 2. **回环下只认回环 `Host`，写接口只接受同源 `Origin`，且只收 JSON**。绑在 `127.0.0.1` 上
 *    **不等于别人碰不到** —— 任何网页都能把自己的域名解析到 127.0.0.1（DNS rebinding），
 *    于是那个页面能用你的 cookie 发请求、能让服务往仓库里写文件。三道闸都在 `guard.ts`。
 * 3. **cookie 一个字都不回显**。接口只回「已提供 / 未提供」，页面上没有任何地方能读到它。
 * 4. **录制与入库分开两步**。录完先留在内存里，人看过类型 diff 再决定写不写盘 ——
 *    这正是这个工具存在的理由：那个决定纯自动做不了。
 */

import { existsSync } from 'node:fs'
import { createServer, type IncomingMessage } from 'node:http'

import {
  type CorpusSample,
  createScrubSession,
  expandParamMatrix,
  type JsonValue,
  planCorpusTypes,
  resolveSeeds
} from '@ikenxuan/amagi-typegen'

import type { AnyEndpointDef } from '../../core/src/contracts/endpoint'
import type { Platform } from '../../core/src/contracts/platform'
import type { CookiesResult, CookieStatus, GenerateResult, SaveCookiesResult } from '../shared/contract'
import { runBatch } from './batch'
import { buildEndpointList, PLATFORMS, REGISTRIES, schemaOf } from './endpoints'
import { cookieEnvName, ENV_FILE, envIsGitIgnored, loadEnvFile, patchEnvFile, readEnvFile } from './env'
import { checkRequest, isLoopbackBind } from './guard'
import { buildOutcome, isEndpointOwnedFile, type PendingSample, type RecordOutcome } from './outcome'
import { captureRaw } from './record'
import {
  countSamples,
  listGeneratedUnder,
  readAmagiVersion,
  readSamples,
  readSeeds,
  removeGenerated,
  type SeedRead,
  writeGenerated,
  writeSample
} from './storage'

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

// 绑非回环地址必须给口令。这条是硬拒绝而不是告警：这个服务能拿本机 cookie 发请求。
// 「是不是回环」用 `guard.ts` 的那一份判定 —— 这里和 `Host` 闸必须是同一条判据
if (!isLoopbackBind(host) && (token === undefined || token.length < 8)) {
  console.error(`绑定 ${host} 必须同时给 --token（至少 8 位）—— 这个服务能拿本机 cookie 发请求，裸奔等于把账号借出去`)
  process.exit(1)
}

// 启动时把 `.env` 并进 `process.env`。**不覆盖已有的** —— 真环境变量
// （shell 里 export 的、CI 注入的）优先级更高，那是所有 dotenv 实现的一致行为，
// 反过来会让「临时换一个账号跑一次」这个动作失效
const injectedFromEnvFile = loadEnvFile()

/**
 * 启动时**已经在** `process.env` 里的凭证键 = shell export / CI 注入给的。
 *
 * `loadEnvFile` 不覆盖已存在的环境变量（所有 dotenv 实现的一致行为），所以「它注入了哪些键」
 * 的补集就是「shell 本来就有哪些键」。这个集合算一次就不变了 —— shell 给的值不会自己消失。
 */
const shellProvided = new Set(
  PLATFORMS.map(cookieEnvName).filter((name) => !injectedFromEnvFile.includes(name) && (process.env[name] ?? '') !== '')
)

/**
 * 在界面上保存过的键。**那一刻人明确表示要用这个值，所以它压过 shell。**
 * 这是唯一该压过环境变量的时刻，见 `/api/cookies` 那段。
 */
const overriddenByUi = new Set<string>()

/**
 * cookie 从哪读，按优先级：界面刚保存的 → shell 给的 → 盘上 `.env` 的**当前**值。**永不回显**。
 *
 * 最后一档刻意每次都重读盘：原先只在启动时读一次，于是手改 `.env` 换个账号之后
 * 「改了但没生效」，而抽屉还会告诉你「这个值来自进程环境变量、改 `.env` 覆盖不了它」——
 * 恰好把话说反。`seeds.json` 早就因为同一个理由改成每次重读了（补个种子再录一次是日常动作），
 * 手改 `.env` 再录一发同样是日常动作。
 */
const cookieOf = (platform: Platform): string => {
  const name = cookieEnvName(platform)
  if (overriddenByUi.has(name) || shellProvided.has(name)) return process.env[name] ?? ''
  return readEnvFile()[name] ?? process.env[name] ?? ''
}

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

const recordOne = async (
  platform: Platform,
  endpoint: string,
  params: Record<string, JsonValue>,
  /**
   * 同一批里前面几组已经录到、但**还没落盘**的样本。
   *
   * 不传的话 diff 与 `shapeChanged` 的「之前」那一半只有磁盘上那些，于是一个 0 样本的端点
   * 跑 6 组同形样本会得到 6 份「带来了新形状」—— 人照着提示把 6 份全留下，
   * 而这正是这个工具要消灭的那件事。
   */
  alsoStored: readonly CorpusSample[] = []
): Promise<RecordOutcome> => {
  const def = endpointDef(platform, endpoint)
  if (def === undefined) return { ok: false, verdict: { kind: 'reject', reason: `没有这个端点：${platform}.${endpoint}` } }

  const captured = await captureRaw({ def, platform, cookie: cookieOf(platform), params, clientId: 'amagi-web' })
  if (captured.raw === undefined) {
    return {
      ok: false,
      verdict: { kind: 'reject', reason: '一发请求都没打出去' },
      ...(captured.message === undefined ? {} : { message: captured.message })
    }
  }

  const stored = readSamples(platform, endpoint)
  const { outcome, pending: entry } = buildOutcome({
    platform,
    endpoint,
    params,
    raw: captured.raw,
    ...(captured.normalized === undefined ? {} : { normalized: captured.normalized }),
    http: captured.http,
    amagiVersion,
    stored: [...stored.samples, ...alsoStored],
    now: new Date(),
    newId,
    scrub: { session: sessionOf(platform) }
  })
  // 读不了的样本要说出来 —— 它让 diff 的「之前」那一半缺了东西，
  // 于是这份样本看起来带来的新形状比实际更多
  if (stored.errors.length > 0) outcome.message = [outcome.message, ...stored.errors].filter(Boolean).join('；')
  // 有残留就没有 pendingId，也就没有 entry —— 「入库」这条路在前后端同时不存在
  if (entry !== undefined && outcome.pendingId !== undefined) pending.set(outcome.pendingId, entry)
  return outcome
}

/* ------------------------------------------------------------------ HTTP */

/**
 * 读请求体。**按 Buffer 收、最后一次性解码** —— 原先是 `raw += String(chunk)`，
 * 那样多字节 UTF-8 跨 chunk 边界时会被解成 U+FFFD，而种子里就有中文（`query: "猫"`）。
 *
 * 解析失败**回 `undefined` 而不是 `{}`**：那两件事的后续处理不一样 ——
 * `{}` 会让调用方接着报「platform 不认识：undefined」，把「body 不是合法 JSON」
 * 说成「platform 写错了」。
 *
 * `error` / `aborted` 都要接：流上 emit `'error'` 而无监听者是 Node 的崩溃路径，
 * 而不 resolve 会让整个请求永远悬着。
 */
const readBody = async (request: IncomingMessage): Promise<Record<string, JsonValue> | undefined> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = []
    let settled = false
    const finish = (value: Record<string, JsonValue> | undefined) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('error', () => finish(undefined))
    request.on('aborted', () => finish(undefined))
    request.on('end', () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
        // `JSON.parse('null')` / `'42'` / `'[]'` 都会成功，但它们不是我们要的对象
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) finish(undefined)
        else finish(parsed as Record<string, JsonValue>)
      } catch {
        finish(undefined)
      }
    })
  })

/** 一个平台是否合法。`body.platform` 是外部输入，不能直接 `as Platform` */
const asPlatform = (value: unknown): Platform | undefined =>
  typeof value === 'string' && (PLATFORMS as string[]).includes(value) ? (value as Platform) : undefined

/**
 * 端点定义。**必须走 `Object.hasOwn`** —— 裸的 `REGISTRIES[p][e]` 会命中原型链上的键：
 * `endpoint=constructor` 会拿到 `Object` 当端点定义，然后在 `schemaOf` 里炸成 500
 * 加一段原始 TypeError。
 */
const endpointDef = (platform: Platform, endpoint: string): AnyEndpointDef | undefined => {
  const registry = REGISTRIES[platform]
  return Object.hasOwn(registry, endpoint) ? (registry[endpoint] as AnyEndpointDef) : undefined
}

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

/**
 * 种子文件的问题只打第一次。
 *
 * 它挂在**每个** `/api/endpoints` 与每次批量录制上，而界面会反复拉端点清单 ——
 * 不去重的话终端会被同一句话刷满，那等于没报。
 */
const seedIssuesLogged = new Set<string>()
const readSeedsLoudly = (): SeedRead => {
  const read = readSeeds()
  for (const issue of read.issues) {
    if (seedIssuesLogged.has(issue)) continue
    seedIssuesLogged.add(issue)
    console.warn(`⚠️  ${issue}`)
  }
  return read
}

/** 端点清单。`hasCookie` 与 `storedCount` 在这里注入 —— `endpoints.ts` 那层不碰 IO */
const endpointList = () =>
  buildEndpointList({
    // **每次都重读 seeds.json**：改了种子再录一次是这个工具的日常动作，不该要求重启
    seeds: readSeedsLoudly().seeds,
    hasCookie: (platform) => cookieOf(platform) !== '',
    // `countSamples` 只列目录不解析 —— 61 个端点各数一次，而两份 B站 comments 各 1.3 MB
    storedCount: (platform, endpoint) => countSamples(platform, endpoint)
  })

/**
 * 就地生成某个端点的类型 —— PRD 阶段 3 缺的那个动作。
 *
 * **只写这个端点的产物，不清空整棵树**：`pnpm gen:types` 会先 `rmSync` 再全量写，
 * 那是「产物必须与全部证据一致」的做法；而这里是「我刚录完这个端点，先看到它的类型」。
 * 所以它不能替代 `gen:types` —— 那句话现在在 `GenerateResult.note` 里，每次都回。
 *
 * **但「不清空整棵树」不等于「只写不删」**：这个端点自己目录底下的残留必须清掉，
 * 否则布局翻转时旧文件留着、平台 barrel 仍然导出它，`tsc` 全绿而下游拿到旧类型。
 * 清理范围严格限制在 `<平台>/<Endpoint>/` 底下，barrel 在判据上就碰不到（见 `removeGenerated`）。
 */
const GENERATE_NOTE = 'barrel（根与平台两层）的完整性只有全量 `pnpm gen:types` 能保证 —— 这个动作只碰这一个端点的目录'

const generateOne = (platform: Platform, endpoint: string): GenerateResult => {
  const { samples, errors } = readSamples(platform, endpoint)
  const plan = planCorpusTypes({ endpoints: [{ platform, endpoint, samples }], now: new Date() })
  // 根 barrel 与平台 barrel 由全量生成负责 —— 判据与 diff 那边共用同一个函数
  const owned = [...plan.files].filter(([path]) => isEndpointOwnedFile(path))
  const written: string[] = []
  for (const [path, source] of owned) {
    writeGenerated(path, source)
    written.push(path)
  }
  // 先写再删：万一写到一半失败，树只会比之前多东西、不会少东西
  const expected = new Set(written)
  const removed: string[] = []
  // 端点目录从产物路径本身推出来（`<平台>/<Endpoint>`），不重算一遍 plan.ts 的命名规则 ——
  // 多一份「名字怎么拼」的实现就多一处会脱节的地方。
  // 一个产物都没有时推不出目录，于是也不清理：那种情况交给全量 `gen:types`
  for (const dir of new Set(written.map((path) => path.split('/').slice(0, 2).join('/')))) {
    for (const existing of listGeneratedUnder(dir)) {
      if (expected.has(existing)) continue
      removeGenerated(existing)
      removed.push(existing)
    }
  }
  // 读不了的样本进 warnings：产物是按「少了那几份」算出来的，人得知道这件事
  return { written, removed, warnings: [...errors, ...plan.warnings], summary: plan.summary, note: GENERATE_NOTE }
}

/**
 * cookie 状态。**一个字节的值都不回** —— 只回「有没有、多长、从哪来」。
 *
 * `source` 那一项要紧：进程环境变量（shell export / CI 注入）压过 `.env`，
 * 所以「我在界面上改了但没生效」的唯一解释就是它 —— 不告诉人，那会是个查半天的问题。
 *
 * **判据是「启动时它在不在 `process.env` 里」，不是「现在的值与 `.env` 里的一不一样」。**
 * 后者曾经是实现方式，而它在手改过 `.env` 之后会把话说反：那时两个值确实不一样，
 * 但原因是进程用的还是旧值，跟 shell 一点关系都没有。
 */
const cookieStatus = (): CookiesResult => {
  return {
    platforms: PLATFORMS.map((platform) => {
      const envName = cookieEnvName(platform)
      const value = cookieOf(platform)
      const source: CookieStatus['source'] =
        value === '' ? 'none' : overriddenByUi.has(envName) || !shellProvided.has(envName) ? 'file' : 'env'
      return { platform, envName, hasCookie: value !== '', length: value.length, source }
    }),
    envIsGitIgnored: envIsGitIgnored(),
    envPath: '.env',
    envExists: existsSync(ENV_FILE)
  }
}

const handle = async (request: IncomingMessage, url: URL): Promise<Reply> => {
  if (url.pathname === '/api/endpoints') return json(endpointList())
  if (url.pathname === '/api/cookies' && request.method !== 'POST') return json(cookieStatus())

  if (request.method !== 'POST') return text('没有这个接口', 404)
  const body = await readBody(request)
  // 解析失败**在这里就说清是 body 的问题**。原先它变成 `{}` 往下走，
  // 于是报出来的是「platform 不认识：undefined」—— 把「JSON 写错了」说成「platform 写错了」
  if (body === undefined) return text('请求体不是一个合法的 JSON 对象', 400)

  if (url.pathname === '/api/cookies') {
    // **写凭证之前先确认 `.env` 真的被 git 忽略。** 不确认就写等于可能把 cookie 提交上去，
    // 而那是不可撤销的。前端也拦一道，但这里是最后一道 —— curl 绕不过去
    if (!envIsGitIgnored()) {
      return text('`.gitignore` 里没有一条光秃秃的 `.env`，拒绝往那儿写 cookie —— 先补上那条规则', 409)
    }
    const updates: Record<string, string> = {}
    for (const platform of PLATFORMS) {
      const value = body[platform]
      // 只处理请求里明确给了的平台：没给的键不动（免得「只改抖音」把别的清空）
      if (typeof value === 'string') updates[cookieEnvName(platform)] = value.trim()
    }
    if (Object.keys(updates).length === 0) return text('没有可写的平台 —— body 里一个认识的平台键都没有', 400)
    const { written, removed } = patchEnvFile(updates)
    // 写完立刻注入当前进程，于是「保存后马上录一发」不用重启服务。
    // 注意 `loadEnvFile` 不覆盖已存在的环境变量，所以这里要显式覆盖 —— 人刚在界面上改的
    // 那个值就是他现在想用的，这是唯一该压过 shell 环境变量的时刻
    for (const [key, value] of Object.entries(updates)) {
      if (value === '') {
        delete process.env[key]
        overriddenByUi.delete(key)
      } else {
        process.env[key] = value
        // 记下来，于是 `source` 会说「来自 .env」而不是「来自进程环境变量」——
        // 人刚在界面上按的那一下就是这个值的来源，哪怕 shell 里原本也有一个
        overriddenByUi.add(key)
      }
    }
    return json({ written, removed, status: cookieStatus() } satisfies SaveCookiesResult)
  }

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
    if (endpointDef(platform, endpoint) === undefined) return text('没有这个端点', 404)
    return json(generateOne(platform, endpoint))
  }

  if (url.pathname === '/api/record-batch') {
    const platform = asPlatform(body.platform)
    if (platform === undefined) return text(`platform 不认识：${JSON.stringify(body.platform)}`, 400)
    const endpoint = String(body.endpoint)
    const def = endpointDef(platform, endpoint)
    if (def === undefined) return text('没有这个端点', 404)

    // 种子文件坏掉时**必须在界面上看得见**：「所有端点都缺种子」最常见的原因就是这份文件
    // 被写坏了（一个尾逗号足够），而只打进日志的话人在界面上只会看到「0 组」
    const seedRead = readSeedsLoudly()
    const matrix = expandParamMatrix(schemaOf(def), { seeds: resolveSeeds(seedRead.seeds, platform, endpoint) })
    // 循环本体在 `batch.ts`（有测试）—— 这里只负责把「怎么录一组」「样本从哪取」接上去。
    // `sampleOf` 走 `pending` 而不是 outcome：样本本体不在契约里（它不该过 HTTP），
    // 只有 server 这一侧的待定队列有它
    const { outcomes, failures } = await runBatch({
      combinations: matrix.combinations,
      record: (params, alsoStored) => recordOne(platform, endpoint, params, alsoStored),
      sampleOf: (outcome) => (outcome.pendingId === undefined ? undefined : pending.get(outcome.pendingId)?.sample),
      sleep: () => sleep(BATCH_INTERVAL_MS),
      rejected: (reason): RecordOutcome => ({ ok: false, verdict: { kind: 'reject', reason } })
    })
    return json({ unseeded: matrix.unseeded, notes: [...seedRead.issues, ...matrix.notes, ...failures], outcomes })
  }

  return text('没有这个接口', 404)
}

/* 三道闸与口令都在 `guard.ts` 的 `checkRequest` 里 —— 那边是纯函数，有测试盯着。
   `Host` 白名单、`Origin` 白名单、`hostnameOf` 也都在那个文件，这里不再留第二份定义 */

const server = createServer(async (request, response) => {
  try {
    // base 用**固定字面量**而不是 `http://${host}:${port}` —— `--host ::1` 会让后者变成
    // `http://::1:7345`，那不是合法 URL（IPv6 要方括号），`new URL` 直接抛。
    // 而 `::1` 就在回环白名单里（不需要口令就能起），于是「服务起来了、第一个请求把它打死」。
    // 这里只用 URL 解析 pathname 与查询串，base 是什么无关紧要
    const url = new URL(request.url ?? '/', 'http://localhost')

    // 三道闸（Host / Origin / Content-Type）与口令都在 `checkRequest` 里，见 `guard.ts`。
    // 它在 `handle` **之前**，所以没有任何写接口能绕开
    const verdict = checkRequest(
      {
        method: request.method,
        host: request.headers.host,
        origin: request.headers.origin,
        contentType: request.headers['content-type'],
        queryToken: url.searchParams.get('token'),
        headerToken: request.headers['x-amagi-token']
      },
      { bindHost: host, token }
    )
    if (!verdict.ok) {
      response.writeHead(verdict.status, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(verdict.message)
      return
    }

    const reply = await handle(request, url)
    response.writeHead(reply.status, { 'content-type': reply.type, 'x-content-type-options': 'nosniff' })
    response.end(reply.body)
  } catch (error) {
    // 这个 catch 必须裹住**整个回调**：async 回调里漏出的异常是 unhandled rejection，
    // 而那会让 Node 直接退出 —— 终端一片正常、浏览器一片 Failed to fetch，服务已经不在了
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(error instanceof Error ? error.message : String(error))
  }
})

// `EADDRINUSE`（起了两遍、或 `tsx watch` 重启时旧 socket 没释放）走 server 的 `'error'`
// 事件。没有监听者时它是 uncaught exception，报出来的是一段原始 Node 栈 ——
// 而上面为「端口写成 abc」专门写了一句人话，这里不该反倒退化成栈
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`${host}:${port} 已经被占用了 —— 控制台大概已经在跑（另一个终端？），或者换个 --port`)
  } else if (error.code === 'EACCES') {
    console.error(`没有权限监听 ${host}:${port} —— 1024 以下的端口在多数系统上要 root`)
  } else {
    console.error(`监听 ${host}:${port} 失败：${error.message}`)
  }
  process.exit(1)
})

server.listen(port, host, () => {
  console.log(`控制台 API：http://${host}:${port}`)
  // **口令不打进日志**：原先那版把它拼在启动地址里，于是它进了终端回滚、进了截图、
  // 也进了任何贴出来的日志。要用就自己拿命令行里那个值
  if (token !== undefined) console.log('已启用口令校验（query 参数 `token` 或请求头 `x-amagi-token`）')
  console.log('浏览器界面另一个进程：pnpm console')
  // 只打键名不打值 —— 那些键装的正是 cookie
  if (injectedFromEnvFile.length > 0) console.log(`从 .env 读到 ${injectedFromEnvFile.length} 项：${injectedFromEnvFile.join(' / ')}`)
  if (!envIsGitIgnored()) {
    console.warn('⚠️  `.gitignore` 里没有一条光秃秃的 `.env` —— 界面上的「保存 cookie」会被拒绝，先补上那条规则')
  }
  const missing = PLATFORMS.filter((platform) => cookieOf(platform) === '')
  if (missing.length > 0) console.log(`没有 cookie 的平台：${missing.join(' / ')}（在界面右上角填，会写回 .env）`)
})
