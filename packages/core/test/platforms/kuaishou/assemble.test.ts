import {
  createDerivedFollowButtonState,
  createDerivedFollowState,
  createEmptyLiveRoomInfoResult,
  createEmptyUserListTabData,
  createEmptyUserProfileResult,
  createEmptyUserPublicTabData,
  createEmptyUserWorkListResult,
  dedupeLiveRoomPlayList,
  hasPopulatedRecord,
  isErrorDetailLike,
  isRecord,
  mapLiveDetailToLiveRoomPlayItem,
  mapLiveDetailToUserProfileLiveInfo,
  mapRecoItemToLiveRoomPlayItem,
  mergeKuaishouLiveAuthor,
  normalizeKuaishouLiveAuthor,
  pickFirstNonEmptyString,
  resolveKuaishouLiveDetailData,
  resolveKuaishouLiveDetailRecommendList,
  resolveKuaishouLiveDetailWebsocketMeta,
  resolveKuaishouUserWorkList,
  resolveUserProfileTabData
} from 'amagi/platforms/kuaishou/assemble'
/**
 * platforms/kuaishou/assemble 的契约。
 *
 * 判据：**每个 helper 至少 1 条单测（v6 里它们零测试）**。
 * 这些函数决定快手对外返回的数据结构，v6 把它们堆在 getdata.ts 里无人敢动；
 * v7 搬进 assemble/ 并逐个锁行为，搬迁后 `platform/kuaishou/getdata.ts`
 * 只剩 dispatch（阶段 6 删 v6 时整文件消失）。
 */
import { describe, expect, it } from 'vitest'

describe('判断 helper', () => {
  it('isErrorDetailLike：带 amagiError 键才算 ErrorDetail', () => {
    expect(isErrorDetailLike({ amagiError: {} })).toBe(true)
    expect(isErrorDetailLike({ code: 0 })).toBe(false)
    expect(isErrorDetailLike(null)).toBe(false)
  })

  it('isRecord：对象字面量 true，数组/null 为 false', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
  })

  it('hasPopulatedRecord：非空对象 true，空对象 false', () => {
    expect(hasPopulatedRecord({ a: 1 })).toBe(true)
    expect(hasPopulatedRecord({})).toBe(false)
    expect(hasPopulatedRecord(null)).toBe(false)
  })

  it('pickFirstNonEmptyString：取首个非空字符串，全空返回空串', () => {
    expect(pickFirstNonEmptyString('', undefined, 'a', 'b')).toBe('a')
    expect(pickFirstNonEmptyString('', null, '')).toBe('')
  })
})

describe('createEmpty*', () => {
  it('createEmptyUserListTabData：空列表与游标', () => {
    expect(createEmptyUserListTabData()).toEqual({ list: [], pcursor: '' })
  })

  it('createEmptyUserPublicTabData：含 live 字段', () => {
    expect(createEmptyUserPublicTabData()).toEqual({ live: null, list: [], pcursor: '' })
  })

  it('createEmptyUserWorkListResult：principalId 传入，result 0', () => {
    expect(createEmptyUserWorkListResult('u1')).toEqual({
      principalId: 'u1',
      list: [],
      pcursor: '',
      hasMore: false,
      result: 0
    })
  })

  it('createEmptyUserProfileResult：返回稳定最小骨架（author/profile 就位）', () => {
    const empty = createEmptyUserProfileResult('u1')
    expect(empty.principalId).toBe('u1')
    expect(empty.author.userInfo.id).toBe('')
    expect(empty.profile.currentTab).toBe('public')
    expect(empty.follow).toBeNull()
    expect(empty.categoryMask.hasMore).toBe(false)
  })

  it('createEmptyLiveRoomInfoResult：principalId 传入，current 为 null', () => {
    const empty = createEmptyLiveRoomInfoResult('u1')
    expect(empty.principalId).toBe('u1')
    expect(empty.current).toBeNull()
    expect(empty.playList).toEqual([])
    expect(empty.emoji.giftList).toEqual([])
  })
})

describe('createDerived*', () => {
  it('createDerivedFollowState：有 followStatus 时派生，无则 null', () => {
    expect(createDerivedFollowState({ followStatus: 'FOLLOWING', id: 'u1' })).toEqual({
      currentFollowStatus: 'FOLLOWING',
      needToFollow: false,
      authorId: 'u1',
      data: 0
    })
    expect(createDerivedFollowState({})).toBeNull()
  })

  it('createDerivedFollowButtonState：有 followStatus 时派生，无则 null', () => {
    expect(createDerivedFollowButtonState({ followStatus: 'FOLLOWING' })).toEqual({ followStatus: 'FOLLOWING' })
    expect(createDerivedFollowButtonState({})).toBeNull()
  })
})

describe('resolve*', () => {
  it('resolveUserProfileTabData：ErrorDetail / result 非 1 / list 非数组时回退 fallback', () => {
    const fallback = { list: [], pcursor: 'c0' }
    expect(resolveUserProfileTabData({ amagiError: {} }, fallback)).toBe(fallback)
    expect(resolveUserProfileTabData({ data: { result: 2 } }, fallback)).toBe(fallback)
    expect(resolveUserProfileTabData({ data: { result: 1, list: 'x' } }, fallback)).toBe(fallback)
  })

  it('resolveUserProfileTabData：result=1 时归一化 list / pcursor / live', () => {
    const fallback = { list: [], pcursor: '' }
    const resolved = resolveUserProfileTabData(
      { data: { result: 1, list: [1], pcursor: 'c1', live: { id: 'L1' } } },
      fallback
    )
    expect(resolved.list).toEqual([1])
    expect(resolved.pcursor).toBe('c1')
    expect(resolved.live).toEqual({ id: 'L1' })
  })

  it('resolveKuaishouUserWorkList：解析分页结果，hasMore 由 hasMore/pcursor 决定', () => {
    expect(resolveKuaishouUserWorkList('u1', { amagiError: {} })).toMatchObject({ principalId: 'u1', list: [], hasMore: false })
    expect(resolveKuaishouUserWorkList('u1', { data: { list: [1], pcursor: 'c1', hasMore: true, result: 1 } })).toEqual({
      principalId: 'u1',
      list: [1],
      pcursor: 'c1',
      hasMore: true,
      result: 1
    })
  })

  it('resolveKuaishouLiveDetailData：result=1 返回 data，否则 null', () => {
    expect(resolveKuaishouLiveDetailData({ data: { result: 1, liveStream: {} } })).toEqual({ result: 1, liveStream: {} })
    expect(resolveKuaishouLiveDetailData({ data: { result: 2 } })).toBeNull()
    expect(resolveKuaishouLiveDetailData({ amagiError: {} })).toBeNull()
  })

  it('resolveKuaishouLiveDetailWebsocketMeta：字段缺失补默认值', () => {
    expect(resolveKuaishouLiveDetailWebsocketMeta(null)).toEqual({ websocketUrls: [], token: '' })
    expect(resolveKuaishouLiveDetailWebsocketMeta({ websocketInfo: { websocketUrls: ['w1'], token: 't1' } })).toEqual({
      websocketUrls: ['w1'],
      token: 't1'
    })
  })

  it('resolveKuaishouLiveDetailRecommendList：非数组回退空数组', () => {
    expect(resolveKuaishouLiveDetailRecommendList(null)).toEqual([])
    expect(resolveKuaishouLiveDetailRecommendList({ recommendList: [{ id: 1 }] })).toEqual([{ id: 1 }])
  })
})

describe('normalizeKuaishouLiveAuthor / mergeKuaishouLiveAuthor', () => {
  it('normalizeKuaishouLiveAuthor：多字段名回退（id/name/avatar/followStatus）', () => {
    const author = normalizeKuaishouLiveAuthor({ kwaiId: 'k1', user_name: '昵称', headurl: 'a.png', following: true })
    expect(author.id).toBe('k1')
    expect(author.name).toBe('昵称')
    expect(author.avatar).toBe('a.png')
    expect(author.followStatus).toBe('FOLLOWING')
  })

  it('normalizeKuaishouLiveAuthor：空对象返回全默认', () => {
    const author = normalizeKuaishouLiveAuthor()
    expect(author.id).toBe('')
    expect(author.followStatus).toBe('UN_FOLLOWED')
    expect(author.bannedStatus.banned).toBe(false)
  })

  it('mergeKuaishouLiveAuthor：userInfo 补强 fallback，字段级回退', () => {
    const merged = mergeKuaishouLiveAuthor(
      { name: 'fallback' },
      { followStatus: 'FOLLOWING', counts: { c: 1 } },
      { constellation: '天蝎座' }
    )
    expect(merged.name).toBe('fallback')
    expect(merged.followStatus).toBe('FOLLOWING')
    expect(merged.counts).toEqual({ c: 1 })
    expect(merged.constellation).toBe('天蝎座')
  })
})

describe('map*', () => {
  it('mapLiveDetailToLiveRoomPlayItem：映射 liveStream / author / gameInfo / config', () => {
    const item = mapLiveDetailToLiveRoomPlayItem(
      {
        result: 1,
        liveStream: { id: 'L1', poster: 'p.png', playUrls: { a: 1 } },
        config: { caption: '标题', hlsPlayUrl: 'h1' },
        gameInfo: { id: 42, name: '游戏' }
      },
      normalizeKuaishouLiveAuthor({ id: 'a1', name: '主播' })
    )
    expect(item.liveStream.id).toBe('L1')
    expect(item.author.name).toBe('主播')
    expect(item.gameInfo.id).toBe('42')
    expect(item.config.liveStreamId).toBe('L1')
    expect(item.isLiving).toBe(true)
  })

  it('mapLiveDetailToUserProfileLiveInfo：映射 publicData.live（followed 由作者状态决定）', () => {
    const live = mapLiveDetailToUserProfileLiveInfo(
      { liveStream: { id: 'L1' }, config: { coverUrl: 'c.png' } },
      normalizeKuaishouLiveAuthor({ followStatus: 'FOLLOWING' })
    )
    expect(live.id).toBe('L1')
    expect(live.poster).toBe('c.png')
    expect(live.followed).toBe(true)
    expect(live.type).toBe('live')
  })

  it('mapRecoItemToLiveRoomPlayItem：映射推荐房间项', () => {
    const item = mapRecoItemToLiveRoomPlayItem({ liveStream: { id: 'R1' }, author: { name: '推荐' } })
    expect(item.liveStream.id).toBe('R1')
    expect(item.author.name).toBe('推荐')
    expect(item.config.liveStreamId).toBe('R1')
  })
})

describe('dedupeLiveRoomPlayList', () => {
  it('按 liveStreamId 去重，null 跳过', () => {
    const deduped = dedupeLiveRoomPlayList([
      mapRecoItemToLiveRoomPlayItem({ liveStream: { id: 'R1' } }),
      null,
      mapRecoItemToLiveRoomPlayItem({ liveStream: { id: 'R1' } }),
      mapRecoItemToLiveRoomPlayItem({ liveStream: { id: 'R2' } })
    ])
    expect(deduped.map((i) => i.liveStream.id)).toEqual(['R1', 'R2'])
  })
})