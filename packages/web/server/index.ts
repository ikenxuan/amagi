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
  REQUEST_VERDICTS,
  requestsPath,
  resolveSeeds,
  shapeKeyOfSamples
} from '@ikenxuan/amagi-typegen'

import type { AnyEndpointDef } from '../../core/src/contracts/endpoint'
import type { Platform } from '../../core/src/contracts/platform'
import type {
  CookiesResult,
  CookieStatus,
  DiscardResult,
  GeneratedResult,
  GenerateResult,
  RequestEntry,
  RequestsResult,
  SaveCookiesResult,
  StoreResult
} from '../shared/contract'
import { runBatch } from './batch'
import { compareSamples, pickSample } from './compare'
import { withTypeSource } from './declare'
import { buildEndpointList, PLATFORMS, REGISTRIES, schemaOf } from './endpoints'
import { cookieEnvName, ENV_FILE, envIsGitIgnored, loadEnvFile, patchEnvFile, readEnvFile } from './env'
import { checkRequest, isLoopbackBind } from './guard'
import { highlightCode, withPayloadHighlight } from './highlight'
import { buildOutcome, isEndpointOwnedFile, type PendingSample, type RecordOutcome } from './outcome'
import { describePortInUse, findPortHolder } from './port'
import { captureRaw } from './record'
import {
  appendRequest,
  countSamples,
  listGeneratedUnder,
  readAmagiVersion,
  readDocSidecar,
  readGeneratedFor,
  readRequests,
  readSamples,
  readSeeds,
  removeGenerated,
  type SeedRead,
  writeGenerated,
  writeRequests,
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

  // 墙上时间从**发请求之前**起表，于是 `prepare` 的内部请求（换 guest cookie、取 wbi key）、
  // `retryOn` 的每次重试、`paginate` 的每一页都算在里面 —— 那正是人盯着转圈等的那一段，
  // 而只量最后一发会把「等了 4 秒」说成「312ms」。`performance.now()` 而不是 `Date.now()`：
  // 后者会被系统对时往回拨，那时这个数字会是负的
  const startedAt = performance.now()
  const captured = await captureRaw({ def, platform, cookie: cookieOf(platform), params, clientId: 'amagi-web' })
  const durationMs = Math.round(performance.now() - startedAt)
  if (captured.raw === undefined) {
    return {
      ok: false,
      verdict: { kind: 'reject', reason: '一发请求都没打出去' },
      // **失败这条路上也回收据。** 耗时在这里是真信息（「立刻就红」是端点没注册或参数没过校验，
      // 「转了 30 秒才红」是超时或风控在拖），而 `bytes: 0` 正是「一发都没打出去」那句话的数字版。
      // `status` 不写死 0 而是照搬 `captureRaw` 量到的那个：还有一格是「请求成功但没有捕获到
      // 响应体」（`record.ts:67`），那时状态码是真的 200，谎报成 0 会把人往网络问题上带
      http: { ...captured.http, durationMs, bytes: 0 },
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
  // HTTP 收据。**在这里挂而不是让 `buildOutcome` 挂**：那一层是纯的，连时钟都不看
  // （耗时是这个文件量的），而它自己已经把 `captured.http` 写进样本的 `metadata.http` 了。
  // 数的是**脱敏后**那一层（`outcome.payload`）的字节数，不是原始响应的：面板上显示的、
  // 复制出去的、喂给类型生成的都是它，量另一个数字会与人看到的东西对不上。
  // 被入库判定拒掉的响应压根没有 `payload`（`outcome.ts:276` 在类型上就断了），那时 0 是实话
  outcome.http = {
    ...captured.http,
    durationMs,
    bytes: outcome.payload === undefined ? 0 : Buffer.byteLength(JSON.stringify(outcome.payload))
  }
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
 * 一个 verdict 是否合法，判据是校验器那张闭集表（`REQUEST_VERDICTS`）。
 *
 * 与 {@link asPlatform} 同一个写法。**server 不给它兜默认值**：`/api/requests` 存在的重点
 * 正是「记下被拒的那些组」，默认成 `'ok'` 等于替人把结论说反，而那是这个文件里最贵的一句话。
 */
const asVerdict = (value: unknown): RequestEntry['verdict'] | undefined =>
  typeof value === 'string' && (REQUEST_VERDICTS as readonly string[]).includes(value) ? (value as RequestEntry['verdict']) : undefined

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
 *
 * **注释 sidecar 与全量生成读的是同一份**（见 `readDocSidecar`）：不读它的话，
 * 这个动作写出来的产物与 `gen:types` 差的正是那批人手写的中文说明，而差异要等下一个人
 * 跑 `types:check` 才暴露。这两条路必须喂进同样的输入，否则「先看到它的类型」看到的是假的。
 */
const GENERATE_NOTE = 'barrel（根与平台两层）的完整性只有全量 `pnpm gen:types` 能保证 —— 这个动作只碰这一个端点的目录'

const generateOne = (platform: Platform, endpoint: string): GenerateResult => {
  const { samples, errors } = readSamples(platform, endpoint)
  const { sidecar, issues } = readDocSidecar(platform, endpoint)
  const plan = planCorpusTypes({ endpoints: [{ platform, endpoint, samples, sidecar }], now: new Date() })
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
  // 读不了的样本、写坏的 sidecar 都进 warnings：产物是按「少了那些东西」算出来的，人得知道这件事
  return { written, removed, warnings: [...errors, ...issues, ...plan.warnings], summary: plan.summary, note: GENERATE_NOTE }
}

/**
 * 现在这一刻，写成到秒的 ISO 8601 UTC。
 *
 * 与样本 `metadata.recordedAt` 是同一种写法（`corpus.ts:393` 的 `toSecondIso`，那个没导出），
 * 而请求集合的校验器（`requests.ts` 的 `SECOND_ISO`）把这个写法卡死了：毫秒没有信息量，
 * 而这个文件进 git —— 同一件事两种写法会让 diff 里多出一堆无意义的行。
 */
const nowSecondIso = (): string => `${new Date().toISOString().slice(0, 19)}Z`

/**
 * 样本落盘之后往请求集合追加一条 —— PRD 阶段 1 那条「参数进 git」的落点。
 *
 * 数据从三处来，各有各的不可替代：
 *
 * - `params` / `recordedAt` / `sampleHash` / `shapeKey` 从**样本本体**取。`metadata.params` 现在是真值
 *   （PRD 3.3 起，`corpus.ts:81-85`），这正是它能进集合的前提 —— 在那之前存的是脱敏后的
 *   假值，照它发请求必然 404。`sampleHash` 用 `metadata.paramsHash`：样本文件名就是这个值
 *   （`corpus.ts:474` 拿它拼路径），从 `path` 上剥字符串是同一件事的第二种实现。
 *   `shapeKey` 是**这里当场算的**（`shapeKeyOfSamples([sample])`）—— 客户端不是这个值的来源，
 *   整套理由写在 `/api/requests` 的 `upsert` 那段上。多跑一遍生成器的代价落在「入库」这一次
 *   人工点击上，不在渲染界面的路径上（`shape.ts` 文件头 ① 权衡过这件事）。
 * - `id` 与 `label` 是**人给的**，server 编不出来：`id` 会变成产物的目录名与类型名，
 *   `label` 是给下一个人读的那句话。
 * - `verdict` 走 `'ok'`。判据是「**有没有拿到样本**」而不是「响应内容好不好」——
 *   那四个取值记的是「为什么没拿到样本」这个粒度，而能走到 `/api/store` 的都已经有样本了。
 *   于是 `store-as-error` 的样本（`code: -404` 那类合法错误形状）在这里也是 `ok`，
 *   它的错误性记在样本自己的 `metadata.verdict` 里，不在这个字段上。
 *   顺带这也是 `shapeKey` 在这条路上永远算得出来的理由：手上必定有样本。
 *
 * **没给 `id` 不算失败。** 这是一处明确取舍：参数进 git 是 PRD 的核心诉求，但「留下这份样本」
 * 是这个工具最常用的动作，为了一个还没起名的记录把它整个拒掉是本末倒置。所以没给就只写样本，
 * 并且**把「集合没动、因为没给 id」明说出来** —— 静默跳过会让人以为参数已经进 git 了。
 */
const appendStoreEntry = (sample: PendingSample, id: string, label: string): Omit<StoreResult, 'written'> => {
  if (id === '') {
    return {
      requestsAppended: false,
      requestsIssues: ['没给 id，请求集合没动 —— id 与 label 得人来给（id 会变成产物的目录名与类型名），server 编不出来']
    }
  }
  // 契约那份 `RequestEntry` 喂给吃 typegen 那份的 `appendRequest`：两份手抄的类型在这里对顶，
  // 错开就编译期红（见 `shared/contract.ts` 的 `RequestVerdict`）
  const entry: RequestEntry = {
    id,
    label,
    params: sample.sample.metadata.params,
    recordedAt: sample.sample.metadata.recordedAt,
    verdict: 'ok',
    sampleHash: sample.sample.metadata.paramsHash,
    // 一条记录对一份样本，所以是 `[sample]`（`shape.ts:153` 那句话的落点）
    shapeKey: shapeKeyOfSamples([sample.sample])
  }
  const appended = appendRequest(sample.platform, sample.endpoint, entry)
  // 凭证命中、盘上那份读不了、校验器拒收 —— 三种都是「样本写了、集合没写」，理由原样回给人。
  // 那些字符串里只有**路径与键名**，没有参数值（`findCredentialKeys` 从不返回值）
  if (appended.issues.length > 0) return { requestsAppended: false, requestsIssues: appended.issues }
  return { requestsAppended: true, requestsPath: appended.path, requestsReplaced: appended.replaced, requestsIssues: [] }
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

  // 「已有类型」那块面板的数据源：`packages/response-types/` 里**当前提交**的那一份。
  // 界面原先对「这个端点已经有类型了」一无所知，于是人只能靠翻文件树判断自己是不是在重复劳动。
  //
  // **这条是只读的 GET，所以必须写在下面那个 `method !== 'POST'` 之前**（`/api/endpoints`
  // 与 `GET /api/cookies` 是同一个位置上的既有事实）。副作用是 `PUT /api/generated` 也能拿到
  // 这份数据 —— 只读、不是安全问题，但将来加 REST 风格路由时得记着这个先后。
  if (url.pathname === '/api/generated') {
    const raw = url.searchParams.get('platform')
    const platform = asPlatform(raw)
    if (platform === undefined) return text(`platform 不认识：${JSON.stringify(raw)}`, 400)
    const endpoint = url.searchParams.get('endpoint') ?? ''
    // 端点不存在**是 404**：那是调用方写错了。而「端点存在但一个产物都没有」不是 ——
    // 那是 61 个端点里 49 个的现状，回空数组（见 `GeneratedResult.files`）
    if (endpointDef(platform, endpoint) === undefined) return text('没有这个端点', 404)
    const { files, issues } = readGeneratedFor(platform, endpoint)
    return json({
      platform,
      endpoint,
      // 高亮在 Node 侧做，理由（体积门禁）在 `highlight.ts` 的文件头
      files: await Promise.all(files.map(async (file) => ({ path: file.path, code: await highlightCode(file.source, 'typescript') }))),
      issues
    } satisfies GeneratedResult)
  }

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
    const endpoint = String(body.endpoint)
    // 高亮与类型声明都是**回之前的最后一步**：`recordOne` 那一路是纯判断（`outcome.ts` 那层
    // 连时钟都不看），而这两下要 await 一个带语法数据的单例。套在这里，那层就不用变成异步的。
    //
    // 顺序是**先响应高亮、后类型声明**（`withTypeSource` 读的是 `outcome.payload`，与高亮读的
    // 是同一个字段，所以谁先谁后不影响结果）—— 这么排是为了让面板的顺序与这行代码的顺序一致：
    // 「拿回了什么值」在前，「它长什么形状」在后。两者都在没有 payload 时原样回，
    // 于是「一发都没打出去」那条路上一块空面板都不会多出来
    const outcome = await withPayloadHighlight(await recordOne(platform, endpoint, (body.params ?? {}) as Record<string, JsonValue>))
    return json(await withTypeSource(outcome, endpoint))
  }

  if (url.pathname === '/api/store') {
    const pendingId = String(body.pendingId)
    const entry = pending.get(pendingId)
    if (entry === undefined) return text('这份待定样本已经不在了（服务重启过？重录一次）', 404)
    // **样本先写、集合后追加**，顺序是刻意的：集合里的 `sampleHash` 是**指向样本的指针**，
    // 反过来的顺序会造出指向不存在文件的指针（写集合成功、写样本失败那一格）。
    // 而这个顺序的坏格是「有样本、集合里没记录」—— 那正是今天 61 个端点的常态，代价是零。
    // 校验也不必提前跑一遍：`appendRequest` 要么整条写进去、要么一个字节都不动，
    // 所以「样本写了没有」与「集合写了没有」这两句话在任何一格都是确定的
    writeSample(entry.path, entry.json)
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const requests = appendStoreEntry(entry, id, typeof body.label === 'string' ? body.label : '')
    // **追加没成时把待定条目留着**：样本已经落盘（那一步就是个幂等的 `writeFileSync`），
    // 而 id 写错、label 忘填这类事只该花人一次点击 —— 删掉之后唯一的补救是重录一发真请求。
    // 「压根没给 id」不算没成，那是「只留样本」这条正常路径，条目照常清掉
    if (id === '' || requests.requestsAppended) pending.delete(pendingId)
    return json({ written: entry.path, ...requests } satisfies StoreResult)
  }

  if (url.pathname === '/api/discard') {
    // 未知 id 也回 200：「丢掉」这个动作在语义上是幂等的
    const existed = pending.delete(String(body.pendingId))
    return json({ discarded: true, existed } satisfies DiscardResult)
  }

  /*
   * 请求集合的增删改 —— PRD 阶段 1 的另一半（`/api/store` 那条只覆盖「录成功之后顺手记一条」）。
   *
   * **含被拒的那些组**，那是这个文件最有价值的部分：「我试过这组参数，拿回的是风控页」
   * 今天一个字都不留（PRD 二 ②），而它能让下一个人不用再踩一遍。那时没有 `sampleHash`
   * 是正常状态（样本压根没生成），校验器就是这么判的。
   *
   * **读也走 POST（`op: 'list'`），不新加 GET。** `/api/endpoints` 与 `GET /api/cookies` 那两条在
   * `request.method !== 'POST'` 判断**之前**（于是 `PUT /api/endpoints` 也能拿到清单），加新 GET
   * 得先把那个既有顺序想清楚，这一轮不碰它。走 POST 的代价只是多两道闸（`Origin` 同源、
   * `Content-Type` 必须 JSON），而这条路只有界面在走。
   *
   * 状态码分两档，这个区分是有用的：**400 = 改你的输入**（凭证命中、`id` 不合法、verdict 不认识）；
   * **409 = 先去修盘上那个文件**（坏 JSON / 坏条目）—— 后者不是调用方的错，修法也完全不同。
   */
  if (url.pathname === '/api/requests') {
    const platform = asPlatform(body.platform)
    if (platform === undefined) return text(`platform 不认识：${JSON.stringify(body.platform)}`, 400)
    const endpoint = String(body.endpoint)
    // 端点不存在**是 404**（同 `/api/generate`）：那是调用方写错了，而不是「这个端点还没有集合」
    if (endpointDef(platform, endpoint) === undefined) return text('没有这个端点', 404)
    const op = body.op
    // op 先判、再读盘：反过来的话「op 拼错了」会被一份写坏的集合顶成 409，说的是另一件事
    if (op !== 'list' && op !== 'upsert' && op !== 'remove') {
      return text(`op 只能是 list / upsert / remove，收到的是 ${JSON.stringify(op)}`, 400)
    }

    const path = requestsPath({ platform, endpoint })
    const read = readRequests(platform, endpoint)
    // 读的时候「这个文件坏了」正是最该说出来的话，所以 issues 跟着 200 一起回
    if (op === 'list') return json({ path, collection: read.collection, effect: 'read', issues: read.issues } satisfies RequestsResult)
    // 写之前先看盘上那份好不好。`appendRequest` 自己也拦（那是最后一道，curl 绕不过去），
    // 这里多读一次是为了把状态码分开；而 `remove` 压根不过 `appendRequest`，那条非拦不可 ——
    // 一份读坏了的集合被「删掉一条」重写出去，等于把读不出来的那几条一起删了
    if (read.issues.length > 0) return text(['盘上那份集合有问题，拒绝覆盖它 —— 先把这些修好：', ...read.issues].join('\n'), 409)

    if (op === 'upsert') {
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      const verdict = asVerdict(body.verdict)
      // 这两条自己先判，只为把最常见的两种手误说成人话 —— 校验器那两句是带下标的（`requests[3].id=…`）
      if (id === '') return text('upsert 要给 id —— 它是这条记录的名字，也会变成产物的目录名与类型名', 400)
      if (verdict === undefined) {
        return text(`verdict 只能是 ${REQUEST_VERDICTS.join(' / ')} 之一，收到的是 ${JSON.stringify(body.verdict)}`, 400)
      }
      const sampleHash = typeof body.sampleHash === 'string' ? body.sampleHash : undefined
      /*
       * `shapeKey` **由 server 算，`body.shapeKey` 一个字节都不看。**
       *
       * 原先这里是 `...(typeof body.shapeKey === 'string' ? { shapeKey: body.shapeKey } : {})` ——
       * 客户端给什么就往 `.requests.json` 里写什么，而**那个文件进 git**。这个值的定义是
       * 「这组参数渲出来的类型的指纹」：算它要跑生成器（在 Node 这一侧），客户端手上没有；
       * 拿到一个值也无从验证。而它错的样子是最贵的一种 —— 界面上那句「同指纹 ⇒ 建议合并」
       * 会对着两份**类型不同**的样本说「可以合并」，人照着合就丢掉一份证据，而丢的是真实响应。
       *
       * 另一条路是只加一道 `SHAPE_KEY.test()`，没选：它挡格式不对的，挡不住「格式对但算错了」
       * —— 而后者才是会说谎的那一种（`test/storage.test.ts` 有一条钉着「校验器对一个手编的
       * `sk1-` 值无话可说」）。server 手上就有样本，自己算比验一遍更便宜也更严。
       *
       * 三档，缺一档都会丢东西：
       *
       * 1. `verdict === 'ok'` 且 `sampleHash` 指向一份**读得出来**的样本 → 当场算；
       * 2. 算不出来、而盘上同 `id` 那条**还指着同一份样本** → 沿用盘上那个值。
       *    样本不进 git、集合进 git，所以新克隆一份仓库的人手上有指纹却没有样本；
       *    这一档不留的话，他在界面上改一句 `label` 就把一个已提交的指纹静默删掉了。
       *    判据卡到 `sampleHash` 相同为止 —— 换了样本或改成 `reject:*`，旧指纹描述的就是别的东西了；
       * 3. 其余 → **没有这个字段**。缺失是正常状态（同 `sampleHash`）：被拒的请求压根没生成样本，
       *    算不出指纹，也不该有人替它编一个。而校验器现在只卡「非空字符串」、对
       *    「`reject:*` 却带着 `shapeKey`」还没有意见（`requests.ts:283-289`），所以这道判断只在这里。
       *
       * 样本读坏了走第 2/3 档，不拒这次 upsert：指纹缺失是正常状态，而人要存的是参数。
       * 客户端给了值也不回 400 —— 「把一条已有记录改个 `label` 再存回来」是界面上最常见的动作，
       * 那时它手上那条自然带着盘上那个指纹。忽略不丢信息：回的 `collection` 就是落盘后的那一份。
       */
      const previous = read.collection.requests.find((item) => item.id === id)
      // 第 1 档：指针指向一份读得出来的样本 —— 当场算
      const sample =
        verdict === 'ok' && sampleHash !== undefined ? pickSample(readSamples(platform, endpoint).samples, sampleHash) : undefined
      // 第 2 档：算不出来，而盘上同 `id` 那条还指着同一份样本 —— 沿用已提交的那个值
      const inherited = verdict === 'ok' && sampleHash !== undefined && previous?.sampleHash === sampleHash ? previous.shapeKey : undefined
      const shapeKey = sample === undefined ? inherited : shapeKeyOfSamples([sample])
      const entry: RequestEntry = {
        id,
        label: typeof body.label === 'string' ? body.label : '',
        params: (body.params ?? {}) as Record<string, JsonValue>,
        // 不给就按现在这一刻。自己传是为了「补录一条上周试过的」那种用法，写法由校验器卡死
        recordedAt: typeof body.recordedAt === 'string' ? body.recordedAt : nowSecondIso(),
        verdict,
        ...(sampleHash === undefined ? {} : { sampleHash }),
        ...(shapeKey === undefined ? {} : { shapeKey }),
        ...(typeof body.note === 'string' ? { note: body.note } : {})
      }
      const appended = appendRequest(platform, endpoint, entry)
      // 凭证命中走这条：回的是**命中的路径**（`headers.cookie` 这种），一个值都没有 ——
      // 校验器从不把值放进报错（`findCredentialKeys` 只返回路径），所以原样贴给人是安全的
      if (appended.issues.length > 0) return text(appended.issues.join('\n'), 400)
      return json({
        path: appended.path,
        collection: appended.collection,
        effect: appended.replaced ? 'replaced' : 'added',
        issues: []
      } satisfies RequestsResult)
    }

    // 到这里只剩 `remove`
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const requests = read.collection.requests.filter((item) => item.id !== id)
    const existed = requests.length !== read.collection.requests.length
    // **未知 id 也回 200**（幂等，同 `/api/discard` 那条既有约定），而且没删到就不写盘 ——
    // 写一遍只会把这个进 git 的文件白刷一次 diff。删完也不用再过校验器：
    // 盘上那份刚才是干净的（否则上面已经 409），少一条不会让它变脏
    if (existed) writeRequests(platform, endpoint, { ...read.collection, requests })
    return json({
      path,
      collection: { ...read.collection, requests },
      effect: existed ? 'removed' : 'absent',
      issues: []
    } satisfies RequestsResult)
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
    return json({
      unseeded: matrix.unseeded,
      notes: [...seedRead.issues, ...matrix.notes, ...failures],
      // 批量那条路也要高亮、也要类型声明：两条路进的是同一份界面（`ResponsePane` / `TypePane`），
      // 只给手工那一发上色的话「批量录出来的响应没有颜色」会像个 bug，而少了类型声明的话
      // 人点开批量结果里的某一发会看到一块空面板 —— 那两件事在界面上都读作坏了。
      // 逐个再跑一遍生成器不心疼：它是纯内存计算，而这条路每组之间本来就要睡 1.5 秒
      outcomes: await Promise.all(outcomes.map(async (outcome) => withTypeSource(await withPayloadHighlight(outcome), endpoint)))
    })
  }

  /*
   * 两组参数的字段级对比 —— PRD 阶段 4 第一条。**这一步在 server 侧算完**：
   * 摊平、比对、高亮都在 `compare.ts`（纯函数）与 shiki 那一侧，浏览器包一个字节都不涨。
   *
   * 三处判断记在这里，因为它们是「这条路收什么输入」的政策，而不是对比本身的逻辑：
   *
   * ① **两边给同一个哈希是 400，不是一份全 `same` 的空清单。** 后者「正确」——
   *    一份样本跟自己比当然处处一致 —— 但它对**任何**样本都成立，于是那句话里没有一个
   *    比特是关于这两组参数的。而界面上是两个下拉框，选重了是最常见的手误：回一张
   *    「零差异」的表会被读成「这两组参数产出的类型一模一样」，那是个由手误得出的结论。
   *    照这个文件既有的那档分法（`/api/requests` 那段）：400 = 改你的输入。
   *
   * ② **挑不到样本是 404，且说清是哪一边挑不到。** 两个哈希都可能写错，「没找到」对着
   *    两个下拉框是句废话。用 404 而不是 400 的判据同 `没有这个端点`：指的是一个不存在的
   *    资源，而不是一个写坏了的值。顺带把现有哈希列出来 —— 那正是人下一步要用的东西。
   *
   * ③ **读不了的样本文件只在挑不到时才报。** 你要的那份可能正是读坏的那一份，
   *    而那时「没有这份样本」会把「这个文件坏了」说成「你写错了」（`storage.ts` 逐个文件
   *    try 的全部理由）。而挑到了的时候它们**刻意不回**：对比只读点名的那两份，
   *    别的样本坏不坏影响不到这个答案 —— 与 `/api/record` 那条不同，那边 diff 的
   *    「之前」那一半是全部样本，少一份就会让新样本看起来带来了更多新形状。
   */
  if (url.pathname === '/api/compare') {
    const platform = asPlatform(body.platform)
    if (platform === undefined) return text(`platform 不认识：${JSON.stringify(body.platform)}`, 400)
    const endpoint = String(body.endpoint)
    if (endpointDef(platform, endpoint) === undefined) return text('没有这个端点', 404)
    const left = typeof body.left === 'string' ? body.left.trim() : ''
    const right = typeof body.right === 'string' ? body.right.trim() : ''
    if (left === '' || right === '') {
      return text('要给 left 与 right 两个 sampleHash（12 位十六进制，就是 corpus 里那份样本的文件名）', 400)
    }
    if (left === right) return text(`两边给的是同一份样本（${left}）—— 它跟自己比处处一致，那句话里没有关于参数的信息`, 400)

    const { samples, errors } = readSamples(platform, endpoint)
    const leftSample = pickSample(samples, left)
    const rightSample = pickSample(samples, right)
    if (leftSample === undefined || rightSample === undefined) {
      const missing = [...(leftSample === undefined ? [`left=${left}`] : []), ...(rightSample === undefined ? [`right=${right}`] : [])]
      const hashes = samples.map((sample) => sample.metadata.paramsHash)
      return text(
        [
          `${platform}/${endpoint} 底下没有这些样本：${missing.join(' / ')}`,
          hashes.length === 0 ? '这个端点一份样本都还没录' : `现有的是：${hashes.join(' / ')}`,
          ...errors
        ].join('\n'),
        404
      )
    }
    // 高亮函数从这里递进去，`compare.ts` 那层不认识 shiki（理由在 `CompareInput.highlight`）
    return json(
      await compareSamples({
        platform,
        endpoint,
        left: leftSample,
        right: rightSample,
        highlight: (source) => highlightCode(source, 'typescript')
      })
    )
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
    // 查出占用者 PID 并给一条能直接粘的杀进程命令。**光说「被占用了」是不够的** ——
    // 最常见的成因是幽灵进程（VSCode auto attach 注入的 `--inspect` 让 node 在收到
    // 终止信号后继续占着端口），而它在任务管理器里只是一个普通 `node.exe`，认不出来
    process.stderr.write(describePortInUse({ port, host, pid: findPortHolder(port), platform: process.platform }))
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
  // `pnpm console` 会把两侧一起起来，那时这句话是错的（浏览器侧就在同一条命令里）。
  // 父进程通过 `AMAGI_CONSOLE_API_PORT` 表明自己在场
  if (process.env.AMAGI_CONSOLE_API_PORT === undefined) console.log('浏览器界面另一个进程：pnpm console:web')
  // 只打键名不打值 —— 那些键装的正是 cookie
  if (injectedFromEnvFile.length > 0) console.log(`从 .env 读到 ${injectedFromEnvFile.length} 项：${injectedFromEnvFile.join(' / ')}`)
  if (!envIsGitIgnored()) {
    console.warn('⚠️  `.gitignore` 里没有一条光秃秃的 `.env` —— 界面上的「保存 cookie」会被拒绝，先补上那条规则')
  }
  const missing = PLATFORMS.filter((platform) => cookieOf(platform) === '')
  if (missing.length > 0) console.log(`没有 cookie 的平台：${missing.join(' / ')}（在界面右上角填，会写回 .env）`)
})
