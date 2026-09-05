/**
 * 样本本地缓存的读写。**唯一碰文件系统的地方。**
 *
 * 样本不进 git（PRD 待决 #1），所以 `corpus/` 是**本地缓存**而不是仓库资产：
 * 跨会话累积、供重新生成与排查，谁的机器上有多少是那台机器自己的事。
 *
 * **同一个目录底下有两个反过来的东西**，读这个文件时得随时分清在动哪一个：
 * `<端点>/<哈希>.json` 是样本（本地缓存、值脱敏、随便重录）；
 * `<端点>.requests.json` 是请求集合（**进 git**、值是真的、机器一条条追加，
 * `.gitignore:55` 那条 `!` 例外就是为它开的）。后者写错的代价高一个数量级 ——
 * 提交出去就收不回来 —— 所以 {@link appendRequest} 的默认动作是**拒绝写**。
 */

import { mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type CorpusSample,
  DEFAULT_REQUESTS_COMMENT,
  type DocSidecar,
  EMPTY_SEED_FILE,
  type JsonValue,
  parseDocSidecar,
  parseRequestCollection,
  parseSeedFile,
  type RequestCollection,
  type RequestEntry,
  REQUESTS_FORMAT,
  requestsPath,
  type SeedFile,
  serializeRequestCollection
} from '@ikenxuan/amagi-typegen'

const here = dirname(fileURLToPath(import.meta.url))
/** 仓库根：`packages/web/server` 往上三层 */
export const ROOT = join(here, '..', '..', '..')
export const CORPUS_DIR = join(ROOT, 'corpus')

/** 样本文件名就是参数哈希，12 位十六进制。与 `gen-types.mts` 同一条约定 */
const SAMPLE_FILE = /^[0-9a-f]{12}\.json$/

/** 某个端点的样本文件名（已排序）。目录不存在就是「还没录过」，不是错误 */
const sampleFiles = (platform: string, endpoint: string): string[] => {
  try {
    return readdirSync(join(CORPUS_DIR, platform, endpoint))
      .filter((name) => SAMPLE_FILE.test(name))
      .sort()
  } catch {
    return []
  }
}

/**
 * 数某个端点有几份样本。**只列目录、不解析** ——
 * `/api/endpoints` 要为 61 个端点各数一次，而 `readSamples` 会把每个文件整份 `JSON.parse`。
 * 现在 corpus 里两份 B站 `comments` 各 1.3 MB，光为了拿一个 `.length` 就解析 3 MB JSON。
 */
export const countSamples = (platform: string, endpoint: string): number => sampleFiles(platform, endpoint).length

/**
 * 读某个端点已入库的样本。类型 diff 的「之前」那一半靠它。
 *
 * **一个文件坏了不会静默变成「0 份」**：原先整段包在一个 try 里，于是一个写坏的样本
 * 会让整个端点看起来没录过 —— `stored` 显示 0、diff 的「之前」那半是空的（**每份新样本
 * 都会看起来带来了新形状**）、「生成类型」按钮还会因为 `stored === 0` 被禁掉。全程无声。
 * 现在逐个文件 try，坏的那个进 `errors` 让调用方报出来。
 */
export const readSamples = (platform: string, endpoint: string): { samples: CorpusSample[]; errors: string[] } => {
  const dir = join(CORPUS_DIR, platform, endpoint)
  const samples: CorpusSample[] = []
  const errors: string[] = []
  for (const name of sampleFiles(platform, endpoint)) {
    try {
      samples.push(JSON.parse(readFileSync(join(dir, name), 'utf8')) as CorpusSample)
    } catch (error) {
      errors.push(`${platform}/${endpoint}/${name} 读不了：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { samples, errors }
}

/** 写一份样本。`path` 是仓库相对路径（`createCorpusSample` 算出来的） */
export const writeSample = (path: string, json: string): void => {
  const full = join(ROOT, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, json, 'utf8')
}

/** 生成的类型产物根。与 `packages/typegen/scripts/gen-types.mts` 的 `OUT_DIR` 必须一致 */
export const GENERATED_DIR = join(ROOT, 'packages', 'response-types', 'src', 'generated')

/**
 * 写一个生成产物。`path` 是相对产物根的路径，如 `bilibili/Comments/Comments_V0.ts`。
 *
 * **不清空整棵树**（与 `gen:types` 不同）：那条命令要保证「产物与全部证据一致」所以先
 * `rmSync`；而这里只是「我刚录完这个端点，先看到它的类型」。
 * 单个端点目录里的残留由 {@link listGeneratedUnder} + {@link removeGenerated} 收拾。
 */
export const writeGenerated = (path: string, source: string): void => {
  const full = join(GENERATED_DIR, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, source, 'utf8')
}

/**
 * 递归列出某个端点目录（`<平台>/<Endpoint>`）下现有的 `.ts` 产物，相对产物根、`/` 分隔、已排序。
 *
 * 存在的理由是一个真 bug：`/api/generate` 原先只写不删。补一份样本让判别式忽然可发现之后，
 * 布局会从 `Comments/Comments_V0.ts` + `Comments/index.ts` 翻成
 * `Comments/guards.ts` + `Comments/<取值>/…` —— 旧的两个文件没人删，而平台 barrel
 * 按判据被排除、不重写，于是它仍然 `export type { Comments_V0 } from './Comments'`，
 * 指向的旧文件还在。**`tsc` 全绿，下游拿到的还是旧类型，新写出来的联合谁也 import 不到。**
 *
 * @param root 产物根。只为可测 —— 生产路径永远是那个模块级常量
 */
export const listGeneratedUnder = (dir: string, root: string = GENERATED_DIR): string[] => {
  const walk = (relative: string): string[] => {
    let entries: { name: string; isDirectory: () => boolean }[]
    try {
      entries = readdirSync(join(root, relative), { withFileTypes: true })
    } catch {
      // 目录不存在 = 这个端点还没生成过，不是错误
      return []
    }
    return entries.flatMap((entry) => {
      const child = `${relative}/${entry.name}`
      if (entry.isDirectory()) return walk(child)
      return entry.name.endsWith('.ts') ? [child] : []
    })
  }
  return walk(dir).sort()
}

/** 一个已提交的产物文件：仓库里现在那一份 */
export interface GeneratedFileRead {
  /** 相对产物根、`/` 分隔，如 `bilibili/VideoInfo/VideoInfo_V0.ts` */
  path: string
  source: string
}

export interface GeneratedRead {
  /**
   * 这个端点现在有哪些产物。**空数组是正常状态**（61 个端点里只有 12 个生成过），
   * 与 {@link SeedRead.issues} 是同一条约定：「没有」不是「错了」。
   */
  files: GeneratedFileRead[]
  /** 读不了的产物。空数组 = 都好，其中包括「一个产物都没有」 */
  issues: string[]
}

/**
 * 端点名与产物目录名比对用的归一化：小写、去掉非字母数字。
 *
 * 只用来**认**，不用来**拼** —— 见 {@link readGeneratedFor}。
 */
const comparable = (raw: string): string => raw.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * 读某个端点**已提交**的类型产物（`<平台>/<Endpoint>/…` 底下那些）。
 *
 * **端点目录名不在这里重算。** 那个名字是端点名 pascal 化的结果（`videoInfo` → `VideoInfo`，
 * `packages/typegen/src/plan.ts:57,186`），而那个函数没导出；`server/index.ts` 的 `generateOne`
 * 为同一件事留过一句注释：多一份「名字怎么拼」的实现就多一处会脱节的地方。
 * 所以这里只**认**不**拼** —— 列出盘上真实存在的目录名，与端点名各做一次
 * {@link comparable} 归一化再比。pascal 化哪天改了分隔符或缩写大小写，这个比对都还成立。
 *
 * 顺带这也是安全上更省心的一条：外部传进来的 `endpoint` **一个字符都不参与拼路径**，
 * 只跟 `readdirSync` 回来的名字比较，于是 `../` 那类花样在这条路上无处可去。
 *
 * @param root 产物根。只为可测 —— 生产路径永远是那个模块级常量，而真产物里那 28 个文件
 *   参与 `pnpm types:check` 的逐字节比对，测试不该往那棵树里摆东西
 */
export const readGeneratedFor = (platform: string, endpoint: string, root: string = GENERATED_DIR): GeneratedRead => {
  const wanted = comparable(endpoint)
  const files: GeneratedFileRead[] = []
  const issues: string[] = []
  for (const path of listGeneratedUnder(platform, root)) {
    const parts = path.split('/')
    // 少于三段的只有平台 barrel（`<平台>/index.ts`）—— 它描述的是整个平台、不归任何端点，
    // 判据与 `outcome.ts` 的 `isEndpointOwnedFile` 是同一条
    if (parts.length < 3 || comparable(parts[1]!) !== wanted) continue
    try {
      files.push({ path, source: readFileSync(join(root, ...parts), 'utf8') })
    } catch (error) {
      issues.push(`产物 ${path} 读不了：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { files, issues }
}

/**
 * 删掉一个产物文件，并把因此空掉的目录一层层收走。
 *
 * **判据是解析后的绝对路径，不是原始字符串。** 原先三道闸全按字符串来（`split('/')` 的段数、
 * `endsWith('.ts')`、`parts.includes('..')`），三种写法整个穿过去，而穿过去就是真的 `rmSync`：
 *
 * - `bilibili//index.ts` —— 按 `/` 切出来也是三段（中间那段是空串）、结尾 `.ts`、没有 `..`，
 *   三道闸全过。而 `join` 会把空段吃掉，于是删的是**平台 barrel**，
 *   紧接着往上收的第一层是**平台目录**。
 * - `//x.ts` —— 同理，往上收的目标是**产物根本身**。
 * - `bilibili/Comments/..\..\..\index.ts` —— `..` 藏在反斜杠后面，按 `/` 根本切不开，
 *   于是那道 `..` 检查形同虚设。Windows 上 `join` 认反斜杠，落点是
 *   `packages/response-types/src/index.ts`（**手写**入口），再多几个 `..\` 能出仓库。
 *
 * 今天喂进来的都是 {@link listGeneratedUnder} 回的真 dirent（文件名里不含分隔符），所以三条都
 * 不可达 —— 但这几道闸声称给出的正是这个保证，而这是这个包里唯一会删文件的地方。
 *
 * 现在是五道闸，顺序也是刻意的（先把字符串里的花样挡掉，再看归一化的结果）：
 *
 * 1. **不许有反斜杠**：产物路径的分隔符只有 `/`。放它进来，判据的含义就随平台变了 ——
 *    同一个字符串在 Windows 上能出根、在 Linux 上是个名字带反斜杠的文件。
 * 2. **每段非空**：空段会被归一化悄悄吃掉，于是判据看到的深度不是真的深度 ——
 *    上面 `bilibili//index.ts` 那条就是这么进来的。
 * 3. **归一化之后仍在产物根之内**：`..` 不再靠找字符串，靠 `relative` 的结果说话。
 *    `isAbsolute` 那一支是 Windows 跨盘 —— `relative('D:\\…', 'C:\\…')` 回的是绝对路径。
 * 4. **至少三段**（`<平台>/<Endpoint>/…`）：根 barrel 一段、平台 barrel 两段，于是它们在
 *    判据上就碰不到。
 * 5. **结尾是 `.ts` 且不只是 `.ts`**。
 *
 * 目录只用 `rmdirSync` 收，它对非空目录会失败 —— 这正是想要的行为，
 * 递归删一棵目录树的力气在这里不该有。
 *
 * @param root 产物根。只为可测 —— 生产路径永远是那个模块级常量。
 *   真删一个产物文件就是真删一个已提交的产物文件（那 28 个文件参与 `pnpm types:check` 的
 *   逐字节比对），所以「放过」那一侧只在系统临时目录里测。
 */
export const removeGenerated = (path: string, root: string = GENERATED_DIR): void => {
  /** 五道闸共用一句话：`拒绝删除` 与范围那半句是给日志读的，前面补上到底哪一道拦的 */
  const reject = (why: string): never => {
    throw new Error(`拒绝删除 ${path}：${why} —— 产物清理只碰 <平台>/<Endpoint>/ 底下的 .ts 文件`)
  }
  if (path.includes('\\')) reject('路径里有反斜杠，而产物路径的分隔符只有 `/`')
  if (path.split('/').some((part) => part === '')) reject('路径里有空段')

  const base = resolve(root)
  const target = resolve(base, path)
  const inside = relative(base, target)
  if (inside === '' || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) reject('归一化之后落在产物根外面')

  const segments = inside.split(sep)
  if (segments.length < 3) reject(`归一化之后只有 ${segments.length} 段`)
  const name = segments[segments.length - 1]!
  if (name === '.ts' || !name.endsWith('.ts')) reject('不是一个 .ts 文件')

  rmSync(target, { force: true })
  // 从文件所在的那一层往上收，**最浅收到 `<平台>/<Endpoint>`**：段数至少三段，所以下界 2
  // 就是那两段。平台目录（一段）与产物根（零段）一次都不碰 —— 平台目录底下还有别的端点，
  // 产物根底下还有 barrel。
  // 这里数的是**归一化之后**的 `segments`：原先数原始字符串切出来的段，
  // `['bilibili', '', 'index.ts']` 的 depth 2 拼出来的正是平台目录
  for (let depth = segments.length - 1; depth >= 2; depth -= 1) {
    try {
      rmdirSync(join(base, ...segments.slice(0, depth)))
    } catch {
      // 非空就停 —— 剩下的层级都在用
      return
    }
  }
}

export interface SeedRead {
  seeds: SeedFile
  /**
   * 种子文件本身的问题。**空数组 = 文件是好的**，其中包括「文件不存在」——
   * 那是正常状态（还没人填），不是问题。
   */
  issues: string[]
}

/**
 * 读根种子。**每次调用都重新读盘** —— 原先那版在启动时读一次，
 * 于是改了 `seeds.json` 必须重启服务；而「补一个种子再录一次」是这个工具的日常动作。
 *
 * **问题一律回给调用方，不吞。** 原先这里把两件事混成了一件：`parseSeedFile` 的
 * `errors` 被丢掉、JSON 语法错又被 `catch` 当成「没有 seeds.json」。
 * 于是给 `seeds.json` 加一个尾逗号 → 61 个端点全部显示「缺种子，批量录不了 · 0 组」，
 * 而日志、响应、界面三处没有一个字指向种子文件。而 `parseSeedFile` 恰好报得出
 * 「`params` 拼成了 `parms`」这类最难查的手误 —— 报得出却没人听，比不报更糟。
 */
export const readSeeds = (): SeedRead => {
  let raw: string
  try {
    raw = readFileSync(join(CORPUS_DIR, 'seeds.json'), 'utf8')
  } catch {
    // 没有 seeds.json 不影响手动填参，也不算问题
    return { seeds: EMPTY_SEED_FILE, issues: [] }
  }
  let parsedJson: JsonValue
  try {
    parsedJson = JSON.parse(raw) as JsonValue
  } catch (error) {
    return {
      seeds: EMPTY_SEED_FILE,
      issues: [`corpus/seeds.json 不是合法 JSON，整份种子都没读进来：${error instanceof Error ? error.message : String(error)}`]
    }
  }
  // `errors` 刻意不抛：种子文件写错一个键不该让整个服务起不来
  const parsed = parseSeedFile(parsedJson)
  return { seeds: parsed.seeds, issues: parsed.errors.map((message) => `corpus/seeds.json：${message}`) }
}

export interface DocSidecarRead {
  /**
   * 解析出来的注释 sidecar。**`undefined` 表示这个端点没有 `.doc.json`** ——
   * 那是正常状态（多数端点还没人写说明），生成器会照 `sidecar?.paths ?? {}` 走空注释那条路。
   */
  sidecar: DocSidecar | undefined
  /**
   * sidecar 自身的问题。**空数组 = 文件是好的**，其中包括「文件不存在」。
   * 与 {@link SeedRead.issues} 同一条约定。
   */
  issues: string[]
}

/**
 * 读某个端点的注释 sidecar（`corpus/<平台>/<端点>.doc.json`）。
 *
 * **存在的理由是一个真缺陷**：`/api/generate` 原先不读它，于是界面上点一次「生成这个端点的类型」，
 * 产物里那批人手写的中文说明**整批消失** —— 形状能从样本重新算出来，这些说明不能，它们是人的知识。
 * `bilibili/videoInfo` 掉的 5 条里有「`cid` 是分P 的 ID，不是稿件的」这种拿错就请求到别的东西的说明。
 * 而这件事当场无声：`pnpm types:check` 会红，但只在下一个人跑它的时候。
 *
 * 注释 sidecar 放在端点目录**外面**（与 `gen-types.mts` 同一条约定）：与样本分开，
 * 也就不用担心哪天参数哈希撞上某个保留名字。
 *
 * **「文件不存在」与「JSON 写坏了」分开报**，而 `gen-types.mts:105-111` 那段把两者都
 * 归到「没有 sidecar」。后者在这里是不能吞的：一个尾逗号会让全部注释静默失效，
 * 而人看到的现象只是「生成出来的东西跟 `types:check` 不一致」，没有一个字指向 sidecar。
 * 这与 {@link readSeeds} 修掉的是同一类错误。
 *
 * @param dir corpus 根。只为可测 —— 生产路径永远是那个模块级常量。
 *   「写坏的 sidecar」这类用例总得有个真文件，而真 corpus 里的 4 份 sidecar 参与
 *   `pnpm types:check` 的逐字节比对，测试不该往那里面摆东西。
 */
export const readDocSidecar = (platform: string, endpoint: string, dir: string = CORPUS_DIR): DocSidecarRead => {
  const label = `corpus/${platform}/${endpoint}.doc.json`
  let raw: string
  try {
    raw = readFileSync(join(dir, platform, `${endpoint}.doc.json`), 'utf8')
  } catch {
    // 没有 sidecar 是正常状态（这个端点还没人写说明），不是问题
    return { sidecar: undefined, issues: [] }
  }
  let parsedJson: JsonValue
  try {
    parsedJson = JSON.parse(raw) as JsonValue
  } catch (error) {
    return {
      sidecar: undefined,
      issues: [`${label} 不是合法 JSON，这个端点的注释一条都没注入：${error instanceof Error ? error.message : String(error)}`]
    }
  }
  // `errors` 刻意不抛：写错一个路径不该让「生成这个端点的类型」整个失败 ——
  // 其余的注释仍然该注入，而错的那条要被指名
  const parsed = parseDocSidecar(parsedJson)
  return { sidecar: parsed.sidecar, issues: parsed.errors.map((message) => `${label}：${message}`) }
}

/* ------------------------------------------------------------------ 请求集合 */

/** 集合文件名。放在端点目录**外面**（同 `.doc.json`），读与写共用这一处拼法 */
const requestsFileName = (endpoint: string): string => `${endpoint}.requests.json`

export interface RequestsRead {
  /**
   * 解析出来的请求集合。**文件不存在时回一个空集合，而不是 `undefined`** ——
   * 这一处刻意与 {@link readDocSidecar} 不同：集合是会被机器一条条追加的文件，
   * 而追加的第一步是「读回现在有什么」，那一步对「还没有这个文件」和
   * 「有、但里面零条」的处理完全一样。回 `undefined` 只是让每个调用方多一处能忘的判断。
   */
  collection: RequestCollection
  /**
   * 集合文件自身的问题。**空数组 = 文件是好的**，其中包括「文件不存在」——
   * 那是正常状态（现在 61 个端点一个集合都还没有），同 {@link SeedRead.issues}。
   *
   * 非空时 {@link appendRequest} **一个字节都不会写**，判据见那边。
   */
  issues: string[]
}

/**
 * 读某个端点的请求集合（`corpus/<平台>/<端点>.requests.json`）。
 *
 * 三种状态分开报，判据照抄 {@link readDocSidecar}：
 *
 * | 盘上的情况 | 回什么 |
 * |---|---|
 * | 没有这个文件 | 空集合（带默认 `$comment`）+ `issues` 空 —— **正常状态** |
 * | JSON 语法错 | 空集合 + 一条指名文件的 issue —— **绝不静默当成「没有请求」** |
 * | 能解析但有坏条目 | 校验器收下的那些 + 逐条 issue（带文件名前缀） |
 *
 * 中间那一档是这个函数存在的重点。`readSeeds` 与 `readDocSidecar` 各修过一次同一个错误
 * （一个尾逗号让全部种子 / 全部注释静默失效），而在这里它更贵一格：集合是**唯一记着
 * 「别人拿什么参数能重放这份响应」的地方**，被当成空的话，界面上少的那几行长什么样没人知道。
 *
 * @param dir corpus 根。只为可测，同 {@link readDocSidecar} —— 生产路径永远是那个模块级常量。
 *   而这里的理由还多一条：真 corpus 里的集合文件是**进 git 的**（`.gitignore:55` 的 `!` 例外），
 *   测试往那儿摆一份就是往仓库里摆一份
 */
export const readRequests = (platform: string, endpoint: string, dir: string = CORPUS_DIR): RequestsRead => {
  const label = `corpus/${platform}/${endpoint}.requests.json`
  /**
   * 「还没有这个文件」时的那一份。`$comment` 带上默认那三句 —— 于是第一次追加写出去的文件
   * 自带「值是真值、只放公开内容、凭证永不进」，而改这个 JSON 的人手上通常只有那个 JSON
   */
  const empty = (): RequestCollection => ({
    $comment: DEFAULT_REQUESTS_COMMENT,
    version: REQUESTS_FORMAT,
    endpoint: `${platform}/${endpoint}`,
    requests: []
  })

  let raw: string
  try {
    raw = readFileSync(join(dir, platform, requestsFileName(endpoint)), 'utf8')
  } catch {
    // 没有集合文件是正常状态（这个端点还没人记过参数），不是问题
    return { collection: empty(), issues: [] }
  }
  let parsedJson: JsonValue
  try {
    parsedJson = JSON.parse(raw) as JsonValue
  } catch (error) {
    return {
      collection: empty(),
      issues: [`${label} 不是合法 JSON，这个端点的请求集合一条都没读进来：${error instanceof Error ? error.message : String(error)}`]
    }
  }
  // `errors` 刻意不抛：写坏一条记录不该让整个界面炸掉，而错的那条要被指名（同 `parseSeedFile` 那两处）
  const parsed = parseRequestCollection(parsedJson)
  return { collection: parsed.collection, issues: parsed.errors.map((message) => `${label}：${message}`) }
}

/**
 * 写一份请求集合，返回**仓库相对路径**（人要能把这句话粘进 `git status` 去找）。
 *
 * 路径先过 `requestsPath` —— 那个函数**抛异常**，而这正是要的：输出要进文件系统，
 * 一个含 `../` 的端点名不是「可以记进 issues 的瑕疵」。真实落点按 `dir` 拼，
 * 于是测试换掉 `dir` 时返回值与落点不一致 —— 那是刻意的：返回值是给人读的标签，
 * 不是给下一个 `readFileSync` 用的路径。
 */
export const writeRequests = (platform: string, endpoint: string, collection: RequestCollection, dir: string = CORPUS_DIR): string => {
  const path = requestsPath({ platform, endpoint })
  const full = join(dir, platform, requestsFileName(endpoint))
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, serializeRequestCollection(collection), 'utf8')
  return path
}

export interface RequestAppend {
  /** 集合文件的仓库相对路径。**没写成时也回** —— 那句话总得说清是哪个文件 */
  path: string
  /** 追加/替换之后的集合。`issues` 非空时它是**盘上那一份**（一个字节都没动） */
  collection: RequestCollection
  /** 空数组 = 这一条真的写进去了。非空 = **一个字节都没写**，理由在里面 */
  issues: string[]
  /** 同 `id` 的旧条目被整条替换了（而不是追加了第二条） */
  replaced: boolean
}

/**
 * 往集合里追加一条，或者替换掉同 `id` 的那条。**要么整条写进去，要么一个字节都不动。**
 *
 * `issues` 非空 ⇒ 没写。三种情况都走这一条约定：
 *
 * 1. **盘上那份读不了、或者有坏条目**（{@link readRequests} 报了问题）。这时写回去等于
 *    **替人改文件**：JSON 语法错时会把人手写的那几条整个抹掉，一条坏条目时会把那条悄悄删掉 ——
 *    而这个文件进 git。先让人把那条修好再追加，是这里唯一不会丢东西的顺序。
 * 2. **凭证命中**。判据在校验器内部（`requests.ts` 的 `findCredentialKeys`，连嵌套对象和数组
 *    一起查），**不靠调用方自觉** —— 这个文件进 git，提交出去就收不回来。
 * 3. 其余任何让校验器拒收这一条的原因（`id` 的字符集、空 `label`、`recordedAt` 的写法……）。
 *
 * **幂等性判据是 `id`**：同 `id` 已存在就整条替换，不是追加第二条。理由在 `id` 的双重身份上 ——
 * 它会变成产物的目录名与类型名，同名两条会让产物名由「谁先被读到」决定；而校验器对撞名是
 * **整条拒收**的（`requests.ts` 那段的 PRD 待决 #4 保守方案），所以真追加成第二条的话，
 * 下一次读这个文件会连那条一起丢，而且没人知道是哪一次写坏的。
 *
 * **校验的是即将写盘的那些字节**（序列化 → `JSON.parse` → 校验器），不是内存里那个对象：
 * `RequestEntry` 只是编译期约束，而这条 entry 一路从 HTTP body 上来 —— 到这里它只是个长得像的
 * 对象。顺带把 `JSON.stringify` 自己那几种转换（`Infinity` → `null`）也纳进了判据。
 * 写回去的是**校验器吐出来的那一份**，于是键序是规范化的（`$comment` 在最前）——
 * 手写文件里的键序不会让下一次追加的 diff 多出无意义的行。
 */
export const appendRequest = (platform: string, endpoint: string, entry: RequestEntry, dir: string = CORPUS_DIR): RequestAppend => {
  // 路径先算：它抛异常（`../` 那类），而那件事该发生在碰文件系统之前
  const path = requestsPath({ platform, endpoint })
  const current = readRequests(platform, endpoint, dir)
  if (current.issues.length > 0) return { path, collection: current.collection, issues: current.issues, replaced: false }

  const at = current.collection.requests.findIndex((item) => item.id === entry.id)
  const requests = [...current.collection.requests]
  if (at < 0) requests.push(entry)
  else requests[at] = entry

  const verified = parseRequestCollection(JSON.parse(serializeRequestCollection({ ...current.collection, requests })) as JsonValue)
  // 盘上那份刚才是干净的（`issues` 空），所以这里报出来的一定是新来这条的问题
  if (verified.errors.length > 0) {
    return { path, collection: current.collection, issues: verified.errors.map((message) => `${path}：${message}`), replaced: false }
  }
  writeRequests(platform, endpoint, verified.collection, dir)
  return { path, collection: verified.collection, issues: [], replaced: at >= 0 }
}

/** 读 core 的版本号，写进样本 metadata —— 「这份样本是哪个版本录的」 */
export const readAmagiVersion = (): string => {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages', 'core', 'package.json'), 'utf8')) as { version: string }
    return pkg.version
  } catch {
    return '0.0.0'
  }
}
