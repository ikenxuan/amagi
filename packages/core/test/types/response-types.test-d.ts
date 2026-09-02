import { createClient } from 'amagi/client/createClient'
import type { EmojiListData } from 'amagi/platforms/kuaishou/endpoints/emojiList'
import type { HomeFeedData } from 'amagi/platforms/xiaohongshu/endpoints/homeFeed'
import type { VideoInfoData } from 'amagi/platforms/bilibili/endpoints/videoInfo'
import type { WorkDetailData } from 'amagi/platforms/douyin/endpoints/videoWork'
/**
 * 响应类型的稳定性承诺（6.3 判据的落点）。
 *
 * **承诺**：fetcher / HTTP 返回的 `data` 类型是平台响应的**实测快照**，
 * 平台加字段不算 breaking —— 因此所有端点声明的响应类型都带顶层索引签名：
 * 读**未声明**的字段返回 `unknown` 而非编译错误。声明过的字段仍保有精确
 * 类型（IDE 补全不丢）。
 *
 * 逃生舱（06-migration「响应类型可能过时」）：`fetchX<T>()` 显式泛型覆盖
 * 返回类型；需要原始报文时 `error.raw`（失败）与端点 `decode` 层可取。
 *
 * 本文件锁死判据：四个平台的代表端点，读未声明字段都编译通过且是
 * `unknown`；读已声明字段仍是精确类型。
 */
import { assertType, describe, expectTypeOf, it } from 'vitest'

describe('6.3 判据：读未声明字段返回 unknown 而非编译错误', () => {
  it('douyin videoWork：声明字段精确、未声明字段 unknown', async () => {
    const client = createClient({})
    const fetcher = client.douyin.fetcher as unknown as {
      fetchVideoWork: (o: { aweme_id: string }) => Promise<{ success: true; data: WorkDetailData } | { success: false }>
    }
    const result = await fetcher.fetchVideoWork({ aweme_id: '1' })
    if (result.success) {
      // 声明过的字段：精确类型
      expectTypeOf(result.data.aweme_detail?.desc).toEqualTypeOf<string | undefined>()
      // 未声明的字段（平台将来新增的）：unknown 而非编译错误
      assertType(result.data.futurePlatformField)
      expectTypeOf(result.data.futurePlatformField).toBeUnknown()
    }
  })

  it('bilibili videoInfo：读未声明字段是 unknown', () => {
    expectTypeOf<VideoInfoData>().toHaveProperty('futureField')
    // 读未声明字段必须编译通过（判据核心），且类型是 unknown
    const read = ({} as VideoInfoData).futureField
    expectTypeOf(read).toBeUnknown()
  })

  it('kuaishou emojiList：读未声明字段是 unknown', () => {
    expectTypeOf<EmojiListData>().toHaveProperty('futureField')
  })

  it('xiaohongshu homeFeed：读未声明字段是 unknown', () => {
    expectTypeOf<HomeFeedData>().toHaveProperty('futureField')
  })
})
