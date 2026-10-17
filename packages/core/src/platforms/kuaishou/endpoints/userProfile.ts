import zod from 'zod'

import type { RawResponse } from '../../../contracts/request'
import { kuaishouApiUrls, type KuaishouLiveApiRequest } from '../api'
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
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, kuaishouLiveApiJudge, type } from './define'

/**
 * 获取用户主页（**多请求聚合**，12 个并发 + `partial: 'tolerate'`）。
 *
 * 一次打 12 个 `live_api` 接口（userinfo / sensitive /
 * profile public+private+liked+playback / interestlist / interestmask /
 * category config+data+classify / livedetail），部分失败时各字段回退
 * 到空值 —— 这正是「部分失败」语义：build 返回 12 个请求并发发出，
 * 失败分片在 normalize 里留空，**全部分片都失败时仍返回失败信封**。
 *
 * 判定走 {@link kuaishouLiveApiJudge}：live_api 的状态位嵌在 `data.result`，平台
 * 默认 judge 只看顶层。不换的话被拒的分片会判成「成功」、带着空 `data` 进
 * normalize，结果与「这人真没有这项」不可区分。换了之后这类分片落进失败分片那条
 * 既有路径（normalize 里本来就按缺值兜底），调用方也能从 meta 看出哪几片没拿到。
 * 2026-10-08 实测同一用户：`userinfo/byid` 回 `result=1`、`profile/public` 回
 * `result=2`，所以这是**部分**失败，不会把整条打成失败信封。
 */
export const userProfile = defineKuaishouEndpoint({
  name: 'kuaishou.userProfile',
  route: '/fetch_user_profile',
  doc: {
    summary: '用户主页聚合信息',
    description: '取用户主页聚合信息（资料、作品列表、直播间等）。部分数据取不到时留空，不整体失败。'
  },
  params: zod.object({
    principalId: zod.string().min(1, { error: 'principalId 不能为空' }).describe('用户 ID')
  }),
  sign: [hxfalcon()],
  build: (p) => {
    const principalId = p.principalId
    const refererPath = `profile/${encodeURIComponent(principalId)}`
    // 方法和 signPath 一律从 API 描述对象里取，别在这儿另写一份。
    //
    // method：前端 bundle 里这些 live_api 路径走的是 GET 包装器（模块 34372 的 `Jt`
    // → `axios.get`），写死 POST 会整排 405。2026-10-08 实测同一条
    // `baseuser/userinfo/byid`：POST 回 405 `Method Not Allowed`，GET 回 200 带完整
    // `userInfo` —— 这条是真故障，不是风格问题。
    //
    // signPath：缺了不报错，`resolveKuaishouHxfalconSignPath` 会拿 `/live_api/...`
    // 请求路径去签。**但这几条服务端校验宽松，签错也放行** —— 2026-10-08 A/B 实测
    // `profile/public`、`playback/list`、`profile/interestlist` 三条，带正确 signPath
    // 与完全不传的输出逐字节一致，全程没出现过签名失败码 `result=50`。所以这里透传
    // signPath 是为了和前端 bundle 的 `url → realUrl` 表对齐（将来平台收紧校验时才
    // 不用回头找），不是在修一个当前能观测到的故障。
    const live = ({ method, url, signPath }: KuaishouLiveApiRequest) => ({
      method,
      url,
      headers: { Referer: `https://www.kuaishou.com/${refererPath}` },
      ...(signPath ? { signPath } : {})
    })

    return [
      // 12 个并发请求
      live(kuaishouApiUrls.userInfoById({ principalId })),
      live(kuaishouApiUrls.userSensitiveInfo({ principalId })),
      live(kuaishouApiUrls.profilePublic({ principalId })),
      live(kuaishouApiUrls.profilePrivate({ principalId })),
      live(kuaishouApiUrls.profileLiked({ principalId })),
      live(kuaishouApiUrls.playbackList({ principalId })),
      live(kuaishouApiUrls.profileInterestList({ principalId })),
      live(kuaishouApiUrls.interestMaskList()),
      live(kuaishouApiUrls.categoryConfig()),
      live(kuaishouApiUrls.categoryData()),
      live(kuaishouApiUrls.categoryClassify()),
      live(kuaishouApiUrls.liveDetail({ principalId }))
    ]
  },
  judge: kuaishouLiveApiJudge,
  partial: 'tolerate',
  normalize: (decoded, params) => {
    // decoded 是 12 个分片的数组（tolerate 下失败分片为 undefined）
    const [
      userInfoRes,
      sensitiveRes,
      publicRes,
      privateRes,
      likedRes,
      playbackRes,
      interestListRes,
      interestMaskRes,
      categoryConfigRes,
      categoryDataRes,
      categoryClassifyRes,
      liveDetailRes
    ] = decoded as Array<RawResponse['body'] | undefined>

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
          (((nextPlaybackData as Record<string, unknown>).list as unknown[] | undefined)?.length ?? 0) > 0
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
          !isErrorDetailLike(categoryClassifyRes) &&
          Array.isArray((categoryClassifyRes as { data?: { list?: unknown } } | undefined)?.data?.list)
            ? ((categoryClassifyRes as { data: { list: unknown } }).data.list as unknown[])
            : userProfile.categoryMask.list,
        hotList:
          !isErrorDetailLike(categoryDataRes) && Array.isArray((categoryDataRes as { data?: { list?: unknown } } | undefined)?.data?.list)
            ? ((categoryDataRes as { data: { list: unknown } }).data.list as unknown[])
            : userProfile.categoryMask.hotList,
        hasMore: Boolean((categoryClassifyRes as { data?: { hasMore?: unknown } } | undefined)?.data?.hasMore),
        hasMoreHot: Boolean((categoryDataRes as { data?: { hasMore?: unknown } } | undefined)?.data?.hasMore)
      }
    } as any
  },
  response: type<any>()
})
