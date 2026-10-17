import { DEFAULT_UA } from 'amagi/contracts/ua'
import { createDouyinApiUrls } from 'amagi/platforms/douyin/api'
import { describe, expect, it } from 'vitest'

const urls = () => {
  const api = createDouyinApiUrls('Mozilla/5.0 Chrome/153.0.0.0 Safari/537.36')
  return [
    api.getWorkDetail({ aweme_id: '1' }),
    api.getComments({ aweme_id: '1' }),
    api.getCommentReplies({ aweme_id: '1', comment_id: '2' }),
    api.getEmojiList(),
    api.getUserVideoList({ sec_uid: 'u' }),
    api.getUserFavoriteList({ sec_uid: 'u' }),
    api.getUserRecommendList({ sec_uid: 'u' }),
    api.getUserProfile({ sec_uid: 'u' }),
    api.getSuggestWords({ query: 'test' }),
    api.getDynamicEmojiList(),
    api.getMusicInfo({ music_id: 'm' }),
    api.getDanmakuList({ aweme_id: '1', duration: 60000 }),
    api.getMixAweme({ mix_id: 'm' }),
    api.getWebShorten({ target: 'https://www.iesdouyin.com/share/video/1/' }),
    ...(['user', 'video', 'general'] as const).map((type) => api.search({ query: 'test', type }))
  ].map((url) => new URL(url))
}

describe('douyin web request baseline', () => {
  it('declares the same capabilities and browser across all Web API builders', () => {
    for (const url of urls()) {
      const query = url.searchParams
      expect(query.get('device_platform'), url.pathname).toBe('webapp')
      expect(query.get('pc_libra_divert'), url.pathname).toBe('Windows')
      expect(query.get('support_h265'), url.pathname).toBe('0')
      expect(query.get('support_dash'), url.pathname).toBe('1')
      expect(query.get('update_version_code'), url.pathname).toBe('170400')
      expect(query.get('screen_width'), url.pathname).toBe('1920')
      expect(query.get('screen_height'), url.pathname).toBe('1080')
      expect(query.get('browser_name'), url.pathname).toBe('Chrome')
      expect(query.get('browser_version'), url.pathname).toBe('153.0.0.0')
      expect(query.get('engine_version'), url.pathname).toBe('153.0.0.0')
    }
  })

  it('reports Edge the way the browser does when the UA carries Edg/', () => {
    // 2026-10-07 Edge 154 抓包：browser_name=Edge，browser_version 取 Edg/ 的版本，engine 取 Chrome/
    const api = createDouyinApiUrls(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.3.1'
    )
    for (const url of [api.getWorkDetail({ aweme_id: '1' }), api.getLiveRoomInfo({ web_rid: 'w', room_id: 'r' })]) {
      const query = new URL(url).searchParams
      expect(query.get('browser_name'), url).toBe('Edge')
      expect(query.get('browser_version'), url).toBe('154.0.3.1')
    }
    expect(new URL(api.getWorkDetail({ aweme_id: '1' })).searchParams.get('engine_version')).toBe('154.0.0.0')
  })

  it('keeps the work detail version override while defaulting collection requests', () => {
    const api = createDouyinApiUrls()
    const work = new URL(api.getWorkDetail({ aweme_id: '1' })).searchParams
    const mix = new URL(api.getMixAweme({ mix_id: 'm' })).searchParams
    expect(work.get('version_code')).toBe('190500')
    expect(work.get('version_name')).toBe('19.5.0')
    expect(mix.get('version_code')).toBe('170400')
    expect(mix.get('version_name')).toBe('17.4.0')
    expect(DEFAULT_UA).toContain(`Chrome/${mix.get('browser_version')}`)
  })
})
