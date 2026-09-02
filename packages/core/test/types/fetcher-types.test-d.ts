import { createBoundDouyinFetcher, douyinFetcher } from 'amagi/index'
import type { AmagiResult } from 'amagi/contracts/result'
import type { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
/**
 * 类型层契约（由 `pnpm test:types` 运行）—— 阶段 6 改写版。
 *
 * v6 的 typeMode 语义（默认 loose 返回 any，strict 才精确）随阶段 6/6.3
 * 删除：静态 fetcher 由 registry 派生，**默认就是精确类型**，显式泛型
 * `fetchX<T>()` 是逃生舱。本文件锁定新语义：
 * - 默认返回 `AmagiResult<端点声明的响应类型>`（不再是 Result<any>）
 * - 静态形态三参签名：options 必填、cookie / requestConfig 可选
 * - 显式泛型覆盖返回类型
 * - bound fetcher 少一个 cookie 形参
 */
import { assertType, describe, expectTypeOf, it } from 'vitest'

describe('静态 fetcher 的返回类型（默认精确，typeMode 已删）', () => {
  it('fetchVideoWork 默认返回 AmagiResult<videoWork 声明的响应类型>', async () => {
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: '1' }, 'ck')
    expectTypeOf(result).toEqualTypeOf<AmagiResult<DouyinReturnTypeMap['videoWork']>>()
  })

  it('无参方法可以完全省略参数', async () => {
    const result = await douyinFetcher.fetchEmojiList()
    expectTypeOf(result).toEqualTypeOf<AmagiResult<DouyinReturnTypeMap['emojiList']>>()
  })

  it('显式泛型覆盖返回类型（typeMode 逃生舱的替代）', async () => {
    const result = await douyinFetcher.fetchVideoWork<{ custom: true }>({ aweme_id: '1' }, 'ck')
    expectTypeOf(result).toEqualTypeOf<AmagiResult<{ custom: true }>>()
  })
})

describe('静态 fetcher 的三参签名', () => {
  it('必填字段缺失时报错', () => {
    // @ts-expect-error aweme_id 必填
    assertType(douyinFetcher.fetchVideoWork({}, 'ck'))
  })

  it('cookie 与 requestConfig 都可省略', () => {
    assertType(douyinFetcher.fetchVideoWork({ aweme_id: '1' }))
    assertType(douyinFetcher.fetchVideoWork({ aweme_id: '1' }, 'ck'))
  })
})

describe('bound fetcher 的类型', () => {
  it('bound 形态少一个 cookie 形参：方法签名是 (options, requestConfig?)', async () => {
    const bound = createBoundDouyinFetcher('ck')
    const result = await bound.fetchVideoWork({ aweme_id: '1' })
    expectTypeOf(result).toEqualTypeOf<AmagiResult<DouyinReturnTypeMap['videoWork']>>()
  })

  it('bound 形态拒绝把 cookie 当第二参', () => {
    const bound = createBoundDouyinFetcher('ck')
    // @ts-expect-error bound 形态第二参是 requestConfig，不是 cookie
    assertType(bound.fetchVideoWork({ aweme_id: '1' }, 'ck'))
  })
})
