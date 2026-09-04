import type { AnyEndpointDef, Registry } from 'amagi/contracts/endpoint'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
/**
 * `doc.summary` 的防漂移钉子（PRD 阶段 8.1 第 2 项判据）。
 *
 * OpenAPI 规范由 `scripts/gen-openapi.mts` 从这四个注册表派生，
 * `summary` 是规范里唯一「面向人」的必需文案 —— 新增端点忘了写，
 * 生成的 API 参考就会出现一个没有说明的端点卡片。这里让它过不了 CI。
 *
 * 约定（与 `contracts/endpoint.ts` 的 `EndpointDoc` JSDoc 一致）：
 * 中文名词短语、不带句号、≤40 字。
 */
import { describe, expect, it } from 'vitest'

const SUMMARY_MAX = 40

/** 端点数与阶段 1–4 的迁移清单逐条对齐，改动即说明有端点增删 */
const REGISTRIES: ReadonlyArray<readonly [platform: string, registry: Registry, count: number]> = [
  ['douyin', douyinRegistry, 19],
  ['bilibili', bilibiliRegistry, 27],
  ['kuaishou', kuaishouRegistry, 7],
  ['xiaohongshu', xiaohongshuRegistry, 7]
]

const entriesOf = (registry: Registry): Array<[string, AnyEndpointDef]> => Object.entries(registry)

describe('endpoint doc.summary - 每个端点都有一句人话', () => {
  it.each(REGISTRIES)('%s 的端点数与阶段 1–4 的迁移清单一致', (_platform, registry, count) => {
    expect(entriesOf(registry)).toHaveLength(count)
  })

  it('四个注册表合计 60 个端点', () => {
    const total = REGISTRIES.reduce((n, [, registry]) => n + entriesOf(registry).length, 0)
    expect(total).toBe(60)
  })

  for (const [platform, registry] of REGISTRIES) {
    describe(platform, () => {
      it.each(entriesOf(registry))(`${platform}.%s 的 summary 非空、≤${SUMMARY_MAX} 字、不带句号`, (_short, def) => {
        const summary = def.doc?.summary
        expect(summary, `${def.name} 缺 doc.summary（新增端点必须写，见 EndpointDoc 的 JSDoc）`).toBeTruthy()
        expect(typeof summary).toBe('string')
        // 字符数而非 UTF-16 长度：Array.from 按码点拆，中文与 emoji 都算一个
        expect(Array.from(summary as string).length).toBeLessThanOrEqual(SUMMARY_MAX)
        expect(summary).toBe((summary as string).trim())
        expect(summary).not.toMatch(/[。.!?！？]$/)
      })

      it('同平台内 summary 互不重复（重复说明两个端点的说明没写清区别）', () => {
        const summaries = entriesOf(registry).map(([, def]) => def.doc?.summary)
        expect(new Set(summaries).size).toBe(summaries.length)
      })
    })
  }
})
