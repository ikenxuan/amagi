import { existsSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { buildEndpointList } from '../server/endpoints'
import type { StoreOptions, StoreResult } from '../shared/contract'

vi.stubGlobal('location', new URL('http://localhost:5190/'))
const { generateTypes } = await import('../src/lib/api')
const { canGenerateAfterStore } = await import('../src/lib/workbench')

describe('工作台保存与生成', () => {
  it('接口目录指向重构后实际存在的源文件，包含 Web、App 和游客端点', () => {
    const platforms = buildEndpointList({ seeds: { version: 1, platforms: {} }, hasCookie: () => false, storedCount: () => 0 })
    const root = new URL('../../../', import.meta.url)
    const missing = platforms.flatMap((platform) =>
      platform.endpoints.filter((endpoint) => !existsSync(new URL(endpoint.source, root))).map((endpoint) => endpoint.source)
    )
    expect(missing).toEqual([])
  })
  const receipt: StoreResult = {
    written: 'corpus/douyin/appComments/sample.json',
    requestsAppended: false,
    requestsPath: 'corpus/douyin/appComments.requests.json',
    requestsReplaced: false,
    requestsIssues: []
  }

  it('仅保存样本成功后，可以继续生成类型', () => {
    expect(canGenerateAfterStore(receipt, { mode: 'sample-only' })).toBe(true)
  })

  it('共享参数失败时，保留重试入口，不继续生成并消费待定样本', () => {
    const options: StoreOptions = { mode: 'sample-and-params', label: '公开作品评论' }
    expect(canGenerateAfterStore({ ...receipt, requestsIssues: ['请求集合无法写入'] }, options)).toBe(false)
    expect(canGenerateAfterStore({ ...receipt, requestsAppended: true }, options)).toBe(true)
  })

  it('生成只使用已经审核入库的样本，不顺带保存其他待定响应', async () => {
    let requestBody: unknown
    vi.stubGlobal('fetch', async (_path: string, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body))
      return Response.json({ written: [], removed: [], storedSamples: [], summary: [], warnings: [], note: '' })
    })
    await generateTypes({ platform: 'douyin', endpoint: 'appComments', savedOnly: true })
    expect(requestBody).toEqual({ platform: 'douyin', endpoint: 'appComments', savedOnly: true })
  })
})
