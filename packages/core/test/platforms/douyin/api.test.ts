import { createDouyinApiUrls as v6Create } from 'amagi/platform/douyin/API'
import { createDouyinApiUrls as v7Create } from 'amagi/platforms/douyin/api'
/**
 * platforms/douyin/api 的契约。
 *
 * 判据：**v6 的 `api-urls.test.ts` 快照一字不变**。与小红书/快手同一策略：
 * import v6 的 `createDouyinApiUrls` 逐项对照 —— 抖音 URL 里含随机
 * `msToken` / `verifyFp` / `fp`，对照前把这三个参数替换成占位符
 * （与 v6 测试的 `normalizeUrl` 同一处理）。
 */
import { describe, expect, it } from 'vitest'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const VOLATILE = ['msToken', 'verifyFp', 'fp']

/** 与 v6 测试同款归一化：把易变参数替换成占位符 */
const normalize = (url: string): string => {
  const parsed = new URL(url)
  for (const key of VOLATILE) {
    if (parsed.searchParams.has(key)) parsed.searchParams.set(key, '<volatile>')
  }
  return decodeURIComponent(parsed.toString())
}

/** 对照：v7 输出与 v6 归一化后逐项相等 */
const same = (v7: () => string, v6: () => string): void => {
  expect(normalize(v7())).toBe(normalize(v6()))
}

describe('platforms/douyin/api 与 v6 逐项对照', () => {
  const v7 = v7Create(UA)
  const v6 = v6Create(UA)

  it('getWorkDetail', () => {
    same(() => v7.getWorkDetail({ aweme_id: '7123456789012345678' }), () => v6.getWorkDetail({ aweme_id: '7123456789012345678' }))
  })

  it('getComments（带 cursor/number）', () => {
    same(
      () => v7.getComments({ aweme_id: '7123', number: 20, cursor: 0 }),
      () => v6.getComments({ aweme_id: '7123', number: 20, cursor: 0 } as never)
    )
  })

  it('getUserProfile', () => {
    same(() => v7.getUserProfile({ sec_uid: 'MS4wLjABAAAAx' }), () => v6.getUserProfile({ sec_uid: 'MS4wLjABAAAAx' }))
  })

  it('getEmojiList', () => {
    same(() => v7.getEmojiList(), () => v6.getEmojiList())
  })

  it('getCommentReplies', () => {
    same(
      () => v7.getCommentReplies({ aweme_id: 'a1', comment_id: 'c1', number: 5, cursor: 0 }),
      () => v6.getCommentReplies({ aweme_id: 'a1', comment_id: 'c1', number: 5, cursor: 0 } as never)
    )
  })

  it('getUserVideoList / getUserFavoriteList / getUserRecommendList', () => {
    const p = { sec_uid: 'MS4wLjABAAAAx', number: 18 }
    same(() => v7.getUserVideoList(p), () => v6.getUserVideoList(p))
    same(() => v7.getUserFavoriteList(p), () => v6.getUserFavoriteList(p))
    same(() => v7.getUserRecommendList(p), () => v6.getUserRecommendList(p))
  })

  it('getSuggestWords', () => {
    same(() => v7.getSuggestWords({ query: '美食' }), () => v6.getSuggestWords({ query: '美食' }))
  })

  it('search（带 search_id）', () => {
    same(
      () => v7.search({ keyword: '美食', search_id: 'sid-1', number: 10, type: 'general' }),
      () => v6.search({ keyword: '美食', search_id: 'sid-1', number: 10, type: 'general' } as never)
    )
  })

  it('getMusicInfo', () => {
    same(() => v7.getMusicInfo({ music_id: 'm1' }), () => v6.getMusicInfo({ music_id: 'm1' }))
  })

  it('getLiveRoomInfo', () => {
    same(() => v7.getLiveRoomInfo({ web_rid: 'r1', room_id: 'x' }), () => v6.getLiveRoomInfo({ web_rid: 'r1', room_id: 'x' } as never))
  })

  it('getLoginQrcode', () => {
    same(
      () => v7.getLoginQrcode({ type: 'qrcode_login', verify_fp: 'fp1' }),
      () => v6.getLoginQrcode({ type: 'qrcode_login', verify_fp: 'fp1' } as never)
    )
  })

  it('getDanmakuList', () => {
    same(
      () => v7.getDanmakuList({ aweme_id: 'a1', start_time: 1, end_time: 2, duration: 3 }),
      () => v6.getDanmakuList({ aweme_id: 'a1', start_time: 1, end_time: 2, duration: 3 } as never)
    )
  })
})

describe('platforms/douyin/api 结构', () => {
  it('UA 里的浏览器版本被写进查询参数', () => {
    const query = new URL(v7Create(UA).getWorkDetail({ aweme_id: '1' })).searchParams
    expect(query.get('browser_version')).toBe('125.0.0.0')
  })

  it('不同 UA 生成不同的 browser_version', () => {
    const other = v7Create(UA.replace('125', '131'))
    const query = new URL(other.getWorkDetail({ aweme_id: '1' })).searchParams
    expect(query.get('browser_version')).toBe('131.0.0.0')
  })

  it('省略 UA 时默认也能工作', () => {
    expect(() => v7Create().getWorkDetail({ aweme_id: '1' })).not.toThrow()
  })

  it('固定的反爬参数始终存在', () => {
    const query = new URL(v7Create(UA).getWorkDetail({ aweme_id: '1' })).searchParams
    for (const key of ['device_platform', 'aid', 'channel', 'pc_client_type', 'version_code', 'webid']) {
      expect(query.get(key), key + ' 缺失').toBeTruthy()
    }
  })
})