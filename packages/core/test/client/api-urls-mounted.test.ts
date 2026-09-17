import amagi from 'amagi/index'
import { describe, expect, it } from 'vitest'

describe('v7 apiUrls 挂载', () => {
  const client = amagi({})

  it('抖音给的是 v7 那份（www-hj + 两个反 Argus 参数）', () => {
    const url = client.douyin.apiUrls.getWorkDetail({ aweme_id: '1' })

    expect(url).toContain('https://www-hj.douyin.com/')
    expect(url).toContain('request_source=600')
    expect(url).toContain('origin_type=video_page')
  })

  it('v6 那份原样留着，且它打的是另一个 host', () => {
    expect(client.douyin.douyinApiUrls.getWorkDetail({ aweme_id: '1' })).toContain('https://www.douyin.com/')
  })

  it('小红书的构造器返回三段式请求描述（不是 URL 字符串）', () => {
    const d = client.xiaohongshu.apiUrls.noteDetail({ note_id: 'n', xsec_token: 't' })

    expect(d.Url).toContain('edith.xiaohongshu.com/api/sns/web/v1/feed')
    expect(d.apiPath).toBe('/api/sns/web/v1/feed')
    expect(d.Body).toMatchObject({ source_note_id: 'n' })
  })

  it('B站返回 URL 字符串，快手返回请求描述对象', () => {
    // B站与抖音同类：一个字符串装得下
    expect(typeof client.bilibili.apiUrls.getVideoInfo({ bvid: 'BV1' })).toBe('string')

    // 快手与小红书同类：返回描述对象。注意快手**没有** getVideoInfo，
    // 它的方法名是 videoWork / videoWorkFull
    const k = client.kuaishou.apiUrls.videoWork({ photoId: '1' })

    expect(typeof k).toBe('object')
    expect(k.method).toBe('POST')
    expect(typeof k.signPath).toBe('string')
    expect(k.body).toBeTruthy()
  })

  it('四个平台的 apiUrls 都不是 v6 那一份（身份比较，不靠输出差异）', () => {
    // 靠「输出不同」是抓不住的：B站与小红书的 v6/v7 目前输出相同或几乎相同，
    // 挂错了照样绿。这里比的是**对象身份**。
    expect(client.douyin.apiUrls).not.toBe(client.douyin.douyinApiUrls)
    expect(client.bilibili.apiUrls).not.toBe(client.bilibili.bilibiliApiUrls)
    expect(client.kuaishou.apiUrls).not.toBe(client.kuaishou.kuaishouApiUrls)
    expect(client.xiaohongshu.apiUrls).not.toBe(client.xiaohongshu.xiaohongshuApiUrls)
  })
})
