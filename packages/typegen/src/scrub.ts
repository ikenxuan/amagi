/**
 * 脱敏器（PRD 七）。**录制即脱敏**，所以它在写盘之前跑，不给「先存原始再清洗」留窗口。
 *
 * 三条不能违反的规则，每条都对应一种「省了样本反而有害」的失败：
 *
 * 1. **不改变类型形状**。URL 还得是 URL、时间戳还得是 13 位、超过
 *    `MAX_SAFE_INTEGER` 的 ID 换完还得超界 —— 因为「大整数掉精度」正是类型要描述的东西，
 *    脱敏把它换成一个安全整数，就顺手把 `unsafe-integer` 那条报告项抹掉了。
 * 2. **同一原值换成同一假值**（同一次会话内）。`author.id` 与 `photo.userId` 是同一个人时
 *    换完还得相等，否则合并器会把「两个字段指同一实体」这种关系打散，断言反而假绿。
 * 3. **清单里不许有原值，连原值的哈希都不留**。清单要跟 corpus 一起提交，
 *    而短值的截断哈希是可以爆破的（昵称、五位 UID 都能拿字典撞）。
 *    review 的人需要知道的是「哪些路径被换了、换了几处」，那不需要原值。
 *
 * 还有一条是设计取向而不是规则：**规则没命中的值一律原样通过**，不猜。
 * 猜错的代价是不对称的 —— 误伤 `type` 这种判别字段会让分组、`is*` 守卫、字面量白名单
 * 全线报废，而漏掉一个字段只是「还得再补一条规则」。所以漏掉的那部分交给
 * {@link ScrubManifest.suspects}：它只报路径，让人来加规则。
 */

import { createHash } from 'node:crypto'

import { childPath, elementPath } from './options'
import type { JsonValue } from './types'

/**
 * 替换策略。选 kind 而不是让调用方传替换函数，是为了让「同形」这件事有唯一实现 ——
 * 每处各写一个 lambda 的话，迟早有一处把 13 位时间戳换成 10 位。
 */
export type ScrubKind =
  /** 不透明 ID：同位数、同字符集，且**安全/超界那一侧不变** */
  | 'id'
  /** 昵称、标题、正文：同码点数，逐码点同字符类（CJK 换 CJK、数字换数字） */
  | 'name'
  /** URL：保 scheme、主机标签数与各标签长度、路径段数与扩展名；换掉查询值（签名 token 就在那里） */
  | 'url'
  /** 长随机串（token / requestId / 签名）：同长度、逐字符同字符类 */
  | 'token'
  /** 掩码手机号：非数字字符（那些 `*`）原样保留，只换数字 */
  | 'phone'
  /** 时间戳：保位数（10 位秒 / 13 位毫秒），首位固定 `1` 以免变成不像时间戳的数 */
  | 'timestamp'
  /** 内容一概不留：字符串换空串、数字换 0。给 cookie 回显这种根本不该进 corpus 的字段 */
  | 'redact'

/** 匹配一个位置：`path` 按 `options.ts` 那套路径约定，`key` 只看最后一段的键名。两者都给就要同时满足 */
export interface ScrubMatcher {
  /** 整条路径。字符串精确匹配，要模糊就给 RegExp */
  path?: string | RegExp
  /** 键名（路径最后一段，数组元素取其容器的键名） */
  key?: string | RegExp
}

export interface ScrubRule extends ScrubMatcher {
  kind: ScrubKind
}

/** 清单里的一条：**只有路径与统计，没有原值** */
export interface ScrubReplacement {
  path: string
  kind: ScrubKind
  /** 这条路径上换掉了多少处 */
  occurrences: number
  /** 其中有多少个不同的原值（配合 `occurrences` 能看出一致性映射有没有生效） */
  distinct: number
  /** 举一个换完的**假值**当例子 —— 假值可以进清单，原值不行 */
  example: JsonValue
}

/** 规则没命中、但看着像凭证的位置。同样只报路径 */
export interface ScrubSuspect {
  path: string
  /** 为什么可疑（人读的），例如「长度 128 的 base64 串」 */
  reason: string
}

export interface ScrubManifest {
  /** 按路径排序（确定性：清单要提交进 git） */
  replacements: ScrubReplacement[]
  /** 见 {@link ScrubSuspect}。上限 {@link MAX_SUSPECTS}，超了在 `warnings` 里说明 */
  suspects: ScrubSuspect[]
  /**
   * **换完之后仍然残留在产物里的原值出现在哪些路径**（只报路径，不报值）。
   *
   * 这一项是事后校验，不是规则的一部分，存在的理由是它抓的是**整类**漏洞而不是某一条：
   * 一个值在 A 处被规则换掉了，却以子串的形式嵌在 B 处的另一个字段里 ——
   * 快手 `share_info` 里就嵌着作品 ID，而它的键名跟任何 URL / ID 规则都不像。
   * 逐条加规则永远追不完这种，让脱敏器自己回头看一遍才追得上。
   *
   * 非空就意味着**这份样本不该提交**：去补规则（通常是给 B 那个位置加一条），然后重录。
   */
  leaks: ScrubSuspect[]
  /** 规则配错了才会有：命中了对象/数组、命中了小数这类没法同形替换的位置 */
  warnings: string[]
}

export interface ScrubOptions {
  /** 追加规则。默认规则见 {@link DEFAULT_SCRUB_RULES}，除非 `replaceDefaultRules` */
  rules?: readonly ScrubRule[]
  /** 用 `rules` 整体替换默认规则，而不是追加 */
  replaceDefaultRules?: boolean
  /**
   * 白名单：命中的位置**既不脱敏也不进 suspects**。
   *
   * 它压过规则，因为判别字段、枚举 token、业务码被换掉的后果是全线报废
   * （分组、`is*` 守卫、字面量收窄一起坏），而这些恰好都不是隐私。
   * 顺带压掉 suspects 是有意的：既然人已经决定留着，就别让告警长期挂在那儿变成噪音。
   */
  keep?: readonly ScrubMatcher[]
  /**
   * 一致性映射的作用域。默认每次调用一份（PRD 只要求「同一份样本内」一致）；
   * 想让同一端点的多份样本共用同一批假值，就从 {@link createScrubSession} 拿一个传进来。
   */
  session?: ScrubSession
}

export interface ScrubResult<T extends JsonValue = JsonValue> {
  value: T
  manifest: ScrubManifest
}

/** suspects 的条数上限 —— 一份大响应能刷出上百条，那样人就不看了 */
export const MAX_SUSPECTS = 40

/**
 * 残留检查只看长度到这个数以上的原值。
 *
 * 短值不查是必须的而不是省事：`86` 这种两位数在一份大响应里到处都是，
 * 全查会刷出几百条假警报，而报告一旦变噪音就等于没有。而真正识别人的东西
 * （ID、URL、昵称、token）没有短的。
 */
const MIN_LEAK_LENGTH = 8

/** 短到这个长度以下的值，就算一个码点都没换动也不算泄漏（`??`、`……` 这种不识别人） */
const MIN_UNCHANGED_LENGTH = 4

/**
 * 默认规则。按**键名**匹配而不是按路径，这样换个端点不用重写一遍。
 *
 * 覆盖的正是 PRD 七点名的那几类：昵称、UID、带签名 token 的 CDN URL、`requestId`、
 * 掩码手机号、cookie 回显。`title` / `desc` / `text` 这类用户产出的正文也收了进来 ——
 * 它们不在 PRD 的清单里，但同样是用户内容，而且最可能被调用方用 `keep` 放回来。
 */
export const DEFAULT_SCRUB_RULES: readonly ScrubRule[] = [
  { key: /^(?:cookie|set_cookie|passport_csrf_token|ttwid|odin_tt|ms_?token|kww)$/i, kind: 'redact' },
  { key: /(?:token|signature|secret|session|ticket|nonce|_sign|sign_?key)/i, kind: 'token' },
  { key: /^(?:request_?id|trace_?id|log_?id|client_?id|msg_?id|serial_?no)$/i, kind: 'token' },
  // 埋点串：快手 `serverExpTag` 里嵌着作品 ID 与实验分组，键名跟 ID / URL 都不像 —— 实录才发现
  { key: /(?:exp_?tag|expTag|llsid|search_?session_?id|session_?id|ab_?params)/i, kind: 'token' },
  // 分享串里嵌着作品 ID 与短链，形状是「一段拼起来的文本」而不是纯 URL，所以按 token 逐字符换
  { key: /^(?:share_?info|share_?url|share_?text)$/i, kind: 'token' },
  { key: /(?:phone|mobile|^tel$)/i, kind: 'phone' },
  // 用 `s?$` 收住 camelCase 与复数：`headUrl` / `coverUrls` / `backupUrl` / `audioUrls` 都得进来。
  // 第一版只写了 `.*_url`，于是快手响应里那一堆 camelCase 的 URL 字段一个都没命中 —— 实录才发现
  { key: /(?:url|uri|link|src|href)s?$/i, kind: 'url' },
  { key: /^(?:cover|avatar|face|image|image_src|pic|pics|photo|thumbnail)$/i, kind: 'url' },
  // 裸主机名（快手每个 URL 旁边都挂一个 `cdn: "p66.a.kwimgs.com"`）
  { key: /^(?:cdn|host|domain)$/i, kind: 'url' },
  /**
   * URL **映射表**的叶子：`iconUrls: { "[哦]": "https://…" }` 这种键是数据、不是字段名，
   * 按键名永远匹配不上。所以这条按**路径**匹配：父键以 url / uri / cdn 结尾的直接子节点。
   */
  { path: /(?:url|uri|cdn)s?\.[^.]+$/i, kind: 'url' },
  { key: /^(?:id|uid|mid|sec_uid|sec_user_id|open_?id|union_?id|up_?mid)$/i, kind: 'id' },
  { key: /^(?:aid|cid|bvid|photo_?id|item_?id|room_?id|comment_?id|group_?id|user_?id|author_?id|vote_?id|rid)(?:_str)?$/i, kind: 'id' },
  {
    key: /^(?:nickname|nick_?name|uname|user_?name|author_?name|name|signature|desc|desc1|desc2|title|text|orig_text|content|summary)$/i,
    kind: 'name'
  },
  { key: /^(?:time|timestamp|ts|create_?time|pub_?ts|pub_?time|due_?date|end_?time|start_?time|expire|expire_?time)$/i, kind: 'timestamp' }
]

/**
 * 默认白名单。这几个键名一个默认规则都命中不了，列在这里纯粹是**防止将来有人往规则里加**
 * —— 判别字段被换掉是最贵的错误，而这条白名单的成本是零。
 */
export const DEFAULT_SCRUB_KEEP: readonly ScrubMatcher[] = [{ key: /^(?:type|kind|code|status|result|message)$/i }]

/* ------------------------------------------------------------------ 确定性随机 */

/**
 * 假值一律从**原值的哈希**派生，不用 `Math.random`。
 *
 * 理由是 `--check`：同一份响应重新录一遍必须产出逐字节相同的文件，否则每次录制都在刷 diff，
 * 而「corpus 变了」这个信号一旦变廉价，就没人看它了。顺带这也让一致性映射有了兜底 ——
 * 就算调用方没共用 session，同一个原值在不同批次里也仍然换成同一个假值。
 */
const digestOf = (kind: ScrubKind, original: string): string => createHash('sha256').update(`${kind} ${original}`).digest('hex')

/** 从哈希里按需取数；取完就再哈希一轮续上（长昵称、长 URL 会取很多次） */
const createStream = (seed: string): ((modulo: number) => number) => {
  let hex = seed
  let cursor = 0
  return (modulo: number): number => {
    if (cursor + 4 > hex.length) {
      hex = createHash('sha256').update(hex).digest('hex')
      cursor = 0
    }
    const chunk = Number.parseInt(hex.slice(cursor, cursor + 4), 16)
    cursor += 4
    return chunk % modulo
  }
}

const DIGITS = '0123456789'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** 一小批常用汉字。够把昵称/标题换成**同码点数**的汉字串，看着还像人话 */
const CJK = '一二三四五六七八九十甲乙丙丁春夏秋冬东南西北山水木火土云风雨雪月日星辰花草树林江河湖海'

/**
 * 这个码点属于哪个字符池。返回 `undefined` 表示原样保留 ——
 * 标点、emoji、各种符号都走这条：它们不识别人，但**影响码点数**，换掉不如留着。
 */
const poolOf = (codePoint: string): string | undefined => {
  if (DIGITS.includes(codePoint)) return DIGITS
  if (LOWER.includes(codePoint)) return LOWER
  if (UPPER.includes(codePoint)) return UPPER
  if (/^[㐀-䶿一-鿿]$/u.test(codePoint)) return CJK
  return undefined
}

/**
 * 值本身就长得像 URL。
 *
 * 这条判据比任何键名规则都硬：一个以 `https://` 或 `//` 开头的字符串**就是** URL，
 * 不需要猜。它存在是因为按键名追永远追不完 —— 实录一次就撞上七个没命中的名字
 * （`path`、`s_img`、`l_img`、`pc_web`、`img_label_uri_hans_static`……），
 * 而且 `mobile` 这种键还会被手机号规则抢走，然后按「保留所有非数字字符」处理，
 * 于是整条 URL 原样留下。
 *
 * 值形状优先于键名，只有 `redact` 例外（cookie 字段无论装的是什么都得清空）。
 */
const LOOKS_LIKE_URL = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i

/** 逐码点同类替换。用 `[...input]` 而不是 `input.length` —— 昵称里的 emoji 是双码元，按长度切会切碎 */
const mapCodePoints = (input: string, seed: string, fallbackPool?: string): string => {
  const next = createStream(seed)
  const mapped = [...input]
    .map((codePoint) => {
      const pool = poolOf(codePoint) ?? fallbackPool
      return pool === undefined ? codePoint : pool[next(pool.length)]!
    })
    .join('')
  /**
   * **一个码点都没换动**的情况要兜住，否则原值原样留在产物里。
   *
   * 这不是理论情形：`✿°•∘ɷ∘•°✿` 这种全是符号的昵称在这些平台上很常见，
   * 而符号既不识别人也不在任何字符池里，第一版就把它们整串原样放过了 ——
   * 实录时被残留检查抓出来的正是这一类。兜底把符号也换成汉字：
   * 码点数不变（形状还是那个形状），但值确实变了。
   */
  if (fallbackPool === undefined && mapped === input && [...input].length >= MIN_UNCHANGED_LENGTH) {
    return mapCodePoints(input, seed, CJK)
  }
  return mapped
}

/** 生成 `length` 位十进制串。多位数首位避开 0（前导零会让「这看着是个数」的判断变味） */
const fakeDigits = (length: number, seed: string, leading = ''): string => {
  const next = createStream(seed)
  const out = Array.from({ length }, (_, index) => (index === 0 && length > 1 ? String(1 + next(9)) : DIGITS[next(10)]!))
  for (let index = 0; index < leading.length && index < out.length; index += 1) out[index] = leading[index]!
  return out.join('')
}

/* ------------------------------------------------------------------ URL */

/** `scheme://host/rest`，scheme 可省（corpus 里满地都是 `//space.example.invalid/123/` 这种协议相对 URL） */
const URL_PATTERN = /^([a-z][a-z0-9+.-]*:)?(\/\/)([^/?#]*)([/?#].*)?$/i

/** 主机：保标签数与各标签长度，末段一律换 `invalid`（RFC 2606 保留，保证解析不出去），userinfo 直接丢掉 */
const scrubHost = (host: string, seed: string): string => {
  const withoutUserInfo = host.slice(host.lastIndexOf('@') + 1)
  const colon = withoutUserInfo.lastIndexOf(':')
  const port = colon > 0 && /^\d+$/.test(withoutUserInfo.slice(colon + 1)) ? withoutUserInfo.slice(colon) : ''
  const labels = (port === '' ? withoutUserInfo : withoutUserInfo.slice(0, colon)).split('.')
  const scrubbed = labels.map((label, index) => (index === labels.length - 1 ? 'invalid' : mapCodePoints(label, `${seed}h${index}`)))
  return scrubbed.join('.') + port
}

/** 路径段：**保住扩展名**。类型上没差别，但人看 fixture 时能一眼认出这是张图还是段视频 */
const scrubSegment = (segment: string, seed: string): string => {
  const dot = segment.lastIndexOf('.')
  return dot <= 0 ? mapCodePoints(segment, seed) : mapCodePoints(segment.slice(0, dot), seed) + segment.slice(dot)
}

/** 查询串：**键留着、值全换**。签名 token 就在值里，而键名本身是接口形状的一部分（排查时要看） */
const scrubQuery = (query: string, seed: string): string =>
  query
    .split('&')
    .map((pair, index) => {
      const equals = pair.indexOf('=')
      return equals < 0 ? pair : `${pair.slice(0, equals)}=${mapCodePoints(pair.slice(equals + 1), `${seed}q${index}`)}`
    })
    .join('&')

const scrubUrl = (value: string, seed: string): string => {
  const match = URL_PATTERN.exec(value)
  // 不是 URL 形状（相对路径、或者干脆是塞了 JSON 的字符串）就退回逐码点替换，别硬套
  if (match === null) return mapCodePoints(value, seed)
  const [, scheme = '', slashes, host = '', rest = ''] = match
  const hash = rest.indexOf('#')
  const withoutHash = hash < 0 ? rest : rest.slice(0, hash)
  const question = withoutHash.indexOf('?')
  const pathname = question < 0 ? withoutHash : withoutHash.slice(0, question)
  const query = question < 0 ? '' : withoutHash.slice(question + 1)
  const path = pathname
    .split('/')
    .map((segment, index) => (segment === '' ? '' : scrubSegment(segment, `${seed}p${index}`)))
    .join('/')
  return [
    scheme,
    slashes,
    scrubHost(host, seed),
    path,
    query === '' ? '' : `?${scrubQuery(query, seed)}`,
    hash < 0 ? '' : `#${mapCodePoints(rest.slice(hash + 1), `${seed}f`)}`
  ].join('')
}

/* ------------------------------------------------------------------ 叶子替换 */

/** 15 位以内的整数一定安全、17 位以上一定超界，只有 16 位横跨 `MAX_SAFE_INTEGER`（9007199254740991） */
const STRADDLING_DIGITS = 16

/**
 * 数字。`undefined` 表示「这个位置没法同形替换」，由调用方记进 warnings。
 *
 * 关键的一条在 `id`：**安全 / 超界那一侧必须保住**。快手、B站的 ID 落进 `JSON.parse`
 * 时就已经掉精度了，而「掉精度」正是 `unsafe-integer` 那条报告项要说的事。
 * 脱敏把 `9007199254740993` 换成一个安全整数，等于顺手把结论删了。
 */
const scrubNumber = (value: number, kind: ScrubKind, seed: string): number | undefined => {
  if (kind === 'redact') return 0
  // 小数没有「同形」的说法（位数怎么算都在编），报出来让人改规则，别猜
  if (!Number.isInteger(value)) return undefined
  const digits = Math.abs(value).toString()
  if (!/^\d+$/.test(digits)) return undefined // ≥1e21 会变成 '1e+21' 这种指数写法
  const leading =
    kind === 'timestamp'
      ? '1'
      : digits.length === STRADDLING_DIGITS
        ? Number.isSafeInteger(value)
          ? '1' // 1 后面 15 位 ≤ 1.99e15 < 9.007e15，必然仍在安全区
          : '99' // 99 后面 14 位 ≥ 9.9e15 > 9.007e15，必然仍然超界
        : ''
  const fake = Number(fakeDigits(digits.length, seed, leading))
  return value < 0 ? -fake : fake
}

const scrubString = (value: string, kind: ScrubKind, seed: string): string => {
  // 空串换成什么都是无中生有，而且它本来就不含信息
  if (value === '') return ''
  switch (kind) {
    case 'redact':
      return ''
    case 'url':
      return scrubUrl(value, seed)
    case 'phone':
      // 非数字字符（掩码那些 `*`、分隔符）原样保留 —— 掩码结构就是这个字段的形状
      return [...value].map((codePoint, index) => (DIGITS.includes(codePoint) ? fakeDigits(1, `${seed}${index}`) : codePoint)).join('')
    case 'timestamp':
      return /^\d+$/.test(value) ? fakeDigits(value.length, seed, '1') : mapCodePoints(value, seed)
    case 'id':
      // 纯数字串保位数即可：字符串不经过 double，没有「掉精度」这一侧要保
      return /^\d+$/.test(value) ? fakeDigits(value.length, seed) : mapCodePoints(value, seed)
    default:
      return mapCodePoints(value, seed)
  }
}

/* ------------------------------------------------------------------ 匹配与可疑扫描 */

const test = (pattern: string | RegExp, subject: string): boolean => {
  if (typeof pattern === 'string') return pattern === subject
  pattern.lastIndex = 0 // 调用方给了带 g / y 的正则时，`test` 会带状态，第二次就漏匹配
  return pattern.test(subject)
}

/** 空 matcher（`{}`）一律不匹配 —— 否则一条手滑写空的规则会把整棵树换掉 */
const matches = (matcher: ScrubMatcher, path: string, key: string): boolean => {
  if (matcher.path === undefined && matcher.key === undefined) return false
  if (matcher.path !== undefined && !test(matcher.path, path)) return false
  if (matcher.key !== undefined && !test(matcher.key, key)) return false
  return true
}

/** 路径最后一段的键名。`pics[]` 取 `pics`，这样一条 `pics` 的 URL 规则能同时管住数组元素 */
const keyOfPath = (path: string): string => {
  const last = path.slice(path.lastIndexOf('.') + 1)
  return last.endsWith('[]') ? last.slice(0, -2) : last
}

/** 连续 token 串的长度阈值：32 个 `[A-Za-z0-9_-]` 以上基本只有哈希、签名、base64 才长这样 */
const LONG_TOKEN = /[A-Za-z0-9_-]{32,}/

/**
 * 规则漏掉的凭证长什么样。判据全部只看**值的形状**，不看键名 ——
 * 按键名判断是规则的活，这里要抓的正是「键名起得没规律所以规则没命中」那批。
 */
const suspectReason = (value: string): string | undefined => {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && value.includes('?')) return '带查询串的 URL（签名 token 一般就在查询里）'
  if (value.length > 512) return `长度 ${value.length} 的字符串`
  if (/^[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}$/.test(value)) return '像 JWT 的三段串'
  const long = LONG_TOKEN.exec(value)
  if (long !== null) return `含一段长度 ${long[0].length} 的连续 token 串`
  if (/^1[3-9]\d{9}$/.test(value)) return '像手机号的 11 位数字'
  if (/\d{2,}\*{2,}\d{2,}/.test(value)) return '像掩码手机号'
  return undefined
}

/* ------------------------------------------------------------------ 遍历 */

/**
 * 一致性映射的容器。`原值 → 假值`，跨样本共用它就能让同一个人在整批样本里是同一个假身份。
 *
 * 它**只活在内存里**：里面确实有原值，但它从不进清单、不落盘。
 */
export interface ScrubSession {
  readonly mapping: Map<string, JsonValue>
}

export const createScrubSession = (): ScrubSession => ({ mapping: new Map() })

interface Entry {
  kind: ScrubKind
  occurrences: number
  /** 原值集合。同样只活在内存里，只用来数 `distinct` */
  originals: Set<string>
  example: JsonValue
}

interface Accumulator {
  rules: readonly ScrubRule[]
  keep: readonly ScrubMatcher[]
  session: ScrubSession
  entries: Map<string, Entry>
  suspects: ScrubSuspect[]
  seenSuspects: Set<string>
  /** 用 Set 去重：一条规则命中数组里 100 个对象时，同一句告警会来 100 遍 */
  warnings: Set<string>
}

const record = (acc: Accumulator, path: string, kind: ScrubKind, original: string, replacement: JsonValue): void => {
  const existing = acc.entries.get(path)
  if (existing === undefined) {
    acc.entries.set(path, { kind, occurrences: 1, originals: new Set([original]), example: replacement })
    return
  }
  existing.occurrences += 1
  existing.originals.add(original)
}

/** 换一个叶子。先查一致性映射，命中就复用 —— 这条就是「同一原值 → 同一假值」的全部实现 */
const scrubLeaf = (value: string | number, kind: ScrubKind, path: string, acc: Accumulator): JsonValue | undefined => {
  // 类型前缀：字符串 `'123'` 与数字 `123` 不能共用同一个假值，它们的替换结果类型不同
  const original = `${typeof value === 'string' ? 's' : 'n'}${value}`
  const cacheKey = `${kind} ${original}`
  const cached = acc.session.mapping.get(cacheKey)
  if (cached !== undefined) {
    record(acc, path, kind, original, cached)
    return cached
  }
  const seed = digestOf(kind, original)
  const replacement = typeof value === 'string' ? scrubString(value, kind, seed) : scrubNumber(value, kind, seed)
  if (replacement === undefined) return undefined
  acc.session.mapping.set(cacheKey, replacement)
  record(acc, path, kind, original, replacement)
  return replacement
}

const addSuspect = (acc: Accumulator, path: string, reason: string): void => {
  if (acc.seenSuspects.has(path)) return
  acc.seenSuspects.add(path)
  if (acc.suspects.length >= MAX_SUSPECTS) {
    acc.warnings.add(`可疑位置超过 ${MAX_SUSPECTS} 条，清单里只留了前 ${MAX_SUSPECTS} 条 —— 先补规则再重录`)
    return
  }
  acc.suspects.push({ path, reason })
}

const walk = (value: JsonValue, path: string, acc: Accumulator): JsonValue => {
  const key = keyOfPath(path)
  // 白名单压过一切，而且**连子树都不进**：`keep: [{ key: 'data' }]` 的意思就是「这一整块别动」
  if (acc.keep.some((matcher) => matches(matcher, path, key))) return value
  if (value === null || typeof value === 'boolean') return value
  const rule = acc.rules.find((candidate) => matches(candidate, path, key))

  if (typeof value === 'string' || typeof value === 'number') {
    // 值长得像 URL 就按 URL 换，压过键名规则（`redact` 例外）—— 见 LOOKS_LIKE_URL
    const looksLikeUrl = typeof value === 'string' && LOOKS_LIKE_URL.test(value)
    const kind = rule === undefined ? (looksLikeUrl ? 'url' : undefined) : rule.kind === 'redact' || !looksLikeUrl ? rule.kind : 'url'
    if (kind === undefined) {
      const reason = typeof value === 'string' ? suspectReason(value) : undefined
      if (reason !== undefined) addSuspect(acc, path, reason)
      return value
    }
    const replaced = scrubLeaf(value, kind, path, acc)
    if (replaced !== undefined) return replaced
    // 告警里**不写原值** —— 清单和告警都会跟 corpus 一起提交
    acc.warnings.add(`${path}：规则 ${kind} 命中的数字没法同形替换（小数或超出十进制写法），原值保留，请改规则`)
    return value
  }

  if (rule !== undefined) {
    const container = Array.isArray(value) ? '数组' : '对象'
    acc.warnings.add(
      `${path}：规则 ${rule.kind} 命中的是${container}，容器整体替换会改形状（第一条硬规则不许），已改为继续往下钻，请把规则写到具体字段上`
    )
  }
  if (Array.isArray(value)) return value.map((item) => walk(item, elementPath(path), acc))
  return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, walk(child, childPath(path, childKey), acc)]))
}

/**
 * 脱敏一份样本。纯函数：不读文件、不发请求，同一份输入永远产出同一份输出（`--check` 的前提）。
 *
 * @param value 原始响应（`JSON.parse` 的结果）
 * @param options 见 {@link ScrubOptions}。默认规则会**追加**在调用方规则之后，所以调用方的规则优先
 */
export const scrubSample = (value: JsonValue, options: ScrubOptions = {}): ScrubResult => {
  const acc: Accumulator = {
    rules: options.replaceDefaultRules === true ? (options.rules ?? []) : [...(options.rules ?? []), ...DEFAULT_SCRUB_RULES],
    keep: [...(options.keep ?? []), ...DEFAULT_SCRUB_KEEP],
    session: options.session ?? createScrubSession(),
    entries: new Map(),
    suspects: [],
    seenSuspects: new Set(),
    warnings: new Set()
  }
  const scrubbed = walk(value, '', acc)
  const replacements = [...acc.entries.entries()]
    .map(([path, entry]) => ({
      path,
      kind: entry.kind,
      occurrences: entry.occurrences,
      distinct: entry.originals.size,
      example: entry.example
    }))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
  const byPath = (left: ScrubSuspect, right: ScrubSuspect): number => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
  return {
    value: scrubbed,
    manifest: {
      replacements,
      suspects: [...acc.suspects].sort(byPath),
      leaks: findLeaks(scrubbed, acc).sort(byPath),
      warnings: [...acc.warnings].sort()
    }
  }
}

/**
 * 换完之后再走一遍，找出「某处被换掉的原值仍然以子串形式留在别处」。
 *
 * 只报路径与是哪一类值，**不报值本身**（清单要提交）。
 */
const findLeaks = (scrubbed: JsonValue, acc: Accumulator): ScrubSuspect[] => {
  const originals: { text: string; kind: ScrubKind }[] = []
  for (const entry of acc.entries.values()) {
    for (const original of entry.originals) {
      // `originals` 里存的是带类型前缀的键（`s…` / `n…`），去掉前缀取真正的值
      const text = original.slice(1)
      if (text.length >= MIN_LEAK_LENGTH) originals.push({ text, kind: entry.kind })
    }
  }
  if (originals.length === 0) return []
  const found = new Map<string, string>()
  const scan = (node: JsonValue, path: string): void => {
    if (typeof node === 'string') {
      for (const { text, kind } of originals) {
        if (!node.includes(text)) continue
        found.set(path, `这里嵌着一个别处已按 ${kind} 换掉的原值 —— 补一条规则再重录，这份样本先别提交`)
        return
      }
      return
    }
    if (Array.isArray(node)) {
      node.forEach((item) => scan(item, elementPath(path)))
      return
    }
    if (node !== null && typeof node === 'object') for (const [key, child] of Object.entries(node)) scan(child, childPath(path, key))
  }
  scan(scrubbed, '')
  return [...found.entries()].map(([path, reason]) => ({ path, reason }))
}
