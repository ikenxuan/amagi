import { filterSearchResponses, parseDouyinMultiJson } from 'amagi/platforms/douyin/decode/multiJson'
/**
 * platforms/douyin/decode/multiJson 的契约。
 *
 * 判据：从 v6 `getdata.ts` 搬出来后有单测（v6 里零测试）。
 * 行为与 v6 逐字一致：
 * - 按花括号深度切块，畸形块静默跳过
 * - `filterSearchResponses` 只留带 cursor（number）/ has_more（number）/
 *   data（数组）的块
 */
import { describe, expect, it } from 'vitest'

describe('parseDouyinMultiJson - 按深度切块', () => {
  it('单个 JSON 原样解析', () => {
    expect(parseDouyinMultiJson('{"a":1}')).toEqual([{ a: 1 }])
  })

  it('两个 JSON 粘连：切成两个块', () => {
    expect(parseDouyinMultiJson('{"a":1}{"b":2}')).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('嵌套花括号不会提前切块', () => {
    const raw = '{"data":{"list":[{"name":"x"}]}}{"ok":true}'
    expect(parseDouyinMultiJson(raw)).toEqual([{ data: { list: [{ name: 'x' }] } }, { ok: true }])
  })

  it('字符串里的花括号不参与深度', () => {
    const raw = '{"msg":"{not json}"}{"n":1}'
    expect(parseDouyinMultiJson(raw)).toEqual([{ msg: '{not json}' }, { n: 1 }])
  })

  it('畸形块静默跳过（v6 原行为）', () => {
    expect(parseDouyinMultiJson('{"a":1}not-json{"b":2}')).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('空串 / 无花括号返回空数组', () => {
    expect(parseDouyinMultiJson('')).toEqual([])
    expect(parseDouyinMultiJson('plain text')).toEqual([])
  })

  it('返回普通对象数组而不是字符串', () => {
    for (const item of parseDouyinMultiJson('{"a":1}')) {
      expect(typeof item).toBe('object')
    }
  })
})

describe('filterSearchResponses - 只留合法搜索响应', () => {
  it('带 cursor/has_more/data 的块被保留', () => {
    const block = { cursor: 20, has_more: 1, data: [{ id: '1' }] }
    expect(filterSearchResponses([block])).toEqual([block])
  })

  it('缺少任一字段的块被过滤', () => {
    const blocks = [
      { cursor: 1, has_more: 0 }, // 缺 data
      { cursor: 1, data: [] }, // 缺 has_more
      { has_more: 0, data: [] }, // 缺 cursor
      { cursor: '1', has_more: 0, data: [] } // cursor 是字符串
    ]
    expect(filterSearchResponses(blocks)).toEqual([])
  })

  it('data 不是数组的块被过滤', () => {
    expect(filterSearchResponses([{ cursor: 1, has_more: 0, data: 'not-array' }])).toEqual([])
  })

  it('空对象 / null / 非对象被过滤', () => {
    expect(filterSearchResponses([{}, null, 'x', 42])).toEqual([])
  })

  it('混合输入：只保留合法块，其余丢弃', () => {
    const valid = { cursor: 0, has_more: 1, data: [{ id: 'keep' }] }
    expect(filterSearchResponses([{ msg: 'noise' }, valid, 'garbage'])).toEqual([valid])
  })
})
