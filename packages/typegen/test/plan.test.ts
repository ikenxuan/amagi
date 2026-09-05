/**
 * corpus → 产物计划（`pnpm gen:types` 的全部生成逻辑）。
 *
 * 这一层是**整条链的接缝**：样本进、「相对路径 → 源码」出。所以测试用
 * `createCorpusSample` 造真样本走完整流程，而不是手搓一个 `CorpusSample` 字面量 ——
 * 只有走完整流程才能发现「corpus 存的是脱敏后的值，而类型是从脱敏后的值生成的」
 * 这类跨层问题。
 */

import { describe, expect, it } from 'vitest'

import {
  createCorpusSample,
  type CorpusSample,
  type CreateCorpusSampleInput,
  type DocSidecar,
  type JsonValue,
  planCorpusTypes
} from '../src/index'

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

/**
 * 产物里指向不存在文件的 `from './x'`。
 *
 * 当不变量用，而不是只在某一条里断言：比对文件清单能钉住「该产的都产了」，钉不住
 * 「产出来的东西彼此对得上」—— 而 barrel 里留一条指向不存在模块的 export，后果是
 * **整棵树编译不过**，比少一个端点严重得多（少一个端点只是那个端点没有类型）。
 *
 * 目录写法（`./Comments`）解析到该目录的 barrel，文件写法（`./UserDynamicList/guards`）
 * 解析到文件本身 —— 两种写法产物里都有。
 */
const danglingImports = (files: ReadonlyMap<string, string>): string[] => {
  const dangling: string[] = []
  for (const [path, source] of files) {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    for (const [, target] of source.matchAll(/from '\.\/([^']+)'/g)) {
      const resolved = [dir, target].filter(Boolean).join('/')
      if (!files.has(`${resolved}.ts`) && !files.has(`${resolved}/index.ts`)) dangling.push(`${path} → ${target}`)
    }
  }
  return dangling
}

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

  it('**声明了却从未出现的取值进 warnings** —— PRD 1.1 那个「缺口有多大没人知道」的缺口', () => {
    const { warnings } = plan([
      {
        platform: 'bilibili',
        endpoint: 'userDynamicList',
        samples: variants,
        // 样本里只有 AV / DRAW，而声明里还有两个没录到
        sidecar: { paths: {}, declaredValues: ['AV', 'DRAW', 'WORD', 'LIVE_RCMD'] }
      }
    ])
    const line = warnings.find((text) => text.includes('从未出现'))
    expect(line).toContain('WORD')
    expect(line).toContain('LIVE_RCMD')
    // 要人做决定的东西进 warnings 而不是 summary（后者是告知性的）
    expect(line).toContain('要么补样本，要么这些成员该删')
  })

  it('**样本里出现但没声明的取值也进 warnings** —— 反向漂移更急：下游按枚举分支会漏掉整支', () => {
    const { warnings } = plan([
      { platform: 'bilibili', endpoint: 'userDynamicList', samples: variants, sidecar: { paths: {}, declaredValues: ['AV'] } }
    ])
    const line = warnings.find((text) => text.includes('没声明的取值'))
    expect(line).toContain('DRAW')
    expect(line).toContain('手写枚举漂移了')
  })

  it('没给 declaredValues 就一条漂移警告都不报（不猜人有没有清单）', () => {
    const { warnings } = plan([{ platform: 'bilibili', endpoint: 'userDynamicList', samples: variants }])
    expect(warnings.filter((text) => text.includes('从未出现') || text.includes('没声明的取值'))).toEqual([])
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
    const { files, warnings } = plan([
      {
        platform: 'bilibili',
        endpoint: 'userDynamicList',
        samples: variants,
        sidecar: { paths: { 'data.item.archive.bvid': '稿件号，只有 AV 那一支有' } }
      }
    ])
    expect(warnings.filter((line) => line.includes('注释'))).toEqual([])
    // 没报假警报是一件事，注释真的落进产物是另一件。同一份 docs 喂给了每一支
    // （emit.ts 里各成员共用 `options.docs`），所以还得钉住它**只**落在真有那个字段的那一支上
    expect(files.get('bilibili/UserDynamicList/AV/AV_V0.ts')).toContain('稿件号，只有 AV 那一支有')
    expect(files.get('bilibili/UserDynamicList/DRAW/DRAW_V0.ts')).not.toContain('稿件号')
  })

  it('每一支都不存在的路径才报孤立', () => {
    const { files, warnings } = plan([
      { platform: 'bilibili', endpoint: 'userDynamicList', samples: variants, sidecar: { paths: { 'data.item.gone': '没了' } } }
    ])
    expect(warnings.join('\n')).toContain('已经在说谎')
    // 报了警还不够：这句话不许出现在任何一支的产物里 —— 挂到别的字段上比丢掉更糟，
    // 丢了只是少一句说明，挂错了是产物在骗人，而它看起来跟正常注释一模一样
    expect([...files.values()].join('\n')).not.toContain('没了')
  })

  /**
   * 16 位、横跨 `Number.MAX_SAFE_INTEGER` 的 ID。脱敏**故意**保住「超界」这一侧
   * （scrub.ts 的 STRADDLING_DIGITS），所以它进了样本还是超界的 —— 这正是 PRD 五规则表
   * 最后一行「数字看起来像 ID 且超过 MAX_SAFE_INTEGER → 标注出来让人决策」要抓的那类值。
   */
  // oxlint-disable-next-line no-loss-of-precision
  const UNSAFE_ID = 9007199254740993

  const unsafeVariants: CorpusSample[] = [
    sample({ endpoint: 'userDynamicList', params: { id: 'c1' }, raw: { data: { item: { type: 'AV', archive: { aid: UNSAFE_ID } } } } }),
    sample({ endpoint: 'userDynamicList', params: { id: 'c2' }, raw: { data: { item: { type: 'AV', archive: { aid: UNSAFE_ID } } } } }),
    sample({ endpoint: 'userDynamicList', params: { id: 'd1' }, raw: { data: { item: { type: 'DRAW', pics: ['p'] } } } }),
    sample({ endpoint: 'userDynamicList', params: { id: 'd2' }, raw: { data: { item: { type: 'DRAW', pics: ['q'] } } } })
  ]

  it('**各支的合并报告也要冒到 warnings** —— 同一个超界 ID，退回单类型时报了，走判别联合时一条都没有', () => {
    const asUnion = plan([{ platform: 'bilibili', endpoint: 'userDynamicList', samples: unsafeVariants }])
    const asSingle = plan([
      { platform: 'bilibili', endpoint: 'userDynamicList', samples: unsafeVariants, sidecar: { paths: {}, discriminantPath: false } }
    ])
    // 前提：这批样本真的走了判别联合那条路，否则这条测的是别的东西
    expect([...asUnion.files.keys()]).toContain('bilibili/UserDynamicList/AV/AV_V0.ts')
    expect(asSingle.warnings.join('\n')).toContain('MAX_SAFE_INTEGER')
    expect(asUnion.warnings.join('\n')).toContain('MAX_SAFE_INTEGER')
    // 报出来还得说清是哪一支的哪个字段，否则人拿着告警找不到地方
    expect(asUnion.warnings.join('\n')).toContain('data.item.archive.aid')
    expect(asUnion.warnings.join('\n')).toContain('AV')
  })

  it('判别路径上读不到取值的样本不许静默丢掉 —— 它的形状整个没进类型', () => {
    const odd = sample({ endpoint: 'userDynamicList', params: { id: 'z9' }, raw: { data: { item: { archive: { bvid: 'z' } } } } })
    const { warnings } = plan([
      {
        platform: 'bilibili',
        endpoint: 'userDynamicList',
        samples: [...variants, odd],
        // 钉死判别式：这条测的是「读不到取值怎么办」，不是自动发现会挑哪条路径
        sidecar: { paths: {}, discriminantPath: 'data.item.type' }
      }
    ])
    const line = warnings.find((text) => text.includes('读不到'))
    expect(line).toBeDefined()
    // 报下标没用（那是过滤后数组里的位置），报参数哈希才找得到东西：corpus 里的样本文件名就是它
    expect(line).toContain(odd.metadata.paramsHash)
  })

  it('emit 的 notes 进 summary —— 「未产 <Endpoint>/index.ts」这类结论烂在返回值里等于没说', () => {
    const { summary } = plan([{ platform: 'bilibili', endpoint: 'userDynamicList', samples: variants }])
    expect(summary.join('\n')).toContain('未产 UserDynamicList/index.ts')
  })

  describe('钉死的判别式失效时：宁可不产，也不要产一个编译不过的产物', () => {
    it('钉的路径含 `[]` → 这个端点一个文件都不产，barrel 里也不留那条 export', () => {
      const { files, warnings } = plan([
        {
          platform: 'bilibili',
          endpoint: 'userDynamicList',
          samples: variants,
          sidecar: { paths: {}, discriminantPath: 'data.items[].type' }
        }
      ])
      // 实测：emit 对含 `[]` 的路径早退、不产任何文件，而 barrel 照写
      // `from './UserDynamicList/guards'` —— 产物里只剩两个 barrel，整棵树编译不过
      expect(danglingImports(files)).toEqual([])
      expect([...files.keys()]).toEqual(['index.ts'])
      expect(warnings.join('\n')).toContain('data.items[].type')
    })

    it('钉的路径在所有样本上都读不到 → 同样一个文件都不产，而不是产一个空联合的 guards.ts', () => {
      const { files, warnings } = plan([
        { platform: 'bilibili', endpoint: 'userDynamicList', samples: variants, sidecar: { paths: {}, discriminantPath: 'data.item.kind' } }
      ])
      expect([...files.keys()]).toEqual(['index.ts'])
      expect(warnings.join('\n')).toContain('data.item.kind')
    })

    it('判别联合正常产出时，barrel 那条 export 指向真的存在的 guards.ts', () => {
      const { files } = plan([{ platform: 'bilibili', endpoint: 'userDynamicList', samples: variants }])
      expect(danglingImports(files)).toEqual([])
      expect(files.get('bilibili/index.ts')).toContain("from './UserDynamicList/guards'")
    })
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

describe('溯源块（样本不进 git，所以产物是唯一的证据记录）', () => {
  const source = (samples: readonly CorpusSample[]) =>
    plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples }]).files.get('kuaishou/VideoWork/VideoWork_V0.ts')!

  it('列出份数、录制日期、参数键与 amagi 版本', () => {
    const text = source([sample()])
    expect(text).toContain('证据：1 份样本（amagi 7.0.0）')
    expect(text).toContain('2026-09-01')
    expect(text).toContain('photoId')
  })

  it('**只写日期不写「距今多少天」** —— 相对量会让同一批样本隔天生成出不同的文件', () => {
    const one = sample()
    const later = plan([{ platform: 'kuaishou', endpoint: 'videoWork', samples: [one] }], new Date('2027-01-01T00:00:00Z'))
    // `now` 差了四个月，产物必须逐字节相同（否则 `--check` 会隔天就红）
    expect(later.files.get('kuaishou/VideoWork/VideoWork_V0.ts')).toBe(source([one]))
  })

  it('参数只写键名不写值 —— 值会跟着脱敏实现的每次调整刷 diff', () => {
    const text = source([sample({ params: { photoId: '3xabc' } })])
    expect(text).toContain('photoId')
    expect(text).not.toContain('3xabc')
  })

  it('没进类型的样本不列进溯源 —— 列了会让人以为它贡献了形状', () => {
    const rejected = sample({
      platform: 'bilibili',
      endpoint: 'videoInfo',
      raw: { code: -404, message: '稿件不存在' },
      params: { bvid: 'x' }
    })
    const ok = sample({ platform: 'bilibili', endpoint: 'videoInfo', raw: { code: 0, data: { title: 't' } }, params: { bvid: 'y' } })
    const { files } = plan([{ platform: 'bilibili', endpoint: 'videoInfo', samples: [rejected, ok] }])
    const text = files.get('bilibili/VideoInfo/VideoInfo_V0.ts')!
    expect(text).toContain('证据：1 份样本')
    expect(text).not.toContain(rejected.metadata.paramsHash)
    expect(text).toContain(ok.metadata.paramsHash)
  })

  it('样本顺序不影响溯源块（确定性）', () => {
    const a = sample({ params: { photoId: '3xaaa' } })
    const b = sample({ params: { photoId: '3xbbb' } })
    expect(source([a, b])).toBe(source([b, a]))
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

/**
 * **sidecar 注释真的进了产物** —— PRD 阶段 3 点名的那个缺陷（第 433-442 行）。
 *
 * 缺陷长这样：`generateOne`（`packages/web/server/index.ts`）调 `planCorpusTypes` 时**不传
 * sidecar**，于是界面上点一次「生成这个端点的类型」，产物里人手写的语义注释整批消失
 * （实测 `VideoInfo_V0.ts` 掉了 5 条）。而这件事当场无声：少了注释的产物编译照样过、
 * `warnings` 一个字都没有、肉眼看也是一份正常的类型，要等下一个人跑 `types:check` 才暴露。
 *
 * 所以这一组断言的是**产物文本**。上面那几条孤立注释的用例测的是「注释没落上去时有没有人
 * 被告知」（`warnings`），钉不住反面 —— 「该落上去的那些真的在文件里」。
 */
describe('sidecar 注释真的进了产物', () => {
  /**
   * PRD 点名的那条。挑它是因为它丢了会真的害到人：拿 `aid` 当 `cid` 去请求视频流，
   * 拿到的是别的东西而不是报错。也因为它是最难自动推出来的那类知识 ——
   * 样本里 `cid` 就是个数字，形状上与 `aid` 毫无区别。
   */
  const CID_DOC = '**分P 的 ID，不是稿件的** —— 拿错会请求到别的东西'
  /** 指向已经不存在的字段的那一条（字段被删了或改名了） */
  const ORPHAN_DOC = '这个键上一版就没了'

  const videoInfo = sample({
    platform: 'bilibili',
    endpoint: 'videoInfo',
    params: { bvid: 'BV1xx' },
    raw: { code: 0, data: { bvid: 'BV1xx', cid: 1362321, title: 't' } }
  })

  const sourceWith = (sidecar?: DocSidecar): string => {
    const endpoint = { platform: 'bilibili', endpoint: 'videoInfo', samples: [videoInfo] }
    const { files } = plan([sidecar === undefined ? endpoint : { ...endpoint, sidecar }])
    return files.get('bilibili/VideoInfo/VideoInfo_V0.ts')!
  }

  it('**注释原文逐字进产物，且挂在它说的那个字段上**', () => {
    const source = sourceWith({ paths: { 'data.cid': CID_DOC } })
    expect(source).toContain(CID_DOC)
    // 逐字出现在文件里还不够 —— 得挂在 `cid` 上。JSDoc 紧贴属性那一行，中间不许有别的东西
    expect(source).toContain(`/** ${CID_DOC} */\n  cid:`)
  })

  it('**不传 sidecar 时这句话一个字都没有** —— 这就是缺陷本身的形状', () => {
    const source = sourceWith()
    // 前提：形状本身一模一样，两条路差的只可能是注释（否则这条测的是别的东西）
    expect(source).toContain('cid:')
    expect(source).not.toContain(CID_DOC)
    expect(source).not.toContain('分P')
  })

  it('**指向不存在字段的注释在产物里一个字都找不到** —— 同一份 sidecar 里的好注释照落', () => {
    const { files, warnings } = plan([
      {
        platform: 'bilibili',
        endpoint: 'videoInfo',
        samples: [videoInfo],
        sidecar: { paths: { 'data.cid': CID_DOC, 'data.gone': ORPHAN_DOC } }
      }
    ])
    expect(warnings.join('\n')).toContain('已经在说谎')
    const all = [...files.values()].join('\n')
    expect(all).toContain(CID_DOC)
    // 挂错字段比丢掉更糟：丢了只是少一句说明，挂错了是产物在骗人，而它看起来跟正常注释一样
    expect(all).not.toContain(ORPHAN_DOC)
  })
})
