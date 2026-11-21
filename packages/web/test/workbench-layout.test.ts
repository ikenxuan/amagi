import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { RecordOutcome } from '../shared/contract'

vi.stubGlobal('location', new URL('http://localhost:5190/'))
const sampleModule = '../src/components/WorkbenchReview'
const { WorkbenchReview: SamplePane } = (await import(sampleModule)) as { WorkbenchReview: (props: Record<string, unknown>) => ReactNode }
const paramModule = '../src/components/ParamForm'
const { ParamField } = (await import(paramModule)) as { ParamField: (props: Record<string, unknown>) => ReactNode }
const dockModule = '../src/components/ResponseDock'
const { ResponseDock } = (await import(dockModule)) as { ResponseDock: (props: Record<string, unknown>) => ReactNode }
const diagnostic = '深层字段变更说明'.repeat(80)
const outcome: RecordOutcome = {
  ok: true,
  pendingId: 'review-one',
  verdict: { kind: 'store', reason: diagnostic },
  direction: 'success',
  nextShapeIndex: 3,
  payload: { status_code: 0 },
  breaking: Array.from({ length: 80 }, (_, index) => `${index}: ${diagnostic}`)
}

const renderReview = (overrides: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(SamplePane, {
      workbench: true,
      outcome,
      payloadView: 'raw',
      busy: false,
      stored: 2,
      computed: false,
      consumed: false,
      generateLoading: false,
      generateLabel: '保存并生成类型',
      endpointLabel: 'douyin/appVideoWork',
      onStore: async () => {},
      onDiscard: async () => {},
      onGenerate: async () => {},
      onSaveOnly: async () => {},
      onDirectionChange: async () => {},
      onShapeChoiceChange: () => {},
      ...overrides
    })
  )

describe('底部响应面板', () => {
  it.each([false, true])('默认收起，有历史响应也不抢占请求区（窄屏：%s）', (narrow) => {
    const html = renderToStaticMarkup(
      createElement(ResponseDock, {
        narrow,
        request: createElement('input', { name: 'keyword', defaultValue: '已有参数' }),
        response: createElement('p', null, '响应内容'),
        inspector: createElement('p', null, '审核内容'),
        requestKey: 'douyin/search',
        responseKey: 'previous-response'
      })
    )
    expect(html).toContain('value="已有参数"')
    expect(html).toMatch(/aria-label="展开响应面板"[^>]*aria-expanded="false"/)
    expect(html).toMatch(/id="response-dock-content"[^>]*hidden=""[^>]*inert=""/)
    expect(html).toContain('响应已就绪')
    expect(html).toMatch(/aria-label="调整响应面板高度"[^>]*role="separator"/)
  })
})

describe('工作台审核区的空间与可操作性', () => {
  it('长字段说明按需打开，不挤占参数控件的位置', () => {
    const html = renderToStaticMarkup(
      createElement(ParamField, {
        name: 'aweme_id',
        field: { type: 'string', description: diagnostic },
        isRequired: true,
        onEdit: () => {}
      })
    )
    expect(html).not.toContain(diagnostic)
    expect(html).toContain('参数说明：aweme_id')
    expect(html).toContain('name="aweme_id"')
  })
  it('长诊断按需打开，默认页面仍提供保存动作', () => {
    const html = renderReview()
    expect(html).not.toContain(diagnostic)
    expect(html).toContain('诊断详情')
    expect(html).toContain('保存并生成类型')
  })

  it('保存动作在独立 footer 中，诊断及字段内容不会将它推离面板', () => {
    const html = renderReview()
    const footer = /<footer\b[\s\S]*?<\/footer>/.exec(html)?.[0]
    expect(footer).toBeDefined()
    expect(footer).toContain('保存并生成类型')
    expect(footer).toContain('仅保存样本')
    expect(footer).not.toContain(diagnostic)
  })

  it('已入库样本可继续生成，失效的保存和丢弃操作不出现', () => {
    const html = renderReview({ saved: true, generateLabel: '生成类型' })
    expect(html).toContain('生成类型')
    expect(html).not.toContain('仅保存样本')
    expect(html).not.toContain('丢弃这份样本')
  })
})
