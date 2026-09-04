// corpus 录制器（PRD 阶段 1）。**有网络、非确定、要 cookie**，所以它是脚本而不是库：
// 纯函数那一半全在 `packages/typegen`，这里只负责「发请求 → 交给它 → 写盘」。
//
//   pnpm record:corpus --dry-run                 只打印要录哪些端点、哪几组参数，不发请求
//   pnpm record:corpus --platform kuaishou       录一个平台
//   pnpm record:corpus --endpoint videoWork      录一个端点（可与 --platform 同用）
//
// cookie 从**环境变量**读（`AMAGI_COOKIE_KUAISHOU` 这类），照 `src/dev.ts` 那条既有惯例：
// 真凭证放本地、不进仓库。没给 cookie 的平台照样会跑 —— 快手 H5、B站部分端点本来就免 cookie，
// 拿不到就让入库判定去拒（`result=2001` / `code=-101`），**绝不把错误页写进 corpus**。
//
// 三件事这个脚本刻意不做：
//
// 1. **不重试**。风控与限流由入库判定拒掉并打印理由，人换出口再来。自动重试只会把
//    IP 级冷却拖成分钟级封锁（快手 `result=2` 实测）。
// 2. **不并发**。一个端点接一个端点地录，慢是有意的：并发是最快触发风控的方式，
//    而这个脚本一轮跑几十个请求，省下的几分钟远不值一次冷却。
// 3. **不猜参数**。必填参数没种子就跳过并报出来（`unseeded`），编一个假 ID 只会换回错误页。

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  collectSeedsFromSamples,
  createCorpusSample,
  createScrubSession,
  type DependencyEdge,
  EMPTY_SEED_FILE,
  expandParamMatrix,
  type JsonSchemaLike,
  type JsonValue,
  parseSeedFile,
  planRecordingOrder,
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

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..', '..')
const CORPUS_DIR = join(ROOT, 'corpus')

const REGISTRIES: Record<Platform, Registry> = {
  douyin: douyinRegistry,
  bilibili: bilibiliRegistry,
  kuaishou: kuaishouRegistry,
  xiaohongshu: xiaohongshuRegistry
}

/** 每次请求之间等这么久。不是礼貌，是省一次风控冷却 */
const DELAY_MS = 1500

/**
 * 撞上**整机级**风控就停下，不接着录这个平台的下一个端点。
 *
 * 快手 `result=2` 是 IP 级冷却（分钟级），B站 `-412` / `-509` 撞了也要等，cookie 过期
 * 更是后面每一发都会一样地失败。这种状态下继续发请求只有两个后果：白扔请求、把冷却拖得更久。
 *
 * **验证码故意不在这条里。** 快手 `result=2001` 是**端点级**行为反作弊：实测同一个出口、
 * 同一个 did 下 `photo/info` 稳定要验证码，而同样签名带 body 的 `comment/list` 正常返回 ——
 * 把它当整机风控会让本来能录的端点全被跳过。
 *
 * 判据读的是入库判定给出的理由，不重新判一遍：重判就等于多一份会跟 `corpus.ts` 那张表脱节的副本。
 */
const HALT_REASON = /冷却|频繁|拦截|未登录|cookie 过期|风控校验/

/**
 * **不录的端点**：会签发凭证的那些。
 *
 * 登录二维码接口的响应里带一个当场有效的 `qrcode_key`（扫一下就能拿到账号），
 * 而 corpus 要提交进 git。脱敏规则按键名匹配，`qrcode_key` 这种名字撞不上任何一条，
 * 残留检查也抓不到它（这个值在样本里只出现一次，没有「别处已换掉」的参照）。
 * 与其给每种凭证补一条规则，不如整类不录 —— 它们的响应形状本来也不是这套方案要描述的东西。
 */
const NEVER_RECORD = /login|passport|qrcode|captcha/i

/**
 * 依赖图（PRD 3.1）。**手工声明**，每条边都得有 `note` 说清为什么这么走 ——
 * 自动推断要靠字段名相似度，而 `id` 在一份响应里能出现几十处、指的东西各不相同，
 * 推错的代价是拿错 ID 发请求换回一份错误页，而那是静默的。
 *
 * 现在只有几条，写的是**已经确认过路径**的那些。补新边时照这个格式，别省 note。
 */
const EDGES: Record<Platform, DependencyEdge[]> = {
  kuaishou: [
    {
      endpoint: 'videoWork',
      param: 'photoId',
      from: 'userWorkList',
      path: 'feeds[].photo.id',
      limit: 3,
      note: '路径按 test/fixtures/kuaishou/search.json 那份真响应的形状写（H5 一族都是顶层 feeds[].photo.id，不是 data.feeds）——但那是 search 的响应，userWorkList 的形状还没实测过，第一次录完要核一眼'
    },
    {
      endpoint: 'comments',
      param: 'photoId',
      from: 'userWorkList',
      path: 'feeds[].photo.id',
      limit: 2,
      note: '同 videoWork 那条，包括「路径未实测」这一点'
    },
    {
      endpoint: 'danmakuList',
      param: 'photoId',
      from: 'userWorkList',
      path: 'feeds[].photo.id',
      limit: 1,
      note: '同上'
    }
  ],
  bilibili: [],
  douyin: [],
  xiaohongshu: []
}

/* ------------------------------------------------------------------ 命令行 */

const argOf = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`)
  return index < 0 ? undefined : process.argv[index + 1]
}
const dryRun = process.argv.includes('--dry-run')
const onlyPlatform = argOf('platform')
const onlyEndpoint = argOf('endpoint')

/** cookie 从环境变量读，照 `src/dev.ts` 那条惯例（真凭证放本地、不进仓库） */
const cookieOf = (platform: Platform): string => process.env[`AMAGI_COOKIE_${platform.toUpperCase()}`] ?? ''

const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string }

let seeds: SeedFile = EMPTY_SEED_FILE
try {
  const parsed = parseSeedFile(JSON.parse(readFileSync(join(CORPUS_DIR, 'seeds.json'), 'utf8')) as JsonValue)
  for (const error of parsed.errors) console.warn(`⚠️  seeds.json：${error}`)
  seeds = parsed.seeds
} catch {
  console.warn('⚠️  没有 corpus/seeds.json —— 需要种子的端点会被跳过')
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** 端点 params 的 JSON Schema。`io: 'input'` 与 `server/openapi.ts` 一致：要的是 coerce 之前的形状 */
const schemaOf = (def: AnyEndpointDef): JsonSchemaLike =>
  zod.toJSONSchema(def.params, { io: 'input', unrepresentable: 'any' }) as JsonSchemaLike

interface Recorded {
  stored: number
  rejected: number
  skipped: number
}

/* ------------------------------------------------------------------ 录一个平台 */

const recordPlatform = async (platform: Platform, tally: Recorded): Promise<void> => {
  const registry = REGISTRIES[platform]
  const names = Object.keys(registry).filter((name) => {
    if (onlyEndpoint !== undefined && name !== onlyEndpoint) return false
    if (NEVER_RECORD.test(name)) {
      console.log(`   ⊘ ${name}：会签发凭证的端点不录（见 NEVER_RECORD）`)
      return false
    }
    return true
  })
  if (names.length === 0) return

  const plan = planRecordingOrder(names, EDGES[platform])
  for (const cycle of plan.cycles) {
    console.warn(`⚠️  ${platform}：${cycle.join(' ↔ ')} 互为上下游，这一组里至少要有一个端点在 seeds.json 里有根值`)
  }
  for (const edge of plan.danglingEdges) {
    console.warn(`⚠️  ${platform}：依赖图里 ${edge.endpoint} ← ${edge.from} 指向不存在的端点（端点改名了？）`)
  }

  const cookie = cookieOf(platform)
  console.log(`\n▶ ${platform}（${plan.order.length} 个端点，cookie ${cookie === '' ? '未提供' : '已提供'}）`)
  // 同平台一个 session：同一个人在这一批样本里换完还是同一个假身份
  const session = createScrubSession()
  /** 已录到的原始响应，喂依赖图 */
  const recorded: Record<string, JsonValue[]> = {}

  for (const name of plan.order) {
    const def = registry[name]!
    const fromGraph = collectSeedsFromSamples(EDGES[platform], recorded)[name] ?? {}
    const matrix = expandParamMatrix(schemaOf(def), { seeds: { ...resolveSeeds(seeds, platform, name), ...fromGraph } })
    for (const note of matrix.notes) console.log(`   · ${name}：${note}`)
    if (matrix.unseeded.length > 0) {
      tally.skipped += 1
      continue
    }

    for (const params of matrix.combinations) {
      const shown = JSON.stringify(params)
      if (dryRun) {
        console.log(`   ○ ${name} ${shown}`)
        continue
      }

      // 抓原始响应：包一层 send，把 decode / normalize **之前**的 body 留下来。
      // 类型描述的是归一化后那一层，但排查全靠原始 —— 字段是平台改名了还是 normalize
      // 吃掉了，只有对比两边才分得出，所以两份都得存。
      //
      // 每发都覆盖，留下的是**最后一发**：prepare 里的内部请求（换 guest cookie、
      // 取 wbi key）都排在主请求前面，而重试时最后一发才是被 judge 放过的那一发
      const base = makeClientCtx(platform, cookie, {}, 'record-corpus')
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

      // `signers` / `judge` 要显式传：`execute` 读的是 `options.signers`，不是 `ctx.signers`
      // （client/fetcher.ts:247 也是这么传的）。漏了的话签名端点会在 sign 阶段
      // 报「未注册的签名器」—— 第一次跑这个脚本就是这么撞上的
      const result = await execute(def, params, { ctx, signers: base.signers, judge: base.judge })
      await sleep(DELAY_MS)
      if (raw === undefined) {
        console.error(`   ✗ ${name} ${shown}：一发请求都没打出去（${result.success ? '?' : result.error.message}）`)
        tally.rejected += 1
        continue
      }

      // 先按形状截断再脱敏。截断保留每一种不同的元素形状，所以生成的类型一字不变
      // （`typegen/test/trim.test.ts` 直接断言了这条），而一份 `danmakuList` 从 204 KB
      // 掉到几 KB —— corpus 要提交进 git 并被 review，600 KB 的机器生成 JSON 没人看得动
      const trimmedRaw = trimSample(raw)
      const trimmedNormalized = result.success && def.normalize !== undefined ? trimSample(result.data as JsonValue) : undefined
      for (const record of trimmedRaw.trimmed) {
        if (record.from - record.to >= 10) console.log(`     · 截断 raw.${record.path}：${record.from} → ${record.to} 条`)
      }

      const created = createCorpusSample({
        platform,
        endpoint: name,
        params: params as Record<string, JsonValue>,
        raw: trimmedRaw.value,
        ...(trimmedNormalized === undefined ? {} : { normalized: trimmedNormalized.value }),
        http: { status, ...(statusText === undefined ? {} : { statusText }) },
        amagiVersion: version,
        recordedAt: new Date(),
        scrub: { session }
      })
      if (!('sample' in created)) {
        console.error(`   ✗ ${name} ${shown}：${created.verdict.reason}`)
        tally.rejected += 1
        // 整机级风控就停下（验证码不算，见 HALT_REASON）—— 继续发只会白扔请求并把冷却拖长
        if (HALT_REASON.test(created.verdict.reason)) {
          console.error(`\n⛔ ${platform} 撞上整机级风控 / 限流，这个平台不再往下录。换出口或等一阵再来`)
          return
        }
        continue
      }
      const full = join(ROOT, created.path)
      const manifest = created.sample.metadata.scrub
      // 残留检查非空就**不写盘**：某处换掉的原值以子串形式嵌在别处，说明规则还差一条。
      // 这道拦截是这个脚本里唯一「宁可少一份样本」的地方 —— 提交出去就收不回来了
      if (manifest.leaks.length > 0) {
        console.error(`   ✗ ${name} ${shown}：脱敏残留 ${manifest.leaks.length} 处，没有写盘`)
        for (const leak of manifest.leaks) console.error(`     ✗ ${leak.path} —— ${leak.reason}`)
        tally.rejected += 1
        continue
      }
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, created.json, 'utf8')
      recorded[name] = [...(recorded[name] ?? []), raw]
      tally.stored += 1
      console.log(
        `   ✓ ${name} ${shown} → ${created.path}` +
          `（脱敏 ${manifest.replacements.length} 处${manifest.suspects.length > 0 ? `，可疑 ${manifest.suspects.length} 处` : ''}）`
      )
      for (const suspect of manifest.suspects) console.warn(`     ⚠️  可疑未脱敏：${suspect.path} —— ${suspect.reason}`)
    }
  }
}

/* ------------------------------------------------------------------ 主流程 */

const tally: Recorded = { stored: 0, rejected: 0, skipped: 0 }
const platforms = (Object.keys(REGISTRIES) as Platform[]).filter((name) => onlyPlatform === undefined || name === onlyPlatform)

for (const platform of platforms) await recordPlatform(platform, tally)

console.log(
  `\n${dryRun ? '（dry-run，没有发出任何请求）' : `入库 ${tally.stored} 份，被拒 ${tally.rejected} 份，跳过 ${tally.skipped} 个端点（缺种子）`}`
)
if (!dryRun && tally.stored > 0) console.log('接着跑 pnpm gen:types 生成类型，然后把 corpus 与产物一起提交')
