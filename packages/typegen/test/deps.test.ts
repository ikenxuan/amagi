/**
 * 种子与依赖图（PRD 阶段 1、3.1）。
 *
 * 端点名与路径都照快手 / B站的真形状写（`data.feeds[].photo.photoId` 这种），
 * 因为依赖图的价值全在「路径写得对不对」上 —— 用 `a.b.c` 那样的假路径测不出
 * 「跨数组要不要摊开」这类真问题。
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectSeedsFromSamples,
  type DependencyEdge,
  type JsonValue,
  parseSeedFile,
  planRecordingOrder,
  readValuesAtPath,
  resolveSeeds,
  type SeedFile
} from '../src/index'

const SEEDS: SeedFile = {
  version: 1,
  platforms: {
    kuaishou: { params: { uid: ['3xabc'], keyword: ['猫'] }, endpoints: { userVideoList: { uid: ['3xdef', '3xghi'] } } },
    bilibili: { params: { uid: [11111] } }
  }
}

describe('种子：平台级 + 端点级', () => {
  it('端点级覆盖平台级', () => {
    expect(resolveSeeds(SEEDS, 'kuaishou', 'userVideoList')).toEqual({ uid: ['3xdef', '3xghi'], keyword: ['猫'] })
  })

  it('没有端点级覆盖时用平台级', () => {
    expect(resolveSeeds(SEEDS, 'kuaishou', 'videoWork')).toEqual({ uid: ['3xabc'], keyword: ['猫'] })
  })

  it('没登记的平台返回空对象，不炸', () => {
    expect(resolveSeeds(SEEDS, 'xiaohongshu', 'anything')).toEqual({})
  })
})

describe('种子文件解析：人手改的文件，坏了要说清坏在哪', () => {
  it('正常文件解析出来没有错误', () => {
    const raw: JsonValue = { version: 1, platforms: { kuaishou: { params: { uid: ['3xabc'] } } } }
    const { seeds, errors } = parseSeedFile(raw)
    expect(errors).toEqual([])
    expect(resolveSeeds(seeds, 'kuaishou', 'x')).toEqual({ uid: ['3xabc'] })
  })

  it('取值写成字符串而不是数组 → 报出具体路径，其余照常解析', () => {
    const raw: JsonValue = { version: 1, platforms: { kuaishou: { params: { uid: '3xabc', mid: ['ok'] } } } }
    const { seeds, errors } = parseSeedFile(raw)
    expect(errors).toEqual(['platforms.kuaishou.params.uid 不是数组'])
    expect(resolveSeeds(seeds, 'kuaishou', 'x')).toEqual({ mid: ['ok'] })
  })

  it('空数组等于没给种子，也要报 —— 静默的话人会以为种子生效了', () => {
    const { errors } = parseSeedFile({ version: 1, platforms: { kuaishou: { params: { uid: [] } } } })
    expect(errors[0]).toContain('空数组')
  })

  it('缺 version 按 1 处理但要报一句', () => {
    const { seeds, errors } = parseSeedFile({ platforms: {} })
    expect(seeds.version).toBe(1)
    expect(errors[0]).toContain('version')
  })

  it('根不是对象、或者缺 platforms → 退化成空种子，不抛异常', () => {
    expect(parseSeedFile([]).errors[0]).toContain('根不是对象')
    expect(parseSeedFile({ version: 1 }).errors[0]).toContain('platforms')
  })

  it('把 params 拼错成 parms 要报出来 —— 静默当成「没给种子」是最难查的那种错', () => {
    const { errors } = parseSeedFile({ version: 1, platforms: { kuaishou: { parms: { uid: ['x'] } } } })
    expect(errors).toEqual(['platforms.kuaishou.parms 不是认识的键'])
  })

  it('`$comment` 是约定的注释键，不报错（JSON 没有注释）', () => {
    const raw: JsonValue = { version: 1, platforms: { kuaishou: { $comment: '这里放公开账号的 uid', params: { uid: ['x'] } } } }
    expect(parseSeedFile(raw).errors).toEqual([])
  })

  it('仓库里那份 corpus/seeds.json 本身是合法的（它是人手改的，得有东西盯着）', () => {
    const path = new URL('../../../corpus/seeds.json', import.meta.url)
    const parsed = parseSeedFile(JSON.parse(readFileSync(path, 'utf8')) as JsonValue)
    expect(parsed.errors).toEqual([])
    // 快手那几个 photoId 是实测用过的公开作品，别在重构里丢掉
    expect(resolveSeeds(parsed.seeds, 'kuaishou', 'videoWork').photoId).toBeDefined()
  })
})

describe('按路径取值', () => {
  const feed: JsonValue = {
    data: {
      feeds: [{ photo: { photoId: '3xa', caption: '一' } }, { photo: { photoId: '3xb', caption: '二' } }, { photo: { photoId: null } }]
    }
  }

  it('跨数组摊开，一份列表能喂出多个 ID', () => {
    expect(readValuesAtPath(feed, 'data.feeds[].photo.photoId')).toEqual(['3xa', '3xb'])
  })

  it('null 与缺键都被丢掉 —— 当种子没用，留着会让计数骗人', () => {
    expect(readValuesAtPath({ a: { b: null } }, 'a.b')).toEqual([])
    expect(readValuesAtPath({ a: {} }, 'a.b')).toEqual([])
  })

  it('路径中途类型不对时返回空，不抛', () => {
    expect(readValuesAtPath({ a: 1 }, 'a.b.c')).toEqual([])
  })

  it('根是数组时用 `[]` 开头', () => {
    expect(readValuesAtPath([{ id: 1 }, { id: 2 }], '[].id')).toEqual([1, 2])
  })

  it('嵌套两层数组要摊两次', () => {
    const nested: JsonValue = { pages: [{ items: [{ id: 1 }, { id: 2 }] }, { items: [{ id: 3 }] }] }
    expect(readValuesAtPath(nested, 'pages[].items[].id')).toEqual([1, 2, 3])
  })

  it('空路径返回根本身', () => {
    expect(readValuesAtPath({ a: 1 }, '')).toEqual([{ a: 1 }])
  })
})

describe('依赖图：从上游响应里抽下游要的参数', () => {
  const edges: DependencyEdge[] = [
    { endpoint: 'videoWork', param: 'photoId', from: 'userVideoList', path: 'data.feeds[].photo.photoId', limit: 2 },
    { endpoint: 'comments', param: 'photoId', from: 'userVideoList', path: 'data.feeds[].photo.photoId', limit: 1 }
  ]
  const recorded: Record<string, JsonValue[]> = {
    userVideoList: [{ data: { feeds: [{ photo: { photoId: '3xa' } }, { photo: { photoId: '3xb' } }, { photo: { photoId: '3xc' } }] } }]
  }

  it('抽出来的形状能直接喂给 expandParamMatrix 的 seeds', () => {
    expect(collectSeedsFromSamples(edges, recorded)).toEqual({
      videoWork: { photoId: ['3xa', '3xb'] },
      comments: { photoId: ['3xa'] }
    })
  })

  it('limit 卡住数量 —— 不限的话一份列表能喂出几十个详情请求', () => {
    const many: Record<string, JsonValue[]> = {
      userVideoList: [{ data: { feeds: Array.from({ length: 50 }, (_, index) => ({ photo: { photoId: `p${index}` } })) } }]
    }
    expect(collectSeedsFromSamples(edges, many).videoWork!.photoId).toHaveLength(2)
  })

  it('跨多份上游样本去重', () => {
    const duplicated: Record<string, JsonValue[]> = {
      userVideoList: [{ data: { feeds: [{ photo: { photoId: '3xa' } }] } }, { data: { feeds: [{ photo: { photoId: '3xa' } }] } }]
    }
    expect(collectSeedsFromSamples(edges, duplicated).videoWork!.photoId).toEqual(['3xa'])
  })

  it('上游一份都没录到时不产生空条目（`{photoId: []}` 会让下游以为有种子）', () => {
    expect(collectSeedsFromSamples(edges, {})).toEqual({})
  })

  it('同一端点的多个参数合进一条', () => {
    const twoParams: DependencyEdge[] = [
      { endpoint: 'comments', param: 'photoId', from: 'list', path: 'items[].id' },
      { endpoint: 'comments', param: 'uid', from: 'list', path: 'items[].uid' }
    ]
    const samples: Record<string, JsonValue[]> = { list: [{ items: [{ id: 'a', uid: 'u1' }] }] }
    expect(collectSeedsFromSamples(twoParams, samples)).toEqual({ comments: { photoId: ['a'], uid: ['u1'] } })
  })
})

describe('录制顺序', () => {
  it('被依赖的端点排前面', () => {
    const edges: DependencyEdge[] = [{ endpoint: 'videoWork', param: 'photoId', from: 'userVideoList', path: 'x' }]
    const plan = planRecordingOrder(['videoWork', 'userVideoList'], edges)
    expect(plan.order).toEqual(['userVideoList', 'videoWork'])
    expect(plan.cycles).toEqual([])
  })

  it('多层链条按层排', () => {
    const edges: DependencyEdge[] = [
      { endpoint: 'comments', param: 'photoId', from: 'videoWork', path: 'x' },
      { endpoint: 'videoWork', param: 'photoId', from: 'userVideoList', path: 'x' }
    ]
    expect(planRecordingOrder(['comments', 'videoWork', 'userVideoList'], edges).order).toEqual(['userVideoList', 'videoWork', 'comments'])
  })

  it('环报出来（这不是理论情形：列表要 uid、详情的作者又能给 uid）', () => {
    const edges: DependencyEdge[] = [
      { endpoint: 'videoWork', param: 'photoId', from: 'userVideoList', path: 'x' },
      { endpoint: 'userVideoList', param: 'uid', from: 'videoWork', path: 'y' }
    ]
    const plan = planRecordingOrder(['videoWork', 'userVideoList'], edges)
    expect(plan.cycles).toEqual([['userVideoList', 'videoWork']])
    // 环里的端点仍然要录（通常靠种子就能起步），只是排在最后
    expect(plan.order.sort()).toEqual(['userVideoList', 'videoWork'])
  })

  it('两个互不相干的环分成两组', () => {
    const edges: DependencyEdge[] = [
      { endpoint: 'a1', param: 'p', from: 'a2', path: 'x' },
      { endpoint: 'a2', param: 'p', from: 'a1', path: 'x' },
      { endpoint: 'b1', param: 'p', from: 'b2', path: 'x' },
      { endpoint: 'b2', param: 'p', from: 'b1', path: 'x' }
    ]
    expect(planRecordingOrder(['a1', 'a2', 'b1', 'b2'], edges).cycles).toEqual([
      ['a1', 'a2'],
      ['b1', 'b2']
    ])
  })

  it('自环不算环（端点从自己的响应里取值，录第二轮时有意义）', () => {
    const edges: DependencyEdge[] = [{ endpoint: 'feed', param: 'cursor', from: 'feed', path: 'pcursor' }]
    const plan = planRecordingOrder(['feed'], edges)
    expect(plan.cycles).toEqual([])
    expect(plan.order).toEqual(['feed'])
  })

  it('指向不存在端点的边单独报出来 —— 大概是端点改名了，边没跟着改', () => {
    const edges: DependencyEdge[] = [{ endpoint: 'videoWork', param: 'photoId', from: 'oldNameList', path: 'x' }]
    const plan = planRecordingOrder(['videoWork'], edges)
    expect(plan.danglingEdges).toHaveLength(1)
    expect(plan.order).toEqual(['videoWork'])
  })

  it('没有边时顺序就是原顺序（确定性）', () => {
    expect(planRecordingOrder(['c', 'a', 'b'], []).order).toEqual(['c', 'a', 'b'])
  })
})
