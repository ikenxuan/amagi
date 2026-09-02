import { bilibiliApiUrls } from 'amagi/platform/bilibili/API'
import { createDouyinApiUrls, douyinApiUrls } from 'amagi/platform/douyin/API'
import { kuaishouApiUrls } from 'amagi/platform/kuaishou/API'
import { createXiaohongshuApiUrls } from 'amagi/platform/xiaohongshu/API'
/**
 * 四个平台的 URL 构造器。
 *
 * 这一层是 v6 里唯一没有类型约束的「字符串拼接」环节，也是最容易在重构中
 * 漏掉某个固定参数（aid / device_platform / web_location ...）的地方。
 * 快照把每个接口的完整 URL 钉死。
 */
import { describe, expect, it } from 'vitest'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/**
 * 抖音的 URL 里含随机 msToken / verifyFp / fp（分别来自 crypto.randomBytes 与
 * new Date()），无法冻结。快照前把这些值替换成占位符，
 * 这样快照仍然能守住「参数集合与固定值」这件事。
 */
const VOLATILE_PARAMS = ['msToken', 'verifyFp', 'fp']

const normalizeUrl = (url: string): string => {
  const parsed = new URL(url)
  for (const key of VOLATILE_PARAMS) {
    if (parsed.searchParams.has(key)) parsed.searchParams.set(key, '<volatile>')
  }
  return decodeURIComponent(parsed.toString())
}

describe('douyinApiUrls', () => {
  const urls = createDouyinApiUrls(UA)

  it.each([
    ['getWorkDetail', () => urls.getWorkDetail({ aweme_id: '7123456789012345678' })],
    ['getComments', () => urls.getComments({ aweme_id: '7123', number: 20, cursor: 0 } as never)],
    ['getUserProfile', () => urls.getUserProfile({ sec_uid: 'MS4wLjABAAAAx' })],
    ['getEmojiList', () => urls.getEmojiList()]
  ])('%s 的 URL 被锁定', (_name, build) => {
    expect(normalizeUrl(build())).toMatchSnapshot()
  })

  it('随机参数每次调用都变化，因此快照里被占位', () => {
    const a = new URL(urls.getWorkDetail({ aweme_id: '1' })).searchParams.get('msToken')
    const b = new URL(urls.getWorkDetail({ aweme_id: '1' })).searchParams.get('msToken')

    expect(a).toBeTruthy()
    expect(b).not.toBe(a)
  })

  it('所有 URL 都指向 douyin.com 且使用 https', () => {
    for (const url of [urls.getWorkDetail({ aweme_id: '1' }), urls.getUserProfile({ sec_uid: 'x' }), urls.getEmojiList()]) {
      const parsed = new URL(url)
      expect(parsed.protocol).toBe('https:')
      expect(parsed.hostname.endsWith('douyin.com')).toBe(true)
    }
  })

  it('固定的反爬参数始终存在', () => {
    const query = new URL(urls.getWorkDetail({ aweme_id: '1' })).searchParams
    for (const key of ['device_platform', 'aid', 'channel', 'pc_client_type', 'version_code', 'webid']) {
      expect(query.get(key), key + ' 缺失').toBeTruthy()
    }
  })

  it('UA 里的浏览器版本被写进查询参数', () => {
    const query = new URL(createDouyinApiUrls(UA).getWorkDetail({ aweme_id: '1' })).searchParams
    expect(query.get('browser_version')).toBe('125.0.0.0')
  })

  it('不同 UA 生成不同的 browser_version', () => {
    const other = createDouyinApiUrls(UA.replace('125', '131'))
    const query = new URL(other.getWorkDetail({ aweme_id: '1' })).searchParams
    expect(query.get('browser_version')).toBe('131.0.0.0')
  })

  it('省略 UA 时默认单例 douyinApiUrls 也能工作', () => {
    expect(() => douyinApiUrls.getWorkDetail({ aweme_id: '1' })).not.toThrow()
  })

  it('查询关键词被正确编码', () => {
    const url = urls.getSuggestWords({ query: '中文 & 特殊=符号' } as never)
    expect(url).not.toContain('中文')
    expect(url).toContain('%')
  })

  it('aweme_id 原样进入查询串', () => {
    const query = new URL(urls.getWorkDetail({ aweme_id: '7999888777666555444' })).searchParams
    expect(query.get('aweme_id')).toBe('7999888777666555444')
  })
})

describe('bilibiliApiUrls', () => {
  it.each([
    ['getVideoInfo', () => bilibiliApiUrls.getVideoInfo({ bvid: 'BV1xx411c7mD' } as never)],
    ['getUserCard', () => bilibiliApiUrls.getUserCard({ host_mid: 1 } as never)],
    ['getEmojiList', () => bilibiliApiUrls.getEmojiList()],
    ['getLoginStatus', () => bilibiliApiUrls.getLoginStatus()],
    ['getComments', () => bilibiliApiUrls.getComments({ oid: '170001', type: 1, mode: 3 } as never)]
  ])('%s 的 URL 被锁定', (_name, build) => {
    expect(build()).toMatchSnapshot()
  })

  it('所有 URL 指向 bilibili.com 且使用 https', () => {
    for (const url of [
      bilibiliApiUrls.getVideoInfo({ bvid: 'BV1' } as never),
      bilibiliApiUrls.getEmojiList(),
      bilibiliApiUrls.getLoginStatus()
    ]) {
      const parsed = new URL(url)
      expect(parsed.protocol).toBe('https:')
      expect(parsed.hostname.endsWith('bilibili.com')).toBe(true)
    }
  })

  it('getComments 的 mode 会生效', () => {
    const query = new URL(bilibiliApiUrls.getComments({ oid: '1', type: 1, mode: 2 } as never)).searchParams
    expect(query.get('mode')).toBe('2')
  })

  it('getComments 未传 mode 时默认为 3', () => {
    const query = new URL(bilibiliApiUrls.getComments({ oid: '1', type: 1 } as never)).searchParams
    expect(query.get('mode')).toBe('3')
  })

  it('getComments 的 pagination_str 被包成 JSON', () => {
    const query = new URL(bilibiliApiUrls.getComments({ oid: '1', type: 1, pagination_str: 'TOKEN' } as never)).searchParams
    expect(query.get('pagination_str')).toBe('{"offset":"TOKEN"}')
  })

  it('getComments 未传 pagination_str 时 offset 为空串', () => {
    const query = new URL(bilibiliApiUrls.getComments({ oid: '1', type: 1 } as never)).searchParams
    expect(query.get('pagination_str')).toBe('{"offset":""}')
  })
})

describe('kuaishouApiUrls', () => {
  it.each([
    ['videoWork', () => kuaishouApiUrls.videoWork({ photoId: 'p1' } as never)],
    ['comments', () => kuaishouApiUrls.comments({ photoId: 'p1' } as never)],
    ['userInfoById', () => kuaishouApiUrls.userInfoById({ principalId: 'u1' } as never)]
  ])('%s 的请求描述被锁定', (_name, build) => {
    expect(build()).toMatchSnapshot()
  })

  it('live_api 类请求带 caver 参数，这是签名的前置条件', () => {
    const req = kuaishouApiUrls.userInfoById({ principalId: 'u1' } as never) as { url: string }
    expect(new URL(req.url).searchParams.get('caver')).toBeTruthy()
  })

  it('graphql 类请求返回带 url 的描述对象', () => {
    const req = kuaishouApiUrls.videoWork({ photoId: 'p1' } as never)
    expect(req).toHaveProperty('url')
  })

  it('principalId 被 URL 编码', () => {
    const req = kuaishouApiUrls.userInfoById({ principalId: 'a b&c' } as never) as { url: string }
    expect(req.url).not.toContain('a b&c')
  })
})

describe('xiaohongshuApiUrls', () => {
  const urls = createXiaohongshuApiUrls()

  it.each([
    ['homeFeed', () => urls.homeFeed({} as never)],
    ['noteDetail', () => urls.noteDetail({ note_id: 'n1', xsec_token: 'tk' } as never)],
    ['emojiList', () => urls.emojiList({} as never)]
  ])('%s 的请求描述被锁定', (_name, build) => {
    expect(build()).toMatchSnapshot()
  })

  it('返回结构包含 Url 与 apiPath', () => {
    const req = urls.homeFeed({} as never)
    expect(req).toHaveProperty('Url')
    expect(req).toHaveProperty('apiPath')
  })

  it('Url 指向 edith.xiaohongshu.com', () => {
    expect(urls.homeFeed({} as never).Url).toContain('edith.xiaohongshu.com')
  })

  it('apiPath 以 / 开头且不含域名，供签名使用', () => {
    const apiPath = urls.homeFeed({} as never).apiPath
    expect(apiPath.startsWith('/')).toBe(true)
    expect(apiPath).not.toContain('xiaohongshu.com')
  })
})
