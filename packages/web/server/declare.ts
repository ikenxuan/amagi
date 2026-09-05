/**
 * 「**这一发响应本身长什么形状**」—— 一份响应 → 一份类型声明（`RecordOutcome.typeSource`）。
 *
 * 这与录制那条路上已有的两块面板都不是同一件事，三者缺一块都会少一个答案：
 *
 * - `diff` 说的是「**产物文件**会怎么变」，它是「全部样本 + 这一份」减去「全部样本」的结果 ——
 *   于是同形样本的 diff 是空的，而人这时最想看的恰恰是「那这一份到底长什么样」。
 * - `payloadHighlight` 说的是「这一发**拿回了什么值**」，一份上千行的 JSON 读不出形状。
 * - 这一份说的是形状本身。**单份视角**，所以它比合并出来的类型更严（出现过的键全是必需、
 *   空数组是 `unknown[]`、只见过 `string` 就不会有 `| null`）—— 与 `compare.ts` 两边那份
 *   `CompareSide.code` 是同一种东西、同一条口径（`generateTypes([一份], { banner: false })`），
 *   契约里 `typeSource` 那条注释把这句话说给前端听。
 *
 * 为什么单独一个文件：
 *
 * - **不放 `highlight.ts`。** 那个文件的文件头写着 shiki 只在它里面出现，理由是体积门禁 ——
 *   它是「浏览器包一个字节都不涨」这件事的边界，往里加 typegen 的 import 等于把那条边界
 *   变成「Node 侧那堆东西的杂物间」，下一个人就读不出它为什么必须独居了。
 * - **不放 `outcome.ts`。** 那一层是纯的（不发请求、不读盘、不看时钟），而这里要 `await`
 *   shiki 那个带语法数据的单例；同 `withPayloadHighlight` 的处置，录制那条路上它是最后一步，
 *   由路由在回 JSON 之前套一下。
 * - **不放 `compare.ts`。** 那一层刻意能在没有 shiki 的前提下被验证（高亮函数是注入的），
 *   而这里直接 import 它 —— 两种取舍放在同一个文件里，测试就得替它把 shiki 拖进来。
 *
 * 方向上 `declare.ts → highlight.ts` 与 `withPayloadHighlight` 是同一条既有的边，不新增环。
 */

import { generateTypes, type JsonValue } from '@ikenxuan/amagi-typegen'

import type { RecordOutcome } from '../shared/contract'
import { highlightCode } from './highlight'

/**
 * 根类型名。**`compare.ts` 与这条路共用同一份** —— 从那边搬过来的（它原先没导出）。
 *
 * **不复制 `plan.ts:57` 那套 pascal 规则**（它也没导出）：类型名在这两条路上都没有语义 ——
 * 对比那边差异按路径对齐、`shape` 把引用归一成 `↦`（见 `compare.ts` 的文件头），
 * 录制这边这份声明**永远不落盘**，所以这个名字只影响面板上显示出来的那一行。
 * 首字母大写就够让它看起来像产物里那个名字（`videoInfo` → `VideoInfo_V0`），
 * 而端点名真是个怪写法时 `render.ts:388` 还会兜一道 pascal 化。
 */
export const rootNameOf = (endpoint: string): string => `${endpoint.slice(0, 1).toUpperCase()}${endpoint.slice(1)}_V0`

/**
 * 一份响应 → 一份类型源码。**纯函数，不碰 IO**（`generateTypes` 自己也是）。
 *
 * `banner: false`：那个文件头写的是「自动生成，手改无意义 —— 重新生成会覆盖」，
 * 而这份源码**永远不会落盘**，贴在面板上会把人指向一个不存在的文件（同 `compare.ts:123`
 * 那处 `renderSide`，两处的判据一字不差）。
 *
 * 喂进去的是 `outcome.payload` 那一层，而不是原始响应：那个字段（`outcome.ts:300`）本来就是
 * 「归一化后优先、没有 normalize 步骤才退回 raw」的结果，也就是产物类型描述的那一层
 * （`plan.ts:70` 的 `payloadOf`，PRD 待决 #2）。所以这条路上**不需要第二份 `payloadOf`**：
 * 判断已经在 `outcome.ts` 里做过一次了，这里再挑一遍就是给同一条规则留第二处会脱节的实现。
 */
export const declareResponseType = (payload: JsonValue, endpoint: string): string =>
  generateTypes([payload], { rootName: rootNameOf(endpoint), banner: false }).source

/**
 * 给一次录制结果补上「这一发的形状」。形状同 `withPayloadHighlight`，路由那边两个套在一起。
 *
 * 没有 `payload` 就原样回（同一个对象引用）：一发都没打出去时多一块空代码面板，
 * 说的是「这份响应的形状是空的」—— 而真相是压根没有响应。
 *
 * **抛出来的一律落进 `typeIssue`，绝不让它冒到路由上。** 这一步是整条 `/api/record` 里
 * 最边缘的一块面板，而路由上抛一下的代价是整个接口 500 —— 前端把那个显示成
 * 「连不上控制台的 Node 侧」（`highlight.ts` 里 `forgiving: true` 那条注释同一个理由），
 * 那是句假话：请求发出去了、样本录到了、脱敏统计与 diff 都算好了，只是少了一块面板。
 * 于是这里的判据是「**少一块面板要说出来，但不能把别的九块一起带走**」。
 *
 * `await` 也圈在 `try` 里面（而不是只圈生成那一步）：多包一层没有代价，而
 * 「`typeSource` 与 `typeIssue` 不会同时在」这条契约由此在类型之外也成立 ——
 * 高亮那一步 `highlight.ts` 说了它不抛，可那是它的承诺，不是这里能替它兜的事。
 */
export const withTypeSource = async (outcome: RecordOutcome, endpoint: string): Promise<RecordOutcome> => {
  if (outcome.payload === undefined) return outcome
  try {
    return { ...outcome, typeSource: await highlightCode(declareResponseType(outcome.payload, endpoint), 'typescript') }
  } catch (error) {
    return { ...outcome, typeIssue: `这一发的类型声明没生成出来：${error instanceof Error ? error.message : String(error)}` }
  }
}
