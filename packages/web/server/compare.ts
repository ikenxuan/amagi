/**
 * 两组参数的**字段级对比**（PRD 阶段 4 第一条 / 六那张表里的 `POST /api/compare`）：
 * 两份样本 → 两份**各自单独**生成的类型 → 逐字段差异清单。
 *
 * 「两份样本 → `CompareResult`」这一整步都在这里，**不碰 HTTP、不读盘、不认识 shiki**。
 * 路由那边只剩三件事：校验 platform / endpoint、按 `sampleHash` 从盘上挑出那两份、
 * 把真高亮函数递进来。抽出来的理由与 `batch.ts` 相同 —— 这一层的正确性（哪一类差异归哪个
 * kind、方向有没有反、类型名的编号会不会造成误报）能用手搓的样本钉住，不用起服务，
 * 也不用往真 corpus 与真产物树里摆文件。
 *
 * ## 为什么不走 `planCorpusTypes`（`/api/generate` 走的是那条）
 *
 * 因为 plan 那一层有两道**为「产物」设计的**闸，而对比要的恰好是被它们挡掉的东西：
 *
 * 1. `plan.ts:166` 把 `verdict.kind !== 'store'` 的样本整份跳过 —— 那是对的，`store-as-error`
 *    的形状混进成功类型会把业务字段全变成可选。但「拿 `code: -404` 那份跟正常那份并排看看
 *    错误形状长什么样」正是 PRD 3.2 留下那条 `deleted` 记录的**全部目的**，
 *    走 plan 的话这条路上的面板会是空的。
 * 2. plan 回的是「路径 → 源码」的整张文件表（还带 barrel 与溯源块），而这里每边只需要一份源码。
 *
 * 代价是 `payloadOf` 抄了一行，见下面那条注释。
 *
 * ## 为什么「按路径对齐」这件事是成立的（PRD 4.3 那条实现约束）
 *
 * 子类型编号是**每次渲染独立算**的（`render.ts:224` 的 `uniqueName`：撞名就补数字后缀），
 * 所以同一个 `Data2` 在两边完全可能指两个不同的东西 —— 按类型名对齐会得出满屏假差异。
 * 而 `diffFlattened` 比的是 `FlatField.shape`（`flatten.ts:32`），那个字段里**所有指向本文件
 * 声明的类型的引用都已经被换成 `↦`**（`normalizeType`，`flatten.ts:70`），于是名字与编号
 * 一个字符都进不了比对；两个字段之所以被放在一起比，唯一的理由是它们的**路径**相同
 * （`flatten.ts:99,103` 的 `childPath` / `elementPath`）。`test/compare.test.ts` 里那条
 * 「两边的 `Data2` 指着不同的东西却不误报」就是这句话的实测。
 */

import {
  type CorpusSample,
  diffFlattened,
  type FieldDiff,
  type FlattenResult,
  flattenTypeSource,
  generateTypes,
  type JsonValue
} from '@ikenxuan/amagi-typegen'

import type { CompareFieldDiff, CompareResult, CompareSide, HighlightedCode } from '../shared/contract'

/**
 * 一份样本里，类型该描述哪一层。**照抄 `plan.ts:70` 的 `payloadOf`**（那个 const 没导出）：
 * 归一化后的值优先，端点没有 normalize 步骤时那个键整个不存在，这时才退回 `raw`。
 *
 * 抄一行而不是把它导出去：导出等于给 `packages/typegen` 的公共 API 面再添一个得长期兜住的
 * 符号，而这条规则本身是「类型描述 fetcher 返回的那一层」这个决定的一半（PRD 待决 #2）。
 * 两处脱节的后果是对比面板与产物描述的不是同一层数据，而那件事编译器抓不到 ——
 * 所以这条指路的注释就是这份抄写唯一的保险。
 */
const payloadOf = (sample: CorpusSample): JsonValue => ('normalized' in sample ? (sample.normalized as JsonValue) : sample.raw)

/**
 * 根类型名。两边用同一个。
 *
 * **不复制 `plan.ts:57` 那套 pascal 规则**（它也没导出）：类型名在这条路上没有语义 ——
 * 差异按路径对齐、`shape` 把引用归一成 `↦`（见文件头），所以这个名字只影响两块面板上
 * 显示出来的那一行。首字母大写就够让它看起来像产物里那个名字（`videoInfo` → `VideoInfo_V0`），
 * 而端点名真是个怪写法时 `render.ts:388` 还会兜一道 pascal 化。
 */
const rootNameOf = (endpoint: string): string => `${endpoint.slice(0, 1).toUpperCase()}${endpoint.slice(1)}_V0`

/**
 * 两套方向词之间的映射，理由在契约里那条 {@link CompareFieldDiff}。
 *
 * **声明成 `Record<FieldDiff['kind'], …>` 是这处映射唯一的保险**：typegen 那边给 `FieldDiff`
 * 添第五个取值，这张表就少一个键、`pnpm typecheck` 当场红 —— 而不是让新的那一类差异
 * 静默地对不上号。同 `contract.ts` 的 `RequestVerdict` 那条两头对顶。
 */
const KIND: Record<FieldDiff['kind'], CompareFieldDiff['kind']> = {
  // `diffFlattened(generated, handwritten)` 的第一个参数落在 `only-generated` 上，
  // 而下面 `compareSamples` 把 `left` 传在第一位 —— 这两句必须一起读，反了就是把结论说反
  'only-generated': 'only-left',
  'only-handwritten': 'only-right',
  type: 'type',
  optionality: 'optionality'
}

/**
 * 一处差异换成契约那套说法。
 *
 * `generated` / `handwritten` 那两个字符串**原样搬过来**，不重算一遍：`optionality` 那一类
 * 装的是 `必需` / `可选`（`flatten.ts:180`）而不是类型表达式，重算就是把那段判断抄第二遍。
 * 缺的那一侧**整个不给键**（而不是给一个 `undefined`），与契约里「`only-right` 时这个键不在」一致。
 */
const translate = (diff: FieldDiff): CompareFieldDiff => ({
  path: diff.path,
  kind: KIND[diff.kind],
  ...(diff.generated === undefined ? {} : { left: diff.generated }),
  ...(diff.handwritten === undefined ? {} : { right: diff.handwritten })
})

/**
 * 那句「单份视角比合并的更严」。四条差异都是实测的，判据在 `render.ts`（PRD 4.3 那张表）。
 *
 * 每次都回，理由同 `GenerateResult.note`：这是这个结果**做不到**的那件事，
 * 而它恰好是最容易被误读成「平台改了字段」的那件事。
 */
export const COMPARE_NOTE =
  '两边都是**单份样本单独**生成的类型，比合并出来的更严：出现的键全是必需、空数组是 `unknown[]`、' +
  '只见过 `string` 就不会有 `null`、键不到 12 个不会变成索引签名。' +
  '所以 `optionality` 与 `type` 这两类里有一部分是「这一组只录了一份样本」的影子，不是平台真的改了字段'

/** 一边渲完之后的中间结果 —— 源码还没高亮，摊平结果还要参与比对 */
interface RenderedSide {
  sampleHash: string
  source: string
  flat: FlattenResult
}

/**
 * 一份样本 → 一份类型源码 + 它的摊平结果。
 *
 * `banner: false`：那个文件头写的是「自动生成，手改无意义 —— 重新生成会覆盖」，
 * 而这份源码**永远不会落盘**，贴在对比面板上会把人指向一个不存在的文件。
 * 摊平时**把根类型名显式传进去**（用 `generateTypes` 自己回的那个，不用我们传进去的那个）：
 * `flattenTypeSource` 不给名字时取「第一个 `export type`」，那条约定成立，但绕了一圈。
 */
const renderSide = (sample: CorpusSample, rootName: string): RenderedSide => {
  const generated = generateTypes([payloadOf(sample)], { rootName, banner: false })
  return {
    sampleHash: sample.metadata.paramsHash,
    source: generated.source,
    flat: flattenTypeSource(generated.source, generated.rootName)
  }
}

export interface CompareInput {
  platform: string
  endpoint: string
  /** 左边那一组的样本。**挑样本是调用方的事** —— 见 {@link pickSample} */
  left: CorpusSample
  right: CorpusSample
  /**
   * 一段类型源码 → 契约里那个 `HighlightedCode`。生产路径是 `highlight.ts` 的
   * `highlightCode(source, 'typescript')`。
   *
   * **注入而不是在这里 import 它**：那条 import 会把 shiki 的两份语法数据（`typescript.mjs`
   * 一个文件 181 KB 的 JSON）拖进每个引用这个模块的地方，测试首当其冲；而这一层要能在
   * 没有 shiki 的前提下被验证。注入点的写法同 `batch.ts` 的 `runBatch`。
   */
  highlight: (source: string) => Promise<HighlightedCode>
}

/**
 * 两份样本 → 契约里那个 {@link CompareResult}。
 *
 * **两边是同一份样本时这里照样算**（结果是一份全 `same` 的空清单）。那种输入该不该被拒
 * 是**输入边界的政策**，不是这一层的判断，所以它在路由那边挡（`server/index.ts` 的
 * `/api/compare`，连理由一起写在那儿）。这一层保持成一个对任意两份样本都成立的纯函数。
 */
export const compareSamples = async (input: CompareInput): Promise<CompareResult> => {
  const rootName = rootNameOf(input.endpoint)
  const left = renderSide(input.left, rootName)
  const right = renderSide(input.right, rootName)
  // 方向：`left` 在第一位，于是它落在 `only-generated` 那一格上 —— 见 `KIND` 那张表
  const { diffs: raw, same } = diffFlattened(left.flat, right.flat)
  const diffs = raw.map(translate)
  // 计数**从 `diffs` 重新数**而不是搬 `diffFlattened` 回的那份：这样 `counts` 描述的
  // 一定是这次回出去的那个数组，两者不可能对不上号（那份 counts 用的还是旧那套 kind 名）
  const counts: Record<CompareFieldDiff['kind'], number> = { 'only-left': 0, 'only-right': 0, type: 0, optionality: 0 }
  for (const diff of diffs) counts[diff.kind] += 1
  // 高亮是**回之前的最后一步**（同 `/api/record` 那条路上的 `withPayloadHighlight`）：
  // 上面全是同步的纯判断，异步只发生在这一下。两边并行，shiki 那个单例自己扛并发
  const [leftCode, rightCode] = await Promise.all([input.highlight(left.source), input.highlight(right.source)])
  const sideOf = (rendered: RenderedSide, code: HighlightedCode): CompareSide => ({
    sampleHash: rendered.sampleHash,
    code,
    fields: rendered.flat.fields.size,
    recursive: rendered.flat.recursive
  })
  return {
    platform: input.platform,
    endpoint: input.endpoint,
    left: sideOf(left, leftCode),
    right: sideOf(right, rightCode),
    diffs,
    same,
    counts,
    note: COMPARE_NOTE
  }
}

/**
 * 按 `sampleHash` 从一堆样本里挑一份。
 *
 * 判据是 `metadata.paramsHash` —— **样本的文件名就是这个值**（`corpus.ts:474` 拿它拼路径），
 * 也是请求集合里那个 `sampleHash` 指向样本的指针，所以界面上显示的那 12 位与这里比的是同一个。
 * 从文件名上剥字符串是同一件事的第二种实现，不留第二份。
 *
 * 挑不到回 `undefined`，**由调用方说清是哪一边挑不到** —— 两个下拉框都可能写错，
 * 而「没找到」这三个字对着两个哈希是句废话。
 */
export const pickSample = (samples: readonly CorpusSample[], sampleHash: string): CorpusSample | undefined =>
  samples.find((sample) => sample.metadata.paramsHash === sampleHash)
