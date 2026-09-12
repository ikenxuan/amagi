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
})
