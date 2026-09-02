import { createClient } from 'amagi/client/createClient'
import type { AmagiError } from 'amagi/contracts/error'
import type { AmagiFailure, AmagiSuccess, AmagiThrownError } from 'amagi/contracts/result'
import { isFailure, isSuccess, unwrap } from 'amagi/contracts/result'
import type { BiliCommentReply_V0 } from 'amagi/types/ReturnDataType/Bilibili/BiliCommentReply/BiliCommentReply_V0'
/**
 * 信封的四种读法（阶段 9.2，修 BUG-2）。
 *
 * 断言全部走**真 fetcher** 的返回类型：9.2 之前本仓自己的类型测试都得
 * `as unknown as` 一个手写两支联合才敢往下写（`response-types.test-d.ts` 原第 26 行），
 * 那正是「真类型还不好用」的证据 —— 所以这里一个 `as` 都不用。
 *
 * ① **不收窄直接读 `r.data`** —— BUG-2 的复现片段，从 TS2339 变成 `T | undefined`
 * ② **`if (r.success)` 收窄** —— `data` 是 `T`、`error` 是 `AmagiError`，判别联合没弱
 * ③ **`list.filter(isSuccess)`** —— 数组回调里没有 `if` 可用，`?: undefined` 解决不了
 * ④ **`unwrap(r)`** —— 返回 `T`，失败即抛
 */
import { describe, expectTypeOf, it } from 'vitest'

const client = createClient({})

/** BUG-2 复现片段里的那个调用（`src/dev.ts` 的 `fetchCommentReplies`） */
const replies = () => client.bilibili.fetcher.fetchCommentReplies({ oid: '', type: 1, root: '' })

describe('① 不收窄直接读 data（BUG-2 的复现片段）', () => {
  it('r.data 是 BiliCommentReply_V0 | undefined，不再是 TS2339', async () => {
    const r1 = await replies()
    // 这一行就是 BUG-2 的复现片段本体：v7 早期它是 TS2339
    void r1.data
    expectTypeOf(r1.data).toEqualTypeOf<BiliCommentReply_V0 | undefined>()
  })

  it('对侧的 r.error 同样可读，是 AmagiError | undefined', async () => {
    const r1 = await replies()
    void r1.error
    expectTypeOf(r1.error).toEqualTypeOf<AmagiError | undefined>()
  })

  it('message / meta 仍在联合上（v6 读法不受影响）', async () => {
    const r1 = await replies()
    expectTypeOf(r1.message).toEqualTypeOf<string>()
    expectTypeOf(r1.meta.endpoint).toEqualTypeOf<string>()
  })
})

describe('② if (r.success) 收窄（收窄能力不许退化）', () => {
  it('收窄后 data 是 T、error 是 AmagiError，都不带 | undefined', async () => {
    const r = await replies()
    if (r.success) {
      expectTypeOf(r.data).toEqualTypeOf<BiliCommentReply_V0>()
      expectTypeOf(r).toEqualTypeOf<AmagiSuccess<BiliCommentReply_V0>>()
    } else {
      expectTypeOf(r.error).toEqualTypeOf<AmagiError>()
      expectTypeOf(r).toEqualTypeOf<AmagiFailure>()
    }
  })

  it('isSuccess / isFailure 作为 if 条件时收窄效果与 r.success 一致', async () => {
    const r = await replies()
    if (isSuccess(r)) {
      expectTypeOf(r.data).toEqualTypeOf<BiliCommentReply_V0>()
    }
    if (isFailure(r)) {
      expectTypeOf(r.error).toEqualTypeOf<AmagiError>()
    }
  })
})

describe('③ filter(isSuccess)：数组回调里 `?: undefined` 解决不了的场景', () => {
  it('filter(isSuccess).map((r) => r.data) 的元素类型是 T', async () => {
    const results = [await replies(), await replies()]
    expectTypeOf(results.filter(isSuccess)).toEqualTypeOf<AmagiSuccess<BiliCommentReply_V0>[]>()
    expectTypeOf(results.filter(isSuccess).map((r) => r.data)).toEqualTypeOf<BiliCommentReply_V0[]>()
  })

  it('filter(isFailure) 之后 error 是 AmagiError，可直接按 kind 分流', async () => {
    const results = [await replies(), await replies()]
    expectTypeOf(results.filter(isFailure)).toEqualTypeOf<AmagiFailure[]>()
    expectTypeOf(results.filter(isFailure).map((r) => r.error.kind)).toEqualTypeOf<AmagiError['kind'][]>()
  })

  it('不用守卫时同一个 map 只能拿到 T | undefined —— 这就是守卫存在的理由', async () => {
    const results = [await replies(), await replies()]
    expectTypeOf(results.map((r) => r.data)).toEqualTypeOf<(BiliCommentReply_V0 | undefined)[]>()
  })
})

describe('④ unwrap(r)：返回 T，失败即抛', () => {
  it('返回类型是 T，不是 T | undefined', async () => {
    const data = unwrap(await replies())
    expectTypeOf(data).toEqualTypeOf<BiliCommentReply_V0>()
    expectTypeOf(data).not.toEqualTypeOf<BiliCommentReply_V0 | undefined>()
  })

  it('抛出物是 Error 子类，且 AmagiError 全字段可读、cause 不吞', () => {
    expectTypeOf<AmagiThrownError>().toExtend<Error>()
    expectTypeOf<AmagiThrownError>().toExtend<AmagiError>()
    expectTypeOf<AmagiThrownError['kind']>().toEqualTypeOf<AmagiError['kind']>()
    expectTypeOf<AmagiThrownError['code']>().toEqualTypeOf<AmagiError['code']>()
    expectTypeOf<AmagiThrownError['message']>().toEqualTypeOf<string>()
    expectTypeOf<AmagiThrownError['retryable']>().toEqualTypeOf<boolean>()
    expectTypeOf<AmagiThrownError['error']>().toEqualTypeOf<AmagiError>()
    expectTypeOf<AmagiThrownError['cause']>().toBeUnknown()
  })
})
