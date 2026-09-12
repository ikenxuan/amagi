import type { DataOf } from 'amagi/contracts/endpoint'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import type { AvToBvData, BvToAvData } from 'amagi/platforms/bilibili/endpoints'
import type {
  BilibiliArticleCardsResponse,
  BilibiliArticleContentResponse,
  BilibiliArticleInfoResponse,
  BilibiliArticleListInfoResponse,
  BilibiliBangumiInfoResponse,
  BilibiliBangumiStreamResponse,
  BilibiliCommentRepliesResponse,
  BilibiliCommentsResponse,
  BilibiliDynamicDetailResponse,
  BilibiliEmojiListResponse,
  BilibiliLiveRoomInfoResponse,
  BilibiliLiveRoomInitResponse,
  BilibiliLoginQrcodeResponse,
  BilibiliLoginStatusResponse,
  BilibiliQrcodeStatusResponse,
  BilibiliUploaderTotalViewsResponse,
  BilibiliUserCardResponse,
  BilibiliUserDynamicListResponse,
  BilibiliUserLiveStatusResponse,
  BilibiliUserSpaceInfoResponse,
  BilibiliVideoDanmakuResponse,
  BilibiliVideoInfoResponse,
  BilibiliVideoStreamResponse,
  DouyinCommentRepliesResponse,
  DouyinCommentsResponse,
  DouyinDanmakuListResponse,
  DouyinDynamicEmojiListResponse,
  DouyinEmojiListResponse,
  DouyinEmojiResourceMetaResponse,
  DouyinGuestMusicAwemeListResponse,
  DouyinGuestMusicInfoResponse,
  DouyinGuestUserInfoResponse,
  DouyinImageAlbumWorkResponse,
  DouyinLiveRoomInfoResponse,
  DouyinMusicInfoResponse,
  DouyinParseWorkResponse,
  DouyinSearchResponse,
  DouyinSlidesWorkResponse,
  DouyinSuggestWordsResponse,
  DouyinTextWorkResponse,
  DouyinUserFavoriteListResponse,
  DouyinUserProfileResponse,
  DouyinUserRecommendListResponse,
  DouyinUserVideoListResponse,
  DouyinVideoWorkResponse,
  KuaishouCommentsResponse,
  KuaishouDanmakuListResponse,
  KuaishouEmojiListResponse,
  KuaishouVideoWorkResponse,
  XiaohongshuEmojiListResponse,
  XiaohongshuHomeFeedResponse,
  XiaohongshuNoteDetailResponse,
  XiaohongshuSearchNotesResponse,
  XiaohongshuUserProfileResponse,
} from 'amagi/index'
/**
 * 端点响应类型的**全量锁**（2026-09-11 改写）。
 *
 * 换的是什么：v7 端点声明的 `response` 原先直接引用 v6 的 `XxxReturnTypeMap` 条目
 * （那张表是 quicktype 时代的实测快照，也一直在漂）；现在引用
 * `@ikenxuan/amagi-response-types` 的生成类型 —— 由 `packages/typegen` 从录到的真实响应
 * 派生，名字形如 `BilibiliCommentsResponse` / `DouyinVideoWorkResponse`。
 *
 * **还没有生成类型的端点回退 `any`**（用户 2026-09-11 的决定：先把接线打通，不让样本覆盖
 * 挡住这件事）。它们在这份文件里显式断言成 `any`，所以那 21 个洞是**登记在案**的：
* 补上样本、重新生成之后，**提醒来自 `test/contracts/response-source.test.ts`**（它比对端点声明与生成树，
* 会直接告诉你这一行该换成哪个名字）—— 这里的 `toBeAny()` 自己不会红，它只断言端点是 `any`。
 *
 * 2 个例外保留本地声明：`bilibili.avToBv` / `bilibili.bvToAv` 是 compute 端点
 * （本地算完就返回、一个网络请求都不发），永远录不到「响应」，所以它们没有、也不会有生成类型。
 *
 * 手写树 `types/ReturnDataType` 仍然导出、仍是 v6 兼容面（`response-types.test-d.ts` 钉它），
 * 但**不再是端点声明的来源**。
 */
import { describe, expectTypeOf, it } from 'vitest'

/** 注册表端点的 data 类型（registry 值是具体端点类型） */
type Data<E> = E extends { __data: infer D } ? D : DataOf<E>

describe('bilibili：data 类型 = 端点声明的响应类型', () => {
  type D = typeof bilibiliRegistry
  it('27 个端点', () => {
    expectTypeOf<Data<D['articleCards']>>().toEqualTypeOf<BilibiliArticleCardsResponse>()
    expectTypeOf<Data<D['articleContent']>>().toEqualTypeOf<BilibiliArticleContentResponse>()
    expectTypeOf<Data<D['articleInfo']>>().toEqualTypeOf<BilibiliArticleInfoResponse>()
    expectTypeOf<Data<D['articleListInfo']>>().toEqualTypeOf<BilibiliArticleListInfoResponse>()
    expectTypeOf<Data<D['avToBv']>>().toEqualTypeOf<AvToBvData>()
    expectTypeOf<Data<D['bangumiInfo']>>().toEqualTypeOf<BilibiliBangumiInfoResponse>()
    expectTypeOf<Data<D['bangumiStream']>>().toEqualTypeOf<BilibiliBangumiStreamResponse>()
    expectTypeOf<Data<D['bvToAv']>>().toEqualTypeOf<BvToAvData>()
    expectTypeOf<Data<D['captchaFromVoucher']>>().toBeAny()
    expectTypeOf<Data<D['commentReplies']>>().toEqualTypeOf<BilibiliCommentRepliesResponse>()
    expectTypeOf<Data<D['comments']>>().toEqualTypeOf<BilibiliCommentsResponse>()
    expectTypeOf<Data<D['dynamicDetail']>>().toEqualTypeOf<BilibiliDynamicDetailResponse>()
    expectTypeOf<Data<D['emojiList']>>().toEqualTypeOf<BilibiliEmojiListResponse>()
    expectTypeOf<Data<D['liveRoomInfo']>>().toEqualTypeOf<BilibiliLiveRoomInfoResponse>()
    expectTypeOf<Data<D['liveRoomInit']>>().toEqualTypeOf<BilibiliLiveRoomInitResponse>()
    expectTypeOf<Data<D['loginQrcode']>>().toEqualTypeOf<BilibiliLoginQrcodeResponse>()
    expectTypeOf<Data<D['loginStatus']>>().toEqualTypeOf<BilibiliLoginStatusResponse>()
    expectTypeOf<Data<D['qrcodeStatus']>>().toEqualTypeOf<BilibiliQrcodeStatusResponse>()
    expectTypeOf<Data<D['uploaderTotalViews']>>().toEqualTypeOf<BilibiliUploaderTotalViewsResponse>()
    expectTypeOf<Data<D['userCard']>>().toEqualTypeOf<BilibiliUserCardResponse>()
    expectTypeOf<Data<D['userDynamicList']>>().toEqualTypeOf<BilibiliUserDynamicListResponse>()
    expectTypeOf<Data<D['userLiveStatus']>>().toEqualTypeOf<BilibiliUserLiveStatusResponse>()
    expectTypeOf<Data<D['userSpaceInfo']>>().toEqualTypeOf<BilibiliUserSpaceInfoResponse>()
    expectTypeOf<Data<D['validateCaptcha']>>().toBeAny()
    expectTypeOf<Data<D['videoDanmaku']>>().toEqualTypeOf<BilibiliVideoDanmakuResponse>()
    expectTypeOf<Data<D['videoInfo']>>().toEqualTypeOf<BilibiliVideoInfoResponse>()
    expectTypeOf<Data<D['videoStream']>>().toEqualTypeOf<BilibiliVideoStreamResponse>()
  })
})

describe('douyin：data 类型 = 端点声明的响应类型', () => {
  type D = typeof douyinRegistry
  it('23 个端点', () => {
    expectTypeOf<Data<D['commentReplies']>>().toEqualTypeOf<DouyinCommentRepliesResponse>()
    expectTypeOf<Data<D['comments']>>().toEqualTypeOf<DouyinCommentsResponse>()
    expectTypeOf<Data<D['danmakuList']>>().toEqualTypeOf<DouyinDanmakuListResponse>()
    expectTypeOf<Data<D['dynamicEmojiList']>>().toEqualTypeOf<DouyinDynamicEmojiListResponse>()
    expectTypeOf<Data<D['emojiList']>>().toEqualTypeOf<DouyinEmojiListResponse>()
    expectTypeOf<Data<D['emojiResourceMeta']>>().toEqualTypeOf<DouyinEmojiResourceMetaResponse>()
    expectTypeOf<Data<D['guestMusicAwemeList']>>().toEqualTypeOf<DouyinGuestMusicAwemeListResponse>()
    expectTypeOf<Data<D['guestMusicInfo']>>().toEqualTypeOf<DouyinGuestMusicInfoResponse>()
    expectTypeOf<Data<D['guestUserInfo']>>().toEqualTypeOf<DouyinGuestUserInfoResponse>()
    expectTypeOf<Data<D['imageAlbumWork']>>().toEqualTypeOf<DouyinImageAlbumWorkResponse>()
    expectTypeOf<Data<D['liveRoomInfo']>>().toEqualTypeOf<DouyinLiveRoomInfoResponse>()
    expectTypeOf<Data<D['loginQrcode']>>().toBeAny()
    expectTypeOf<Data<D['musicInfo']>>().toEqualTypeOf<DouyinMusicInfoResponse>()
    expectTypeOf<Data<D['parseWork']>>().toEqualTypeOf<DouyinParseWorkResponse>()
    expectTypeOf<Data<D['search']>>().toEqualTypeOf<DouyinSearchResponse>()
    expectTypeOf<Data<D['slidesWork']>>().toEqualTypeOf<DouyinSlidesWorkResponse>()
    expectTypeOf<Data<D['suggestWords']>>().toEqualTypeOf<DouyinSuggestWordsResponse>()
    expectTypeOf<Data<D['textWork']>>().toEqualTypeOf<DouyinTextWorkResponse>()
    expectTypeOf<Data<D['userFavoriteList']>>().toEqualTypeOf<DouyinUserFavoriteListResponse>()
    expectTypeOf<Data<D['userProfile']>>().toEqualTypeOf<DouyinUserProfileResponse>()
    expectTypeOf<Data<D['userRecommendList']>>().toEqualTypeOf<DouyinUserRecommendListResponse>()
    expectTypeOf<Data<D['userVideoList']>>().toEqualTypeOf<DouyinUserVideoListResponse>()
    expectTypeOf<Data<D['videoWork']>>().toEqualTypeOf<DouyinVideoWorkResponse>()
  })
})

describe('kuaishou：data 类型 = 端点声明的响应类型', () => {
  type D = typeof kuaishouRegistry
  it('8 个端点', () => {
    expectTypeOf<Data<D['comments']>>().toEqualTypeOf<KuaishouCommentsResponse>()
    expectTypeOf<Data<D['danmakuList']>>().toEqualTypeOf<KuaishouDanmakuListResponse>()
    expectTypeOf<Data<D['emojiList']>>().toEqualTypeOf<KuaishouEmojiListResponse>()
    expectTypeOf<Data<D['liveRoomInfo']>>().toBeAny()
    expectTypeOf<Data<D['userProfile']>>().toBeAny()
    expectTypeOf<Data<D['userWorkList']>>().toBeAny()
    expectTypeOf<Data<D['videoWork']>>().toEqualTypeOf<KuaishouVideoWorkResponse>()
    expectTypeOf<Data<D['videoWorkFull']>>().toBeAny()
  })
})

describe('xiaohongshu：data 类型 = 端点声明的响应类型', () => {
  type D = typeof xiaohongshuRegistry
  it('7 个端点', () => {
    expectTypeOf<Data<D['emojiList']>>().toEqualTypeOf<XiaohongshuEmojiListResponse>()
    expectTypeOf<Data<D['homeFeed']>>().toEqualTypeOf<XiaohongshuHomeFeedResponse>()
    expectTypeOf<Data<D['noteComments']>>().toBeAny()
    expectTypeOf<Data<D['noteDetail']>>().toEqualTypeOf<XiaohongshuNoteDetailResponse>()
    expectTypeOf<Data<D['searchNotes']>>().toEqualTypeOf<XiaohongshuSearchNotesResponse>()
    expectTypeOf<Data<D['userNoteList']>>().toBeAny()
    expectTypeOf<Data<D['userProfile']>>().toEqualTypeOf<XiaohongshuUserProfileResponse>()
  })
})
