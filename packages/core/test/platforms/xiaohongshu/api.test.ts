import { createXiaohongshuApiUrls } from 'amagi/platforms/legacy/xiaohongshu/API'
import { emojiList, homeFeed, noteComments, noteDetail, searchNotes, userNoteList, userProfile } from 'amagi/platforms/xiaohongshu/api'
/**
 * platforms/xiaohongshu/api 的契约。
 *
 * 判据：**v6 的 `api-urls.test.ts` 快照一字不变**。这里不复制快照，
 * 而是直接 import v6 的 `createXiaohongshuApiUrls()`，对同一入参断言
 * v7 输出与 v6 输出完全相等 —— v6 快照由 `test/platforms/legacy/api-urls.test.ts`
 * 锁死，v7 与 v6 相等由本文件锁死，两条链合起来就是「快照不变」。
 *
 * 唯一例外是 `searchNotes` 的 `search_id`：v6 在函数内部随机生成，
 * v7 由调用方显式传入（保持纯函数），因此对该字段单独处理。
 */
import { describe, expect, it } from 'vitest'

const v6 = createXiaohongshuApiUrls()

describe('platforms/xiaohongshu/api 与 v6 逐项对照', () => {
  it('homeFeed：默认参数输出与 v6 一致', () => {
    expect(homeFeed()).toEqual(v6.homeFeed({} as never))
  })

  it('homeFeed：带参输出与 v6 一致', () => {
    const params = { cursor_score: '1.1E9', num: 10, refresh_type: 1, note_index: 5, category: 'video', search_key: 'k' }
    expect(homeFeed(params)).toEqual(v6.homeFeed(params as never))
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

  it('userProfile：输出与 v6 一致', () => {
    const params = { user_id: 'u1' }
    expect(userProfile(params)).toEqual(v6.userProfile(params as never))
  })

  // userNoteList / noteComments 故意偏离 v6 的 query 编码：v6 用 encodeURIComponent，
  // 会把 image_formats 的 `,` 编成 `%2C`；但小红书 x-s 签名的内部编码只把 `=` 转成
  // `%3D`、逗号原样保留，URL 与签名内容必须逐字节一致，否则平台返回 HTTP 406
  // （实测 `%2C`→406、原始逗号→200）。此外 v7 多带 `signParams`（供签名器覆盖 query）。
  // apiPath 与主机、其余参数仍与 v6 一致。
  it('userNoteList：默认 num —— 逗号不编码、apiPath 与 v6 一致、带 signParams', () => {
    const params = { user_id: 'u1' }
    const v7out = userNoteList(params)
    const v6out = v6.userNoteList(params as never)
    expect(v7out.apiPath).toBe(v6out.apiPath)
    expect(v7out.Url).toBe((v6out.Url as string).replaceAll('%2C', ','))
    expect(v7out.Url).not.toContain('%2C')
    expect(v7out.signParams).toEqual({
      user_id: 'u1',
      cursor: '',
      num: 30,
      image_formats: 'jpg,webp,avif',
      xsec_source: 'pc_feed'
    })
  })

  it('userNoteList：带 cursor / num —— 逗号不编码、apiPath 与 v6 一致、带 signParams', () => {
    const params = { user_id: 'u1', cursor: 'cur', num: 5 }
    const v7out = userNoteList(params)
    const v6out = v6.userNoteList(params as never)
    expect(v7out.apiPath).toBe(v6out.apiPath)
    expect(v7out.Url).toBe((v6out.Url as string).replaceAll('%2C', ','))
    expect(v7out.Url).toContain('cursor=cur')
    expect(v7out.signParams).toMatchObject({ user_id: 'u1', cursor: 'cur', num: 5 })
  })

  it('emojiList：输出与 v6 一致', () => {
    expect(emojiList()).toEqual(v6.emojiList({} as never))
  })

  it('searchNotes：除 search_id 外与 v6 一致（v7 的 search_id 由调用方传入）', () => {
    const params = { keyword: 'k', page: 2, page_size: 10 }
    const v7out = searchNotes(params, 'fixed-search-id')
    const v6out = v6.searchNotes(params as never)

    expect(v7out.Url).toBe(v6out.Url)
    expect(v7out.apiPath).toBe(v6out.apiPath)
    expect(v7out.Body).toEqual({ ...(v6out.Body as object), search_id: 'fixed-search-id' })
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
