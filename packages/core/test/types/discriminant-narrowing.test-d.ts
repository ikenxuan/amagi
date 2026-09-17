import type { BiliDynamicInfoUnion } from 'amagi/types/ReturnDataType/Bilibili/DynamicInfo/index'
import { DynamicType } from 'amagi/types/ReturnDataType/Bilibili/DynamicType'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * 判别式收窄到底能不能用（生成器落地前的第一条前置验证）。
 *
 * 为什么必须先验这条：B站动态是这批端点里最难的一块，它的判别字段在
 * `data.item.type` —— **第三层嵌套**。加上每层都带 `[property: string]: any`
 * （`response-types.test-d.ts` 用它承诺「平台加字段不算 breaking」，不能删），
 * 直觉上会以为收窄没戏。
 *
 * 结论（下面每条断言都是结论本体）：**收窄发生在判别字段所在的那个对象上，不在信封上。**
 *
 * - `if (info.data.item.type === …)` 之后，`info.data.item` **会**收窄到对应支（`it` 第 2 条）——
 *   下游要读的变体字段就在这一层，所以裸 `if` / `switch` 是能用的；
 * - 但 `info`（整个信封）不变，仍是完整联合（`it` 第 1 条）。要收窄信封得用类型谓词
 *   （`it` 第 3 条），生成器产的 `guards.ts` 给的就是这个。
 *
 * 2026-09-11 修正：这份文件原先的标题写的是「`if` 判断不收窄（所以生成器必须产守卫函数）」——
 * 那只对信封成立，却被读成了「裸 `if` 没用」。生成产物的 `dynamic-detail-union.test-d.ts`
 * 里有对应的实测（判别值改成字面量之后，裸 `if` 的收窄是精确的）。
 */

/** 生成器将来要产出的东西：按嵌套判别式收窄的类型谓词 */
const isDynamicType =
  <T extends DynamicType>(type: T) =>
  (info: BiliDynamicInfoUnion): info is Extract<BiliDynamicInfoUnion, { data: { item: { type: T } } }> =>
    info.data.item.type === type

describe('嵌套判别式：信封不收窄，但 `data.item` 会收窄', () => {
  it('裸 if 之后，**信封**还是整个联合 —— 收窄不发生在这一层', () => {
    const narrow = (info: BiliDynamicInfoUnion) => {
      if (info.data.item.type === DynamicType.AV) {
        // 这条断言锁的是「信封不收窄」这个事实。哪天 TS 支持了，它才会失败 ——
        // 那时该做的是把守卫简化掉，而不是把这条断言删掉当没看见。
        expectTypeOf(info).toEqualTypeOf<BiliDynamicInfoUnion>()
        return info
      }
      return info
    }
    expectTypeOf(narrow).parameter(0).toEqualTypeOf<BiliDynamicInfoUnion>()
  })

  it('但**判别字段所在的那个对象**（`data.item`）收窄到了对应支 —— 裸 if 拿得到变体字段', () => {
    const narrow = (info: BiliDynamicInfoUnion) => {
      if (info.data.item.type === DynamicType.AV) {
        expectTypeOf(info.data.item).toEqualTypeOf<
          Extract<BiliDynamicInfoUnion, { data: { item: { type: DynamicType.AV } } }>['data']['item']
        >()
        // 收窄之后读变体字段不该是 any
        expectTypeOf(info.data.item.id_str).not.toBeAny()
      }
      return info
    }
    expectTypeOf(narrow).parameter(0).toEqualTypeOf<BiliDynamicInfoUnion>()
  })

  it('类型谓词能收窄**信封**，且收窄结果不是 never（联合里真有这个成员）', () => {
    const guarded = (info: BiliDynamicInfoUnion) => {
      if (isDynamicType(DynamicType.AV)(info)) {
        expectTypeOf(info).not.toEqualTypeOf<BiliDynamicInfoUnion>()
        expectTypeOf(info).not.toBeNever()
        return info
      }
      return undefined
    }
    expectTypeOf(guarded).returns.not.toBeNever()
  })

  it('每个已声明的 DynamicType 取值都能从联合里 Extract 出成员（一个都不能落空）', () => {
    // 落空说明联合与枚举漂移了：枚举里声明了但联合里没有对应成员。
    // 生成器的覆盖率报告要报的正是这类漂移。
    expectTypeOf<Extract<BiliDynamicInfoUnion, { data: { item: { type: DynamicType.AV } } }>>().not.toBeNever()
    expectTypeOf<Extract<BiliDynamicInfoUnion, { data: { item: { type: DynamicType.DRAW } } }>>().not.toBeNever()
    expectTypeOf<Extract<BiliDynamicInfoUnion, { data: { item: { type: DynamicType.WORD } } }>>().not.toBeNever()
    expectTypeOf<Extract<BiliDynamicInfoUnion, { data: { item: { type: DynamicType.LIVE_RCMD } } }>>().not.toBeNever()
    expectTypeOf<Extract<BiliDynamicInfoUnion, { data: { item: { type: DynamicType.FORWARD } } }>>().not.toBeNever()
    expectTypeOf<Extract<BiliDynamicInfoUnion, { data: { item: { type: DynamicType.ARTICLE } } }>>().not.toBeNever()
  })

  it('索引签名还在（「平台加字段不算 breaking」的承诺）', () => {
    // 索引签名与「`data.item` 能收窄」并不冲突（上面第 2 条实测过）—— 它换来的是
    // 「读未声明的字段不报错」。它与收窄真正冲突的地方只有一处：**兜底支**要么声明
    // `type?: never`（收窄保留、任意字段可读）、要么声明 `type: string`（收窄全废）——
    // 那条取舍在生成产物的 dynamic-detail-union.test-d.ts 里钉着。
    expectTypeOf<BiliDynamicInfoUnion>().toHaveProperty('code')
    const readUndeclared = (info: BiliDynamicInfoUnion) => info.field_that_does_not_exist
    expectTypeOf(readUndeclared).returns.toBeAny()
  })
})
