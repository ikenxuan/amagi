/**
 * corpus → 产物计划（`pnpm gen:types` 的全部生成逻辑）。
 *
 * 这一层是**整条链的接缝**：样本进、「相对路径 → 源码」出。所以测试用
 * `createCorpusSample` 造真样本走完整流程，而不是手搓一个 `CorpusSample` 字面量 ——
 * 只有走完整流程才能发现「corpus 存的是脱敏后的值，而类型是从脱敏后的值生成的」
 * 这类跨层问题。
 */

import { describe, expect, it } from 'vitest'

import { createCorpusSample, type CorpusSample, type CreateCorpusSampleInput, type JsonValue, planCorpusTypes } from '../src/index'

const RECORDED_AT = new Date('2026-09-01T00:00:00Z')
const NOW = new Date('2026-09-04T00:00:00Z')

/** 造一份入库样本。被拒的响应拿不到 sample，所以这里直接抛 —— 测试里那就是写错了 */
const sample = (overrides: Partial<CreateCorpusSampleInput> = {}): CorpusSample => {
  const result = createCorpusSample({
    platform: 'kuaishou',
    endpoint: 'videoWork',
    params: { photoId: '3xabc' },
    raw: { result: 1, photo: { photoId: '3xabc', caption: '标题' } },
    http: { status: 200 },
    amagiVersion: '7.0.0',
    recordedAt: RECORDED_AT,
    ...overrides
  })
  if (!('sample' in result)) throw new Error(`预期入库，实际被拒：${result.verdict.reason}`)
  return result.sample
}

const plan = (endpoints: Parameters<typeof planCorpusTypes>[0]['endpoints'], now = NOW) => planCorpusTypes({ endpoints, now })

describe('单类型端点', () => {
  it('产两个文件：类型文件与 barrel', () => {
    const { files } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [sample()] }])
    expect([...files.keys()]).toEqual([
      'index.ts',
      'kuaishou/VideoWork/VideoWork_V0.ts',
      'kuaishou/VideoWork/index.ts',
      'kuaishou/index.ts'
    ])
    expect(files.get('kuaishou/VideoWork/index.ts')).toBe("export type { VideoWork_V0 } from './VideoWork_V0'\n")
  })

  it('类型带文件头，且写明 `_V<n>` 不是版本号', () => {
    const { files } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [sample()] }])
    const source = files.get('kuaishou/VideoWork/VideoWork_V0.ts')!
    expect(source).toContain('自动生成，手改无意义')
    expect(source).toContain('不是 API 版本号')
    expect(source).toContain('export type VideoWork_V0 = {')
  })

  it('类型描述的是归一化后那一层（有 normalized 就用它，这是 PRD 待决 #2 的结论）', () => {
    const withNormalized = sample({ normalized: { title: '标题', durationMs: 1000 } })
    const { files } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [withNormalized] }])
    const source = files.get('kuaishou/VideoWork/VideoWork_V0.ts')!
    expect(source).toContain('durationMs: number')
    // 原始响应里的 `result` 不该出现 —— 它是信封，不是 fetcher 返回的东西
    expect(source).not.toContain('result:')
  })

  it('没有 normalize 步骤时退回原始响应', () => {
    const { files } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [sample()] }])
    expect(files.get('kuaishou/VideoWork/VideoWork_V0.ts')).toContain('result: number')
  })

  it('多份样本合并成一个类型，缺键变可选', () => {
    const two = [sample(), sample({ params: { photoId: '3xdef' }, raw: { result: 1, photo: { photoId: '3xdef' }, extra: 1 } })]
    const { files } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: two }])
    expect(files.get('kuaishou/VideoWork/VideoWork_V0.ts')).toContain('extra?: number')
  })
})

describe('判别联合端点', () => {
  /** 两个变体各两份 —— 每个变体至少两份是判别式发现能工作的前提（见 discriminant.ts 的 looksLikeId） */
  const variants: CorpusSample[] = [
    sample({ endpoint: 'userDynamicList', params: { id: 'a1' }, raw: { data: { item: { type: 'AV', archive: { bvid: 'x' } } } } }),
    sample({ endpoint: 'userDynamicList', params: { id: 'a2' }, raw: { data: { item: { type: 'AV', archive: { bvid: 'y' } } } } }),
    sample({ endpoint: 'userDynamicList', params: { id: 'b1' }, raw: { data: { item: { type: 'DRAW', pics: ['p'] } } } }),
    sample({ endpoint: 'userDynamicList', params: { id: 'b2' }, raw: { data: { item: { type: 'DRAW', pics: ['q'] } } } })
  ]

  it('自动发现判别式，按取值开目录', () => {
    const { files, summary } = plan([{ platform: 'bilibili', endpoint: 'userDynamicList', samples: variants }])
    const paths = [...files.keys()]
    expect(paths).toContain('bilibili/UserDynamicList/AV/AV_V0.ts')
    expect(paths).toContain('bilibili/UserDynamicList/DRAW/DRAW_V0.ts')
    expect(paths).toContain('bilibili/UserDynamicList/guards.ts')
    expect(summary.join('\n')).toContain('自动发现')
  })

  it('sidecar 能钉死判别式路径（欠采样时自动发现会挑错，那时得有地方写死结论）', () => {
    const { summary } = plan([
      { platform: 'bilibili', endpoint: 'userDynamicList', samples: variants, sidecar: { paths: {}, discriminantPath: 'data.item.type' } }
    ])
    expect(summary.join('\n')).toContain('sidecar 钉死')
  })

  it('sidecar 传 false 就退回单类型，不产判别联合', () => {
    const { files } = plan([
      { platform: 'bilibili', endpoint: 'userDynamicList', samples: variants, sidecar: { paths: {}, discriminantPath: false } }
    ])
    expect([...files.keys()]).toEqual([
      'bilibili/UserDynamicList/UserDynamicList_V0.ts',
      'bilibili/UserDynamicList/index.ts',
      'bilibili/index.ts',
      'index.ts'
    ])
  })

  it('只在一支里存在的路径不算孤立注释 —— 逐成员判会让其余各支都报假警报', () => {
    const { warnings } = plan([
      {
        platform: 'bilibili',
        endpoint: 'userDynamicList',
        samples: variants,
        sidecar: { paths: { 'data.item.archive.bvid': '稿件号，只有 AV 那一支有' } }
      }
    ])
    expect(warnings.filter((line) => line.includes('注释'))).toEqual([])
  })

  it('每一支都不存在的路径才报孤立', () => {
    const { warnings } = plan([
      { platform: 'bilibili', endpoint: 'userDynamicList', samples: variants, sidecar: { paths: { 'data.item.gone': '没了' } } }
    ])
    expect(warnings.join('\n')).toContain('已经在说谎')
  })
})

describe('样本筛选', () => {
  it('store-as-error 的样本不进成功类型，但要说一声（否则业务字段会全变成可选）', () => {
    const error = sample({
      platform: 'bilibili',
      endpoint: 'videoInfo',
      raw: { code: -404, message: '稿件不存在' },
      params: { bvid: 'x' }
    })
    const ok = sample({ platform: 'bilibili', endpoint: 'videoInfo', raw: { code: 0, data: { title: 't' } }, params: { bvid: 'y' } })
    const { files, summary } = plan([{ platform: 'bilibili', endpoint: 'videoInfo', samples: [error, ok] }])
    expect(files.get('bilibili/VideoInfo/VideoInfo_V0.ts')).toContain('data: Data')
    expect(summary.join('\n')).toContain('store-as-error')
  })

  it('一份可用样本都没有时不产文件', () => {
    const error = sample({ platform: 'bilibili', endpoint: 'videoInfo', raw: { code: -404 }, params: { bvid: 'x' } })
    const { files, summary } = plan([{ platform: 'bilibili', endpoint: 'videoInfo', samples: [error] }])
    // 只剩根 barrel，而且是空的那一版：它常年被 response-types 的手写 `src/index.ts`
    // re-export，零样本时也得解析得开
    expect([...files.keys()]).toEqual(['index.ts'])
    expect(files.get('index.ts')).toContain('export {}')
    expect(summary.join('\n')).toContain('没有可用样本')
  })

  it('format 不认识的样本跳过并告警 —— 静默混用两种语义比报错糟得多', () => {
    const stale = { ...sample(), format: 999 }
    const { warnings, files } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [stale] }])
    expect(warnings.join('\n')).toContain('format=999')
    expect([...files.keys()]).toEqual(['index.ts'])
  })

  it('样本过期要告警（证据可能过期，而类型看着一样绿）', () => {
    const old = sample({ recordedAt: new Date('2025-01-01T00:00:00Z') })
    const { warnings } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [old] }])
    expect(warnings.join('\n')).toContain('证据可能过期')
  })

  it('需要人决策的 finding 冒到 warnings（超界整数这类不能静默）', () => {
    // oxlint-disable-next-line no-loss-of-precision
    const unsafe = sample({ normalized: { photoId: 9007199254740993 } })
    const { warnings } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [unsafe] }])
    expect(warnings.join('\n')).toContain('JSON.parse')
  })
})

describe('确定性（--check 的前提）', () => {
  const endpoints = [
    { platform: 'kuaishou', endpoint: 'videoWork', samples: [sample()] },
    { platform: 'bilibili', endpoint: 'videoInfo', samples: [sample({ platform: 'bilibili', raw: { code: 0, data: { a: 1 } } })] }
  ]

  it('端点顺序不影响产物', () => {
    const forward = plan(endpoints)
    const reversed = plan([...endpoints].reverse())
    expect([...reversed.files.keys()]).toEqual([...forward.files.keys()])
    for (const [path, content] of forward.files) expect(reversed.files.get(path)).toBe(content)
  })

  it('文件按路径排序', () => {
    const paths = [...plan(endpoints).files.keys()]
    expect(paths).toEqual([...paths].sort())
  })

  it('每个文件都以换行结尾（跟 gen-openapi 的产物契约一致）', () => {
    for (const content of plan(endpoints).files.values()) expect(content.endsWith('\n')).toBe(true)
  })

  it('产物里不含回车（行尾归一在写盘那层，源码本身就得是 LF）', () => {
    for (const content of plan(endpoints).files.values()) expect(content).not.toContain('\r')
  })

  it('空 corpus 只产一个空的根 barrel，不炸', () => {
    const { files } = plan([])
    expect([...files.keys()]).toEqual(['index.ts'])
    expect(files.get('index.ts')).toContain('export {}')
  })

  it('平台 barrel 加完整平台名前缀 —— 端点名跨平台会重复（emojiList 三个平台都有）', () => {
    const { files } = plan([
      { platform: 'kuaishou', endpoint: 'emojiList', samples: [sample({ endpoint: 'emojiList' })] },
      { platform: 'bilibili', endpoint: 'emojiList', samples: [sample({ platform: 'bilibili', endpoint: 'emojiList', raw: { code: 0 } })] }
    ])
    expect(files.get('kuaishou/index.ts')).toContain('EmojiList_V0 as KuaishouEmojiList_V0')
    expect(files.get('bilibili/index.ts')).toContain('EmojiList_V0 as BilibiliEmojiList_V0')
    // 根 barrel 摊平（不是命名空间）：core 的 tsdown 解析不开 `export * as X`
    expect(files.get('index.ts')).toContain("export type * from './kuaishou'")
  })
})

describe('脱敏与生成的接缝', () => {
  it('类型是从脱敏后的值生成的，所以产物里不含真值 —— 但形状照样对', () => {
    const real: JsonValue = { result: 1, photo: { userId: 114514, caption: '真昵称', coverUrl: 'https://cdn.example.com/a.jpg' } }
    const stored = sample({ raw: real })
    const { files } = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [stored] }])
    const source = files.get('kuaishou/VideoWork/VideoWork_V0.ts')!
    expect(source).toContain('userId: number')
    expect(source).toContain('coverUrl: string')
    expect(source).not.toContain('114514')
    expect(source).not.toContain('真昵称')
  })
})
