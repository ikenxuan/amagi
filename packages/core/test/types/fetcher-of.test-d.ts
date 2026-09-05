import type { FetcherOf } from 'amagi/client/fetcher'
import type { AmagiResult } from 'amagi/contracts/result'
import { fakeRegistry } from './fake-endpoints'
/**
 * client/fetcher.ts 的类型推导验证。
 *
 * 阶段门 0 判据的类型层四条：
 * ① 参数类型从 `z.infer` 正确推导，缺必填字段编译报错
 * ② 返回类型是 `AmagiResult<声明的 response 类型>`
 * ③ 显式泛型 `fetchX<T>()` 能覆盖返回类型
 * ④ 无参端点（compute）也被派生出来，返回类型正确
 *
 * 写法与 `fetcher-types.test-d.ts`（v6）一致：`typecheck.enabled` 下直接调用
 * fetcher，对结果做类型断言 —— 编译期钉死形状，IDE 悬停看到的也是这套具体类型
 * （不掺 any / never / 巨大交叉类型）。
 */
import { assertType, describe, expectTypeOf, it } from 'vitest'

/** 从假端点 registry 派生的具体 fetcher 类型（`douyin` 平台视角） */
declare const fakeFetcher: FetcherOf<'douyin', typeof fakeRegistry>

describe('FetcherOf 类型推导', () => {
  it('① 带参端点：参数类型从 z.infer 正确推导，缺必填字段编译报错', async () => {
    const r = await fakeFetcher.fetchFakeEcho({ aweme_id: '7123' })
    expectTypeOf(r).toEqualTypeOf<AmagiResult<{ ok: true; echoed: string }>>()
    // 成功分支收窄后 data 是声明的响应类型
    if (r.success) {
      expectTypeOf(r.data).toEqualTypeOf<{ ok: true; echoed: string }>()
    }
    // @ts-expect-error aweme_id 必填，缺它报错
    fakeFetcher.fetchFakeEcho({ number: 1 })
  })

  it('② 缺必填字段时编译报错（独立成条便于判据对账）', async () => {
    // @ts-expect-error 空对象不满足 { aweme_id: string }
    await fakeFetcher.fetchFakeEcho({})
  })

  it('③ 显式泛型 fetchX<T>() 能覆盖返回类型', async () => {
    const custom = await fakeFetcher.fetchFakeEcho<{ custom: true }>({ aweme_id: 'x' })
    if (custom.success) {
      expectTypeOf(custom.data).toEqualTypeOf<{ custom: true }>()
    }
  })

  it('④ 无参端点（compute）也被派生出来，返回类型正确', async () => {
    const r = await fakeFetcher.fetchFakeCompute()
    expectTypeOf(r).toEqualTypeOf<AmagiResult<{ aid: number }>>()
  })

  it('未知方法名在 fetcher 上不存在（编译错误）', () => {
    // @ts-expect-error fetchNope 不在 registry 里
    assertType(fakeFetcher.fetchNope({}))
  })
})