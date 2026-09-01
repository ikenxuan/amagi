import type { Registry } from 'amagi/contracts/endpoint'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
/**
 * contracts/endpoint 的运行时契约。
 *
 * 类型推导的完整验证在 0.5（`test/types/contracts.test-d.ts` 与假端点），
 * 这里只钉运行时行为：`defineEndpoint` 必须是恒等函数（零运行时开销），
 * `type<T>()` 必须不携带任何值。
 */
import { describe, expect, it } from 'vitest'
import zod from 'zod'

const fake = defineEndpoint({
  name: 'douyin.fakeEndpoint',
  route: '/__fake_endpoint',
  params: zod.object({ aweme_id: zod.string().min(1, '作品 ID 不能为空') }),
  build: (p) => ({ method: 'GET', url: `https://example.com/?id=${p.aweme_id}` }),
  sign: 'a_bogus',
  response: type<{ ok: true }>()
})

describe('contracts/endpoint - defineEndpoint', () => {
  it('是恒等函数：返回的就是传进去的那个对象', () => {
    const def = { name: 'douyin.x', route: '/x', params: zod.object({}) } as const
    expect(defineEndpoint(def)).toBe(def)
  })

  it('声明的字段原样保留', () => {
    expect(fake.name).toBe('douyin.fakeEndpoint')
    expect(fake.route).toBe('/__fake_endpoint')
    expect(fake.sign).toBe('a_bogus')
  })

  it('params 是可用的 zod schema，校验行为不被包装改变', () => {
    expect(fake.params.safeParse({ aweme_id: '7123' }).success).toBe(true)
    const bad = fake.params.safeParse({ aweme_id: '' })
    expect(bad.success).toBe(false)
    expect(bad.error?.issues[0]?.message).toBe('作品 ID 不能为空')
  })

  it('build 能被直接调用，产出 RequestSpec', () => {
    const spec = fake.build?.({ aweme_id: '7123' }, {} as never)
    expect(spec).toEqual({ method: 'GET', url: 'https://example.com/?id=7123' })
  })
})

describe('contracts/endpoint - type<T>()', () => {
  it('不携带任何运行时值', () => {
    const token = type<{ a: number }>()
    expect(token).toEqual({})
    expect(Object.keys(token)).toEqual([])
  })

  it('response 槽位在运行时只是空对象', () => {
    expect(fake.response).toEqual({})
  })
})

describe('contracts/endpoint - Registry', () => {
  const registry = {
    fakeEndpoint: fake,
    fakeCompute: defineEndpoint({
      name: 'bilibili.fakeCompute',
      route: '/__fake_compute',
      params: zod.object({ bvid: zod.string() }),
      compute: (p) => ({ aid: p.bvid.length })
    })
  } as const satisfies Registry

  it('注册表就是普通对象，key 即端点短名', () => {
    expect(Object.keys(registry)).toEqual(['fakeEndpoint', 'fakeCompute'])
  })

  it('可以遍历出 name 与 route，供派生路由与文档使用', () => {
    expect(Object.values(registry).map((d) => [d.name, d.route])).toEqual([
      ['douyin.fakeEndpoint', '/__fake_endpoint'],
      ['bilibili.fakeCompute', '/__fake_compute']
    ])
  })

  it('compute 端点不发请求，直接算出 data', () => {
    expect(registry.fakeCompute.compute?.({ bvid: 'BV1xx411c7mD' })).toEqual({ aid: 12 })
  })
})
