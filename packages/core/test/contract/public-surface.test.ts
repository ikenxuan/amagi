import * as amagiEntry from 'amagi/index'
/**
 * v6 公开导出面契约 —— 迁移成本的度量尺。
 *
 * 这里把 `@ikenxuan/amagi` 的入口导出逐个钉死：名字、运行时类型、
 * 静态属性、客户端实例形状。v7 之后本文件的 snapshot 若发生变化，
 * 每一条差异都必须在迁移文档中有对应说明，否则就是无声的 breaking change。
 */
import { describe, expect, it } from 'vitest'

const kindOf = (value: unknown): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'function') return 'function'
  return typeof value
}

describe('入口导出清单', () => {
  it('导出名列表被锁定', () => {
    expect(Object.keys(amagiEntry).sort()).toMatchSnapshot()
  })

  it('每个导出的运行时类型被锁定', () => {
    const shape: Record<string, string> = {}
    for (const [name, value] of Object.entries(amagiEntry)) {
      shape[name] = kindOf(value)
    }
    expect(shape).toMatchSnapshot()
  })

  it('导出数量不为 0（防止 barrel 在重构中被整体打断）', () => {
    expect(Object.keys(amagiEntry).length).toBeGreaterThan(50)
  })
})

describe('默认导出 / amagi / CreateApp 三者同源', () => {
  it('default === amagi === CreateApp', () => {
    expect(amagiEntry.default).toBe(amagiEntry.amagi)
    expect(amagiEntry.default).toBe(amagiEntry.CreateApp)
  })

  it('既能函数调用也能 new 调用，且返回等价形状', () => {
    const Client = amagiEntry.default
    const byCall = Client({})
    const byNew = new Client({})

    expect(Object.keys(byCall).sort()).toEqual(Object.keys(byNew).sort())
  })

  it('不传参数也能创建', () => {
    expect(() => amagiEntry.default()).not.toThrow()
  })
})

describe('构造函数上的静态属性', () => {
  const STATIC_KEYS = [
    'version',
    'douyin',
    'bilibili',
    'kuaishou',
    'xiaohongshu',
    'events',
    'on',
    'once',
    'bilibiliFetcher',
    'douyinFetcher',
    'kuaishouFetcher',
    'xiaohongshuFetcher',
    'createBoundBilibiliFetcher',
    'createBoundDouyinFetcher',
    'createBoundKuaishouFetcher',
    'createBoundXiaohongshuFetcher'
  ] as const

  it.each(STATIC_KEYS)('amagi.%s 存在', (key) => {
    expect(amagiEntry.default[key]).toBeDefined()
  })

  it('version 是语义化版本字符串', () => {
    expect(amagiEntry.default.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('version 只读，赋值不生效', () => {
    const before = amagiEntry.default.version
    try {
      ;(amagiEntry.default as unknown as { version: string }).version = '0.0.0-hacked'
    } catch {
      // 严格模式下会抛，非严格模式下静默失败，两者都可接受
    }
    expect(amagiEntry.default.version).toBe(before)
  })

  it('静态属性集合被锁定', () => {
    const keys = Object.keys(amagiEntry.default).sort()
    expect(keys).toMatchSnapshot()
  })
})

describe('客户端实例形状', () => {
  const client = amagiEntry.default({
    cookies: { douyin: 'a=1', bilibili: 'b=1', kuaishou: 'c=1', xiaohongshu: 'd=1' }
  })

  it('顶层键被锁定', () => {
    expect(Object.keys(client).sort()).toMatchSnapshot()
  })

  it.each(['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const)('client.%s 上挂着 fetcher', (platform) => {
    expect(client[platform]).toHaveProperty('fetcher')
    expect(typeof client[platform].fetcher).toBe('object')
  })

  it.each(['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const)('client.%s 的键集合被锁定', (platform) => {
    expect(Object.keys(client[platform]).sort()).toMatchSnapshot()
  })

  it('startServer / on / once / events 齐全', () => {
    expect(typeof client.startServer).toBe('function')
    expect(typeof client.on).toBe('function')
    expect(typeof client.once).toBe('function')
    expect(client.events).toBeDefined()
  })

  it('两个实例的 events 是同一个全局单例（v7 若改为实例级即属 breaking）', () => {
    const other = amagiEntry.default({})
    expect(client.events).toBe(other.events)
  })
})


