// corpus 策展前端（PRD 阶段 3）。**本地开发工具**：填参 → 发请求 → 看即将写入的类型 diff → 决定入库还是丢弃。
//
//   pnpm curate:corpus                      默认只监听 127.0.0.1:7345
//   pnpm curate:corpus --port 8080
//   pnpm curate:corpus --host 0.0.0.0 --token <口令>   绑局域网必须同时给口令
//
// **它不在 `packages/typegen` 里，而在 core 的 scripts 下** —— PRD 阶段 3 原话是「在
// packages/typegen 里起」，但那半边是纯函数、不发请求不落盘，而这个服务两件都要做：
// 它得用 core 的注册表与执行管线发请求。core 依赖 typegen，反过来 import 就成了包级环。
// 放这里与 `record-corpus.mts` 同一个理由：有网络、非确定的那一半归 core 的脚本。
//
// 三条安全约定，都不是可选项：
//
// 1. **默认只绑 `127.0.0.1`**。要绑别的地址必须同时给 `--token`，否则直接拒绝启动 ——
//    这个服务能拿本机 cookie 发请求，暴露在局域网上等于把账号借出去。
// 2. **cookie 一个字都不回显**。接口只回「已提供 / 未提供」，页面上没有任何地方能读到它。
//    这条与 corpus 的 metadata 是同一条纪律（PRD 七）。
// 3. **录制与入库分开两步**。录完先留在内存里，人看过类型 diff 再决定写不写盘 ——
//    这正是这个工具存在的理由：那个决定纯自动做不了。

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type CorpusSample,
  createCorpusSample,
  createScrubSession,
  detectBreakingChanges,
  expandParamMatrix,
  type JsonSchemaLike,
  type JsonValue,
  parseSeedFile,
  planCorpusTypes,
  resolveSeeds,
  type SeedFile,
  trimSample
} from '@ikenxuan/amagi-typegen'
import * as zod from 'zod'

import { makeClientCtx } from '../src/client/runtime'
import type { AnyEndpointDef, Registry } from '../src/contracts/endpoint'
import type { Platform } from '../src/contracts/platform'
import { bilibiliRegistry } from '../src/platforms/bilibili/endpoints'
import { douyinRegistry } from '../src/platforms/douyin/endpoints'
import { kuaishouRegistry } from '../src/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from '../src/platforms/xiaohongshu/endpoints'
import { execute } from '../src/runtime/execute'
import { CURATE_PAGE } from './curate-page.mts'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..', '..')
const CORPUS_DIR = join(ROOT, 'corpus')

const REGISTRIES: Record<Platform, Registry> = {
  douyin: douyinRegistry,
  bilibili: bilibiliRegistry,
  kuaishou: kuaishouRegistry,
  xiaohongshu: xiaohongshuRegistry
}

/** 样本文件名就是参数哈希，12 位十六进制。与 gen-types.mts 同一条约定 */
const SAMPLE_FILE = /^[0-9a-f]{12}\.json$/

/* ------------------------------------------------------------------ 命令行与安全 */

const argOf = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`)
  return index < 0 ? undefined : process.argv[index + 1]
}

const host = argOf('host') ?? '127.0.0.1'
const port = Number(argOf('port') ?? 7345)
const token = argOf('token')

// 绑非回环地址必须给口令。这条是硬拒绝而不是告警：这个服务能拿本机 cookie 发请求
if (host !== '127.0.0.1' && host !== 'localhost' && (token === undefined || token.length < 8)) {
  console.error(`绑定 ${host} 必须同时给 --token（至少 8 位）—— 这个服务能拿本机 cookie 发请求，裸奔等于把账号借出去`)
  process.exit(1)
}

/** cookie 从环境变量读，与 record-corpus.mts 同一条惯例。**永不回显** */
const cookieOf = (platform: Platform): string => process.env[`AMAGI_COOKIE_${platform.toUpperCase()}`] ?? ''

const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string }

let seeds: SeedFile = { version: 1, platforms: {} }
try {
  seeds = parseSeedFile(JSON.parse(readFileSync(join(CORPUS_DIR, 'seeds.json'), 'utf8')) as JsonValue).seeds
} catch {
  // 没有 seeds.json 不影响手动填参
}

/* ------------------------------------------------------------------ corpus 读写 */

const schemaOf = (def: AnyEndpointDef): JsonSchemaLike =>
  zod.toJSONSchema(def.params, { io: 'input', unrepresentable: 'any' }) as JsonSchemaLike

/** 读某个端点已入库的样本。类型 diff 的「之前」那一半靠它 */
const readSamples = (platform: string, endpoint: string): CorpusSample[] => {
  const dir = join(CORPUS_DIR, platform, endpoint)
  try {
    return readdirSync(dir)
      .filter((name) => SAMPLE_FILE.test(name))
      .sort()
      .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as CorpusSample)
  } catch {
    return []
  }
}

/** 一个端点的产物：加不加这份待定样本，各生成一次，拿来比 */
const filesFor = (platform: string, endpoint: string, extra?: CorpusSample): Map<string, string> =>
  planCorpusTypes({
    endpoints: [
      { platform, endpoint, samples: extra === undefined ? readSamples(platform, endpoint) : [...readSamples(platform, endpoint), extra] }
    ],
    now: new Date()
  }).files

/** 行级 diff，够看出多了/少了哪些字段就行 —— 不引第三方 diff 库 */
const lineDiff = (before: string, after: string): string[] => {
  const beforeLines = new Set(before.split('\n'))
  const afterLines = new Set(after.split('\n'))
  const out: string[] = []
  for (const line of after.split('\n')) if (!beforeLines.has(line) && line.trim() !== '') out.push(`+ ${line}`)
  for (const line of before.split('\n')) if (!afterLines.has(line) && line.trim() !== '') out.push(`- ${line}`)
  return out
}

/* ------------------------------------------------------------------ 录一发 */

/** 录完先放这儿，等人看过 diff 再决定写不写盘。key 是随机 id，不是参数哈希（同一组参数可以录多次） */
const pending = new Map<string, { platform: string; endpoint: string; sample: CorpusSample; path: string; json: string }>()

/** 同一次会话共用一个脱敏 session：同一个人在这一批样本里换完还是同一个假身份 */
const session = createScrubSession()

interface RecordOutcome {
  ok: boolean
  /** 入库判定的结论与理由 */
  verdict: { kind: string; reason: string }
  /** 待定样本 id；被拒时没有 */
  pendingId?: string
  /** 脱敏统计（**只有数量与路径，没有值**） */
  scrub?: { replacements: number; suspects: string[]; leaks: string[] }
  /** 脱敏后的响应，给「响应 JSON」那块面板 */
  payload?: JsonValue
  /** 「即将写入的类型 diff」那块面板 */
  diff?: string[]
  /** 会不会让下游编译红 */
  breaking?: string[]
  message?: string
}

const recordOne = async (platform: Platform, endpoint: string, params: Record<string, JsonValue>): Promise<RecordOutcome> => {
  const def = REGISTRIES[platform][endpoint]
  if (def === undefined) return { ok: false, verdict: { kind: 'reject', reason: `没有这个端点：${platform}.${endpoint}` } }

  const base = makeClientCtx(platform, cookieOf(platform), {}, 'curate-corpus')
  let raw: JsonValue | undefined
  let status = 0
  let statusText: string | undefined
  const ctx = {
    ...base,
    send: async (...args: Parameters<typeof base.send>) => {
      const response = await base.send(...args)
      raw = response.body as JsonValue
      status = response.status
      statusText = response.statusText
      return response
    }
  }

  const result = await execute(def, params, { ctx, signers: base.signers, judge: base.judge })
  if (raw === undefined) {
    return {
      ok: false,
      verdict: { kind: 'reject', reason: '一发请求都没打出去' },
      message: result.success ? '?' : result.error.message
    }
  }

  const trimmedRaw = trimSample(raw)
  const trimmedNormalized = result.success && def.normalize !== undefined ? trimSample(result.data as JsonValue) : undefined
  const created = createCorpusSample({
    platform,
    endpoint,
    params,
    raw: trimmedRaw.value,
    ...(trimmedNormalized === undefined ? {} : { normalized: trimmedNormalized.value }),
    http: { status, ...(statusText === undefined ? {} : { statusText }) },
    amagiVersion: version,
    recordedAt: new Date(),
    scrub: { session }
  })
  if (!('sample' in created)) return { ok: false, verdict: created.verdict }

  const manifest = created.sample.metadata.scrub
  const before = filesFor(platform, endpoint)
  const after = filesFor(platform, endpoint, created.sample)
  const diff: string[] = []
  for (const [path, source] of after) diff.push(...lineDiff(before.get(path) ?? '', source).map((line) => `${path} ${line}`))
  for (const path of before.keys()) if (!after.has(path)) diff.push(`- 整个文件不再产出：${path}`)

  const pendingId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  // 残留非空时**不给 pendingId**，也就没法入库：提交出去就收不回来了
  if (manifest.leaks.length === 0)
    pending.set(pendingId, { platform, endpoint, sample: created.sample, path: created.path, json: created.json })

  return {
    ok: manifest.leaks.length === 0,
    verdict: created.verdict,
    ...(manifest.leaks.length === 0 ? { pendingId } : {}),
    scrub: {
      replacements: manifest.replacements.length,
      suspects: manifest.suspects.map((item) => `${item.path} —— ${item.reason}`),
      leaks: manifest.leaks.map((item) => `${item.path} —— ${item.reason}`)
    },
    payload: 'normalized' in created.sample ? (created.sample.normalized as JsonValue) : created.sample.raw,
    diff,
    breaking: detectBreakingChanges(before, after)
      .filter((change) => change.breaksReaders)
      .map((change) => change.message)
  }
}

/* ------------------------------------------------------------------ HTTP */

const json = (body: unknown): { status: number; type: string; body: string } => ({
  status: 200,
  type: 'application/json; charset=utf-8',
  body: JSON.stringify(body)
})

/** 端点清单：全部由注册表派生，参数表单由 zod schema 派生 —— 一个表单都不手写 */
const endpointList = () =>
  (Object.keys(REGISTRIES) as Platform[]).map((platform) => ({
    platform,
    // 只回「有没有 cookie」，**绝不回 cookie 本身**
    hasCookie: cookieOf(platform) !== '',
    endpoints: Object.entries(REGISTRIES[platform]).map(([name, def]) => {
      const schema = schemaOf(def)
      const matrix = expandParamMatrix(schema, { seeds: resolveSeeds(seeds, platform, name) })
      return {
        name,
        summary: def.doc?.summary ?? '',
        schema,
        seeds: resolveSeeds(seeds, platform, name),
        stored: readSamples(platform, name).length,
        /** 「一键补样本」要录几组；`unseeded` 非空表示这个端点缺种子、录不了 */
        combinations: matrix.combinations.length,
        unseeded: matrix.unseeded
      }
    })
  }))

const readBody = async (request: { on: (event: string, handler: (chunk?: unknown) => void) => void }): Promise<Record<string, JsonValue>> =>
  new Promise((resolve) => {
    let raw = ''
    request.on('data', (chunk) => {
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

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`)
  // 给了口令就每个请求都验（绑局域网时才有口令，回环下不打扰人）
  if (token !== undefined && url.searchParams.get('token') !== token && request.headers['x-curate-token'] !== token) {
    response.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('口令不对')
    return
  }

  try {
    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(CURATE_PAGE)
      return
    }
    if (url.pathname === '/api/endpoints') {
      const { status, type, body } = json(endpointList())
      response.writeHead(status, { 'content-type': type })
      response.end(body)
      return
    }
    if (url.pathname === '/api/record' && request.method === 'POST') {
      const body = await readBody(request)
      const outcome = await recordOne(body.platform as Platform, String(body.endpoint), (body.params ?? {}) as Record<string, JsonValue>)
      const { status, type, body: text } = json(outcome)
      response.writeHead(status, { 'content-type': type })
      response.end(text)
      return
    }
    if (url.pathname === '/api/store' && request.method === 'POST') {
      const body = await readBody(request)
      const entry = pending.get(String(body.pendingId))
      if (entry === undefined) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        response.end('这份待定样本已经不在了（服务重启过？重录一次）')
        return
      }
      const full = join(ROOT, entry.path)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, entry.json, 'utf8')
      pending.delete(String(body.pendingId))
      const { status, type, body: text } = json({ written: entry.path })
      response.writeHead(status, { 'content-type': type })
      response.end(text)
      return
    }
    if (url.pathname === '/api/discard' && request.method === 'POST') {
      const body = await readBody(request)
      pending.delete(String(body.pendingId))
      const { status, type, body: text } = json({ discarded: true })
      response.writeHead(status, { 'content-type': type })
      response.end(text)
      return
    }
    if (url.pathname === '/api/record-batch' && request.method === 'POST') {
      // 「一键补样本」：按参数矩阵把这个端点录一轮，**每组都只到待定为止**，
      // 要不要入库还是人一组一组看 —— 批量录制不等于批量入库
      const body = await readBody(request)
      const platform = body.platform as Platform
      const endpoint = String(body.endpoint)
      const def = REGISTRIES[platform]?.[endpoint]
      if (def === undefined) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        response.end('没有这个端点')
        return
      }
      const matrix = expandParamMatrix(schemaOf(def), { seeds: resolveSeeds(seeds, platform, endpoint) })
      const outcomes: RecordOutcome[] = []
      for (const params of matrix.combinations) {
        outcomes.push(await recordOne(platform, endpoint, params))
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
      const { status, type, body: text } = json({ unseeded: matrix.unseeded, notes: matrix.notes, outcomes })
      response.writeHead(status, { 'content-type': type })
      response.end(text)
      return
    }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('没有这个接口')
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(error instanceof Error ? error.message : String(error))
  }
})

server.listen(port, host, () => {
  console.log(`corpus 策展工具：http://${host}:${port}${token === undefined ? '' : `?token=${token}`}`)
  console.log(token === undefined ? '只监听回环地址。要绑局域网得同时给 --host 与 --token' : '已开口令校验')
})
