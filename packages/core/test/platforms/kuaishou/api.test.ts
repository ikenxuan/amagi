import { kuaishouApiUrls } from 'amagi/platform/kuaishou/API'
import { kuaishouApiUrls as v7Api } from 'amagi/platforms/kuaishou/api'
/**
 * platforms/kuaishou/api 的契约。
 *
 * 判据：**v6 的 `api-urls.test.ts` 快照一字不变**。与小红书同一策略：
 * import v6 的 `kuaishouApiUrls` 逐项 `toEqual` 对照 —— v6 快照由
 * `test/platform/api-urls.test.ts` 锁死，v7 与 v6 相等由本文件锁死。
 *
 * **两处例外**：`videoWork` 与 `comments` 已从 PC GraphQL 换到 H5 REST
 * （`c.kuaishou.com/rest/wd/*`），与 v6 **故意不同** —— GraphQL 那两条对未登录
 * 返回全 null 空壳，是 amagi 过去必须要 cookie 的根因。这两个端点的形状因此改由
 * 下面的 H5 专项用例锁死，不再与 v6 对照。其余端点仍逐项对齐 v6。
 */
import { describe, expect, it } from 'vitest'

describe('platforms/kuaishou/api 与 v6 逐项对照', () => {
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
    expect(v7Api.liveDetail({ principalId: 'u1' }, 'tok')).toEqual(kuaishouApiUrls.liveDetail({ principalId: 'u1' } as never, 'tok'))
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
    const req = v7Api.emojiList()
    expect(req).toHaveProperty('url')
    expect(req.body).toHaveProperty('operationName')
    expect(req.body).toHaveProperty('variables')
    expect(req.body).toHaveProperty('query')
  })
})

/**
 * H5 命名空间的请求形状。
 *
 * 这几条是本次迁移的核心判据，逐项都有实测代价（来源：@OduckO 的
 * kuaishou-parser，GPL-3.0-only）：body 少一个键就 `result=50` / `result=2`，
 * 参数放 query 就拿到 0 条评论。
 */
describe('H5 请求形状（photo/info、simple/info、comment/list）', () => {
  it('photo/info：POST + 14 个 body 键一个不少', () => {
    const req = v7Api.videoWork({ photoId: 'p1' })

    expect(req.url).toBe('https://c.kuaishou.com/rest/wd/photo/info?kpn=NEBULA&captchaToken=')
    expect(req.method).toBe('POST')
    expect(req.requiresSign).toBe(true)
    expect(req.signPath).toBe('/rest/wd/photo/info')
    expect(req.referer).toBe('https://c.kuaishou.com/fw/photo/p1')
    expect(Object.keys(req.body).sort()).toEqual(
      [
        'efid',
        'env',
        'fid',
        'h5Domain',
        'isLongVideo',
        'kpn',
        'photoId',
        'shareChannel',
        'shareId',
        'shareMethod',
        'shareObjectId',
        'shareResourceType',
        'shareToken',
        'subBiz'
      ].sort()
    )
    // 缺值填空串而不是省略键 —— 省略会被当成非法请求
    expect(req.body).toMatchObject({
      fid: '',
      shareChannel: '',
      kpn: 'NEBULA',
      env: 'SHARE_VIEWER_ENV_TX_TRICK',
      h5Domain: 'c.kuaishou.com',
      photoId: 'p1',
      isLongVideo: false
    })
  })

  it('photo/info：share 系列给了值就照传（来自短链展开后的 query）', () => {
    const req = v7Api.videoWork({ photoId: 'p1', shareChannel: 'cc-value', shareId: 's1' })
    expect(req.body).toMatchObject({ shareChannel: 'cc-value', shareId: 's1' })
  })

  it('simple/info：免签、body 只有 photoId', () => {
    const req = v7Api.videoWorkSimple({ photoId: 'p1' })
    expect(req.url).toBe('https://c.kuaishou.com/rest/wd/ugH5App/photo/simple/info')
    expect(req.requiresSign).toBe(false)
    expect(req.body).toEqual({ photoId: 'p1' })
  })

  it('comment/list：参数在 body 而不是 query（放 query 会 0 条）', () => {
    const req = v7Api.comments({ photoId: 'p1', pcursor: 'c2' })
    expect(new URL(req.url).search).toBe('')
    expect(req.body).toEqual({ photoId: 'p1', pcursor: 'c2' })
    expect(req.signPath).toBe('/rest/wd/photo/comment/list')
  })

  it('comment/list：不传 pcursor 时补空串（键必须存在）', () => {
    expect(v7Api.comments({ photoId: 'p1' }).body).toEqual({ photoId: 'p1', pcursor: '' })
  })
})

/**
 * 弹幕构造器的形状。
 *
 * query 是逆向产物，**改一个字就废**，所以这里把 523 个字符整条写死 ——
 * 缩进、换行、字段顺序任一处变了都会红。变量名同理：`positionFromInclude` /
 * `positionToExclude` 少一个就回 `result: 21`。
 */
describe('visionDanmaku 请求形状（完全免鉴权）', () => {
  const DANMAKU_QUERY =
    'query visionDanmaku($photoId: String, $positionFromInclude: Long, $positionToExclude: Long, $pcursor: String, $timestamp: Long) {\n  visionDanmaku(photoId: $photoId, positionFromInclude: $positionFromInclude, positionToExclude: $positionToExclude, pcursor: $pcursor, timestamp: $timestamp) {\n    result\n    positionFromInclude\n    positionToExclude\n    pcursor\n    danmakus {\n      id\n      body\n      position\n      userId\n      isLiked\n      likeCount\n      quality\n      isShow\n      __typename\n    }\n    __typename\n  }\n}'

  it('走 PC graphql，operationName / variables / query 一字不差', () => {
    const req = v7Api.danmaku({ photoId: 'p1', positionFromInclude: 0, positionToExclude: 59_999, timestamp: 1_700_000_000_000 })

    expect(req.type).toBe('visionDanmaku')
    expect(req.url).toBe('https://www.kuaishou.com/graphql')
    expect(req.body).toEqual({
      operationName: 'visionDanmaku',
      variables: {
        photoId: 'p1',
        positionFromInclude: 0,
        positionToExclude: 59_999,
        pcursor: '',
        timestamp: 1_700_000_000_000
      },
      query: DANMAKU_QUERY
    })
    // 免鉴权：既没有 signPath 也没有 requiresSign（与 emojiList 同类）
    expect(req).not.toHaveProperty('signPath')
    expect(req).not.toHaveProperty('requiresSign')
  })

  it('timestamp 缺省补 Date.now()，pcursor 缺省补空串（键必须存在）', () => {
    const before = Date.now()
    const vars = v7Api.danmaku({ photoId: 'p1', positionFromInclude: 0, positionToExclude: 1 }).body.variables as {
      pcursor: string
      timestamp: number
    }

    expect(vars.pcursor).toBe('')
    expect(vars.timestamp).toBeGreaterThanOrEqual(before)
  })
})
