import type { BiliDynamicInfoUnion } from 'amagi/types/ReturnDataType/Bilibili/DynamicInfo/index'
import { DynamicType } from 'amagi/types/ReturnDataType/Bilibili/DynamicType'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * 判别式收窄到底能不能用（`RESPONSE-TYPE-AUTOGEN-PRD.md` 阶段 0 的前置验证）。
 *
 * 为什么必须先验这条：B站动态是那份 PRD 里最难的一块，它的判别字段在
 * `data.item.type` —— **第三层嵌套**，不在联合成员顶层。而 TS 的判别式收窄只对
 * 联合成员的**直接属性**生效。雪上加霜的是每层都带 `[property: string]: any`，
 * 那本身就是收窄失效的经典原因，而这个索引签名**不能删**：
 * `test/types/response-types.test-d.ts` 用它承诺「平台加字段不算 breaking」。
 *
 * 在这之前，全仓**没有任何测试**验证过按 `type` 收窄能不能工作 —— 现有的判别联合
 * 是「结构上的意图」，不是被验证过的行为。生成器要按这个联合的形状产出类型，
 * 就得先知道这个形状到底给不给下游带来收窄能力。
 *
 * 结论（下面的断言就是结论本体）：**`if (x.data.item.type === ...)` 不收窄 `x`**。
 * 所以生成器不能只产联合类型，还要产 `is*` 类型谓词 —— 那是纯增量，
 * 不动既有的索引签名承诺。
 */

/** 生成器将来要产出的东西：按嵌套判别式收窄的类型谓词 */
const isDynamicType =
  <T extends DynamicType>(type: T) =>
  (info: BiliDynamicInfoUnion): info is Extract<BiliDynamicInfoUnion, { data: { item: { type: T } } }> =>
    info.data.item.type === type

describe('嵌套判别式：`if` 判断不收窄（所以生成器必须产守卫函数）', () => {
  it('直接 if 判断之后，联合还是整个联合 —— 没有收窄发生', () => {
    const narrow = (info: BiliDynamicInfoUnion) => {
      if (info.data.item.type === DynamicType.AV) {
        // 收窄没发生：这里的 info 仍是完整联合。
        // 这条断言是**故意**写成「等于整个联合」的 —— 它锁住的是「TS 现在做不到」
        // 这个事实。哪天 TS 支持了嵌套判别式收窄，这条会失败，那时该把生成的守卫
        // 函数简化掉，而不是把这条断言删掉了当没看见。
        expectTypeOf(info).toEqualTypeOf<BiliDynamicInfoUnion>()
        return info
      }
      return info
    }
    expectTypeOf(narrow).parameter(0).toEqualTypeOf<BiliDynamicInfoUnion>()
  })

  it('类型谓词能收窄，且收窄结果不是 never（联合里真有这个成员）', () => {
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

  it('索引签名还在（收窄失效的代价换来的是「平台加字段不算 breaking」）', () => {
    // 两者不可兼得这件事本身要被记住：删掉索引签名能让收窄好一些，
    // 但会毁掉 response-types.test-d.ts 锁着的那条兼容承诺。
    expectTypeOf<BiliDynamicInfoUnion>().toHaveProperty('code')
    const readUndeclared = (info: BiliDynamicInfoUnion) => info.field_that_does_not_exist
    expectTypeOf(readUndeclared).returns.toBeAny()
  })
})
