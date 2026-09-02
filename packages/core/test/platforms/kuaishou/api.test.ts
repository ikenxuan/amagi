import { kuaishouApiUrls } from 'amagi/platform/kuaishou/API'
import { kuaishouApiUrls as v7Api } from 'amagi/platforms/kuaishou/api'
/**
 * platforms/kuaishou/api 的契约。
 *
 * 判据：**v6 的 `api-urls.test.ts` 快照一字不变**。与小红书同一策略：
 * import v6 的 `kuaishouApiUrls` 逐项 `toEqual` 对照 —— v6 快照由
 * `test/platform/api-urls.test.ts` 锁死，v7 与 v6 相等由本文件锁死。
 */
import { describe, expect, it } from 'vitest'

describe('platforms/kuaishou/api 与 v6 逐项对照', () => {
  it('videoWork（graphql POST）输出与 v6 一致', () => {
    expect(v7Api.videoWork({ photoId: 'p1' })).toEqual(kuaishouApiUrls.videoWork({ photoId: 'p1' } as never))
  })

  it('comments（graphql POST）输出与 v6 一致', () => {
    expect(v7Api.comments({ photoId: 'p1' })).toEqual(kuaishouApiUrls.comments({ photoId: 'p1' } as never))
  })

  it('emojiList（graphql POST）输出与 v6 一致', () => {
    expect(v7Api.emojiList()).toEqual(kuaishouApiUrls.emojiList())
  })

  it('userInfoById（live_api GET + signPath）输出与 v6 一致', () => {
    expect(v7Api.userInfoById({ principalId: 'u1' })).toEqual(kuaishouApiUrls.userInfoById({ principalId: 'u1' } as never))
  })

  it('userSensitiveInfo 输出与 v6 一致', () => {
    expect(v7Api.userSensitiveInfo({ principalId: 'u1' })).toEqual(kuaishouApiUrls.userSensitiveInfo({ principalId: 'u1' } as never))
  })

  it('profilePublic 输出与 v6 一致（含 count 覆盖）', () => {
    expect(v7Api.profilePublic({ principalId: 'u1' })).toEqual(kuaishouApiUrls.profilePublic({ principalId: 'u1' } as never))
    expect(v7Api.profilePublic({ principalId: 'u1', count: 5, pcursor: 'c1' })).toEqual(
      kuaishouApiUrls.profilePublic({ principalId: 'u1', count: 5, pcursor: 'c1' } as never)
    )
  })

  it('userWorkList（profilePublic 的领域化封装）输出与 v6 一致', () => {
    expect(v7Api.userWorkList({ principalId: 'u1' })).toEqual(kuaishouApiUrls.userWorkList({ principalId: 'u1' } as never))
  })

  it('profilePrivate / profileLiked 输出与 v6 一致', () => {
    expect(v7Api.profilePrivate({ principalId: 'u1' })).toEqual(kuaishouApiUrls.profilePrivate({ principalId: 'u1' } as never))
    expect(v7Api.profileLiked({ principalId: 'u1' })).toEqual(kuaishouApiUrls.profileLiked({ principalId: 'u1' } as never))
  })

  it('liveDetail（带/不带 authToken）输出与 v6 一致', () => {
    expect(v7Api.liveDetail({ principalId: 'u1' })).toEqual(kuaishouApiUrls.liveDetail({ principalId: 'u1' } as never))
    expect(v7Api.liveDetail({ principalId: 'u1' }, 'tok')).toEqual(
      kuaishouApiUrls.liveDetail({ principalId: 'u1' } as never, 'tok')
    )
  })

  it('liveReco（POST body）输出与 v6 一致', () => {
    expect(v7Api.liveReco()).toEqual(kuaishouApiUrls.liveReco())
    expect(v7Api.liveReco(42)).toEqual(kuaishouApiUrls.liveReco(42))
  })
})

describe('platforms/kuaishou/api 结构', () => {
  it('live_api 请求带 method / url / type，signPath 独立声明', () => {
    const req = v7Api.userInfoById({ principalId: 'u1' })
    expect(req).toHaveProperty('url')
    expect(req).toHaveProperty('method')
    expect(req).toHaveProperty('type')
    expect(req).toHaveProperty('signPath')
  })

  it('graphql 请求带 body（operationName / variables / query）', () => {
    const req = v7Api.videoWork({ photoId: 'p1' })
    expect(req).toHaveProperty('url')
    expect(req.body).toHaveProperty('operationName')
    expect(req.body).toHaveProperty('variables')
    expect(req.body).toHaveProperty('query')
  })
})