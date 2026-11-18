import amagi from 'amagi/index'
import { describe, expect, it } from 'vitest'

describe('request 挂载点', () => {
  const client = amagi({ douyin: { web: { cookie: 'ttwid=x' } }, bilibili: { cookie: 'SESSDATA=y' } })

  it('四个平台都有 request', () => {
    for (const p of ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const) {
      expect(typeof (p === 'douyin' ? client.douyin.web : client[p]).request.get).toBe('function')
      expect(typeof (p === 'douyin' ? client.douyin.web : client[p]).request.post).toBe('function')
      expect(typeof (p === 'douyin' ? client.douyin.web : client[p]).request.axios.get).toBe('function')
      expect(typeof (p === 'douyin' ? client.douyin.web : client[p]).request.create).toBe('function')
    }
  })

  it('静态面没有 request —— 它没有实例 ck 可绑', () => {
    // `amagi.douyin` 的类型上本就没有 `request`（这正是本用例要钉的事），直接写
    // `.request` 编译不过，所以用断言够过去 —— 同 public-surface 里够 `version` 的手法
    expect((amagi.douyin as { request?: unknown }).request).toBeUndefined()
  })

  it('同一平台两次取到的是同一个模块（不是每次访问新建一个 axios 实例）', () => {
    expect(client.douyin.web.request).toBe(client.douyin.web.request)
  })

  it('两个 client 实例各有各的 request', () => {
    const a = amagi({})
    const b = amagi({})

    expect(a.douyin.web.request).not.toBe(b.douyin.web.request)
  })
})
