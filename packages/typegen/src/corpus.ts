/**
 * corpus 的存储格式与入库判定（PRD 阶段 1）。**纯函数**：不读文件、不发请求、不落盘 ——
 * 录制器（有网络、非确定）只负责「发请求 → 交给这里 → 把返回的 json 写到返回的 path」。
 *
 * 这一层要挡住的失败只有一个，但它是这套方案里最贵的：**把错误页当成响应入库**。
 * 快手 `result=2`、B站 `code=-412` 长得跟正常响应一模一样（HTTP 200、JSON 完整），
 * 混进 corpus 之后生成的类型会把所有业务字段变成可选、可 null，而且**没有任何测试会红** ——
 * 类型确实覆盖了那份样本，只是那份样本描述的是风控页。
 *
 * 所以入库判定不是 judge 的复制品，它回答的是另一个问题：
 *
 * | | judge 问的 | 入库判定问的 |
 * |---|---|---|
 * | `code=-404 稿件不存在` | 失败 | **要**（PRD 点名要「已删除」这种样本） |
 * | `result=11` 字段全 null | 可重试 | **不要**（会把所有字段变成可 null） |
 * | `result=2001` 需要验证码 | 风控 | 不要 |
 *
 * 两边会给出不同答案，所以这张表只能写在这里，不能从 `PLATFORM_RUNTIME` 借。
 * 但录制器手上有真 judge 的结论时应该用 {@link CreateCorpusSampleInput.verdict} 传进来覆盖。
 */

import { createHash } from 'node:crypto'

import { createScrubSession, scrubSample, type ScrubManifest, type ScrubOptions } from './scrub'
import type { JsonValue } from './types'

/** 目录根。路径约定：`corpus/<platform>/<endpoint>/<paramsHash>.json` */
export const CORPUS_ROOT = 'corpus'

/**
 * 格式版本。**加字段不用动它**（读旧样本时缺键就是缺键）；
 * 只有「同一个键的含义变了」才 +1 —— 那种改动必须让旧样本显式失效，否则会静默混用两种语义。
 */
export const CORPUS_FORMAT = 1

/** 样本超过这个天数就在生成时告警。90 天 ≈ 一个季度，平台改字段的节奏大致是这个量级 */
export const DEFAULT_MAX_AGE_DAYS = 90

/** 参数哈希取多少位十六进制。12 位足够（一个端点下不会有 2^48 组参数），再长会顶到 Windows 的路径上限 */
const PARAMS_HASH_LENGTH = 12

/** 目录名与文件名只允许这些字符 —— 端点名进的是文件系统，得先当它不可信 */
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/

/**
 * 参数里这些键**一律不写进 metadata**。
 *
 * 这是整套设计里最可能泄漏的一处：amagi 有些端点把 cookie 当参数收。
 * 样本只留本地、不进 git，但那不是保险箱（会被顺手 `cat` 进聊天、被截图、被打包进 bug 报告），
 * 而且这条正是 PRD 七那句「cookie 绝不能进样本的 metadata」。
 * 被删掉的键名本身会记进 `strippedParams`（键名不是秘密，让人看见删了什么）。
 *
 * **平台自家的凭证名要逐个列出来，光靠通用词是漏的。** 2026-09-05 实测：
 * `SESSDATA` / `bili_jct` / `DedeUserID` / `buvid3` / `sid_guard` 这五个原先一个都不命中
 * —— 而 `SESSDATA` 与 `sid_guard` 恰好是这个仓库自己在用的那两个（`sid_guard` 还是
 * PRD 七点名过的）。其中 `bili_jct` / `buvid3` 只是因为「32 位连续串」进了 `suspects`，
 * 值照样留在 metadata 里。
 * 加平台凭证名的代价不对称：多删一个参数只是 metadata 少一项（键名还记着），
 * 漏一个是真凭证落盘。所以拿不准就加进来。
 * （`msToken` / `web_session` 这类不用单列 —— 通用词 `token` / `session` 已经盖住了。
 * 而**绝不能加光秃秃的 `uid`**：那是正当的业务参数，删掉它 metadata 就说不清这份样本问的是谁。）
 */
const CREDENTIAL_PARAM =
  /cookie|token|csrf|session|passport|ttwid|odin|sign|secret|auth|password|sessdata|bili_jct|dedeuserid|buvid|sid_guard|sid_tt|uid_tt|s_v_web_id/i

/* ------------------------------------------------------------------ 数据结构 */

export interface CorpusHttpInfo {
  status: number
  statusText?: string
}

export interface CorpusMetadata {
  /** 注册表里的端点名（不含平台前缀），例如 `videoWork` */
  endpoint: string
  platform: string
  /**
   * 请求参数，**脱敏后的**。跟 payload 用同一个 session 脱敏，所以
   * `params.uid` 与响应里那个作者 ID 换完仍然相等 —— metadata 与 payload 还能对得上。
   */
  params: Record<string, JsonValue>
  /** 因为像凭证而被整个删掉的参数键名，见 {@link CREDENTIAL_PARAM} */
  strippedParams: string[]
  /** 见 {@link hashParams} */
  paramsHash: string
  /** ISO 8601 UTC，**到秒**（毫秒没有信息量，只会让每次录制都刷 diff） */
  recordedAt: string
  http: CorpusHttpInfo
  /** 录制时的 amagi 版本。字段变了之后回头查「这份样本是哪个版本录的」 */
  amagiVersion: string
  /** 入库判定的结论，连理由一起存 —— `store-as-error` 的样本靠它被认出来 */
  verdict: CorpusVerdict
  scrub: ScrubManifest
}

export interface CorpusSample {
  format: number
  metadata: CorpusMetadata
  /**
   * **未经 `decode` / `normalize` 的原始响应**。类型描述的是归一化后的 `data`，
   * 但排查靠这个：字段是平台改了名，还是 amagi 的 normalize 吃掉了，只有对比两边才分得出。
   */
  raw: JsonValue
  /**
   * 归一化后的值。**端点没有 normalize 步骤时这个键整个不存在** ——
   * 与「normalize 返回了 null」是两件事，而 JSON 里区分它们的唯一办法就是缺键。
   */
  normalized?: JsonValue
}

/** 入库判定的三种结论。三分而不是布尔，因为「已删除 / 私密」这种错误形状是 PRD 点名要收的样本 */
export type CorpusVerdictKind =
  /** 正常响应，入库 */
  | 'store'
  /** 合法的错误形状（稿件不存在 / 不可见），入库但标出来，别混进成功类型 */
  | 'store-as-error'
  /** 风控 / 限流 / 验证码 / cookie 过期 / 空壳，**绝不入库** */
  | 'reject'

export interface CorpusVerdict {
  kind: CorpusVerdictKind
  /** 人读的理由，会写进 metadata（`reject` 时也是录制器该打印的那句话） */
  reason: string
  /**
   * 这个结论有没有**依据**。
   *
   * `false` 表示判定器在这份响应上是瞎的 —— 平台没登记业务码、响应里没有那个码字段、
   * 或者响应根本不是对象，于是只能按「没理由拒绝」放过。它**不是**「这份响应没问题」。
   *
   * 存在的理由是录制器手上还有另一份情报：真 judge 的结论。两者分工是
   * 「judge 只在判定器瞎的时候补位」—— 不能反过来让 judge 一票否决，因为
   * `code=-404 稿件不存在` 在 judge 眼里是失败，而它正是 PRD 点名要收的样本。
   */
  confident: boolean
}

/* ------------------------------------------------------------------ 入库判定 */

const isRecord = (value: JsonValue): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** 业务码表。键是**平台自己那个码字段**的取值，值是结论 */
interface CodeTable {
  /** 装业务码的键名，按顺序找第一个存在的 */
  field: readonly string[]
  /** 表示成功的取值 */
  ok: readonly number[]
  /** 明确认识的取值 → 结论。表里不写 `confident` —— 查表命中就是有依据的，由 `classifyResponse` 补上 */
  known: Record<number, Omit<CorpusVerdict, 'confident'>>
}

/**
 * 各平台的业务码。只登记**见过实物**的码：
 * 快手那几个是这一轮迁移实测出来的，B站那几个来自 `judge.ts` 已有的映射。
 * 没登记的非成功码一律 `reject` —— 方向是安全的那一侧（宁可漏收样本，不可收进错误页）。
 */
const CODE_TABLES: Record<string, CodeTable> = {
  kuaishou: {
    field: ['result'],
    ok: [1],
    known: {
      2: { kind: 'reject', reason: '快手 result=2：平台拒绝 / IP 级冷却（分钟级），换出口再录' },
      11: { kind: 'reject', reason: '快手 result=11：字段全 null 的空壳，入库会把所有字段变成可 null' },
      21: { kind: 'reject', reason: '快手 result=21：缺位置参数，是请求写错了不是响应' },
      50: { kind: 'reject', reason: '快手 result=50：签名校验失败，是签名写错了不是响应' },
      2001: { kind: 'reject', reason: '快手 result=2001：H5 需要验证码' },
      400002: { kind: 'reject', reason: '快手 result=400002：PC 需要验证码' }
    }
  },
  bilibili: {
    field: ['code'],
    ok: [0],
    known: {
      [-101]: { kind: 'reject', reason: 'B站 code=-101：账号未登录 / cookie 过期' },
      [-352]: { kind: 'reject', reason: 'B站 code=-352：风控校验失败' },
      [-412]: { kind: 'reject', reason: 'B站 code=-412：请求被拦截（风控）' },
      [-509]: { kind: 'reject', reason: 'B站 code=-509：请求过于频繁' },
      [-404]: { kind: 'store-as-error', reason: 'B站 code=-404：稿件不存在 —— 这是要收的「已删除」样本' },
      62002: { kind: 'store-as-error', reason: 'B站 code=62002：稿件不可见 —— 这是要收的「私密」样本' },
      62004: { kind: 'store-as-error', reason: 'B站 code=62004：稿件审核中' }
    }
  },
  douyin: {
    field: ['status_code'],
    ok: [0],
    known: {
      8: { kind: 'reject', reason: '抖音 status_code=8：需要验证' },
      2154: { kind: 'reject', reason: '抖音 status_code=2154：风控拦截' },
      2190: { kind: 'reject', reason: '抖音 status_code=2190：需要登录' },
      // 实测原文是「请先登录，再继续搜索吧」—— 搜索一族未登录就是这个码
      2483: { kind: 'reject', reason: '抖音 status_code=2483：搜索需要登录' }
    }
  }
}

/**
 * 验证码页的通用特征。只列**见过实物**的两个键：`captchaConfig` 是快手 H5 `result=2001`
 * 那份响应里的（还是个字符串化的 JSON），`verify_center_decision_conf` 是抖音风控页的。
 *
 * 故意不收 `captcha_token` 这类眼熟的名字 —— 快手 H5 的正常请求里就带一个空的 `captchaToken`，
 * 按名字宁滥勿缺会把正常样本判成风控页，而那种误判是静默的。
 */
const CAPTCHA_MARKERS = ['captchaConfig', 'verify_center_decision_conf']

/**
 * 「字段全 null 的空壳」。快手 PC GraphQL 未登录时就返回这个，`result` 还是 1。
 *
 * 它比风控页更危险：风控页至少形状明显不同，空壳的形状与真响应**完全一致**，
 * 只是每个值都是 null —— 入库之后生成的类型里每个字段都带 `| null`，而且看不出是哪份样本干的。
 */
const isNullShell = (raw: JsonValue): boolean => {
  if (!isRecord(raw)) return false
  const data = raw.data
  if (!isRecord(data)) return false
  const values = Object.values(data)
  return values.length > 0 && values.every((value) => value === null)
}

const hasCaptchaMarker = (raw: JsonValue): boolean => {
  if (Array.isArray(raw)) return raw.some(hasCaptchaMarker)
  if (!isRecord(raw)) return false
  if (CAPTCHA_MARKERS.some((marker) => marker in raw)) return true
  return Object.values(raw).some(hasCaptchaMarker)
}

/**
 * 十进制整数的字符串写法。不收 `1e3` / `0x10` / 带空格 / 前导零 ——
 * 那些都不是平台在写业务码时会用的形式，收进来只会多一处「这个字符串到底是几」的歧义。
 */
const DECIMAL_INTEGER = /^-?(?:0|[1-9]\d*)$/

/**
 * 把业务码取成数字。**字符串形式也要认。**
 *
 * PRD 第五节的规则表自己写着「平台业务码有的接口给 `-412`、有的给 `"12061"`」，
 * 而原先这里是 `typeof code !== 'number'` 就直接放行、`confident: false` ——
 * 于是一份 `{"code":"-412"}` 的风控页会被当成正常响应入库，而这个函数存在的全部理由
 * 就是挡住那种东西。判定器在这条上不是「瞎」，是根本没看。
 *
 * 超出安全整数范围的一律不认：那种长度的东西不可能是业务码，
 * 而 `Number()` 会把它对齐到一个可能真的在表里的值。
 */
const asBusinessCode = (value: JsonValue | undefined): number | undefined => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || !DECIMAL_INTEGER.test(value)) return undefined
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

/**
 * 这份响应能不能进 corpus。
 *
 * 顺序是有意的：先看 HTTP、再看通用风控特征、最后才看平台业务码。
 * 因为风控页经常**同时**带一个成功的业务码（快手空壳就是 `result=1`），
 * 业务码先跑的话它会被判成 `store`。
 */
export const classifyResponse = (input: { platform: string; raw: JsonValue; http: CorpusHttpInfo }): CorpusVerdict => {
  const { platform, raw, http } = input
  if (http.status < 200 || http.status >= 300) {
    return {
      kind: 'reject',
      reason: `HTTP ${http.status}${http.statusText === undefined ? '' : ` ${http.statusText}`}：不是业务响应`,
      confident: true
    }
  }
  if (hasCaptchaMarker(raw)) return { kind: 'reject', reason: '响应里带验证码字段，这是风控页不是响应', confident: true }
  if (isNullShell(raw)) {
    return { kind: 'reject', reason: 'data 下所有字段都是 null：空壳响应，入库会让每个字段都带 `| null`', confident: true }
  }

  const table = CODE_TABLES[platform]
  // 下面三条 `confident: false` 是判定器**在这份响应上是瞎的**，不是「这份响应没问题」——
  // 录制器会在这三种情况下拿真 judge 的结论补位（见 `CorpusVerdict.confident`）
  if (table === undefined || !isRecord(raw)) return { kind: 'store', reason: '没有可查的业务码，按正常响应入库', confident: false }
  const field = table.field.find((candidate) => candidate in raw)
  if (field === undefined) {
    return { kind: 'store', reason: `响应里没有 ${table.field.join(' / ')} 字段，按正常响应入库`, confident: false }
  }
  const code = raw[field]
  const numeric = asBusinessCode(code)
  if (numeric === undefined) {
    return { kind: 'store', reason: `${field} 不是数字也不是数字形式的字符串，无法判定，按正常响应入库`, confident: false }
  }
  // 原值是字符串时在理由后面补一句。**不改写 `CODE_TABLES` 里那句话** —— 那是人写的文案，
  // 而「平台这次发的是字符串不是数字」是另一件事，排查时两件都要看得见
  const asString = typeof code === 'string' ? `（原值是字符串 ${JSON.stringify(code)}）` : ''
  const shown = `${field}=${typeof code === 'string' ? JSON.stringify(code) : numeric}`
  if (table.ok.includes(numeric)) return { kind: 'store', reason: shown, confident: true }
  const known = table.known[numeric]
  if (known !== undefined) return { ...known, reason: `${known.reason}${asString}`, confident: true }
  return {
    kind: 'reject',
    reason: `${platform} ${shown}：没见过这个码，先别入库 —— 确认它是正常响应就把它加进 CODE_TABLES`,
    confident: true
  }
}

/* ------------------------------------------------------------------ 路径与哈希 */

/** 递归排键的 JSON。参数对象的键序不该影响文件名（`{a,b}` 与 `{b,a}` 是同一个请求） */
const canonicalJson = (value: JsonValue): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (!isRecord(value)) return JSON.stringify(value) ?? 'null'
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`).join(',')}}`
}

/**
 * 参数哈希 = 文件名。
 *
 * **喂进去的是脱敏后的参数**，不是真参数。因为脱敏是确定性的（假值派生自原值哈希），
 * 所以文件身份照样稳定 —— 同一个请求重录一遍还是同一个文件名；
 * 而好处是文件名里不留任何真值的哈希，与 `scrub.ts` 里「清单不留原值哈希」那条一致
 * （五位 UID 的截断哈希是能爆破的，文件名跟清单一样要提交）。
 */
export const hashParams = (params: Record<string, JsonValue>): string =>
  createHash('sha256').update(canonicalJson(params)).digest('hex').slice(0, PARAMS_HASH_LENGTH)

/** 路径：`corpus/<platform>/<endpoint>/<paramsHash>.json`。段名不合法就抛 —— 它要进文件系统 */
export const corpusPath = (input: { platform: string; endpoint: string; paramsHash: string }): string => {
  for (const [name, segment] of Object.entries(input)) {
    if (!SAFE_SEGMENT.test(segment)) throw new Error(`corpus 路径段 ${name}=${JSON.stringify(segment)} 含非法字符，只允许 [A-Za-z0-9_-]`)
  }
  return `${CORPUS_ROOT}/${input.platform}/${input.endpoint}/${input.paramsHash}.json`
}

/* ------------------------------------------------------------------ 年龄 */

export interface CorpusAge {
  ageDays: number
  stale: boolean
  /** `stale` 时才有。生成器该把它原样打出来 */
  warning?: string
}

const MS_PER_DAY = 86_400_000

/**
 * 样本有多旧。`now` 必须由调用方传（纯函数：拿 `Date.now()` 的话测试就得冻时间）。
 *
 * 存在的理由不是洁癖：**类型是证据的快照**，而平台会悄悄改字段。
 * 一份两年前的样本生成出来的类型看着一样绿，实际描述的是一个已经不存在的响应。
 */
export const assessCorpusAge = (input: { recordedAt: string; now: Date; maxAgeDays?: number }): CorpusAge => {
  const maxAgeDays = input.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS
  const recorded = new Date(input.recordedAt).getTime()
  if (Number.isNaN(recorded)) return { ageDays: Number.NaN, stale: true, warning: `录制时间 ${input.recordedAt} 解析不了，当成过期处理` }
  const ageDays = Math.floor((input.now.getTime() - recorded) / MS_PER_DAY)
  if (ageDays <= maxAgeDays) return { ageDays, stale: false }
  return {
    ageDays,
    stale: true,
    warning: `样本已录制 ${ageDays} 天（阈值 ${maxAgeDays} 天），证据可能过期：平台改了字段这份样本也看不出来`
  }
}

/* ------------------------------------------------------------------ 组装 */

export interface CreateCorpusSampleInput {
  platform: string
  /** 端点名，不含平台前缀 */
  endpoint: string
  params: Record<string, JsonValue>
  /** 未经 decode / normalize 的原始响应 */
  raw: JsonValue
  /** 归一化后的值。端点没有 normalize 就别传（传 `undefined` 与传 `null` 是两件事） */
  normalized?: JsonValue
  http: CorpusHttpInfo
  amagiVersion: string
  recordedAt: Date
  /** 脱敏选项。`session` 也从这里传，同一批样本共用一个才能保住跨样本的一致性 */
  scrub?: ScrubOptions
  /**
   * 覆盖入库判定。录制器手上有真 judge 的结论、或者人在 Web 工具里手工打了标，就从这里传。
   * 不传就用 {@link classifyResponse}。
   */
  verdict?: CorpusVerdict
}

export type CreateCorpusSampleResult =
  /** 被拒的响应**拿不到 sample** —— 用类型让「跳过」成为唯一出路，而不是靠调用方记得判 if */
  { verdict: CorpusVerdict & { kind: 'reject' } } | { verdict: CorpusVerdict; sample: CorpusSample; path: string; json: string }

/** ISO 8601 到秒。毫秒没有信息量，留着只会让每次重录都刷一行 diff */
const toSecondIso = (date: Date): string => `${date.toISOString().slice(0, 19)}Z`

/** 删掉像凭证的参数，返回剩下的和被删掉的键名 */
const stripCredentials = (params: Record<string, JsonValue>): { kept: Record<string, JsonValue>; stripped: string[] } => {
  const kept: Record<string, JsonValue> = {}
  const stripped: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (CREDENTIAL_PARAM.test(key)) stripped.push(key)
    else kept[key] = value
  }
  return { kept, stripped: stripped.sort() }
}

/** 三份清单（params / raw / normalized）合成一份，路径按来源加前缀，否则 `uid` 分不出是参数还是响应里的 */
const mergeManifests = (parts: readonly { prefix: string; manifest: ScrubManifest }[]): ScrubManifest => {
  const withPrefix = <T extends { path: string }>(prefix: string, items: readonly T[]): T[] =>
    items.map((item) => ({ ...item, path: item.path === '' ? prefix : `${prefix}.${item.path}` }))
  const byPath = <T extends { path: string }>(left: T, right: T): number => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
  // 全局按路径排完，同前缀的自然还挨在一起 —— 既守住「清单按路径排序」的约定，又保持按来源分组的可读性
  return {
    replacements: parts.flatMap(({ prefix, manifest }) => withPrefix(prefix, manifest.replacements)).sort(byPath),
    suspects: parts.flatMap(({ prefix, manifest }) => withPrefix(prefix, manifest.suspects)).sort(byPath),
    leaks: parts.flatMap(({ prefix, manifest }) => withPrefix(prefix, manifest.leaks)).sort(byPath),
    warnings: [...new Set(parts.flatMap(({ prefix, manifest }) => manifest.warnings.map((item) => `${prefix}.${item}`)))].sort()
  }
}

/**
 * 一份响应 → 一份 corpus 样本（或者一个「别入库」的结论）。
 *
 * 判定、脱凭证、脱敏、算哈希、拼路径、序列化全在这一个函数里，是**故意**的：
 * 每多一个能绕过入库判定的入口，就多一个把风控页写进 corpus 的机会。
 */
export const createCorpusSample = (input: CreateCorpusSampleInput): CreateCorpusSampleResult => {
  const verdict = input.verdict ?? classifyResponse(input)
  if (verdict.kind === 'reject') return { verdict: { ...verdict, kind: 'reject' } }

  const { kept, stripped } = stripCredentials(input.params)
  // 参数、原始响应、归一化值共用**同一个 session**：`params.uid` 与响应里那个作者 ID 换完还得相等，
  // 否则 metadata 与 payload 就对不上了，而「对得上」正是把参数也存下来的理由
  const scrubOptions: ScrubOptions = { ...input.scrub, session: input.scrub?.session ?? createScrubSession() }
  const params = scrubSample(kept, scrubOptions)
  const raw = scrubSample(input.raw, scrubOptions)
  const normalized = 'normalized' in input && input.normalized !== undefined ? scrubSample(input.normalized, scrubOptions) : undefined

  const paramsHash = hashParams(params.value as Record<string, JsonValue>)
  const sample: CorpusSample = {
    format: CORPUS_FORMAT,
    metadata: {
      endpoint: input.endpoint,
      platform: input.platform,
      params: params.value as Record<string, JsonValue>,
      strippedParams: stripped,
      paramsHash,
      recordedAt: toSecondIso(input.recordedAt),
      http: input.http,
      amagiVersion: input.amagiVersion,
      verdict,
      scrub: mergeManifests([
        { prefix: 'params', manifest: params.manifest },
        { prefix: 'raw', manifest: raw.manifest },
        ...(normalized === undefined ? [] : [{ prefix: 'normalized', manifest: normalized.manifest }])
      ])
    },
    raw: raw.value,
    ...(normalized === undefined ? {} : { normalized: normalized.value })
  }
  return {
    verdict,
    sample,
    path: corpusPath({ platform: input.platform, endpoint: input.endpoint, paramsHash }),
    json: serializeCorpusSample(sample)
  }
}

/**
 * 落盘用的字符串。两条照 `packages/core/scripts/gen-openapi.mts` 的契约：
 * 2 空格缩进 + 结尾换行，且**行尾是 LF**（这个仓库在 Windows 上开发，不归一的话 `--check` 天天红）。
 *
 * 不给 payload 排键：键序是响应的一部分，排了序 diff 会跟线上抓包对不上。
 * 确定性靠「同一份输入 → 同一份输出」，而 `JSON.stringify` 保持插入顺序，本来就满足。
 */
export const serializeCorpusSample = (sample: CorpusSample): string => `${JSON.stringify(sample, null, 2).replace(/\r\n/g, '\n')}\n`
