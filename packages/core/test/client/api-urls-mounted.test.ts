import amagi, { bilibiliApiUrls, douyinApiUrls, kuaishouApiUrls, xiaohongshuApiUrls } from 'amagi/index'
import { describe, expect, it } from 'vitest'

import compatAmagi from '../../src/exports/compat'

describe('v7 apiUrls 挂载', () => {
  const client = amagi({})

  it('抖音给的是 v7 那份（www-hj + 两个反 Argus 参数）', () => {
    const url = client.douyin.apiUrls.getWorkDetail({ aweme_id: '1' })

    expect(url).toContain('https://www-hj.douyin.com/')
    expect(url).toContain('request_source=600')
    expect(url).toContain('origin_type=video_page')
  })

  it('v6 构造器不在 v7 门面上：四个 <平台>ApiUrls 键都不存在', () => {
    // v7 门面只摊 v7：这四个键曾经是 v6 那份的落点，现在包顶层与 compat 才有
    expect(client.douyin).not.toHaveProperty('douyinApiUrls')
    expect(client.bilibili).not.toHaveProperty('bilibiliApiUrls')
    expect(client.kuaishou).not.toHaveProperty('kuaishouApiUrls')
    expect(client.xiaohongshu).not.toHaveProperty('xiaohongshuApiUrls')
    // 运行时对照：旧写法读到 undefined（TS 下这一行本身是编译错误，所以要绕开类型）
    expect((client.douyin as unknown as Record<string, unknown>).douyinApiUrls).toBeUndefined()
  })

  it('v6 那份从包顶层到达（import { douyinApiUrls }），打的仍是 www.douyin.com', () => {
    expect(douyinApiUrls.getWorkDetail({ aweme_id: '1' })).toContain('https://www.douyin.com/')
  })

  it('compat 入口下两个键都在：<平台>ApiUrls 是 v6 那份（原名），apiUrls 仍是 v7', () => {
    const compatClient = compatAmagi({})

    // 身份断言：compat 摊的就是包顶层那份 v6 构造器本体
    expect(compatClient.douyin.douyinApiUrls).toBe(douyinApiUrls)
    expect(compatClient.bilibili.bilibiliApiUrls).toBe(bilibiliApiUrls)
    expect(compatClient.kuaishou.kuaishouApiUrls).toBe(kuaishouApiUrls)
    expect(compatClient.xiaohongshu.xiaohongshuApiUrls).toBe(xiaohongshuApiUrls)

    // v7 那份在 compat 下照样够得到（抖音两版 host 不同，可直接分辨）
    expect(compatClient.douyin.apiUrls.getWorkDetail({ aweme_id: '1' })).toContain('https://www-hj.douyin.com/')
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
    // 挂错了照样绿。这里比的是**对象身份** —— 与包顶层那份 v6 比
    // （v7 门面上已经没有 v6 键可拿了）。
    expect(client.douyin.apiUrls).not.toBe(douyinApiUrls)
    expect(client.bilibili.apiUrls).not.toBe(bilibiliApiUrls)
    expect(client.kuaishou.apiUrls).not.toBe(kuaishouApiUrls)
    expect(client.xiaohongshu.apiUrls).not.toBe(xiaohongshuApiUrls)
  })
})
