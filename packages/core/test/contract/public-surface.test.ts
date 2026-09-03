import * as amagiEntry from 'amagi/index'
import type { Options } from 'amagi/index'
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

/**
 * 阶段 9.1 修 BUG-1 的另一半：`createAmagiClient` 保留为 `@deprecated` 别名。
 *
 * v6 唯一的具名工厂不能消失，也不能变成第二份实现 —— 它现在与 `createClient`
 * 是**同一个函数对象**，所以「两个门面并存」这件事在运行时就不再可能。
 */
describe('createAmagiClient 是 v7 门面的 @deprecated 别名', () => {
  it('与 createClient 是同一个函数对象（不是第二份实现）', () => {
    expect(amagiEntry.createAmagiClient).toBe(amagiEntry.createClient)
  })

  it('默认导出与它产出同形状的 client', () => {
    expect(Object.keys(amagiEntry.createAmagiClient({})).sort()).toEqual(Object.keys(amagiEntry.default({})).sort())
  })

  it('v6 的 Options 照旧可传（调用点零改动）', () => {
    // 形参类型标成 v6 的 `Options`（不是 `ClientOptions`）：这一行编译通过
    // 就是「v6 调用点零改动」的编译期判据，`pnpm test:types` 会看它
    const v6Options: Options = { cookies: { douyin: 'a=1', bilibili: 'b=1' }, request: { timeout: 8000 } }
    const client = amagiEntry.createAmagiClient(v6Options)
    expect(typeof client.startServer).toBe('function')
    expect(client.douyin.fetcher).toBeTypeOf('object')
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

  // 阶段 9.1（修 BUG-1）：默认导出的门面换成 v7 的 `createClient`，`events` 随之
  // 变成**实例级**总线。原用例断言的是 v6 的「两个实例共享同一个全局单例」
  // （缺陷 10：负载里没有任何关联 id，多实例并发时分不清事件来自谁），缺陷修掉之后
  // 按 KNOWN-DEFECT 纪律**显式改写**成断言修好之后的事实 —— 不 `.skip`、不留悬案。
  // 这条差异在 docs/v7/06-migration.md 的「默认导出换成 v7 门面」一节里有对应说明。
  it('两个实例的 events 各自一条总线（v7 实例级，不再是全局单例）', () => {
    const other = amagiEntry.default({})
    expect(client.events).not.toBe(other.events)
    expect(client.events).not.toBe(amagiEntry.amagiEvents)
  })

  it('构造函数上的静态事件面仍是 v6 全局单例（切换只作用于实例）', () => {
    expect(amagiEntry.default.events).toBe(amagiEntry.amagiEvents)
  })

  it.each(['douyin', 'bilibili'] as const)('client.%s 带 login 命名空间（v7 门面的扫码会话入口）', (platform) => {
    expect(client[platform].login).toBeDefined()
    expect(typeof client[platform].login.qrcode).toBe('function')
    expect(typeof client[platform].login.resume).toBe('function')
  })
})


