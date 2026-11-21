import type { AmagiClient, AmagiSuccess, BilibiliCommentsResponse, DouyinParseWorkResponse, SuccessAmagiClient } from 'amagi/index'
import { describe, expectTypeOf, it } from 'vitest'

describe('新门面的成功分支类型', () => {
  it('业务调用保留默认响应类型和显式泛型，不退化成 unknown', () => {
    const client = {} as SuccessAmagiClient
    expectTypeOf(client.bilibili.comments({ oid: '1', type: 1 })).toEqualTypeOf<Promise<AmagiSuccess<BilibiliCommentsResponse>>>()
    expectTypeOf(client.douyin.web.work({ aweme_id: '1' })).toEqualTypeOf<Promise<AmagiSuccess<DouyinParseWorkResponse>>>()
    expectTypeOf(client.douyin.app.commandTrans({ command: 'abc123' })).toEqualTypeOf<
      Promise<
        AmagiSuccess<{
          status_code: number | string
          status_msg?: string
          extra_info?: { object_id?: string | number | null } | null
          schema_detail?: { aweme_id?: string | number | null } | null
          schema?: string | null
        }>
      >
    >()
    expectTypeOf(client.bilibili.comments<{ custom: true }>({ oid: '1', type: 1 })).toEqualTypeOf<Promise<AmagiSuccess<{ custom: true }>>>()
  })

  it('必填参数、可省略参数与单次请求配置保持一致', () => {
    type Raw = AmagiClient['bilibili']
    type Success = SuccessAmagiClient['bilibili']
    expectTypeOf<Parameters<Success['comments']>>().toEqualTypeOf<Parameters<Raw['comments']>>()
    expectTypeOf<Parameters<Success['emojis']>>().toEqualTypeOf<Parameters<Raw['emojis']>>()
    expectTypeOf<Parameters<SuccessAmagiClient['douyin']['app']['shareSettings']>>().toEqualTypeOf<
      Parameters<AmagiClient['douyin']['app']['shareSettings']>
    >()
    const client = {} as SuccessAmagiClient
    expectTypeOf(client.bilibili.emojis()).resolves.toHaveProperty('success').toEqualTypeOf<true>()
    expectTypeOf(client.douyin.app.shareSettings()).resolves.toHaveProperty('success').toEqualTypeOf<true>()
    // @ts-expect-error 迁移后 oid 仍必须为字符串
    client.bilibili.comments({ oid: 1, type: 1 })
    // @ts-expect-error 成功分支投影不能把必填 type 变成可选
    client.bilibili.comments({ oid: '1' })
  })

  it('auth 端点投影为成功信封，扫码会话、非信封结果和 request/guest 保持原类型', () => {
    type Raw = AmagiClient
    type Success = SuccessAmagiClient
    expectTypeOf<Success['bilibili']['auth']['status']>().returns.resolves.toHaveProperty('success').toEqualTypeOf<true>()
    expectTypeOf<Success['douyin']['web']['auth']['qrcode']>().toEqualTypeOf<Raw['douyin']['web']['auth']['qrcode']>()
    expectTypeOf<Success['bilibili']['auth']['resume']>().toEqualTypeOf<Raw['bilibili']['auth']['resume']>()
    expectTypeOf<Success['bilibili']['auth']['refresh']>().toEqualTypeOf<Raw['bilibili']['auth']['refresh']>()
    expectTypeOf<Success['douyin']['web']['auth']['status']>().toEqualTypeOf<Raw['douyin']['web']['auth']['status']>()
    expectTypeOf<Success['douyin']['app']['guest']>().toEqualTypeOf<Raw['douyin']['app']['guest']>()
    expectTypeOf<Success['bilibili']['request']>().toEqualTypeOf<Raw['bilibili']['request']>()
    expectTypeOf<Pick<Success, 'events' | 'on' | 'once' | 'startServer'>>().toEqualTypeOf<
      Pick<Raw, 'events' | 'on' | 'once' | 'startServer'>
    >()
  })
})
