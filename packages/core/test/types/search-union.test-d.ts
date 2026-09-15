import type { AmagiResult } from 'amagi/contracts/result'
import { SEARCH_TYPE_FIELD } from 'amagi/platforms/douyin/endpoints/search'
import type { DouyinSearchResponse } from 'amagi/types/generated'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * 抖音搜索的生成类型：**形态由请求参数决定**的那个端点，判别联合能不能用。
 *
 * 它跟 B站动态那条（`dynamic-detail-union.test-d.ts`）是同一套机制的两个来源：
 * B站是平台自己就在响应里写了判别值（`data.item.type`），搜索是**响应里根本没有** ——
 * 形状由 `type` 参数决定，而 `path` / `mock_recall_path` 那几个只在 user / video 上出现，
 * general 整个键都不存在，判别式发现器一个候选都挑不出来。
 *
 * 所以那边的判别值是 amagi 在 `normalize` 里补写回去的（`SEARCH_TYPE_FIELD`，见
 * `packages/core/src/platforms/douyin/endpoints/search.ts`）。**这份测试的意义就是钉住
 * 「运行时补的那个字段」与「生成出来的类型」仍然对得上** —— 一边改了另一边没改，
 * 这里会红，而不是等到下游 `if (r.__search_type === 'user')` 收窄失败才发现。
 *
 * 2026-09-14 补了三条（`src/dev.ts` 里那两行抖音搜索要删，先把断言落在这里）：
 *
 * - **键名**也是一处要对上的东西：`SEARCH_TYPE_FIELD` 是运行时写的键，生成器是按样本开的键，
 *   下面那条把两者焊在一起（此前只有生成侧被钉住，键名是两处手抄的字面量）；
 * - **从 `AmagiResult` 里读**（dev.ts 那行 `dy1.data?.__search_type` 逐字）：判别式在信封的
 *   `.data` 上，用 `?.` 穿过去照样收窄；
 * - **各支独占字段**收窄后是精确类型，且同名的 `data` 在两支上是两种东西（没串味）。
 */
type Resp = DouyinSearchResponse

describe('抖音搜索：按 `__search_type` 收窄的判别联合', () => {
  it('判别字段是字面量联合（不是 string）—— 收窄能成立的前提', () => {
    expectTypeOf<Extract<Resp['__search_type'], string>>().toEqualTypeOf<'general' | 'user' | 'video'>()
  })

  it('裸 if 收窄到各支，支内字段是精确类型（不是 any）', () => {
    const narrow = (r: Resp) => {
      if (r.__search_type === 'user') {
        // 这三条同时锁住：判别式是字面量 + 兜底支是 `?: never`。
        // 兜底支改成 `__search_type: string` 的话，收窄结果会带上它，这里全变 any，一起红。
        expectTypeOf(r.user_list).not.toBeAny()
        expectTypeOf(r.user_list).toEqualTypeOf<Extract<Resp, { __search_type: 'user' }>['user_list']>()
      }
      if (r.__search_type === 'general') {
        expectTypeOf(r.data).not.toBeAny()
      }
      if (r.__search_type === 'video') {
        expectTypeOf(r.backtrace).toEqualTypeOf<string>()
      }
      return r
    }
    expectTypeOf(narrow).parameter(0).toEqualTypeOf<Resp>()
  })

  it('switch 三分支各自精确', () => {
    const pick = (r: Resp) => {
      switch (r.__search_type) {
        case 'user':
          return r.user_list
        case 'general':
          return r.data
        case 'video':
          return r.backtrace
        default:
          return undefined
      }
    }
    expectTypeOf(pick).returns.not.toBeNever()
  })

  it('兜底支存在：`default` 里读没见过的字段不报错（平台加搜索类型不算 breaking）', () => {
    const render = (r: Resp) => {
      if (r.__search_type === 'user') return r.user_list
      // 这一支里 `r` 不是 `never` —— 是的话下面这行编译不过，
      // 那就是「抖音加一个新搜索类型 → 下游 default 分支直接红」，正是兜底支要避免的事
      return r.这个字段今天还不存在
    }
    expectTypeOf(render).returns.toBeAny()
  })

  it('兜底支的判别字段是 `?: never`（`undefined` 只可能来自它）', () => {
    expectTypeOf<Extract<Resp['__search_type'], undefined>>().toEqualTypeOf<undefined>()
  })

  it('判别字段名就是 `normalize` 里写回去的那个键（`SEARCH_TYPE_FIELD`，不是两处手抄的字面量）', () => {
    // 上面那些断言把 `'__search_type'` 写死在类型里 —— 只钉住了生成侧。
    // 这个端点的判别值既然是 amagi 自己补的，「键名」就有两份事实：运行时那条常量、生成树里那个键。
    // 这两条把它俩焊在一起：常量改了而生成树没重跑（或反过来），这里红。
    expectTypeOf<typeof SEARCH_TYPE_FIELD>().toEqualTypeOf<'__search_type'>()
    expectTypeOf<Resp[typeof SEARCH_TYPE_FIELD]>().toEqualTypeOf<'general' | 'user' | 'video' | undefined>()
  })

  it("从 Result 读：`r.data?.__search_type === 'user'` 穿过信封收窄（`src/dev.ts` 那行逐字）", () => {
    // dev.ts 的形状：判别式不在返回值上，在信封的 `.data` 上，用 `?.` 穿过去。
    // 这行能编译本身就说明收窄发生了 —— 没发生的话 `r.data.user_list` 在 general / video /
    // 兜底支上都不存在（`user_list` 只有 user 支声明），那是 TS2339。
    // 断言返回类型是为了钉住 `uid` 是 `string` 而不是 any：是 any 的话整条 `&&` 都会塌成 any。
    const fromDevFile = (r: AmagiResult<Resp>) => r.data?.__search_type === 'user' && r.data.user_list?.[0].user_info.uid
    expectTypeOf(fromDevFile).returns.toEqualTypeOf<string | false>()
  })

  it('各支独占字段收窄后是精确类型，且 `data` 在两支上是两种东西（同名不串味）', () => {
    const read = (r: Resp) => {
      if (r.__search_type === 'user') {
        expectTypeOf(r.user_list[0].user_info.uid).toEqualTypeOf<string>()
      }
      if (r.__search_type === 'general') {
        // general 的 `data` 是卡片列表、video 的 `data` 是视频列表 —— 同名不同形，
        // 收窄到哪一支就该拿到哪一支的元素类型
        expectTypeOf(r.data[0].card_unique_name).toEqualTypeOf<string>()
        // `path` 只在 user / video 上出现，general 整个键都不存在（这正是判别值要由 amagi 补、
        // 而不能靠「响应里有什么结构」判的原因之一）：读得到，但那是索引签名的 any
        expectTypeOf(r.path).toBeAny()
      }
      if (r.__search_type === 'video') {
        expectTypeOf(r.data[0].aweme_info.aweme_id).toEqualTypeOf<string>()
        expectTypeOf(r.path).toEqualTypeOf<string>()
      }
      return r
    }
    expectTypeOf(read).parameter(0).toEqualTypeOf<Resp>()
  })
})
