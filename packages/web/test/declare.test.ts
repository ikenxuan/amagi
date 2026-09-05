/**
 * `declare.ts` —— 「这一发响应本身长什么形状」那块面板的产出（`RecordOutcome.typeSource`）。
 *
 * 钉的是三件靠读代码看不出来的事：
 *
 * 1. **那个「自动生成，重新生成会覆盖」的文件头不在。** 这份源码永远不落盘，贴上那句话
 *    会把人指向一个不存在的文件 —— 与 `compare.test.ts` 里同一条断言一字不差，因为两条路
 *    用的是同一份判据（`banner: false`）。
 * 2. **怪形状的响应不抛。** 根上是数组 / `null` / 空对象的响应都是真实存在的（`null` 那种
 *    正是 `code` 非 0 时 `data` 的常态），而这一步抛一下的代价是整个 `/api/record` 回 500。
 * 3. **`typeSource` 与 `typeIssue` 不会同时在。** 契约上那句「非空 ⇒ 另一个不在」只由这里兜。
 *
 * 与 `compare.test.ts` 同一条纪律：不读真 corpus、不碰真产物树、不起服务。
 * 区别是这个文件**会真的把 shiki 拖进来**（`withTypeSource` 直接 import `highlightCode`，
 * 不像 `compareSamples` 那样注入），所以断言分两种写法：纯生成那部分对着源码断言，
 * 过了 shiki 的那部分只断言「有没有」与「是哪一个字段」，不去 HTML 里找 token。
 */

import type { JsonValue } from '@ikenxuan/amagi-typegen'
import { describe, expect, it } from 'vitest'

import { declareResponseType, rootNameOf, withTypeSource } from '../server/declare'
import type { RecordOutcome } from '../shared/contract'

/** 一份最小的成功录制结果。只有 `payload` 是 `withTypeSource` 真的会读的 */
const settled = (payload: JsonValue): RecordOutcome => ({
  ok: true,
  verdict: { kind: 'store', reason: '手搓的结果', confident: true },
  payload
})

describe('一份响应 → 一份类型声明', () => {
  it('嵌套对象逐层渲成子类型，根类型名是端点名首字母大写加 `_V0`', () => {
    const source = declareResponseType({ data: { title: '标题', pages: [{ cid: 1 }] } }, 'videoInfo')
    // 根类型的写法是 `export type X = {`（不是 `export interface`）—— 生成器只发类型别名，
    // `compare.test.ts` 那条断言盯着同一件事。写成 interface 的话下面 `| null` 那种根本渲不出来
    expect(source).toContain('export type VideoInfo_V0 = {')
    expect(source).toContain('pages: Page[]')
    // 这份源码永远不落盘，贴上那句文件头会把人指向一个不存在的文件
    expect(source).not.toContain('自动生成')
  })

  /**
   * 「单份视角比合并的更严」那条（契约里 `typeSource` 的注释、`COMPARE_NOTE` 说的是同一件事）。
   * 一份样本内部**数组元素之间仍然是合并的**，所以 `| null` 与「可选」这两种都能在一发里看见 ——
   * 真实场景里这就是那句「多 P 稿件的 `desc` 有时是 null」被看见的方式。
   */
  it('同一份响应里的数组元素照样合并 —— 于是一发就能看出 `string | null` 与可选键', () => {
    const source = declareResponseType({ items: [{ desc: '简介', staff: 'x' }, { desc: null }] }, 'videoInfo')
    expect(source).toContain('desc: string | null')
    expect(source).toContain('staff?: string')
  })

  it('根类型名只做首字母大写 —— 名字在这条路上只影响面板上显示的那一行', () => {
    expect(rootNameOf('videoInfo')).toBe('VideoInfo_V0')
    // 已经大写的原样、怪写法也不报错（真是个怪名字时 `render.ts:388` 还会兜一道 pascal 化）
    expect(rootNameOf('Comments')).toBe('Comments_V0')
    expect(rootNameOf('')).toBe('_V0')
  })
})

describe('怪形状的响应不抛 —— 抛一下的代价是整个接口 500', () => {
  /**
   * 三种都是真实存在的响应：根上直接是列表（不带信封的那些端点）、
   * `null`（`code` 非 0 时 `data` 的常态，PRD 3.2 那条 `deleted` 记录就是它）、
   * 空对象（风控页与「作品已删除」都可能只回一个 `{}`）。
   */
  it.each([
    ['根上是数组', [{ a: 1 }, { a: 2 }] as JsonValue, 'export type VideoInfo_V0 = VideoInfoV0[]'],
    ['`null`', null as JsonValue, 'export type VideoInfo_V0 = null'],
    ['空对象', {} as JsonValue, 'export type VideoInfo_V0 = {'],
    ['空数组', [] as JsonValue, 'export type VideoInfo_V0 = unknown[]']
  ])('%s 照样渲得出来', (_label, payload, expected) => {
    expect(declareResponseType(payload, 'videoInfo')).toContain(expected)
  })
})

describe('挂到录制结果上', () => {
  it('没有 `payload` 的结果**原样返回**（同一个对象）—— 一发都没打出去时不该多出一块空面板', async () => {
    const input: RecordOutcome = { ok: false, verdict: { kind: 'reject', reason: '一发请求都没打出去' } }
    expect(await withTypeSource(input, 'videoInfo')).toBe(input)
  })

  it('正常那一发只有 `typeSource`，`typeIssue` 不在；`payload` 与别的字段一个都没动', async () => {
    const outcome = await withTypeSource(settled({ data: { title: '猫 & 狗' } }), 'videoInfo')
    expect(outcome.typeIssue).toBeUndefined()
    // 过了 shiki，所以只断言「渲了东西、字数与原文对得上」——
    // 内容逐字节不变那条由 `highlight.test.ts` 盯着，不在这里抄第二遍
    expect(outcome.typeSource?.html).toContain('<pre')
    expect(outcome.typeSource?.chars).toBe(outcome.typeSource?.totalChars)
    expect(outcome.payload).toEqual({ data: { title: '猫 & 狗' } })
    expect(outcome.verdict).toEqual({ kind: 'store', reason: '手搓的结果', confident: true })
  })

  /**
   * 生成器抛出来的那一格。
   *
   * 用一个**读一下就抛的 getter** 造这个输入：真的 JSON 响应长不出这种东西，而这条用例
   * 要钉的正是「万一它抛了」—— 那时必须是少一块面板加一句话，而不是整个 `/api/record` 回 500
   * （前端把 500 显示成「连不上控制台的 Node 侧」，那是句假话：请求发出去了、样本也录到了）。
   * 换成「造一份真能让生成器抛的响应」是做不到的：能做到的话那本身就是 typegen 的 bug。
   */
  it('生成器抛了就落进 `typeIssue`，**而且不会两个字段同时在** —— 少一块面板要说出来', async () => {
    const exploding = {
      get data(): JsonValue {
        throw new Error('炸给你看')
      }
    } as unknown as JsonValue
    const outcome = await withTypeSource(settled(exploding), 'videoInfo')
    expect(outcome.typeSource).toBeUndefined()
    expect(outcome.typeIssue).toContain('炸给你看')
    // 别的字段照旧回 —— 这一发的结论、脱敏统计、diff 与它无关
    expect(outcome.ok).toBe(true)
  })
})
