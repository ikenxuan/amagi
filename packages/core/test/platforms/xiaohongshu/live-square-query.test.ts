import { liveSquare } from 'amagi/platforms/xiaohongshu/endpoints/liveSquare'
import { describe, expect, it } from 'vitest'
import zod from 'zod'

describe('直播广场的 SDK 与 HTTP 参数保持一致', () => {
  it('HTTP query 中的 JSON 对象字符串解析为与 SDK 相同的对象', () => {
    const extra = { image_formats: ['jpg', 'webp'], scene: 'discover' }
    expect(liveSquare.params.parse({ extra_info: JSON.stringify(extra) })).toEqual(liveSquare.params.parse({ extra_info: extra }))
  })

  it.each(['{broken', 'null', '[1,2]', '42', '"text"'])('拒绝无效的 extra_info: %s', (extra_info) => {
    expect(liveSquare.params.safeParse({ extra_info }).success).toBe(false)
  })

  it('OpenAPI 输入 schema 同时声明对象和字符串，不丢掉参数类型', () => {
    const schema = zod.toJSONSchema(liveSquare.params, { io: 'input', unrepresentable: 'any' })
    expect(schema.properties?.extra_info).toMatchObject({
      anyOf: expect.arrayContaining([expect.objectContaining({ type: 'object' }), expect.objectContaining({ type: 'string' })])
    })
  })
})
