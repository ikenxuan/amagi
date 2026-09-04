import type { BilibiliComments_V0, BilibiliVideoInfo_V0, KuaishouVideoWorkSimple_V0 } from 'amagi/index'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * 生成的响应类型**真的到达了公开面**。
 *
 * ## 为什么需要这一条
 *
 * 生成树在仓库里活了整整一轮而没有任何人收到它：产物躺在
 * `core/src/types/generated/` 底下，而 `types/index.ts` 只导出 `./ReturnDataType` ——
 * 全 `src` 搜 `types/generated` 零命中，776 KB 的 `dist/*.d.ts` 里一个生成类型名都没有。
 *
 * 而当时的判据是「下游 `tsc --noEmit` 退出码 0」，那条**同时兼容「产物根本不存在」** ——
 * 它证明的是「没有撞名」而不是「到达了」。整条链每一段都绿，终点是一棵没人 import 的树。
 *
 * 所以这个文件用**唯一能证明到达的判据**：从公开入口 `import` 那个类型名，
 * 然后断言它有内容。名字解析不到 → 编译红；解析到了但是个空壳
 * （`type X = undefined`，rolldown 解析不到依赖时的静默降级）→ `keyof` 那条红。
 *
 * ## 它盯着的三条接线，断哪一条都会红
 *
 * 1. `packages/response-types` 必须**构建**（`types` 指向 `dist/index.d.ts` 而不是 `.ts`
 *    源码 —— 指向源码时 rolldown 找不到、把类型静默换成 `undefined`）；
 * 2. 它必须挂在 core 的 **devDependencies**（`dependencies` 会被 tsdown 外部化，
 *    产物里留一个裸 import，而那个包不发布、下游解析不到）；
 * 3. `core/src/index.ts` 到 `types/generated.ts` 到那个包的 re-export 链不能断。
 *
 * 挑这三个类型不是随手取的：一个来自判别联合以外的普通单类型端点（`VideoInfo`）、
 * 一个是全仓最大的生成产物（`Comments`，809 行）、一个来自另一个平台
 * （`KuaishouVideoWorkSimple` —— 顺带证明平台前缀那套消歧真的生效，
 * 而不是只有 bilibili 那一支接通了）。
 */

describe('生成的响应类型进了公开面（不是「没撞名」，是「到达了」）', () => {
  it('三个平台的生成类型都能从 `@ikenxuan/amagi` 的入口写下来', () => {
    // 名字解析不到的话这一行就是编译错误 —— 那正是「产物没到达下游」的样子
    expectTypeOf<BilibiliVideoInfo_V0>().not.toBeNever()
    expectTypeOf<BilibiliComments_V0>().not.toBeNever()
    expectTypeOf<KuaishouVideoWorkSimple_V0>().not.toBeNever()
  })

  it('**不是空壳** —— rolldown 解析不到依赖时会静默降级成 `undefined`', () => {
    // 这一条是上面那条抓不到的：`type X = undefined` 也能被 import、也不是 never。
    // 实测过那个失败模式：`types` 指向 `.ts` 源码时产出的就是 `type __Probe = undefined`
    expectTypeOf<BilibiliVideoInfo_V0>().not.toBeUndefined()
    expectTypeOf<keyof BilibiliVideoInfo_V0>().not.toBeNever()
    expectTypeOf<keyof BilibiliComments_V0>().not.toBeNever()
    expectTypeOf<keyof KuaishouVideoWorkSimple_V0>().not.toBeNever()
  })

  it('声明过的字段保有精确类型', () => {
    expectTypeOf<BilibiliVideoInfo_V0['code']>().toBeNumber()
    expectTypeOf<BilibiliComments_V0['code']>().toBeNumber()
  })

  it('生成的类型也带顶层索引签名 —— 硬约束 1（PRD 5.3）在生成侧同样成立', () => {
    // 手写树那条承诺（读未声明字段结果是 `any`）由 response-types.test-d.ts 盯着。
    // 生成树必须给同样的承诺，否则「平台加字段不算 breaking」在两棵树上会不一致
    expectTypeOf<BilibiliVideoInfo_V0['some_field_the_platform_added_later']>().toBeAny()
    expectTypeOf<KuaishouVideoWorkSimple_V0['brand_new_key']>().toBeAny()
  })

  it('平台前缀真的在消歧 —— `emojiList` 三个平台都有，不加前缀会撞名', () => {
    // 三个同名端点各自的类型名互不相同（前缀在生成侧的平台 barrel 里加）。
    // 这一条挂了的话，说明那套前缀退回了扁平 re-export，而那会让两个平台的
    // `EmojiList_V0` 互相覆盖 —— 下游拿到的是「最后被 export 的那个」
    expectTypeOf<BilibiliComments_V0>().not.toEqualTypeOf<KuaishouVideoWorkSimple_V0>()
  })
})
