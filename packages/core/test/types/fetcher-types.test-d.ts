import amagi, { createBoundDouyinFetcher, douyinFetcher } from 'amagi/index'
import type { DouyinWorkOptions, TypeMode } from 'amagi/model/fetchers/types'
import type { ConditionalReturnType } from 'amagi/model/fetchers/types'
import type { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import type { ErrorResult, Result, SuccessResult } from 'amagi/validation'
/**
 * 类型层契约（由 `pnpm test:types` 运行）。
 *
 * v6 的对外类型行为有几条不直观但被用户依赖的规则：
 *   - 默认 typeMode 是 'loose'，返回 `any`
 *   - 传 `typeMode: 'strict'` 才拿到精确类型
 *   - bound fetcher 少一个 cookie 形参
 *   - Result 是可判别联合
 * v7 若改动其中任意一条，都必须在迁移文档里写清楚。
 */
import { assertType, describe, expectTypeOf, it } from 'vitest'

describe('ConditionalReturnType', () => {
  it('strict 返回精确类型，loose 返回 any', () => {
    expectTypeOf<ConditionalReturnType<{ a: number }, 'strict'>>().toEqualTypeOf<{ a: number }>()
    expectTypeOf<ConditionalReturnType<{ a: number }, 'loose'>>().toBeAny()
  })

  it('TypeMode 只有两个成员', () => {
    expectTypeOf<TypeMode>().toEqualTypeOf<'strict' | 'loose'>()
  })
})

describe('douyinFetcher 的返回类型', () => {
  it('KNOWN-DEFECT: 默认（不传 typeMode）返回 Result<any>，26k 行响应类型不生效', async () => {
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: '1' }, 'ck')
    expectTypeOf(result).toEqualTypeOf<Result<any>>()
  })

  it("传 typeMode: 'strict' 时返回精确类型", async () => {
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: '1', typeMode: 'strict' }, 'ck')
    expectTypeOf(result).toEqualTypeOf<Result<DouyinReturnTypeMap['videoWork']>>()
  })

  it('无参方法可以完全省略参数', async () => {
    const result = await douyinFetcher.fetchEmojiList()
    expectTypeOf(result).toEqualTypeOf<Result<any>>()
  })

  it("无参方法传 typeMode: 'strict' 时收窄", async () => {
    const result = await douyinFetcher.fetchEmojiList({ typeMode: 'strict' }, 'ck')
    expectTypeOf(result).toEqualTypeOf<Result<DouyinReturnTypeMap['emojiList']>>()
  })
})

describe('Options 类型', () => {
  it('必填字段缺失时报错', () => {
    // @ts-expect-error aweme_id 必填
    assertType(douyinFetcher.fetchVideoWork({}, 'ck'))
  })

  it('未声明的字段被拒绝', () => {
    // @ts-expect-error not_a_field 不在 DouyinWorkOptions 上
    assertType(douyinFetcher.fetchVideoWork({ aweme_id: '1', not_a_field: 1 }, 'ck'))
  })

  it('aweme_id 必须是字符串', () => {
    // @ts-expect-error 数字不被接受
    assertType(douyinFetcher.fetchVideoWork({ aweme_id: 1 }, 'ck'))
  })

  it('DouyinWorkOptions 继承 BaseRequestOptions 的 typeMode', () => {
    expectTypeOf<DouyinWorkOptions>().toHaveProperty('typeMode')
    expectTypeOf<DouyinWorkOptions['typeMode']>().toEqualTypeOf<TypeMode | undefined>()
  })
})

describe('bound fetcher 的签名', () => {
  const bound = createBoundDouyinFetcher('ck')

  it('第二个参数是 requestConfig，而不是 cookie', async () => {
    const result = await bound.fetchVideoWork({ aweme_id: '1' }, { timeout: 1 })
    expectTypeOf(result).toEqualTypeOf<Result<any>>()
  })

  it('strict 模式同样收窄', async () => {
    const result = await bound.fetchVideoWork({ aweme_id: '1', typeMode: 'strict' })
    expectTypeOf(result).toEqualTypeOf<Result<DouyinReturnTypeMap['videoWork']>>()
  })

  it('不接受字符串 cookie 作为第二个参数', () => {
    // @ts-expect-error 第二个参数是 RequestConfig
    assertType(bound.fetchVideoWork({ aweme_id: '1' }, 'ck'))
  })

  it('passport 系方法不在 bound fetcher 上', () => {
    // @ts-expect-error requestPassportQrcode 有会话，不进 bound fetcher
    assertType(bound.requestPassportQrcode())
  })
})

describe('Result 判别联合', () => {
  it('success 为 true 时收窄到 SuccessResult', () => {
    const result = {} as Result<{ a: number }>
    if (result.success) {
      expectTypeOf(result).toEqualTypeOf<SuccessResult<{ a: number }>>()
      expectTypeOf(result.data).toEqualTypeOf<{ a: number }>()
    }
  })

  it('success 为 false 时收窄到 ErrorResult', () => {
    const result = {} as Result<{ a: number }>
    if (!result.success) {
      expectTypeOf(result).toEqualTypeOf<ErrorResult>()
    }
  })

  it('两个分支都有 code 与 message', () => {
    expectTypeOf<Result<unknown>>().toHaveProperty('code')
    expectTypeOf<Result<unknown>>().toHaveProperty('message')
  })
})

describe('入口构造器类型', () => {
  it('可函数调用也可 new 调用', () => {
    expectTypeOf(amagi).toBeCallableWith({})
    expectTypeOf(amagi).toBeConstructibleWith({})
  })

  it('version 是 string', () => {
    expectTypeOf(amagi.version).toEqualTypeOf<string>()
  })

  it('client 上挂着四个平台', () => {
    const client = amagi({})
    expectTypeOf(client).toHaveProperty('douyin')
    expectTypeOf(client).toHaveProperty('bilibili')
    expectTypeOf(client).toHaveProperty('kuaishou')
    expectTypeOf(client).toHaveProperty('xiaohongshu')
    expectTypeOf(client).toHaveProperty('startServer')
  })

  it('cookies 的四个键都可选', () => {
    expectTypeOf(amagi).toBeCallableWith({ cookies: { douyin: 'a' } })
    expectTypeOf(amagi).toBeCallableWith({ cookies: {} })
  })

  it('未知平台键被拒绝', () => {
    // @ts-expect-error weibo 不是支持的平台
    assertType(amagi({ cookies: { weibo: 'a' } }))
  })
})
