import amagi from 'amagi/index'
import { describe, expect, it } from 'vitest'

/**
 * 请求模块的键集合。与 `fetcher-surface.test.ts` 同一套纪律：
 * 加删一个键都要在 snapshot 里留下可见的一行。
 */
describe('request 模块形状', () => {
  const client = amagi({})

  it('request 的键集合被锁定', () => {
    expect(Object.keys(client.douyin.request).sort()).toMatchSnapshot()
  })

  it('request.axios 的键集合被锁定', () => {
    expect(Object.keys(client.douyin.request.axios).sort()).toMatchSnapshot()
  })

  it('四个平台的 request 键集合一致', () => {
    const shape = (p: 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu') => Object.keys(client[p].request).sort()

    expect(shape('bilibili')).toEqual(shape('douyin'))
    expect(shape('kuaishou')).toEqual(shape('douyin'))
    expect(shape('xiaohongshu')).toEqual(shape('douyin'))
  })
})
