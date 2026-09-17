/**
 * 形状指纹（`WEB-API-CONSOLE-PRD.md` 3.2 的 `shapeKey`）：一份响应 → 一个短字符串，
 * 满足**同指纹 ⇒ 渲出来的类型逐字节相同**。
 *
 * 那句话就是这个字段的全部价值，也是它唯一的正确性判据 —— 有了它，「这组参数带来新形状了吗」
 * 变成一次字符串比较，不用每次把两边的类型重新生成一遍再比。**反过来不要求**：
 * 不同指纹不保证类型真的不同（那只是错过一次合并建议，代价小得多）。方向是有意选的。
 *
 * 这里只产指纹。落盘（`RequestEntry.shapeKey`）与界面上那句「同指纹 ⇒ 建议合并」在
 * `packages/web` 那边，本包一如既往不读文件、不发请求、不落盘。
 *
 * ## ① 指纹算在**渲染出来的类型源码**上
 *
 * 判据与「类型逐字节相同」完全重合 —— 指纹就是那份源码的哈希，相等即逐字节相等，
 * 中间不隔任何一条需要论证的判据。
 *
 * 另一条路是算在响应形状上（摊平后的路径 → 类型集合）：便宜、不用跑生成器，但没选。
 * 「形状相同」与「渲出来的类型逐字节相同」之间隔着 `render.ts` 一整套判据 —— 可选性
 * （`child.seen < object.seen`）、全空数组渲成 `unknown[]`、`null` 单独当一个联合成员、
 * 数据键超过 `MAP_MIN_KEYS` 的对象收成索引签名、结构等价子树复用同一个类型名。
 * 要在形状那一侧算，就得把这些判据**再实现一遍**，于是它们有两份实现、每次改都得改两处。
 * 而这里脱节的代价是不对称的：指纹已经进了 git（`*.requests.json`），脱节之后
 * 「同指纹」这句话在旧记录上就是假的 —— 而它长得跟真的一模一样，没有任何东西会报错。
 * 多花的那点生成时间买的是「判据只有一处」。
 *
 * 「贵」也是相对的：跑的就是生成器本来要跑的那一遍，而调用点在「录一发 / 入库」这种
 * 一次一次的人工动作上，不在每次渲染界面的路径上。
 *
 * ### 溯源块必须排除，而这里靠**根本不渲染它**
 *
 * 产物文件头里有溯源块（几份样本、参数哈希、录制日期 —— `plan.ts` 的 `renderProvenance`）。
 * 把它掺进指纹的话，形状一模一样的两份样本会因为录制日期不同而得出不同指纹，这个字段就整个失效了
 * —— 而它失效的样子是「界面上不再建议合并」，安静得没人会发现。
 *
 * 所以指纹一律用 `banner: false` 渲染（见 {@link FINGERPRINT_OPTIONS}）：被哈希的那份源码里
 * 连一行注释都没有，坑从源头就不存在。不选「渲完再把注释行滤掉」是因为那是事后补救 ——
 * 多一种注释形态就漏一次。（`packages/web/server/outcome.ts` 的 `isShapeLine` 正在逐行判这件事，
 * 但它别无选择：那边拿到的是 `planCorpusTypes` 已经产好的两份产物，而文件头是 `plan.ts` 写死的，
 * 关不掉。这里是从头算，所以躲得开。）
 *
 * ## ② 长度与字符集：`sk1-` + 16 位小写十六进制
 *
 * 前缀不是装饰，它挡的是**与 `sampleHash` 混起来**。那个是 12 位小写十六进制
 * （`requests.ts` 的 `SAMPLE_HASH`），而两个字段在同一条记录上紧挨着躺。要是只靠长度区分
 * （PRD 3.2 例子里写的是 8 位十六进制 `a1b2c3d4`），两个都是十六进制串，复制粘贴错位、
 * 或者拿一个当另一个去查，都不会有任何东西报错 —— 而 `sampleHash` 恰好就是样本文件名，
 * 错位之后指向的是**另一组参数的样本**（`requests.ts` 已经为这件事专门拒过一次：
 * 「它通常是复制粘贴漏改」）。带前缀之后两者字符集不重叠，肉眼与正则都分得开。
 *
 * 前缀里带版本号是为了另一件事：指纹进 git，而 `render.ts` 的判据将来会改（`MAP_MIN_KEYS`
 * 的阈值、递归复用那一条还没做完）。判据一改，同一份响应的指纹就换了一个值，盘上那些旧指纹
 * **静默失配** —— 表现同上，界面上不再建议合并，而没有任何东西说得出为什么。版本号让这件事
 * 看得见：前缀不是 {@link SHAPE_KEY_PREFIX} 的，就是旧算法算的，丢掉重算即可。
 *
 * 16 位十六进制 = 64 位。一个端点下的请求条目是几十条的量级，碰撞概率可以忽略；
 * 而它**不等于 12 位**，长度本身也在提醒「这不是那个哈希」。
 *
 * ## ③ 确定性：由被哈希的那份源码自己保证
 *
 * 指纹进 git，所以同一份输入必须永远得出同一个值（跨进程、跨机器、跨 Node 版本）。
 * 这一条几乎不用本文件操心 —— 它哈希的那份源码本来就是 `--check` 逐字节比对的对象：
 * 对象键按字典序排（`render.ts` 的 `lower`）、字面量走 `sortLiterals`（那里明说不用
 * `localeCompare`，理由就是「换台机器 locale 变了确定性就没了」）、原始类型在联合里
 * 走 `PRIMITIVE_ORDER` 的固定顺序。
 *
 * 于是**输入 JSON 的键序不影响指纹**：键在 `merge.ts` 里进的是 `Map`、渲染时重新排序，
 * `{a,b}` 与 `{b,a}` 同指纹。这与 `hashParams` 的 `canonicalJson` 要解决的是同一件事，
 * 只是那边哈希的是参数对象、非排不可，而这边哈希的是渲染产物、排序已经在上游做完了 ——
 * 再排一遍等于多一处会与 `render.ts` 脱节的实现。**浮点数格式化**同样进不来：
 * 默认不收窄字面量，数字一律渲成 `number`。剩下的只有哈希本身，`sha256` / `utf8` / `hex` 三样写死。
 *
 * ## 用它之前要知道的两条
 *
 * - **根类型名是常量**，所以指纹与端点叫什么无关（`VideoInfo_V0` 与 `Comments_V0` 形状一样就同指纹）。
 *   而「建议合并」比的永远是同一个集合文件里的两条记录 —— 同一个端点、同一个真实根名，
 *   「逐字节相同」那句话照样成立。注释 sidecar 同理不进指纹：它是端点级的，掺进来会让
 *   「改一句注释」把这个端点所有旧指纹全作废，而形状一个字节都没变。
 * - **同指纹 ≠ 可以放心删掉一条。** 默认不收窄字面量，于是「判别式取值不同、渲出来的类型相同」
 *   是可能的（`type: 1` 与 `type: 8` 都渲成 `number`）—— 那两份样本在判别联合里属于不同成员，
 *   删掉一份就少一个成员的证据。界面上那句提示的准确说法是「这组参数没带来新形状」，
 *   删不删要人拍。
 */

import { createHash } from 'node:crypto'

import type { CorpusSample } from './corpus'
import { type GenerateOptions, generateTypes } from './generate'
import type { JsonValue } from './types'

/** 指纹算法版本。`render.ts` 的判据改了就 +1 —— 理由见文件头 ② */
export const SHAPE_KEY_VERSION = 1

/** 当前版本的前缀。不是这个前缀的指纹是旧算法算的，别拿去比 */
export const SHAPE_KEY_PREFIX = `sk${SHAPE_KEY_VERSION}-`

/** 取多少位十六进制。64 位够用，而且**故意不等于** `sampleHash` 的 12 位 */
const SHAPE_KEY_LENGTH = 16

/**
 * 指纹的写法。**只认当前版本**：旧前缀的指纹不该通过校验 —— 它是另一套判据算出来的，
 * 拿它跟新指纹比会说谎，丢掉重算才是对的（`requests.ts` 现在只卡「非空字符串」，
 * 因为产它的这一头当时还没落地；要收紧就用这条）。
 *
 * 从常量拼而不是写字面量，是为了别让长度有第二份定义。不带 `g` / `y` 标志：带了 `test()`
 * 就是有状态的，`options.ts` 的 `matchesLiteralPath` 为这件事栽过一次。
 */
export const SHAPE_KEY = new RegExp(`^${SHAPE_KEY_PREFIX}[0-9a-f]{${SHAPE_KEY_LENGTH}}$`)

/**
 * 指纹用的生成选项。**每一项都是为了让指纹只是「形状」的函数**：
 *
 * - `banner: false` —— 溯源块不进指纹，见文件头 ①。这是整个设计最容易悄悄错的地方；
 * - `rootName` 是常量 —— 指纹与端点叫什么无关，适用范围见文件头；
 * - 不传 `docs` —— 注释是端点级的，掺进来会让「改一句注释」把旧指纹全作废；
 * - 不传 `literalPaths` —— 一律放宽成基础类型，于是取值变了（`type: 1` → `type: 8`）指纹不变。
 *   这既是「形状」该有的粒度，也顺手把浮点数格式化挡在外面。
 *
 * 这个根名只在被哈希的那份中间源码里出现，产物里永远看不到它。
 */
const FINGERPRINT_OPTIONS: GenerateOptions = { rootName: 'ShapeKeyRoot', banner: false }

/**
 * 一份样本里，指纹该看哪一层。**必须与 `plan.ts` 的 `payloadOf`（`:70`）逐字一致** ——
 * 类型描述的是 fetcher 返回的 `data` 而不是线上原始响应（PRD 待决 #2），指纹看错一层
 * 就是在给另一份类型算指纹。那个函数没导出，所以这里是手抄的第二份。
 *
 * `'normalized' in sample` 不能换成 `sample.normalized !== undefined`：「端点没有 normalize
 * 步骤」（键整个不存在）与「normalize 返回了 null」是两件事，而 JSON 里区分它们的唯一办法就是缺键。
 */
const payloadOf = (sample: CorpusSample): JsonValue => ('normalized' in sample ? (sample.normalized as JsonValue) : sample.raw)

/**
 * N 份载荷 → 形状指纹。**核心入口**，入参与 `generateTypes` 是同一种（已经 `JSON.parse` 好的值）。
 *
 * 一条 `RequestEntry` 对应一组参数、一份响应，所以那一条走的是 `[payload]`。收 N 份是因为它免费，
 * 而且**顺手钉住了「样本份数不影响指纹」**：合并 N 份同形载荷与合并 1 份渲出来的类型逐字节相同
 * （可选性判据是 `child.seen < object.seen`，同形状时父子计数一起长，谁都不会变成可选）。
 *
 * 零份不抛：`generateTypes([])` 渲出来是 `unknown`，那是零证据下唯一诚实的类型，不变式照样成立
 * （一个端点所有样本都被判定拒了，就是这种情况）。
 */
export const shapeKeyOfPayloads = (payloads: readonly JsonValue[]): string => {
  const { source } = generateTypes(payloads, FINGERPRINT_OPTIONS)
  // 编码显式写出来。`update` 对字符串默认就是 utf8，但这个值进 git ——
  // 「默认值是什么」不该是一件要去翻文档才确定的事
  return `${SHAPE_KEY_PREFIX}${createHash('sha256').update(source, 'utf8').digest('hex').slice(0, SHAPE_KEY_LENGTH)}`
}

/**
 * N 份样本 → 形状指纹。只看载荷那一层，**`metadata` 一个字节都不参与** ——
 * 录制日期、参数哈希、amagi 版本、脱敏清单、样本份数，一样都不影响指纹（文件头 ① 那个坑）。
 *
 * 一条 `RequestEntry` 对一份样本，所以落点那边写的是 `shapeKeyOfSamples([sample])`。
 *
 * **不按 `verdict` 过滤**，与 `plan.ts` 刻意不同：那边要挡的是「`store-as-error` 的错误形状
 * 混进成功类型」，而这里算的是「这一份的形状指纹」—— 错误形状也有形状，
 * 而且「这组参数拿回的是另一种形状」正是界面要说的那句话。要不要给某一条算指纹由调用方决定。
 */
export const shapeKeyOfSamples = (samples: readonly CorpusSample[]): string => shapeKeyOfPayloads(samples.map(payloadOf))
