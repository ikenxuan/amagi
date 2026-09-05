/**
 * 「生成 vs 手写」逐字段比对（PRD 阶段 0 的决策依据 / 阶段 4 每个端点迁移前要过的清单）。
 *
 * 这一组测试的重心是**什么不该算差异**：两边的类型名根本对不上（`Data` / `DataData`、
 * `Reply[]` / `DataReply[]`、`Member` / `PurpleMember`），把名字算进差异会让清单里
 * 全是废话，人就不看了 —— 实测名字这一类占了 77 条里的 56 条。
 */

import { describe, expect, it } from 'vitest'

import { diffFlattened, flattenTypeSource } from '../src/index'

const generated = [
  'export type R = {',
  '  code: number',
  '  data: Data',
  '  [property: string]: any',
  '}',
  '',
  'type Data = {',
  '  items: Item[]',
  '  cursor: string',
  '  [property: string]: any',
  '}',
  '',
  'type Item = {',
  '  id: number',
  '  name: string',
  '  [property: string]: any',
  '}',
  ''
].join('\n')

/** 同一个响应的手写版：类型名全不一样，还多一个字段、少一个字段、一处类型不同 */
const handwritten = [
  'export type BiliR_V0 = {',
  '  code: number',
  '  data: DataData',
  '  [property: string]: any',
  '}',
  '',
  'type DataData = {',
  '  items: DataItem[]',
  '  cursor: string',
  '  extra: boolean',
  '  [property: string]: any',
  '}',
  '',
  'type DataItem = {',
  '  id: string',
  '  [property: string]: any',
  '}',
  ''
].join('\n')

describe('摊平：按路径而不是按类型名', () => {
  it('路径跨数组用 `[]`，与仓库其它地方一套约定', () => {
    const flat = flattenTypeSource(generated)
    expect([...flat.fields.keys()]).toEqual(['code', 'data', 'data.cursor', 'data.items', 'data.items[].id', 'data.items[].name'])
  })

  it('根类型不给就取第一个 `export type`', () => {
    expect(flattenTypeSource(handwritten).fields.has('data.items[].id')).toBe(true)
  })

  it('CRLF 的文件也能读 —— 仓库在 Windows 上按 CRLF 检出', () => {
    const flat = flattenTypeSource(generated.split('\n').join('\r\n'))
    expect(flat.fields.size).toBe(6)
  })

  it('自引用摊到那一层就停，并报出来（`Reply.replies: Reply[]` 这种）', () => {
    const recursive = [
      'export type R = {',
      '  reply: Reply',
      '}',
      '',
      'type Reply = {',
      '  replies: Reply[]',
      '  id: number',
      '}',
      ''
    ].join('\n')
    const flat = flattenTypeSource(recursive)
    expect(flat.fields.has('reply.id')).toBe(true)
    expect(flat.recursive).toEqual(['reply.replies[]'])
  })

  it('同一个类型出现在两个位置时两边都摊开（那是两个不同的字段，不是自引用）', () => {
    const shared = ['export type R = {', '  a: T', '  b: T', '}', '', 'type T = {', '  x: number', '}', ''].join('\n')
    const flat = flattenTypeSource(shared)
    expect(flat.fields.has('a.x')).toBe(true)
    expect(flat.fields.has('b.x')).toBe(true)
    expect(flat.recursive).toEqual([])
  })

  it('根类型不存在时返回空，不抛', () => {
    expect(flattenTypeSource('', 'Nope').fields.size).toBe(0)
  })
})

describe('比对：名字不算差异', () => {
  const result = diffFlattened(flattenTypeSource(generated), flattenTypeSource(handwritten))

  it('`Data` vs `DataData`、`Item[]` vs `DataItem[]` 都不算差异', () => {
    expect(result.diffs.map((diff) => diff.path)).not.toContain('data')
    expect(result.diffs.map((diff) => diff.path)).not.toContain('data.items')
  })

  it('手写独有的字段单独一类 —— 这是唯一需要人决策的（样本没覆盖到？还是平台删了？）', () => {
    expect(result.diffs).toContainEqual({ path: 'data.extra', kind: 'only-handwritten', handwritten: 'boolean' })
  })

  it('生成独有的字段也报，但它是好事：手写类型漏了这个字段', () => {
    expect(result.diffs).toContainEqual({ path: 'data.items[].name', kind: 'only-generated', generated: 'string' })
  })

  it('真的类型不同才报类型不同', () => {
    expect(result.diffs).toContainEqual({ path: 'data.items[].id', kind: 'type', generated: 'number', handwritten: 'string' })
  })

  it('给出一致字段数当分母 —— 不给分母没法判断「差异小到可接受」', () => {
    // 一致的四个：code、data（名字不同不算）、data.cursor、data.items（同理）
    expect(result.same).toBe(4)
    expect(result.counts).toEqual({ 'only-generated': 1, 'only-handwritten': 1, type: 1, optionality: 0 })
  })

  it('可选性不同单独一类（样本量不够时生成的会偏「必需」）', () => {
    const optional = ['export type R = {', '  a?: number', '}', ''].join('\n')
    const required = ['export type R = {', '  a: number', '}', ''].join('\n')
    const diff = diffFlattened(flattenTypeSource(required), flattenTypeSource(optional))
    expect(diff.diffs).toEqual([{ path: 'a', kind: 'optionality', generated: '必需', handwritten: '可选' }])
  })

  it('索引签名的形参名不算差异（`[property: string]` 与 `[key: string]` 是同一件事）', () => {
    const left = ['export type R = {', '  a: { [property: string]: any }', '}', ''].join('\n')
    const right = ['export type R = {', '  a: { [key: string]: any }', '}', ''].join('\n')
    expect(diffFlattened(flattenTypeSource(left), flattenTypeSource(right)).diffs).toEqual([])
  })
})
