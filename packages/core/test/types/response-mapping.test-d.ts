import type { DataOf } from 'amagi/contracts/endpoint'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import type { AvToBvData, BvToAvData, QrcodeStatusData } from 'amagi/platforms/bilibili/endpoints'
import type { LoginStatusData } from 'amagi/platforms/bilibili/endpoints/loginStatus'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import type { LoginQrcodeData } from 'amagi/platforms/douyin/endpoints/loginQrcode'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import type { UserNoteListData, UserProfileData as XhsUserProfileData } from 'amagi/platforms/xiaohongshu/endpoints'
import type { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import type { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import type { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import type { XiaohongshuReturnTypeMap } from 'amagi/types/ReturnDataType/Xiaohongshu'
/**
 * 响应类型复用 v6 ReturnDataType 的**全量锁**。
 *
 * v7 端点声明的 `response` 直接引用 v6 的 `XxxReturnTypeMap` 条目（v6 映射
 * 表的键与端点短名一一对应），调用方拿到的 `data` 类型与 v6 一致。7 个
 * 例外端点保留本地声明（原因见各自端点文件的 JSDoc）：
 * - `bilibili.avToBv` / `bilibili.bvToAv`：v6 映射条目是 API 信封形状，与实际返回不符
 * - `bilibili.qrcodeStatus`：v7 不再透出 headers（06 矩阵 4.2）
 * - `bilibili.loginStatus` / `douyin.loginQrcode` / `xiaohongshu.userNoteList`：v6 映射为 `any`
 * - `xiaohongshu.userProfile`：v6 条目的 `basicInfo` 与实测载荷 `basic_info` 不符
 *
 * 新增端点时：能对上 v6 语义的就在对应 map 里加条目并在此登记一行，
 * 对不上的保留本地声明并加注释 —— 本文件就是防止两者漂移的哨兵。
 */
import { describe, expectTypeOf, it } from 'vitest'

/** 注册表端点的 data 类型（registry 值是具体端点类型） */
type Data<E> = E extends { __data: infer D } ? D : DataOf<E>

describe('douyin：19 端点 data 类型 = DouyinReturnTypeMap 条目', () => {
  type D = typeof douyinRegistry
  it('作品类', () => {
    expectTypeOf<Data<D['parseWork']>>().toEqualTypeOf<DouyinReturnTypeMap['parseWork']>()
    expectTypeOf<Data<D['videoWork']>>().toEqualTypeOf<DouyinReturnTypeMap['videoWork']>()
    expectTypeOf<Data<D['imageAlbumWork']>>().toEqualTypeOf<DouyinReturnTypeMap['imageAlbumWork']>()
    expectTypeOf<Data<D['slidesWork']>>().toEqualTypeOf<DouyinReturnTypeMap['slidesWork']>()
    expectTypeOf<Data<D['textWork']>>().toEqualTypeOf<DouyinReturnTypeMap['textWork']>()
  })
  it('评论 / 用户 / 搜索类', () => {
    expectTypeOf<Data<D['comments']>>().toEqualTypeOf<DouyinReturnTypeMap['comments']>()
    expectTypeOf<Data<D['commentReplies']>>().toEqualTypeOf<DouyinReturnTypeMap['commentReplies']>()
    expectTypeOf<Data<D['userProfile']>>().toEqualTypeOf<DouyinReturnTypeMap['userProfile']>()
    expectTypeOf<Data<D['userVideoList']>>().toEqualTypeOf<DouyinReturnTypeMap['userVideoList']>()
    expectTypeOf<Data<D['userFavoriteList']>>().toEqualTypeOf<DouyinReturnTypeMap['userFavoriteList']>()
    expectTypeOf<Data<D['userRecommendList']>>().toEqualTypeOf<DouyinReturnTypeMap['userRecommendList']>()
    expectTypeOf<Data<D['search']>>().toEqualTypeOf<DouyinReturnTypeMap['search']>()
    expectTypeOf<Data<D['suggestWords']>>().toEqualTypeOf<DouyinReturnTypeMap['suggestWords']>()
  })
  it('其他 + 例外（loginQrcode 保留本地声明）', () => {
    expectTypeOf<Data<D['musicInfo']>>().toEqualTypeOf<DouyinReturnTypeMap['musicInfo']>()
    expectTypeOf<Data<D['liveRoomInfo']>>().toEqualTypeOf<DouyinReturnTypeMap['liveRoomInfo']>()
    expectTypeOf<Data<D['emojiList']>>().toEqualTypeOf<DouyinReturnTypeMap['emojiList']>()
    expectTypeOf<Data<D['dynamicEmojiList']>>().toEqualTypeOf<DouyinReturnTypeMap['dynamicEmojiList']>()
    expectTypeOf<Data<D['danmakuList']>>().toEqualTypeOf<DouyinReturnTypeMap['danmakuList']>()
    // 例外：v6 映射为 any，保留本地最小声明
    expectTypeOf<Data<D['loginQrcode']>>().toEqualTypeOf<LoginQrcodeData>()
  })
})

describe('bilibili：27 端点 data 类型 = BilibiliReturnTypeMap 条目', () => {
  type R = typeof bilibiliRegistry
  it('视频 / 评论 / 用户类', () => {
    expectTypeOf<Data<R['videoInfo']>>().toEqualTypeOf<BilibiliReturnTypeMap['videoInfo']>()
    expectTypeOf<Data<R['videoStream']>>().toEqualTypeOf<BilibiliReturnTypeMap['videoStream']>()
    expectTypeOf<Data<R['videoDanmaku']>>().toEqualTypeOf<BilibiliReturnTypeMap['videoDanmaku']>()
    expectTypeOf<Data<R['comments']>>().toEqualTypeOf<BilibiliReturnTypeMap['comments']>()
    expectTypeOf<Data<R['commentReplies']>>().toEqualTypeOf<BilibiliReturnTypeMap['commentReplies']>()
    expectTypeOf<Data<R['userCard']>>().toEqualTypeOf<BilibiliReturnTypeMap['userCard']>()
    expectTypeOf<Data<R['userDynamicList']>>().toEqualTypeOf<BilibiliReturnTypeMap['userDynamicList']>()
    expectTypeOf<Data<R['userLiveStatus']>>().toEqualTypeOf<BilibiliReturnTypeMap['userLiveStatus']>()
    expectTypeOf<Data<R['userSpaceInfo']>>().toEqualTypeOf<BilibiliReturnTypeMap['userSpaceInfo']>()
    expectTypeOf<Data<R['uploaderTotalViews']>>().toEqualTypeOf<BilibiliReturnTypeMap['uploaderTotalViews']>()
  })
  it('动态 / 番剧 / 直播 / 专栏类', () => {
    expectTypeOf<Data<R['dynamicDetail']>>().toEqualTypeOf<BilibiliReturnTypeMap['dynamicDetail']>()
    expectTypeOf<Data<R['bangumiInfo']>>().toEqualTypeOf<BilibiliReturnTypeMap['bangumiInfo']>()
    expectTypeOf<Data<R['bangumiStream']>>().toEqualTypeOf<BilibiliReturnTypeMap['bangumiStream']>()
    expectTypeOf<Data<R['liveRoomInfo']>>().toEqualTypeOf<BilibiliReturnTypeMap['liveRoomInfo']>()
    expectTypeOf<Data<R['liveRoomInit']>>().toEqualTypeOf<BilibiliReturnTypeMap['liveRoomInit']>()
    expectTypeOf<Data<R['articleContent']>>().toEqualTypeOf<BilibiliReturnTypeMap['articleContent']>()
    expectTypeOf<Data<R['articleCards']>>().toEqualTypeOf<BilibiliReturnTypeMap['articleCards']>()
    expectTypeOf<Data<R['articleInfo']>>().toEqualTypeOf<BilibiliReturnTypeMap['articleInfo']>()
    expectTypeOf<Data<R['articleListInfo']>>().toEqualTypeOf<BilibiliReturnTypeMap['articleListInfo']>()
  })
  it('登录 / 验证码 / 工具类 + 例外（4 个保留本地声明）', () => {
    expectTypeOf<Data<R['loginQrcode']>>().toEqualTypeOf<BilibiliReturnTypeMap['loginQrcode']>()
    expectTypeOf<Data<R['captchaFromVoucher']>>().toEqualTypeOf<BilibiliReturnTypeMap['captchaFromVoucher']>()
    expectTypeOf<Data<R['validateCaptcha']>>().toEqualTypeOf<BilibiliReturnTypeMap['validateCaptcha']>()
    expectTypeOf<Data<R['emojiList']>>().toEqualTypeOf<BilibiliReturnTypeMap['emojiList']>()
    // 例外
    expectTypeOf<Data<R['loginStatus']>>().toEqualTypeOf<LoginStatusData>()
    expectTypeOf<Data<R['qrcodeStatus']>>().toEqualTypeOf<QrcodeStatusData>()
    expectTypeOf<Data<R['avToBv']>>().toEqualTypeOf<AvToBvData>()
    expectTypeOf<Data<R['bvToAv']>>().toEqualTypeOf<BvToAvData>()
  })
})

describe('kuaishou：8 端点 data 类型 = KuaishouReturnTypeMap 条目', () => {
  type R = typeof kuaishouRegistry
  it('全部 8 个', () => {
    expectTypeOf<Data<R['videoWork']>>().toEqualTypeOf<KuaishouReturnTypeMap['videoWork']>()
    // 免签兜底与完整版共用 KsOneWork：那份类型里只有完整版才有的键本来就是可选的
    expectTypeOf<Data<R['videoWorkSimple']>>().toEqualTypeOf<KuaishouReturnTypeMap['videoWorkSimple']>()
    expectTypeOf<Data<R['comments']>>().toEqualTypeOf<KuaishouReturnTypeMap['comments']>()
    expectTypeOf<Data<R['danmaku']>>().toEqualTypeOf<KuaishouReturnTypeMap['danmaku']>()
    expectTypeOf<Data<R['emojiList']>>().toEqualTypeOf<KuaishouReturnTypeMap['emojiList']>()
    expectTypeOf<Data<R['userProfile']>>().toEqualTypeOf<KuaishouReturnTypeMap['userProfile']>()
    expectTypeOf<Data<R['userWorkList']>>().toEqualTypeOf<KuaishouReturnTypeMap['userWorkList']>()
    expectTypeOf<Data<R['liveRoomInfo']>>().toEqualTypeOf<KuaishouReturnTypeMap['liveRoomInfo']>()
  })
})

describe('xiaohongshu：7 端点 data 类型（5 个 = map 条目，2 个例外）', () => {
  type R = typeof xiaohongshuRegistry
  it('5 个复用 map 条目', () => {
    expectTypeOf<Data<R['homeFeed']>>().toEqualTypeOf<XiaohongshuReturnTypeMap['homeFeed']>()
    expectTypeOf<Data<R['noteDetail']>>().toEqualTypeOf<XiaohongshuReturnTypeMap['noteDetail']>()
    expectTypeOf<Data<R['noteComments']>>().toEqualTypeOf<XiaohongshuReturnTypeMap['noteComments']>()
    expectTypeOf<Data<R['emojiList']>>().toEqualTypeOf<XiaohongshuReturnTypeMap['emojiList']>()
    expectTypeOf<Data<R['searchNotes']>>().toEqualTypeOf<XiaohongshuReturnTypeMap['searchNotes']>()
  })
  it('例外：userNoteList / userProfile 保留本地声明', () => {
    expectTypeOf<Data<R['userNoteList']>>().toEqualTypeOf<UserNoteListData>()
    expectTypeOf<Data<R['userProfile']>>().toEqualTypeOf<XhsUserProfileData>()
  })
})
