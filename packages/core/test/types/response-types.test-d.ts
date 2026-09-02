import { createClient } from 'amagi/client/createClient'
import type { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import type { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import type { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import type { XiaohongshuReturnTypeMap } from 'amagi/types/ReturnDataType/Xiaohongshu'
/**
 * 响应类型的稳定性承诺（6.3 判据 + 响应类型复用 v6 ReturnDataType 的落点）。
 *
 * **承诺**：fetcher / HTTP 返回的 `data` 类型**就是 v6 的实测快照类型**
 * （`types/ReturnDataType` 的 `XxxReturnTypeMap` 条目），平台加字段不算
 * breaking —— v6 快照类型自带 `[property: string]: any` 顶层索引签名，
 * 读**未声明**的字段不产生编译错误（结果是 `any`）。声明过的字段仍保有
 * v6 快照的精确类型（IDE 补全不丢）。
 *
 * 逃生舱（06-migration「响应类型可能过时」）：`fetchX<T>()` 显式泛型覆盖
 * 返回类型；需要原始报文时 `error.raw`（失败）与端点 `decode` 层可取。
 *
 * 本文件锁死判据：四个平台的代表端点，读未声明字段都编译通过（`any`）；
 * 读已声明字段仍是 v6 快照的精确类型。
 */
import { assertType, describe, expectTypeOf, it } from 'vitest'

describe('响应类型复用 v6 ReturnDataType：读未声明字段不报错', () => {
  it('douyin videoWork：声明字段精确、未声明字段 any', async () => {
    const client = createClient({})
    const fetcher = client.douyin.fetcher as unknown as {
      fetchVideoWork: (o: { aweme_id: string }) => Promise<{ success: true; data: DouyinReturnTypeMap['videoWork'] } | { success: false }>
    }
    const result = await fetcher.fetchVideoWork({ aweme_id: '1' })
    if (result.success) {
      // 声明过的字段：v6 快照的精确类型
      expectTypeOf(result.data.aweme_detail.desc).toEqualTypeOf<string>()
      // 未声明的字段（平台将来新增的）：不编译报错（快照类型自带索引签名）
      assertType(result.data.futurePlatformField)
      expectTypeOf(result.data.futurePlatformField).toBeAny()
    }
  })

  it('bilibili videoInfo：读未声明字段不报错', () => {
    expectTypeOf<BilibiliReturnTypeMap['videoInfo']>().toHaveProperty('futureField')
    // 读未声明字段必须编译通过（判据核心），结果是快照索引签名的 any
    const read = ({} as BilibiliReturnTypeMap['videoInfo']).futureField
    expectTypeOf(read).toBeAny()
  })

  it('kuaishou emojiList：读未声明字段不报错', () => {
    expectTypeOf<KuaishouReturnTypeMap['emojiList']>().toHaveProperty('futureField')
  })

  it('xiaohongshu homeFeed：读未声明字段不报错', () => {
    expectTypeOf<XiaohongshuReturnTypeMap['homeFeed']>().toHaveProperty('futureField')
  })
})
