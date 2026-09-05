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

  it('getWorkDetail —— 除边缘主机与视频页两个参数外与 v6 一致', () => {
    const id = '7123456789012345678'
    const v7Url = v7.getWorkDetail({ aweme_id: id })
    const query = new URL(v7Url).searchParams

    // 刻意分叉的三处：www-hj 边缘 + request_source / origin_type。
    // www.douyin.com 上这个接口实测 9/18 被 Argus 拦，换边缘后 18/18 通过
    expect(new URL(v7Url).hostname).toBe('www-hj.douyin.com')
    expect(query.get('request_source')).toBe('600')
    expect(query.get('origin_type')).toBe('video_page')

    // 抹掉这三处之后必须与 v6 逐字相同 —— 参数顺序也一样
    const stripped = new URL(v7Url)
    stripped.hostname = 'www.douyin.com'
    stripped.searchParams.delete('request_source')
    stripped.searchParams.delete('origin_type')
    expect(normalize(stripped.toString())).toBe(normalize(v6.getWorkDetail({ aweme_id: id })))
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

  it('四条免鉴权接口', () => {
    same(() => v7.getGuestUserInfo({ unique_id: 'ubb_up' }), () => v6.getGuestUserInfo({ unique_id: 'ubb_up' } as never))
    same(() => v7.getGuestMusicInfo({ music_id: 'm1' }), () => v6.getGuestMusicInfo({ music_id: 'm1' } as never))
    same(
      () => v7.getGuestMusicAwemeList({ music_id: 'm1', number: 5, cursor: 3 }),
      () => v6.getGuestMusicAwemeList({ music_id: 'm1', number: 5, cursor: 3 } as never)
    )
    same(() => v7.getEmojiResourceMeta(), () => v6.getEmojiResourceMeta())
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
    for (const key of ['device_platform', 'aid', 'channel', 'pc_client_type', 'version_code']) {
      expect(query.get(key), key + ' 缺失').toBeTruthy()
    }
  })

  it('URL 里不再写死 webid', () => {
    // 13 处写死值（6 个不同的值）是从别人的真实会话里抄来的；与 cookie 会话对不上时
    // 抖音静默回 HTTP 200 + 0 字节，没有业务码，于是「ck 失效」那句提示把排查带偏。
    const v7 = v7Create(UA)
    for (const url of [
      v7.getWorkDetail({ aweme_id: '1' }),
      v7.getUserProfile({ sec_uid: 'x' }),
      v7.getUserFavoriteList({ sec_uid: 'x', number: 18 }),
      v7.getSuggestWords({ query: 'kw' }),
      v7.search({ keyword: 'kw', query: 'kw', number: 10, type: 'general' }),
      v7.getEmojiList()
    ]) {
      expect(new URL(url).searchParams.has('webid'), url).toBe(false)
    }
  })

  it('表情列表带上 need_all —— 少了它只回常规表情 214 个', () => {
    const query = new URL(v7Create(UA).getEmojiList()).searchParams
    expect(query.get('need_all')).toBe('true')
  })

  it('dynamicEmojiList 的 scenes 只编码一次', () => {
    const raw = v7Create(UA).getDynamicEmojiList()
    // 预先编码过的值会被 buildQueryString 再编一次变成 %2522，接口回 status_code: 5
    expect(raw).toContain('scenes=%5B%22interactive_resources%22%5D')
    expect(raw).not.toContain('%2522')
  })

  it('四条免鉴权接口不走 douyin.com', () => {
    const v7 = v7Create(UA)
    expect(v7.getGuestUserInfo({ unique_id: 'ubb_up' })).toContain('https://www.iesdouyin.com/web/api/v2/user/info/')
    expect(v7.getGuestMusicInfo({ music_id: 'm1' })).toContain('https://www.iesdouyin.com/web/api/v2/music/info/')
    expect(v7.getGuestMusicAwemeList({ music_id: 'm1' })).toContain('count=10')
    expect(v7.getGuestMusicAwemeList({ music_id: 'm1' })).toContain('cursor=0')
    expect(v7.getEmojiResourceMeta()).toContain('https://api.amemv.com/aweme/v1/im/resources/emoji/')
  })
})