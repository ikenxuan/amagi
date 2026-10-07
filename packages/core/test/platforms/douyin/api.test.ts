import { createDouyinApiUrls as v7Create } from 'amagi/platforms/douyin/api'
import { createDouyinApiUrls as v6Create } from 'amagi/platforms/legacy/douyin/API'
/**
 * platforms/douyin/api 的契约。
 *
 * 判据：**v6 的 `api-urls.test.ts` 快照一字不变**。与小红书/快手同一策略：
 * import v6 的 `createDouyinApiUrls` 逐项对照。保留各端点的业务参数与 v6 一致；
 * 新的 Web 公共默认值由 web-params.test.ts 独立验证，这里按 {@link VOLATILE} 忽略，
 * 查询参数顺序也不参与对照。
 *
 * `msToken` 这一项两边**不对称**：v6 的 URL 构造器自己写（`legacy/douyin/API.ts` 里
 * 7 处 `douyinSign.Mstoken(...)`），v7 已整体下沉到签名 step（`sign/steps.ts` 的
 * `msToken()`），build 出来的 URL 一个都不带。所以归一化要把它从两边一并删掉，
 * 否则每条对照都会因为「v6 有、v7 没有」而假红。
 */
import { describe, expect, it } from 'vitest'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
/** 随机值，以及 v7 统一到 Web 公共默认值后与 v6 必然不同的那些参数 */
const VOLATILE = [
  'msToken',
  'verifyFp',
  'fp',
  'pc_libra_divert',
  'support_h265',
  'support_dash',
  'update_version_code',
  'screen_width',
  'screen_height',
  'round_trip_time',
  'downlink',
  'browser_name',
  'browser_version',
  'engine_version',
  'device_platform',
  'version_code',
  'version_name'
]

/**
 * 归一化：把 {@link VOLATILE} 里的参数从两边一并删掉，再按键排序。
 *
 * `delete('msToken')` 单列一行不能省 —— 它对所有路径生效，而 VOLATILE 的循环只对
 * `/aweme/v1/web/` 下的端点删非随机项。删的是 v6 那一边的多余参数，v7 这边是无操作。
 */
const normalize = (url: string): string => {
  const parsed = new URL(url)
  parsed.searchParams.delete('msToken')
  for (const key of VOLATILE) {
    if (parsed.pathname.includes('/aweme/v1/web/') || ['msToken', 'verifyFp', 'fp'].includes(key)) parsed.searchParams.delete(key)
  }
  parsed.searchParams.sort()
  return decodeURIComponent(parsed.toString())
}

/** 对照：v7 输出与 v6 归一化后逐项相等 */
const same = (v7: () => string, v6: () => string): void => {
  expect(normalize(v7())).toBe(normalize(v6()))
}

/** 对照 v6 走 www-hj 的端点：v7 改回 www.douyin.com，其余参数仍与 v6 一致 */
const sameOnWww = (v7: () => string, v6: () => string): void => {
  const url = new URL(v7())
  expect(url.hostname).toBe('www.douyin.com')
  const legacy = new URL(v6())
  expect(legacy.hostname).toBe('www-hj.douyin.com')
  legacy.hostname = 'www.douyin.com'
  expect(normalize(url.toString())).toBe(normalize(legacy.toString()))
}

describe('platforms/douyin/api 与 v6 逐项对照', () => {
  const v7 = v7Create(UA)
  const v6 = v6Create(UA)

  it('getWorkDetail —— 除视频页两个参数外与 v6 一致', () => {
    const id = '7123456789012345678'
    const v7Url = v7.getWorkDetail({ aweme_id: id })
    const query = new URL(v7Url).searchParams

    // 刻意分叉的两处：request_source / origin_type。host 与浏览器一样打 www.douyin.com
    // （参数补齐后 2026-09-26 实测登录态、游客各 9/9 通过）
    expect(new URL(v7Url).hostname).toBe('www.douyin.com')
    expect(query.get('request_source')).toBe('600')
    expect(query.get('origin_type')).toBe('video_page')

    // 排除 Web 基线变化后，作品专用参数仍与 v6 一致
    const stripped = new URL(v7Url)
    stripped.searchParams.delete('request_source')
    stripped.searchParams.delete('origin_type')
    expect(normalize(stripped.toString())).toBe(normalize(v6.getWorkDetail({ aweme_id: id })))
  })

  it('getComments（带 cursor/number）—— 除 insert_ids 外与 v6 一致', () => {
    // v6 发 `insert_ids=`（恒为空串，原是「把指定评论置顶」用的）。2026-10-05 抓包里
    // 浏览器的 comment/list 只有 aweme_id,cursor,count,item_type,whale_cut_token,
    // cut_version,rcFT 七个端点参数，没有这一项，v7 不再发 —— 从 v6 那边删掉再比。
    const legacy = new URL(v6.getComments({ aweme_id: '7123', number: 20, cursor: 0 } as never))
    expect(legacy.searchParams.get('insert_ids')).toBe('')
    legacy.searchParams.delete('insert_ids')
    expect(normalize(v7.getComments({ aweme_id: '7123', number: 20, cursor: 0 }))).toBe(normalize(legacy.toString()))
  })

  it('getUserProfile', () => {
    same(
      () => v7.getUserProfile({ sec_uid: 'MS4wLjABAAAAx' }),
      () => v6.getUserProfile({ sec_uid: 'MS4wLjABAAAAx' })
    )
  })

  it('getEmojiList', () => {
    same(
      () => v7.getEmojiList(),
      () => v6.getEmojiList()
    )
  })

  it('getCommentReplies（v6 走 www-hj，v7 改回 www）', () => {
    sameOnWww(
      () => v7.getCommentReplies({ aweme_id: 'a1', comment_id: 'c1', number: 5, cursor: 0 }),
      () => v6.getCommentReplies({ aweme_id: 'a1', comment_id: 'c1', number: 5, cursor: 0 } as never)
    )
  })

  it('getUserVideoList / getUserFavoriteList / getUserRecommendList', () => {
    const p = { sec_uid: 'MS4wLjABAAAAx', number: 18 }
    same(
      () => v7.getUserVideoList(p),
      () => v6.getUserVideoList(p)
    )
    sameOnWww(
      () => v7.getUserFavoriteList(p),
      () => v6.getUserFavoriteList(p)
    )
    same(
      () => v7.getUserRecommendList(p),
      () => v6.getUserRecommendList(p)
    )
  })

  it('getSuggestWords', () => {
    same(
      () => v7.getSuggestWords({ query: '美食' }),
      () => v6.getSuggestWords({ query: '美食' })
    )
  })

  it('search（带 search_id）', () => {
    // general 分支比 v6 多带翻页用的 search_id（v6 只有 video/user 分支带），其余一致
    const url = new URL(v7.search({ query: '美食', search_id: 'sid-1', number: 10, type: 'general' }))
    expect(url.searchParams.get('search_id')).toBe('sid-1')
    url.searchParams.delete('search_id')
    expect(normalize(url.toString())).toBe(
      normalize(v6.search({ query: '美食', search_id: 'sid-1', number: 10, type: 'general' } as never))
    )
  })

  it('search general 不带 search_id 时不出现空参数', () => {
    expect(new URL(v7.search({ query: '美食', number: 10, type: 'general' })).searchParams.has('search_id')).toBe(false)
  })

  it('getMusicInfo', () => {
    same(
      () => v7.getMusicInfo({ music_id: 'm1' }),
      () => v6.getMusicInfo({ music_id: 'm1' })
    )
  })

  it('getLiveRoomInfo', () => {
    same(
      () => v7.getLiveRoomInfo({ web_rid: 'r1', room_id: 'x' }),
      () => v6.getLiveRoomInfo({ web_rid: 'r1', room_id: 'x' } as never)
    )
  })

  it('getLoginQrcode', () => {
    same(
      () => v7.getLoginQrcode({ verify_fp: 'fp1' }),
      () => v6.getLoginQrcode({ type: 'qrcode_login', verify_fp: 'fp1' } as never)
    )
  })

  it('getDanmakuList（v6 走 www-hj，v7 改回 www）', () => {
    sameOnWww(
      () => v7.getDanmakuList({ aweme_id: 'a1', start_time: 1, end_time: 2, duration: 3 }),
      () => v6.getDanmakuList({ aweme_id: 'a1', start_time: 1, end_time: 2, duration: 3 } as never)
    )
  })

  it('四条免鉴权接口', () => {
    same(
      () => v7.getGuestUserInfo({ unique_id: 'ubb_up' }),
      () => v6.getGuestUserInfo({ unique_id: 'ubb_up' } as never)
    )
    same(
      () => v7.getGuestMusicInfo({ music_id: 'm1' }),
      () => v6.getGuestMusicInfo({ music_id: 'm1' } as never)
    )
    same(
      () => v7.getGuestMusicAwemeList({ music_id: 'm1', number: 5, cursor: 3 }),
      () => v6.getGuestMusicAwemeList({ music_id: 'm1', number: 5, cursor: 3 } as never)
    )
    same(
      () => v7.getEmojiResourceMeta(),
      () => v6.getEmojiResourceMeta()
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
      v7.search({ query: 'kw', number: 10, type: 'general' }),
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
