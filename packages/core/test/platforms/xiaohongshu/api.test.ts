import { createXiaohongshuApiUrls } from 'amagi/platforms/legacy/xiaohongshu/API'
import { emojiList, homeFeed, noteComments, noteDetail, searchNotes, userNoteList, userProfile } from 'amagi/platforms/xiaohongshu/api'
/** 保留 v6 兼容形态，并显式验证归档补充的 v7 请求协议变化。 */
import { describe, expect, it } from 'vitest'

const v6 = createXiaohongshuApiUrls()

describe('platforms/xiaohongshu/api 与 v6 逐项对照', () => {
  it('homeFeed：首页使用空游标和当前默认数量', () => {
    expect(homeFeed()).toMatchObject({
      apiPath: '/api/sns/web/v1/homefeed',
      Body: { cursor_score: '', num: 27, refresh_type: 1, note_index: 0 }
    })
  })

  it('homeFeed：带参输出与 v6 一致', () => {
    const params = { cursor_score: '1.1E9', num: 10, refresh_type: 1, note_index: 5, category: 'video', search_key: 'k' }
    expect(homeFeed(params).Body).toMatchObject(params)
  })

  it('noteDetail：输出与 v6 一致', () => {
    const params = { note_id: 'n1', xsec_token: 'tk' }
    expect(noteDetail(params)).toEqual(v6.noteDetail(params as never))
  })

  // noteComments 故意偏离 v6：抓包实证 comment/page 的 query 需带 top_comment_id，
  // v6 没有这个参数。apiPath 仍与 v6 一致，其余参数不变。
  it('noteComments：v7 比 v6 多带 top_comment_id（apiPath 与 v6 一致）', () => {
    const params = { note_id: 'n1', xsec_token: 'tk' }
    const v7out = noteComments(params)
    const v6out = v6.noteComments(params as never)
    expect(v7out.apiPath).toBe(v6out.apiPath)
    expect(v7out.Url).toContain('top_comment_id=')
    expect(v6out.Url as string).not.toContain('top_comment_id=')
  })

  it('noteComments：带 cursor 时 URL 含 cursor 与 top_comment_id', () => {
    const params = { note_id: 'n1', cursor: 'cur-2', xsec_token: 'tk' }
    const v7out = noteComments(params)
    expect(v7out.Url).toContain('cursor=cur-2')
    expect(v7out.Url).toContain('top_comment_id=')
  })

  it('userProfile：JSON API 与签名使用相同 target_user_id', () => {
    expect(userProfile({ user_id: 'u1' })).toEqual({
      apiPath: '/api/sns/web/v1/user/otherinfo',
      Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=u1',
      signParams: { target_user_id: 'u1' }
    })
  })

  // 2026-10-04 真机对照（站内跳转到他人主页，200）：线上 query 是
  // target_user_id / xsec_token / xsec_source=pc_feed，顺序如此
  it('userProfile：带 xsec_token 时与真机逐字一致', () => {
    expect(userProfile({ user_id: 'u1', xsec_token: 'tk' })).toEqual({
      apiPath: '/api/sns/web/v1/user/otherinfo',
      Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=u1&xsec_token=tk&xsec_source=pc_feed',
      signParams: { target_user_id: 'u1', xsec_token: 'tk', xsec_source: 'pc_feed' }
    })
  })

  it('userProfile：xsec_source 可覆盖；没有 token 时两者都不发，不补空值', () => {
    expect(userProfile({ user_id: 'u1', xsec_token: 'tk', xsec_source: 'pc_search' }).Url).toContain('xsec_source=pc_search')
    const bare = 'https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=u1'
    expect(userProfile({ user_id: 'u1', xsec_token: '' }).Url).toBe(bare)
    expect(userProfile({ user_id: 'u1', xsec_source: 'pc_feed' }).Url).toBe(bare)
  })

  // 上游 beta.9 的 userProfile 仍抓 HTML 页，本分支已改走 otherinfo JSON API，所以上游的
  // 「与 v6 URL 一致」用例不再适用；保留它的语义：apiPath 与 v6 一致，xsec_token 只在传了时出现。
  it('userProfile：apiPath 与 v6 一致；xsec_token 只影响带了它的调用', () => {
    expect(userProfile({ user_id: 'u1' }).apiPath).toBe(v6.userProfile({ user_id: 'u1' } as never).apiPath)
    expect(userProfile({ user_id: 'u1', xsec_token: 'tok-1' }).Url).toContain('xsec_token=tok-1')
    expect(userProfile({ user_id: 'u1' }).Url).not.toContain('xsec_token')
  })

  // userNoteList / noteComments 故意偏离 v6 的 query 编码：v6 用 encodeURIComponent，
  // 会把 image_formats 的 `,` 编成 `%2C`；但小红书 x-s 签名的内部编码只把 `=` 转成
  // `%3D`、逗号原样保留，URL 与签名内容必须逐字节一致，否则平台返回 HTTP 406
  // （实测 `%2C`→406、原始逗号→200）。此外 v7 还多带 `xsec_token`（user 级令牌，缺它
  // user_posted 回 461）与供签名器覆盖 query 的 `signParams`。apiPath 与主机仍与 v6 一致。
  it('userNoteList：默认 num —— 逗号不编码、apiPath 与 v6 一致、带 xsec_token 与 signParams', () => {
    const params = { user_id: 'u1', xsec_token: 'tok-1' }
    const v7out = userNoteList(params)
    const v6out = v6.userNoteList(params as never)
    expect(v7out.apiPath).toBe(v6out.apiPath)
    expect(v7out.Url).not.toContain('%2C')
    expect(v7out.Url).toContain('xsec_token=tok-1')
    expect(v7out.signParams).toEqual({
      user_id: 'u1',
      cursor: '',
      num: 30,
      image_formats: 'jpg,webp,avif',
      xsec_token: 'tok-1',
      xsec_source: 'pc_feed'
    })
  })

  it('userNoteList：带 cursor / num —— 逗号不编码、apiPath 与 v6 一致、带 signParams', () => {
    const params = { user_id: 'u1', cursor: 'cur', num: 5, xsec_token: 'fixture-token' }
    const v7out = userNoteList(params)
    const v6out = v6.userNoteList(params as never)
    expect(v7out.apiPath).toBe(v6out.apiPath)
    expect(v7out.Url).toBe(
      'https://edith.xiaohongshu.com/api/sns/web/v1/user_posted?num=5&cursor=cur&user_id=u1&image_formats=jpg,webp,avif&xsec_token=fixture-token&xsec_source=pc_feed'
    )
    expect(v7out.Url).toContain('cursor=cur')
    expect(v7out.Url).toContain('xsec_token=fixture-token')
    expect(v7out.signParams).toMatchObject({ user_id: 'u1', cursor: 'cur', num: 5, xsec_token: 'fixture-token' })
  })

  // 回归守卫：不传 xsec_token（有效登录 CK 的用法）时不带这个键，其余参数与 v6 相同 ——
  // user_posted 的签名簇本就是 XYS（v6 无 XYW），加 xsec_token 只影响游客路径。
  // 只比参数集合不比顺序：v7 的字段顺序按真机抓包（num,cursor,user_id,...），与 v6 不同。
  it('userNoteList：不传 xsec_token（有效登录 CK 形态）—— 参数与 v6 一致、无 xsec_token', () => {
    const params = { user_id: 'u1' }
    const v7out = userNoteList(params)
    const v6out = v6.userNoteList(params as never)
    expect(v7out.apiPath).toBe(v6out.apiPath)
    const entries = (url: string) => [...new URL(url).searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    expect(entries(v7out.Url)).toEqual(entries(v6out.Url as string))
    expect(v7out.Url).not.toContain('xsec_token')
    expect(v7out.signParams).toEqual({ user_id: 'u1', cursor: '', num: 30, image_formats: 'jpg,webp,avif', xsec_source: 'pc_feed' })
  })

  it('emojiList：输出与 v6 一致', () => {
    expect(emojiList()).toEqual(v6.emojiList({} as never))
  })

  it('searchNotes：v2 的随机标识由调用方显式传入，构造保持纯函数', () => {
    const params = { keyword: 'k', page: 2, page_size: 10 }
    const v7out = searchNotes(params, 'fixed-search-id', 'fixed-session-id', 'fixed-request-id')
    expect(v7out.Url).toBe('https://so.xiaohongshu.com/api/sns/web/v2/search/notes')
    expect(v7out.apiPath).toBe('/api/sns/web/v2/search/notes')
    expect(v7out.Body).toMatchObject({
      ...params,
      search_id: 'fixed-search-id',
      session_id: 'fixed-session-id',
      search_request_id: 'fixed-request-id'
    })
  })
})

describe('platforms/xiaohongshu/api 结构', () => {
  it('请求描述保持 { Url, Body?, apiPath } 三段', () => {
    expect(homeFeed()).toHaveProperty('Url')
    expect(homeFeed()).toHaveProperty('apiPath')
    expect(homeFeed()).toHaveProperty('Body')
    // GET 端点没有 Body（与 v6 一致）
    expect(emojiList()).not.toHaveProperty('Body')
  })

  it('Url 指向 edith.xiaohongshu.com，apiPath 不含域名（供签名使用）', () => {
    for (const desc of [homeFeed(), noteDetail({ note_id: 'n', xsec_token: 't' }), emojiList()]) {
      expect(desc.Url).toContain('xiaohongshu.com')
      expect(desc.apiPath.startsWith('/')).toBe(true)
      expect(desc.apiPath).not.toContain('xiaohongshu.com')
    }
  })
})
