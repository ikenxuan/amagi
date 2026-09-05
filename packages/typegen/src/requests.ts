/**
 * 请求集合（`WEB-API-CONSOLE-PRD.md` 三）：`corpus/<平台>/<端点>.requests.json`。
 *
 * 与同目录下的样本相反 —— **这个文件进 git，值是真的**。它回答样本回答不了的那个问题：
 * 「别人拿什么参数才能重放出这份响应」。样本里的 `metadata.params` 三重意义上都给不出答案
 * （PRD 二 ①）：改成真值之前值是假的、凭证类键连键带值整个删掉、`paramsHash` 也是假值的哈希。
 *
 * 为什么不扩 `seeds.json`（PRD 3.1）：那个文件的宪法级约束是「一律用公开账号与公开作品」，
 * 而请求集合必然含从依赖图长出来的中间 ID（`deps.ts` 明说 `cid` / `aid` / `oid` 不放种子里）。
 * 两者真值观相反，「值要不要进 git」这道决策得能单独拍，所以是两个文件、两个校验器。
 *
 * 也因此**不复用 `parseSeedFile`**：它对平台节点做闭集校验，而那个形状是「参数名 → 取值数组」，
 * verdict、时间戳、样本哈希没一样塞得进去。但它的**风格照抄**：不抛异常，问题全进 `errors`。
 * 一条写错的记录不该让整个界面炸掉，也绝不能静默当成「这个端点没有请求」。
 *
 * 坏条目分两档处理，判据是「留着它会不会让别的东西说谎」：
 *
 * | 坏在哪 | 怎么办 |
 * |---|---|
 * | `id` / `label` / `params` / `recordedAt` / `verdict` | **整条不收** —— 这几样错了这条记录没法用 |
 * | `sampleHash` / `shapeKey` / `note` | 只丢那个字段，条目本身留着 |
 *
 * 后一档是有意的：这个文件最有价值的部分是「什么参数 + 什么结论」（PRD 二 ② 那句
 * 「被拒的请求今天零留存，而那是最该给别人看的」），为一个多余的哈希把
 * 「我试过这组参数，拿回的是风控页」整条丢掉是本末倒置。取向同 `parseDocSidecar`
 * 对 `declaredValues` 的逐个校验：错的那个要被指名，其余的照样能用。
 */

import { CORPUS_ROOT, CREDENTIAL_PARAM } from './corpus'
import type { JsonValue } from './types'

/** 格式版本。语义同 `CORPUS_FORMAT`：加字段不用动它，只有「同一个键的含义变了」才 +1 */
export const REQUESTS_FORMAT = 1

/**
 * 结论的取值。**记结论而不只记成功的**：被拒的那几条是这个文件最有价值的部分 ——
 * 「这组参数拿回的是风控页」今天一个字都不留，而它能让下一个人不用再踩一遍。
 *
 * 故意只有四种、也不打算长：它记的是「为什么没拿到样本」这个粒度，
 * 而不是平台业务码（那张表在 `corpus.ts` 的 `CODE_TABLES` 里，两者差一个数量级）。
 */
export const REQUEST_VERDICTS = ['ok', 'reject:risk-control', 'reject:login', 'reject:empty'] as const

export type RequestVerdict = (typeof REQUEST_VERDICTS)[number]

/**
 * 新建集合文件时写进 `$comment` 的那几句（原文见 PRD 3.2）。
 *
 * 存在的理由是**约束要跟着文件走**：改这个 JSON 的人手上通常只有那个 JSON，
 * 而「值是真值、只放公开内容、凭证永不进」这三句一旦不在文件里，就等于没人知道。
 */
export const DEFAULT_REQUESTS_COMMENT: readonly string[] = [
  '请求集合。人可读、进 git —— 其他贡献者拿它就能重放这些请求来调试。',
  '值是真值（不脱敏）。所以只放公开内容：公开作品、公开账号、搜索关键词。',
  '凭证永不进这里（cookie 走 .env）。'
]

/* ------------------------------------------------------------------ 数据结构 */

export interface RequestEntry {
  /**
   * 人给的短名。**它会变成产物的目录名与类型名**（`VideoInfo_BvSinglePage`），
   * 所以不能是 12 位哈希 —— 没人读得懂。字符集卡在 {@link REQUEST_ID} 上。
   */
  id: string
  /**
   * 中文说明，渲染在界面上。空串要报错 —— 空标签比没标签更糟：
   * 它占着位置，看起来像已经写过说明了（判据同 `parseDocSidecar` 对空注释那条）。
   */
  label: string
  /**
   * **真值，不脱敏。** 只放公开内容：公开作品、公开账号、搜索关键词。
   * 凭证一律拒收（连嵌套着的也查），判据是 {@link CREDENTIAL_PARAM}。
   */
  params: Record<string, JsonValue>
  /** ISO 8601 UTC，**到秒** —— 与样本 `metadata.recordedAt` 同一种写法，两边要能对着看 */
  recordedAt: string
  verdict: RequestVerdict
  /**
   * 对应本地 corpus 里那份样本的文件名（12 位十六进制）。**样本不进 git，所以这只是个指针。**
   * 没有它是正常状态而不是缺失：被入库判定拒了的请求压根没生成样本。
   */
  sampleHash?: string
  /** 形状指纹。两条记录同指纹 ⇒ 类型逐字节相同 ⇒ 界面上可以直接建议合并 */
  shapeKey?: string
  /** 补充说明，通常是「拿回了什么」。被拒的那几条全靠它传递信息 */
  note?: string
}

export interface RequestCollection {
  /** JSON 没有注释，所以约定 `$comment` 当注释键。解析时原样带出来，见 {@link DEFAULT_REQUESTS_COMMENT} */
  $comment?: string | readonly string[]
  version: number
  /** `<平台>/<端点>`，例如 `bilibili/videoInfo`。两段都要能当路径段用 */
  endpoint: string
  requests: RequestEntry[]
}

/* ------------------------------------------------------------------ 判据 */

/**
 * `id` 的字符集：字母数字开头结尾，中间可以有 `-` / `_`。
 *
 * 比 `corpusPath` 的 `SAFE_SEGMENT` 多一条「首尾必须是字母数字」，理由在它的双重身份上 ——
 * 它既是目录名也是类型名，而 `typeNameFromLiteral` 是**按非字母数字切词再拼**的：
 * `-x` 与 `x` 会拼出同一个类型名。于是文件里两个明明不同的 `id`，到产物里撞成一个，
 * 而这里的撞名检查看不出来。首尾卡死是最省事的堵法（顺带 `-x` 当目录名在命令行里像个选项）。
 */
const REQUEST_ID = /^[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?$/

/** 样本文件名 = 12 位十六进制。判据与 `hashParams` / `gen-types.mts` 的 `SAMPLE_FILE` 是同一条 */
const SAMPLE_HASH = /^[0-9a-f]{12}$/

/** `<平台>/<端点>`。两段都要能当路径段用 —— 它要拼成 `corpus/<平台>/<端点>.requests.json` */
const ENDPOINT_REF = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/

/** 路径段只允许这些字符，同 `corpusPath` 的 `SAFE_SEGMENT`：端点名进的是文件系统，先当它不可信 */
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/

/**
 * ISO 8601 UTC 到秒，形如 `2026-09-05T06:11:00Z`。
 *
 * 卡死写法而不是「能被 `Date` 解析就行」：毫秒没有信息量，而这个文件进 git ——
 * 同一件事两种写法会让 diff 里多出一堆无意义的行（`toSecondIso` 在样本那边是同一个理由）。
 * 光有这个正则还不够，越界的日期得另判，见 `readEntry` 里那段。
 */
const SECOND_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

/** 条目上认识的键。人手改的文件，拼错的键要被指名而不是静默丢掉（同 `parseSeedFile` 的闭集校验） */
const ENTRY_KEYS = new Set(['id', 'label', 'params', 'recordedAt', 'verdict', 'sampleHash', 'shapeKey', 'note'])

/** 根上认识的键 */
const ROOT_KEYS = new Set(['$comment', 'version', 'endpoint', 'requests'])

const isRecord = (value: JsonValue | undefined): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isVerdict = (value: JsonValue | undefined): value is RequestVerdict =>
  typeof value === 'string' && (REQUEST_VERDICTS as readonly string[]).includes(value)

/**
 * 参数里像凭证的键，**连嵌套对象和数组一起查**。返回路径（`headers.cookie`），从不返回值。
 *
 * 为什么要往下钻：这个文件进 git，而 git 收不回来。`{ headers: { cookie: '…' } }` 这种形状
 * 只查顶层就漏了。代价不对称 —— 多拒一条请求只是让人改个写法，漏一条是真凭证进公开仓库，
 * 这也正是 `CREDENTIAL_PARAM` 那张表宁滥勿缺的同一条账。
 */
const findCredentialKeys = (value: JsonValue, prefix = ''): string[] => {
  if (Array.isArray(value)) return value.flatMap((item) => findCredentialKeys(item, `${prefix}[]`))
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`
    return CREDENTIAL_PARAM.test(key) ? [path] : findCredentialKeys(child, path)
  })
}

/* ------------------------------------------------------------------ 解析 */

/**
 * 解析一份 `<端点>.requests.json`。**不抛异常**，问题全进 `errors`（同 `parseSeedFile`）。
 *
 * 返回的 `collection` 永远是可用的：坏条目按模块注释那两档处理，剩下的照常带出来。
 * 所以调用方**必须自己看 `errors`** —— 空的 `requests` 有两种含义（文件是空的 / 每条都坏了），
 * 只有 `errors` 分得出来。
 */
export const parseRequestCollection = (raw: JsonValue): { collection: RequestCollection; errors: string[] } => {
  const errors: string[] = []
  if (!isRecord(raw)) return { collection: { version: REQUESTS_FORMAT, endpoint: '', requests: [] }, errors: ['请求集合的根不是对象'] }

  for (const key of Object.keys(raw)) {
    if (!ROOT_KEYS.has(key)) errors.push(`${key} 不是认识的键（JSON 没有注释，注释写在 $comment 里）`)
  }

  const version = typeof raw.version === 'number' ? raw.version : REQUESTS_FORMAT
  if (typeof raw.version !== 'number') errors.push(`缺 version 字段，按 ${REQUESTS_FORMAT} 处理`)
  else if (version !== REQUESTS_FORMAT) {
    // 版本号变了意味着某个键的含义变了（语义同 `CORPUS_FORMAT`），照旧读就是静默混用两种语义
    errors.push(`version=${version} 不是本包认识的格式版本（${REQUESTS_FORMAT}）—— 别当成同一种语义读`)
  }

  const endpoint = typeof raw.endpoint === 'string' ? raw.endpoint : ''
  if (typeof raw.endpoint !== 'string') errors.push('缺 endpoint 字段，或者它不是字符串')
  else if (!ENDPOINT_REF.test(endpoint)) {
    errors.push(`endpoint=${JSON.stringify(endpoint)} 不是 <平台>/<端点> 的写法，或者含不能当路径段的字符`)
  }

  let comment: string | readonly string[] | undefined
  if (raw.$comment !== undefined) {
    if (typeof raw.$comment === 'string') comment = raw.$comment
    else if (Array.isArray(raw.$comment) && raw.$comment.every((line) => typeof line === 'string')) {
      comment = raw.$comment as string[]
    } else errors.push('$comment 只能是字符串或字符串数组，这个字段已丢掉')
  }
  const head = comment === undefined ? {} : { $comment: comment }

  /** id → 第一次出现在哪个下标。撞名要指出「跟谁撞了」，光说「撞了」还得人自己去翻 */
  const seen = new Map<string, number>()

  /** 一条记录。返回 `undefined` = 这一条整条不收，理由已经进 `errors` */
  const readEntry = (index: number, value: JsonValue): RequestEntry | undefined => {
    const at = `requests[${index}]`
    if (!isRecord(value)) {
      errors.push(`${at} 不是对象`)
      return undefined
    }
    for (const key of Object.keys(value)) {
      if (!ENTRY_KEYS.has(key)) errors.push(`${at}.${key} 不是认识的键（补充说明写在 note 里）`)
    }

    // id 先判，但**报错一律带下标**：id 本身就有可能是坏的，拿它当定位符会指到一个不存在的名字上
    const id = value.id
    if (typeof id !== 'string') {
      errors.push(`${at}.id 缺失或者不是字符串 —— 它会变成产物的目录名与类型名，省不掉`)
      return undefined
    }
    if (!REQUEST_ID.test(id)) {
      errors.push(`${at}.id=${JSON.stringify(id)} 只能用字母数字，中间可以有 - 或 _ —— 它要当目录名与类型名`)
      return undefined
    }
    // 撞名**拒绝写入让人改名**（PRD 待决 #4 的保守方案）：`id` 会变成产物的目录名与类型名，
    // 照 `emit.ts` 那个 `unique` 自动补数字后缀的话，产物叫什么由「谁先被读到」决定 —— 不可控。
    // 判过字符集就登记，哪怕这一条后面因为别的原因被拒：文件里确实躺着两个同名的 id，那是人要改的事
    if (seen.has(id)) {
      errors.push(`${at}.id=${JSON.stringify(id)} 与 requests[${seen.get(id)!}] 撞名 —— 改个名字（产物的目录名与类型名都用它）`)
      return undefined
    }
    seen.set(id, index)

    const label = value.label
    if (typeof label !== 'string') {
      errors.push(`${at}(${id}).label 缺失或者不是字符串`)
      return undefined
    }
    if (label.trim() === '') {
      errors.push(`${at}(${id}).label 是空的 —— 空标签比没标签更糟，它占着位置，看起来像已经写过说明了`)
      return undefined
    }

    const params = value.params
    if (!isRecord(params)) {
      errors.push(`${at}(${id}).params 缺失或者不是对象（没有参数的端点写 {}，别省掉这个键）`)
      return undefined
    }
    // 数组里同一条路径会重复命中，去重再排序 —— 这句报错要贴给人看，不能是一串重复项
    const credentials = [...new Set(findCredentialKeys(params))].sort()
    if (credentials.length > 0) {
      errors.push(
        `${at}(${id}).params 里 ${credentials.join(' / ')} 像凭证 —— 请求集合进 git，凭证走 .env` +
          `（与 server/env.ts 那道闸同一条纪律），这一条整条不收`
      )
      return undefined
    }

    // 判两道：写法（正则）+ **这个日期真的存在**。第二道非要不可 ——
    // `new Date('2026-02-30T00:00:00Z')` 不是 NaN，V8 会把它顺延成 3 月 2 日，
    // 于是「2 月 30 号」这种手写错误会静默变成另一个日期。回写一遍比对是最省事的判据
    const recordedAt = value.recordedAt
    const roundTrip = typeof recordedAt === 'string' ? new Date(recordedAt) : new Date(Number.NaN)
    const canonical = Number.isNaN(roundTrip.getTime()) ? '' : `${roundTrip.toISOString().slice(0, 19)}Z`
    if (typeof recordedAt !== 'string' || !SECOND_ISO.test(recordedAt) || canonical !== recordedAt) {
      errors.push(`${at}(${id}).recordedAt 要写成 2026-09-05T06:11:00Z 这种到秒的 ISO 8601 UTC（同样本的 recordedAt）`)
      return undefined
    }

    const verdict = value.verdict
    if (!isVerdict(verdict)) {
      errors.push(`${at}(${id}).verdict 只能是 ${REQUEST_VERDICTS.join(' / ')} 之一`)
      return undefined
    }

    // 下面三个可选字段坏了**只丢那个字段**，理由见模块注释那张表
    let sampleHash: string | undefined
    if (value.sampleHash !== undefined) {
      if (typeof value.sampleHash !== 'string' || !SAMPLE_HASH.test(value.sampleHash)) {
        errors.push(`${at}(${id}).sampleHash 不是 12 位十六进制的样本文件名，这个字段已丢掉`)
      } else if (verdict !== 'ok') {
        // 被拒的请求压根没生成样本，这个指针指不到东西。留着比没有更糟：
        // 它通常是复制粘贴漏改，而那个哈希指向的是**另一组参数**的样本
        errors.push(`${at}(${id}) 的 verdict=${verdict} 却带着 sampleHash —— 被拒的请求没有样本，这个字段已丢掉`)
      } else sampleHash = value.sampleHash
    }

    let shapeKey: string | undefined
    if (value.shapeKey !== undefined) {
      // 只卡「非空字符串」：产它的那一头（PRD 阶段 4）还没落地，
      // 提前把编码方式钉死只会变成届时要改的一处
      if (typeof value.shapeKey !== 'string' || value.shapeKey.trim() === '') {
        errors.push(`${at}(${id}).shapeKey 不是非空字符串，这个字段已丢掉`)
      } else shapeKey = value.shapeKey
    }

    let note: string | undefined
    if (value.note !== undefined) {
      if (typeof value.note !== 'string' || value.note.trim() === '') {
        errors.push(`${at}(${id}).note 是空的 —— 有话就写，没话就别留这个键，这个字段已丢掉`)
      } else note = value.note
    }

    return {
      id,
      label,
      params,
      recordedAt,
      verdict,
      ...(sampleHash === undefined ? {} : { sampleHash }),
      ...(shapeKey === undefined ? {} : { shapeKey }),
      ...(note === undefined ? {} : { note })
    }
  }

  const rawRequests = raw.requests
  if (!Array.isArray(rawRequests)) {
    return { collection: { ...head, version, endpoint, requests: [] }, errors: [...errors, '缺 requests 字段，或者它不是数组'] }
  }
  const requests: RequestEntry[] = []
  for (const [index, item] of rawRequests.entries()) {
    const entry = readEntry(index, item)
    if (entry !== undefined) requests.push(entry)
  }
  // `$comment` 排在最前：它是给人看的开场白，round-trip 之后不该跑到文件末尾去
  return { collection: { ...head, version, endpoint, requests }, errors }
}

/* ------------------------------------------------------------------ 路径与落盘 */

/**
 * 路径：`corpus/<平台>/<端点>.requests.json`。
 *
 * 放在端点目录**外面**，与注释 sidecar（`<端点>.doc.json`）同一条约定：与样本分开，
 * 于是不用担心哪天某个参数哈希撞上一个保留名字。
 *
 * **这个函数抛异常**，与本模块的解析器相反 —— 它的输出要进文件系统，
 * 一个含 `../` 的端点名不是「可以记进 errors 的瑕疵」，判据同 `corpusPath`。
 */
export const requestsPath = (input: { platform: string; endpoint: string }): string => {
  for (const [name, segment] of Object.entries(input)) {
    if (!SAFE_SEGMENT.test(segment)) {
      throw new Error(`请求集合路径段 ${name}=${JSON.stringify(segment)} 含非法字符，只允许 [A-Za-z0-9_-]`)
    }
  }
  return `${CORPUS_ROOT}/${input.platform}/${input.endpoint}.requests.json`
}

/**
 * 落盘用的字符串。契约与 `serializeCorpusSample` 逐条相同：2 空格缩进、结尾换行、**行尾 LF**。
 *
 * 这里比样本那边更要紧一格 —— 这个文件**进 git 并且会被机器一条条追加**：
 * 行尾不归一的话，Windows 上「加一条记录」的 diff 会变成整文件重写，review 时看不出改了什么。
 */
export const serializeRequestCollection = (collection: RequestCollection): string =>
  `${JSON.stringify(collection, null, 2).replace(/\r\n/g, '\n')}\n`
