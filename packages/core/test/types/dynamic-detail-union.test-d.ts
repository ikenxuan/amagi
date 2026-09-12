import type { BilibiliDynamicDetailResponse } from 'amagi/types/generated'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * B站动态详情的**生成类型**：判别联合到底能不能用（`dynamic-enum-coverage.test.ts` 管的是手写树，这里管产物）。
 *
 * 这个端点走到判别联合花了三步，每步都有会退化的写法，所以这里逐条钉住：
 *
 * 1. 判别字段是**字面量联合**而不是 `string`（退化成 `string` → 收窄全废）；
 * 2. 收窄靠裸 `if` / `switch` 就够（判别式在 `data.item.type`，收窄的是 `data.item` 这一层）；
 * 3. 末尾有**兜底支**（判别式取到没见过的值时不至于让下游编译红），而它的判别字段必须是
 *    `?: never` —— 写成 `type: string` 或者干脆不声明，都会让第 2 条里那些断言变成 `any`，
 *    也就是这一份里最容易被改坏、又最不容易发现的地方。
 */
type Resp = BilibiliDynamicDetailResponse

describe('B站动态详情：生成类型的判别联合', () => {
  it('判别字段是字面量联合（不是 string）—— 这是收窄能成立的前提', () => {
    expectTypeOf<Extract<Resp['data']['item']['type'], string>>().toEqualTypeOf<
      'DYNAMIC_TYPE_AV' | 'DYNAMIC_TYPE_DRAW' | 'DYNAMIC_TYPE_FORWARD'
    >()
  })

  it('裸 if 收窄到已知支，支内字段是精确类型（不是 any、也不是 `null | …`）', () => {
    const narrow = (resp: Resp) => {
      if (resp.data.item.type === 'DYNAMIC_TYPE_AV') {
        // 这三条断言同时锁住两件事：① 判别式是字面量 ② 兜底支是 `?: never`。
        // 兜底支改成 `type: string` 的话，收窄结果会带上它，这里全变 `any`，三条一起红。
        expectTypeOf(resp.data.item.modules.module_dynamic.major.archive.bvid).toEqualTypeOf<string>()
        expectTypeOf(resp.data.item.modules.module_dynamic.major).not.toBeAny()
        expectTypeOf(resp.data.item.id_str).toEqualTypeOf<string>()
      }
      return resp
    }
    expectTypeOf(narrow).parameter(0).toEqualTypeOf<Resp>()
  })

  it('switch + 枚举式的分支同样精确', () => {
    const pick = (resp: Resp) => {
      switch (resp.data.item.type) {
        case 'DYNAMIC_TYPE_AV':
          return resp.data.item.modules.module_dynamic.major.archive.bvid
        case 'DYNAMIC_TYPE_FORWARD':
          return resp.data.item.orig.id_str
        case 'DYNAMIC_TYPE_DRAW':
          return resp.data.item.id_str
        default:
          return undefined
      }
    }
    expectTypeOf(pick).returns.toEqualTypeOf<string | undefined>()
  })

  it('兜底支存在：`default` / `else` 分支里读没见过的字段不报错（平台加新类型不算 breaking）', () => {
    const render = (resp: Resp) => {
      if (resp.data.item.type === 'DYNAMIC_TYPE_AV') return resp.data.item.id_str
      // 这一支里 `resp.data.item` 不是 `never` —— 是的话下面这行编译不过，
      // 那就是「平台加一个新动态类型 → 下游 `else` 分支直接红」，正是兜底支要避免的事
      return resp.data.item.这个字段今天还不存在
    }
    // `string | any` 收敛成 `any`
    expectTypeOf(render).returns.toBeAny()
  })

  it('兜底支的判别字段是 `?: never`（`undefined` 只可能来自它）', () => {
    expectTypeOf<Extract<Resp['data']['item']['type'], undefined>>().toEqualTypeOf<undefined>()
  })

  it('信封字段不受影响；兜底支管辖的 `data.item` 在**未收窄**时退化成 any（有意的取舍）', () => {
    // 信封（`code` / `message` / `ttl`）跟判别式无关，兜底支照常声明它们，所以精度还在
    expectTypeOf<Resp['code']>().toEqualTypeOf<number>()

    // 但 `data.item` 里面是判别式管辖的范围 —— 兜底支对它不作任何承诺（只有索引签名），
    // 于是未收窄的访问拿到 `any`。这是「平台加新类型不能把下游编译红」的代价，不是 bug：
    // 要精度就先收窄（上面那两条断言里，收窄之后 `id_str` 仍然是 `string`）。
    const unNarrowed = (resp: Resp) => resp.data.item.id_str
    expectTypeOf(unNarrowed).returns.toBeAny()
  })
})
