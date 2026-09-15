/**
 * 把签名参数读回明文 —— 验证工具的解码层。
 *
 * 移植自 Douyin_TikTok_Download_API 的 `signing/native/decoding.py`（Apache-2.0）。
 * 存在的理由只有一个：**证明签名实现还是对的**。
 *
 * ## 为什么需要它
 *
 * 抖音对签名是抽样校验的，所以「请求成功」证明不了任何事。唯一能证伪一个常量的办法，
 * 是把真实签名拆开看。旧实现用错盐值（`cus`）活了两年没被发现，就是因为整套测试都是
 * 自证的——自生成快照、和被测量对象比自身、以及没有任何一条断言能证伪一个常量。
 *
 * 这个模块提供外部锚点：给它一份浏览器产出的签名，它会告诉你签名里封住的到底是什么，
 * 以及你手上的候选输入是不是它封的那一个。
 *
 * ## 「解码」在这里诚实地指三件不同的事
 *
 * 把它们混为一谈，就是这类工具开始撒谎的方式：
 *
 * - **可还原**：值就在载荷里，能原样取回。时钟、`aid`、`page_id`、屏幕几何串、
 *   版本串、调用计数。没有任何推断。
 * - **被绑定但不可还原**：载荷里带着某个东西的摘要——a_bogus 里是 query / body / UA
 *   各三个 SM3 字节。输入无法从摘要倒推出来，所以这个模块**从不假装能**。它做的是
 *   **校验**：给它一个候选值，它回答这个候选是不是签名封住的那一个，以及有多少位证据
 *   支持这个结论。这才是哈希真正的逆运算，而且比猜一个值有用得多——它把
 *   「我的请求被拒了」变成「我发的这个签名是对着另一条 URL 算的」。
 * - **根本没被计算**：`msToken` 与访客令牌由平台签发或随机抽出来，底下没有明文可找。
 *   说出这一点就是答案，而不是「没能给出答案」。
 *
 * 每个字段都携带自己属于哪一类，读者不会被留在「标签旁边那个数字是读出来的还是推出来的」
 * 这种猜测里。
 *
 * 这里没有任何东西用于签名。它只跑在调用方已经持有的值上，不碰网络、不消耗身份。
 */

import {
  chainBytes,
  decode as decodeABogusRaw,
  DIGEST_CHAINS,
  digestWith,
  FORTNIGHT_EPOCH_MS,
  SALT,
  structureError,
  userAgentDigest
} from './a_bogus'

/** 字段是什么。控制台按它上色，调用方也可以对它分支 */
export const KIND = {
  /** 从载荷里直接读出，就是签名者放进去的东西 */
  PLAIN: 'plain',
  /** 一个时钟，同时给出原始数字与 ISO-8601 时刻 */
  TIME: 'time',
  /** 哈希或哈希的一个字节。输入不可还原——见 checks */
  DIGEST: 'digest',
  /** 内部冗余。在这里重算，这正是解码得以自证的依据 */
  CHECKSUM: 'checksum',
  /** SDK 对它自认为身处其中的页面所做的回报 */
  ENVIRONMENT: 'environment',
  /** 每次捕获里都有、但含义未被确认的东西。命名它，而不是编造它 */
  OPAQUE: 'opaque'
} as const

/** 一个参数底下为什么没有明文 */
export const REASON = {
  MALFORMED: 'malformed',
  NOT_COMPUTED: 'not_computed',
  ONE_WAY: 'one_way',
  UNKNOWN_PARAMETER: 'unknown_parameter'
} as const

/** 候选输入是不是签名封住的那一个 */
export const CHECK = {
  MATCH: 'match',
  DIFFERS: 'differs',
  NOT_SUPPLIED: 'not_supplied'
} as const

/** 从签名里读出的一个值 */
export interface Field {
  /** 稳定的 slug。展示层负责翻译；未知 slug 原样渲染 */
  name: string
  value: string
  kind: string
  /** 来源，当名字本身不足以说明时 */
  detail?: string
}

/** 候选输入是不是这份签名所覆盖的那一个 */
export interface Check {
  name: string
  status: string
  /** 证据量。a_bogus 携带的三个 SM3 字节是 24 位——实战够用，但值得说明而不是藏起来 */
  bits: number
  /** 被检查的那个确切字符串，**仅在命中时**返回，所以这里发布的原像必定能重现已有的签名 */
  covered?: string
}

/** 一个参数被拆开后的结果 */
export interface Decoded {
  parameter: string
  platform: string | null
  algorithm: string
  /** 是否有可还原的明文 */
  recovered: boolean
  reason?: string
  fields: Field[]
  checks: Check[]
  notes: string[]
}

/** {@link decodeABogus} 的候选输入。给了哪个就校验哪条链 */
export interface ABogusCandidates {
  query?: string
  body?: string
  userAgent?: string
}

/** 每条摘要链钉住输入的位数 */
const CHAIN_BITS = 24
const FORTNIGHT_MS = 1000 * 60 * 60 * 24 * 14

/** 毫秒时钟转 ISO-8601 UTC；数字荒诞到解析不了时退回原样，因为那通常正是它最有意思的地方 */
const instant = (milliseconds: number): string => {
  const date = new Date(milliseconds)
  return Number.isNaN(date.getTime()) ? String(milliseconds) : date.toISOString().replace('.000Z', 'Z')
}

const clockField = (name: string, milliseconds: number, detail?: string): Field => ({
  name,
  value: `${milliseconds} (${instant(milliseconds)})`,
  kind: KIND.TIME,
  detail
})

const check = (name: string, expected: readonly number[], actual: readonly number[], covered: string): Check =>
  expected.join(',') === actual.join(',')
    ? { name, status: CHECK.MATCH, bits: CHAIN_BITS, covered }
    : { name, status: CHECK.DIFFERS, bits: CHAIN_BITS }

/**
 * 拆开一份 `a_bogus`，并就调用方给出的候选值做校验。
 * @param value - `a_bogus` 的值
 * @param candidates - 候选的 query / body / User-Agent，给哪个校验哪个
 * @returns 拆解结果；格式不合法时 `recovered` 为 `false` 并给出 `reason`
 */
export const decodeABogus = (value: string, candidates: ABogusCandidates = {}): Decoded => {
  const problem = structureError(value)
  if (problem !== null) {
    return {
      parameter: 'a_bogus',
      platform: 'douyin',
      algorithm: 'a_bogus',
      recovered: false,
      reason: `${REASON.MALFORMED}:${problem}`,
      fields: [],
      checks: [],
      notes: []
    }
  }

  const raw = decodeABogusRaw(value)
  const scalars = raw.fields
  const fortnights = scalars.L26
  const fields: Field[] = [
    { name: 'header_magic', value: `[${raw.headerMagic.join(', ')}]`, kind: KIND.PLAIN },
    { name: 'sdk_version', value: raw.sdkVersion.join('.'), kind: KIND.PLAIN },
    clockField('now_ms', raw.nowMs),
    clockField('ink_ms', raw.inkMs, 'now_ms - 1，SDK 对自己的存活检查'),
    { name: 'aid', value: String(raw.aid), kind: KIND.PLAIN },
    { name: 'page_id', value: String(raw.pageId), kind: KIND.PLAIN },
    {
      name: 'fortnights',
      value: `${fortnights} (${instant(FORTNIGHT_EPOCH_MS + fortnights * FORTNIGHT_MS)})`,
      kind: KIND.PLAIN,
      detail: '自 a_bogus 纪元起的「两周」数'
    },
    { name: 'browser_info', value: raw.browserInfo, kind: KIND.ENVIRONMENT, detail: '屏幕|可视区|…' },
    { name: 'tail', value: raw.tail, kind: KIND.PLAIN, detail: '(now_ms + 3) & 0xFF' },
    { name: 'env_flags', value: String(raw.envFlags), kind: KIND.ENVIRONMENT },
    { name: 'detect_flags', value: String(raw.detectFlags), kind: KIND.ENVIRONMENT },
    { name: 'call_bucket', value: String(raw.callBucket), kind: KIND.ENVIRONMENT },
    { name: 'tripwire', value: String(raw.tripwire), kind: KIND.ENVIRONMENT }
  ]

  const inputByChain: Record<string, string | undefined> = {
    query: candidates.query,
    body: candidates.body,
    user_agent: candidates.userAgent
  }
  const emptyBody = chainBytes(DIGEST_CHAINS.body, digestWith('', SALT))

  const checks: Check[] = []
  for (const [name, chain] of Object.entries(DIGEST_CHAINS)) {
    const carried = chain.slots.map((slot) => scalars[slot])
    let detail = `${name} 链的 3 个字节，落在 ${chain.slots.join(', ')}`
    if (name === 'body' && carried.join(',') === emptyBody.join(',')) {
      // 这不是一条校验——没人问过它。它是从签名里读出的事实，和 `aid` 一样，
      // 而且它正好回答了手搓 POST 的人真正会问的那个问题
      detail = `${detail}；与空 body 一致，GET 就是这种情况`
    }
    fields.push({
      name: `${name}_digest`,
      value: carried.join(' '),
      kind: KIND.DIGEST,
      detail
    })

    const candidate = inputByChain[name]
    if (candidate === undefined) {
      checks.push({ name, status: CHECK.NOT_SUPPLIED, bits: CHAIN_BITS })
      continue
    }
    // UA 链的 RC4 密钥由**签名自己报的**环境探针值拼成。用模块常量去校验一份
    // detect_flags 不同的签名，这条链会必然报「对不上」——实测踩过，见 userAgentDigest
    const digest =
      name === 'user_agent'
        ? userAgentDigest(candidate, { envFlags: raw.envFlags, detectFlags: raw.detectFlags })
        : digestWith(candidate, SALT)
    checks.push(check(name, chainBytes(chain, digest), carried, candidate))
  }

  return {
    parameter: 'a_bogus',
    platform: 'douyin',
    algorithm: 'a_bogus',
    recovered: true,
    fields,
    checks,
    notes: ['checksum_verified', 'noise_not_recoverable']
  }
}

/** 一次盐值判定的结果 */
export interface SaltDiagnosis {
  /** 命中的候选盐值；都不命中时为 `null` */
  salt: string | null
  /** 签名里封住的那三个 query 链字节，判定的依据 */
  observed: number[]
  /** 每个候选盐值重算出来的三个字节，以及是否命中 */
  results: { salt: string; predicted: number[]; matched: boolean }[]
}

/**
 * 反推一份签名用的是哪个盐值 —— **这个工具存在的核心理由**。
 *
 * 做法与当初发现 `cus` 过期时完全一样：签名里封着 query 链的三个字节，把候选盐值逐个
 * 代进去重算摘要，能重现那三个字节的就是当前盐值。整件事不需要网络、不需要身份、
 * 也不依赖抖音是否接受了你的请求——这正是它能发现「请求照样成功但常量已经过期」的原因。
 *
 * ## 只有 query 链参与判定
 *
 * body 链在 GET 上与空串一致，而 UA 链**根本不吃盐值**（它走 RC4 加单次 SM3），
 * 两条对判定都没有贡献，所以这里的候选盐值只对 query 生效。证据量是 24 位，
 * 实战足够——但要说明，而不是藏起来。
 * @param value - 一份真实的 `a_bogus`
 * @param query - 该签名所覆盖的那条 query（不含 `a_bogus` 自身）
 * @param salts - 待测的盐值候选
 * @returns 判定结果
 */
export const diagnoseSalt = (value: string, query: string, salts: readonly string[] = [SALT, 'cus']): SaltDiagnosis => {
  if (structureError(value) !== null) return { salt: null, observed: [], results: [] }

  const chain = DIGEST_CHAINS.query
  const scalars = decodeABogusRaw(value).fields
  const observed = chain.slots.map((slot) => scalars[slot])

  const results = salts.map((salt) => {
    const predicted = chainBytes(chain, digestWith(query, salt))
    return { salt, predicted, matched: predicted.join(',') === observed.join(',') }
  })

  return { salt: results.find((row) => row.matched)?.salt ?? null, observed, results }
}

/**
 * 只按形状猜一个值是什么参数。用于调用方不知道自己在看什么的时候。
 *
 * 只做形状判断，不做任何密码学断言——猜错时返回 `null` 比返回一个错答案好。
 * @param value - 待识别的值
 * @returns 参数名或 `null`
 */
export const identify = (value: string): string | null => {
  if (!value) return null
  if (structureError(value) === null) return 'a_bogus'
  if (/^verify_[0-9a-z]+_/.test(value)) return 'verifyFp'
  // X-Bogus 固定 28 字符，字母表含 `-` 与 `=`；msToken 更长且字母表含 `+`
  if (value.length === 28 && /^[A-Za-z0-9_=+/-]+$/.test(value)) return 'X-Bogus'
  if (value.length >= 100 && /^[A-Za-z0-9+-]+=*$/.test(value)) return 'msToken'
  if (/^[0-9a-f]{32}$/i.test(value)) return 'x-secsdk-web-signature'
  return null
}

/**
 * 签名**一定**不覆盖的参数。
 *
 * `a_bogus` 是签名自身；`timestamp` 与 `x-secsdk-web-signature` 由 secsdk 在签名
 * **之后**追加 —— 这一点在真实捕获与 amagi 自己的管线里一致。
 */
const NEVER_SIGNED = ['a_bogus', 'timestamp', 'x-secsdk-web-signature']

/**
 * 是否被签名覆盖**随管线而异**的参数。
 *
 * 不要猜。真实浏览器捕获里 `uifid` 在 `a_bogus` **之前**（因而被签名覆盖），
 * 而 amagi 的管线是 `webid → a_bogus → secsdk`，`uifid` 由 secsdk 在之后补上
 * （因而没被覆盖）。同一个参数名，两边结论相反 —— 所以这里把四种参数做成
 * 2⁴ 种组合逐个试，命中的那一种就是答案。
 */
const SIGNING_AMBIGUOUS = ['uifid', 'msToken', 'verifyFp', 'fp']

/** 一次 query 重建的结果 */
export interface SignedQueryRecovery {
  /** 重建出的、签名所覆盖的那条 query */
  query: string
  /** 命中的重建方式保留了哪些参数（`SIGNING_AMBIGUOUS` 的子集） */
  kept: string[]
  /** 命中的盐值；把多个候选盐值一起搜时才有区分意义 */
  salt: string
  /** 试过的组合数，用于说明「这不是撞上的」 */
  tried: number
}

/**
 * 反推一份签名**当时覆盖的那条 query**，以及用的是哪个盐值。
 *
 * 这是 {@link diagnoseSalt} 的加强版：那份要求调用方已经知道签名覆盖了哪些参数，
 * 而线上抓来的 URL 里，`uifid` / `msToken` / `verifyFp` / `fp` 到底在签名前还是
 * 签名后，取决于页面当时挂的是哪条管线 —— 同一份代码在浏览器里和在 amagi 里顺序
 * 就是不一样的。与其让调用方去猜，这里把 2⁴ 种组合全试一遍，报出命中的那一种。
 *
 * 命中意味着**两件事同时成立**：这是一份结构良好的 a_bogus，且它的 query 链在给定
 * 盐值下重现了这条 query。所以它是「验证」而不只是「解码」。
 * @param signature - `a_bogus` 的值（未做 URL 编码）
 * @param url - 已签名的完整 URL
 * @param salts - 待搜的盐值候选
 * @returns 命中结果；没有任何组合命中时返回 `null`
 */
export const recoverSignedQuery = (signature: string, url: string, salts: readonly string[] = [SALT]): SignedQueryRecovery | null => {
  if (structureError(signature) !== null) return null

  const chain = DIGEST_CHAINS.query
  const scalars = decodeABogusRaw(signature).fields
  const observed = chain.slots.map((slot) => scalars[slot]).join(',')

  let tried = 0
  for (let mask = 0; mask < 1 << SIGNING_AMBIGUOUS.length; mask++) {
    const kept = SIGNING_AMBIGUOUS.filter((_, index) => (mask & (1 << index)) !== 0)
    const parsed = new URL(url)
    for (const name of NEVER_SIGNED) parsed.searchParams.delete(name)
    for (const name of SIGNING_AMBIGUOUS) {
      if (!kept.includes(name)) parsed.searchParams.delete(name)
    }
    const query = parsed.searchParams.toString()

    for (const salt of salts) {
      tried++
      if (chainBytes(chain, digestWith(query, salt)).join(',') === observed) {
        return { query, kept, salt, tried }
      }
    }
  }
  return null
}

/**
 * 从一条已签名的 URL 里重建出签名覆盖的那条 query（不再搜索，按固定规则摘参数）。
 *
 * **只在已知管线顺序时使用。** 面对来源不明的 URL 请用 {@link recoverSignedQuery}，
 * 它会搜索并告诉你哪条重建成立。保留这个函数是为了让「摘掉签名参数」这件事在
 * 需要确定行为的地方仍然可用。
 * @param url - 已签名的完整 URL
 * @returns 摘掉 `a_bogus` / `timestamp` / `x-secsdk-web-signature` 之后的 query
 */
export const signedQueryOf = (url: string): string => {
  const parsed = new URL(url)
  for (const name of NEVER_SIGNED) parsed.searchParams.delete(name)
  return parsed.searchParams.toString()
}

/**
 * 拆开一条 URL 上所有认得出的签名参数。
 *
 * 会先尝试 {@link recoverSignedQuery} 找出签名真正覆盖的那条 query；找不到时退回
 * {@link signedQueryOf} 的结果，并把这个不确定性体现在 `notes` 里。
 * @param url - 已签名的完整 URL
 * @param options - 可选的 User-Agent、显式 query 与盐值候选
 * @returns 每个参数一条拆解结果
 */
export const decodeUrl = (
  url: string,
  options: { userAgent?: string; body?: string; query?: string; salts?: readonly string[] } = {}
): Decoded[] => {
  const parsed = new URL(url)
  const aBogus = parsed.searchParams.get('a_bogus')
  if (aBogus === null) return []

  const signature = decodeURIComponent(aBogus)
  const recovery = options.query ? null : recoverSignedQuery(signature, url, options.salts ?? [SALT])
  const query = options.query ?? recovery?.query ?? signedQueryOf(url)

  const decoded = decodeABogus(signature, {
    query,
    body: options.body,
    userAgent: options.userAgent
  })

  if (recovery) {
    decoded.notes.push(`query_recovered:kept=${recovery.kept.join('+') || '(none)'}`)
    decoded.fields.push({
      name: 'signed_query',
      value: recovery.query,
      kind: KIND.PLAIN,
      detail: `从 ${recovery.tried} 种组合中命中：保留了 ${recovery.kept.join('、') || '（不保留任何可选参数）'}`
    })
  } else if (!options.query) {
    decoded.notes.push('query_reconstructed_by_rule:no_combination_matched')
  }
  return [decoded]
}
