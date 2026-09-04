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
 *
 * 阶段 9.2 起 douyin 那条**直接用真 fetcher 类型**：原先它把 `client.douyin.fetcher`
 * `as unknown as` 成一个手写的两支联合（因为 BUG-2 下真类型上读不到 `data`），
 * 仓内自己都不敢用真类型 —— 这条绕行随信封读法修好一起删掉。
 */
import { assertType, describe, expectTypeOf, it } from 'vitest'

describe('响应类型复用 v6 ReturnDataType：读未声明字段不报错', () => {
  it('douyin videoWork：声明字段精确、未声明字段 any', async () => {
    const client = createClient({})
    const result = await client.douyin.fetcher.fetchVideoWork({ aweme_id: '1' })
    // 真 fetcher 的返回类型就是 AmagiResult<DouyinReturnTypeMap['videoWork']>
    expectTypeOf(result.data).toEqualTypeOf<DouyinReturnTypeMap['videoWork'] | undefined>()
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

  /**
   * 快手 H5 迁移（阶段 3）换形状后的锁：`videoWork` / `comments` 从 PC GraphQL
   * 的 `data.visionVideoDetail` / `data.visionCommentList` 换成 H5REST 的顶层形状，
   * 且**不归一化**。这两条断言把「换了形状但没丢索引签名承诺」钉住。
   */
  it('kuaishou videoWork：H5 photo/info 的顶层形状，未声明字段仍是 any', () => {
    // 顶层直接是 photo / mp4Url，没有 data.visionVideoDetail 那两层
    expectTypeOf<KuaishouReturnTypeMap['videoWork']['photo']['caption']>().toEqualTypeOf<string>()
    // mp4Url：图集的视频版，GraphQL 那条根本没有这个字段
    expectTypeOf<KuaishouReturnTypeMap['videoWork']['mp4Url']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<KuaishouReturnTypeMap['videoWork']>().toHaveProperty('futureField')
    const read = ({} as KuaishouReturnTypeMap['videoWork']).futureField
    expectTypeOf(read).toBeAny()
  })

  it('kuaishou comments：H5 的 snake_case 根评论在顶层，未声明字段仍是 any', () => {
    type RootComment = KuaishouReturnTypeMap['comments']['rootComments'][number]
    // H5 是 snake_case（`comment_id`），与 PC GraphQL 的 camelCase（`commentId`）是两套
    expectTypeOf<RootComment['comment_id']>().toEqualTypeOf<string | undefined>()
    // 子评论不内嵌在根评论里，而是按根评论 ID 分组挂在顶层 subCommentsMap
    expectTypeOf<KuaishouReturnTypeMap['comments']>().toHaveProperty('subCommentsMap')
    const read = ({} as KuaishouReturnTypeMap['comments']).futureField
    expectTypeOf(read).toBeAny()
  })

  it('xiaohongshu homeFeed：读未声明字段不报错', () => {
    expectTypeOf<XiaohongshuReturnTypeMap['homeFeed']>().toHaveProperty('futureField')
  })
})
