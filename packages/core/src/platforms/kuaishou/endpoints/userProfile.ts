import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { RawResponse } from '../../../contracts/request'
import { kuaishouApiUrls } from '../api'
import {
  createDerivedFollowButtonState,
  createDerivedFollowState,
  createEmptyUserProfileResult,
  isErrorDetailLike,
  isRecord,
  mapLiveDetailToUserProfileLiveInfo,
  mergeKuaishouLiveAuthor,
  resolveKuaishouLiveDetailData,
  resolveUserProfileTabData
} from '../assemble'

/**
 * 获取用户主页（**多请求聚合**，12 个并发 + `partial: 'tolerate'`）。
 *
 * v6 用 `Promise.all` 一次打 12 个 `live_api` 接口（userinfo / sensitive /
 * profile public+private+liked+playback / interestlist / interestmask /
 * category config+data+classify / livedetail），部分失败时各字段回退
 * 到空值 —— 这正是「部分失败」语义，v7 声明为 `partial: 'tolerate'`：
 * build 返回 12 个请求并发发出，失败分片在 normalize 里留空，
 * **全部分片都失败时仍返回失败信封**（execute 的新语义）。
 *
 * `attempts === 12` 是阶段门 2 的专项判据（12 个并发请求都要真实发出）。
 */
export const userProfile = defineEndpoint({
  name: 'kuaishou.userProfile',
  route: '/fetch_user_profile',
  params: zod.object({
    principalId: zod.string().min(1, { error: 'principalId 不能为空' })
  }),
  build: (p) => {
    const principalId = p.principalId
    const refererPath = `profile/${encodeURIComponent(principalId)}`
    const live = (url: string, signPath?: string) => ({
      method: 'POST' as const,
      url,
      headers: { 'Content-Type': 'application/json', Referer: `https://www.kuaishou.com/${refererPath}` },
      ...(signPath ? { signPath } : {})
    })

    return [
      // 12 个并发请求（顺序与 v6 Promise.all 一致）
      live(kuaishouApiUrls.userInfoById({ principalId }).url, '/rest/k/user/info'),
      live(kuaishouApiUrls.userSensitiveInfo({ principalId }).url, '/rest/k/user/info/sensitive'),
      live(kuaishouApiUrls.profilePublic({ principalId }).url, '/rest/k/feed/profile'),
      live(kuaishouApiUrls.profilePrivate({ principalId }).url),
      live(kuaishouApiUrls.profileLiked({ principalId }).url),
      live(kuaishouApiUrls.playbackList({ principalId }).url),
      live(kuaishouApiUrls.profileInterestList({ principalId }).url),
      live(kuaishouApiUrls.interestMaskList().url),
      live(kuaishouApiUrls.categoryConfig().url),
      live(kuaishouApiUrls.categoryData().url),
      live(kuaishouApiUrls.categoryClassify().url),
      live(kuaishouApiUrls.liveDetail({ principalId }).url)
    ]
  },
  partial: 'tolerate',
  normalize: (decoded, params) => {
    // decoded 是 12 个分片的数组（tolerate 下失败分片为 undefined）
    const [userInfoRes, sensitiveRes, publicRes, privateRes, likedRes, playbackRes, interestListRes, interestMaskRes, categoryConfigRes, categoryDataRes, categoryClassifyRes, liveDetailRes] =
      decoded as Array<RawResponse['body'] | undefined>

    const principalId = params.principalId
    const userProfile = createEmptyUserProfileResult(principalId)

    const userInfo = isRecord((userInfoRes as { data?: unknown } | undefined)?.data)
      ? ((userInfoRes as { data: { userInfo?: unknown } }).data.userInfo as Record<string, unknown> | undefined)
      : undefined
    const sensitiveInfo = isRecord((sensitiveRes as { data?: unknown } | undefined)?.data)
      ? ((sensitiveRes as { data: { sensitiveUserInfo?: unknown } }).data.sensitiveUserInfo as Record<string, unknown> | null)
      : null
    const liveDetailData = resolveKuaishouLiveDetailData(liveDetailRes)
    const normalizedAuthor = mergeKuaishouLiveAuthor(liveDetailData?.author, userInfo, sensitiveInfo ?? undefined)

    const nextPublicData = resolveUserProfileTabData(publicRes, userProfile.profile.publicData)
    const nextPrivateData = resolveUserProfileTabData(privateRes, userProfile.profile.privateData)
    const nextLikedData = resolveUserProfileTabData(likedRes, userProfile.profile.likedData)
    const nextPlaybackData = resolveUserProfileTabData(playbackRes, userProfile.profile.playbackData)

    if (!nextPublicData.live && liveDetailData) {
      nextPublicData.live = mapLiveDetailToUserProfileLiveInfo(liveDetailData, normalizedAuthor)
    }

    const nextInterestList =
      !isErrorDetailLike(interestListRes) && Array.isArray((interestListRes as { data?: unknown } | undefined)?.data)
        ? ((interestListRes as { data: unknown }).data as unknown[])
        : userProfile.profile.interestList
    const nextInterestMask =
      !isErrorDetailLike(interestMaskRes) && Array.isArray((interestMaskRes as { data?: unknown } | undefined)?.data)
        ? ((interestMaskRes as { data: unknown }).data as unknown[])
        : userProfile.interestMask

    return {
      ...userProfile,
      principalId,
      author: {
        ...userProfile.author,
        principalId,
        userInfo: normalizedAuthor,
        sensitiveInfo,
        followInfo: {},
        banStateMap: userProfile.author.banStateMap
      },
      profile: {
        ...userProfile.profile,
        pageSize: 12,
        showPlayback: Boolean(
          ((nextPublicData as Record<string, unknown>).showPlayback as boolean | undefined) ??
            ((nextPlaybackData as Record<string, unknown>).list as unknown[] | undefined)?.length! > 0
        ),
        publicData: nextPublicData,
        privateData: nextPrivateData,
        likedData: nextLikedData,
        playbackData: nextPlaybackData,
        interestList: nextInterestList,
        currentProduct: {}
      },
      follow: createDerivedFollowState(userInfo, sensitiveInfo ?? undefined),
      followButton: createDerivedFollowButtonState(userInfo, sensitiveInfo ?? undefined),
      interestMask: nextInterestMask,
      categoryMask: {
        config:
          !isErrorDetailLike(categoryConfigRes) && Array.isArray((categoryConfigRes as { data?: unknown } | undefined)?.data)
            ? ((categoryConfigRes as { data: unknown }).data as unknown[])
            : userProfile.categoryMask.config,
        list:
          !isErrorDetailLike(categoryClassifyRes) && Array.isArray((categoryClassifyRes as { data?: { list?: unknown } } | undefined)?.data?.list)
            ? ((categoryClassifyRes as { data: { list: unknown } }).data.list as unknown[])
            : userProfile.categoryMask.list,
        hotList:
          !isErrorDetailLike(categoryDataRes) && Array.isArray((categoryDataRes as { data?: { list?: unknown } } | undefined)?.data?.list)
            ? ((categoryDataRes as { data: { list: unknown } }).data.list as unknown[])
            : userProfile.categoryMask.hotList,
        hasMore: Boolean((categoryClassifyRes as { data?: { hasMore?: unknown } } | undefined)?.data?.hasMore),
        hasMoreHot: Boolean((categoryDataRes as { data?: { hasMore?: unknown } } | undefined)?.data?.hasMore)
      }
    }
  },
  response: type<UserProfileData>()
})

/** 用户主页响应（与 v6 `KsUserProfile` 形状一致的最小声明） */
export interface UserProfileData {
  principalId: string
  author: {
    principalId: string
    userInfo: Record<string, unknown>
    sensitiveInfo: unknown
    followInfo: Record<string, unknown>
    banStateMap: Record<string, string>
  }
  profile: {
    currentTab: string
    pageSize: number
    showPlayback: boolean
    publicData: Record<string, unknown>
    privateData: Record<string, unknown>
    likedData: Record<string, unknown>
    playbackData: Record<string, unknown>
    interestList: unknown[]
    currentProduct: Record<string, unknown>
  }
  follow: unknown
  followButton: unknown
  interestMask: unknown[]
  categoryMask: Record<string, unknown>
}
