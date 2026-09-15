import type { AmagiResult } from 'amagi/contracts/result'
import { unwrap } from 'amagi/contracts/result'
import type { BilibiliDynamicDetailResponse } from 'amagi/types/generated'
import { DynamicType } from 'amagi/types/ReturnDataType/Bilibili/DynamicType'
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
 *
 * 2026-09-14 补了四条 —— `src/dev.ts` 的 B站动态那段（它自己在编译期跑着这套东西，但
 * `pnpm typecheck` 只证明「能编译」，不证明「收窄是精确的」）删掉之前，先把它的断言落在这里：
 *
 * 4. **枚举值 ⟷ 生成字面量**。`DynamicType` 是手写的运行时枚举，生成侧是字面量：上面那些
 *    用例全用字面量，只有下面 `case DynamicType.AV` 那条把两者焊在一起 —— 哪天分家，
 *    这里是 TS2678，不再只靠 dev.ts 编译时兜着；
 * 5. **DRAW 支的 `major.opus.pics`**（dev.ts 里 `.pics.length` 那行）是真类型，不是索引签名的 any；
 * 6. **没建模的取值写不进 `case`**：`DynamicType.WORD` 报 TS2678，用 `@ts-expect-error` 钉住
 *    —— 那条指令断言「这里必须报错」，不是抑制报错；
 * 7. **从 `AmagiResult` 里读**（dev.ts 的 `resp` / `resp2`）：判别联合不因套了一层信封而退化。
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

  it('枚举接在生成类型上：`case DynamicType.AV` 一样收窄（枚举值 ⟷ 生成字面量这条链）', () => {
    const pick = (resp: Resp) => {
      switch (resp.data.item.type) {
        // 这一行是**两棵树之间唯一的接口**：`DynamicType` 是手写运行时枚举，`resp.data.item.type`
        // 是生成的字面量。上面那些用例全用字面量，钉不住这条链 —— 生成侧换了字面量、
        // 或者枚举改了值，这里 TS2678「不可比较」直接红。
        case DynamicType.AV:
          return resp.data.item.modules.module_dynamic.major.archive.bvid
        case DynamicType.FORWARD:
          return resp.data.item.orig.id_str
        default:
          return undefined
      }
    }
    // 收窄要是退化成 any，`pick` 的返回就成了 any，这条断言红
    expectTypeOf(pick).returns.toEqualTypeOf<string | undefined>()
  })

  it('DRAW 支的 `major.opus.pics` 是对象数组（`src/dev.ts` 里 `.pics.length` 那行的依据）', () => {
    const read = (resp: Resp) => {
      if (resp.data.item.type === DynamicType.DRAW) {
        // 三件事一起钉住：`opus` 在这一支是必填（所以不用判空）、`pics` 是数组、
        // 元素上是真类型 —— 索引签名没把它们吞成 any
        expectTypeOf(resp.data.item.modules.module_dynamic.major.opus.pics).not.toBeAny()
        expectTypeOf(resp.data.item.modules.module_dynamic.major.opus.pics.length).toEqualTypeOf<number>()
        expectTypeOf(resp.data.item.modules.module_dynamic.major.opus.pics[0].url).toEqualTypeOf<string>()
        // 代价写在明处：DRAW 支没有 `archive`（那是 AV 支的），读它不报错但拿到 any
        expectTypeOf(resp.data.item.modules.module_dynamic.major.archive).toBeAny()
      }
      return resp
    }
    expectTypeOf(read).parameter(0).toEqualTypeOf<Resp>()
  })

  it('没建模的取值写不进 `case`：`DynamicType.WORD` 是 TS2678（枚举里有、样本里没有）', () => {
    const pick = (resp: Resp): string | undefined => {
      switch (resp.data.item.type) {
        case 'DYNAMIC_TYPE_AV':
          return resp.data.item.id_str
        // @ts-expect-error TS2678：生成的判别联合里没有 `DYNAMIC_TYPE_WORD` 这一支。
        // 这条指令断言「这里**必须**报错」：哪天 Word 动态录到样本、生成类型多出一支，
        // 它就变成多余指令，`pnpm test:types` 报 Unused '@ts-expect-error' 而红 ——
        // 那时该做的是把它换成正儿八经的 `case DynamicType.WORD` 分支，不是删掉断言。
        case DynamicType.WORD:
          return undefined
        default:
          return undefined
      }
    }
    expectTypeOf(pick).returns.toEqualTypeOf<string | undefined>()
  })

  it('从 Result 读：`unwrap` 与 `if (r.success)` 之后判别联合不退化（`src/dev.ts` 的 `resp` / `resp2`）', () => {
    const read = (r: AmagiResult<Resp>) => {
      const resp = unwrap(r)
      if (resp.data.item.type === DynamicType.AV) {
        expectTypeOf(resp.data.item.modules.module_dynamic.major.archive.bvid).toEqualTypeOf<string>()
      }
      if (r.success) {
        // dev.ts 里 `resp2.data.data.item.modules` 那一跳：信封 → 响应体 → `data.item`
        if (r.data.data.item.type === DynamicType.DRAW) {
          expectTypeOf(r.data.data.item.modules.module_dynamic.major.opus.pics.length).toEqualTypeOf<number>()
        }
      }
      return resp
    }
    expectTypeOf(read).returns.toEqualTypeOf<Resp>()
  })

  it('未收窄时，不判别的共有字段（`module_author` / `module_stat`）也是 any —— `src/dev.ts` 末尾那两行', () => {
    const read = (resp: Resp) => {
      // 同上一条：兜底支管辖的范围里，不收窄就只能拿到 any。这两个字段每支都有，
      // 但「每支都有」是运行时事实，类型上未收窄时仍不作承诺。
      expectTypeOf(resp.data.item.modules.module_author.name).toBeAny()
      expectTypeOf(resp.data.item.modules.module_stat.like.count).toBeAny()
      return resp
    }
    expectTypeOf(read).parameter(0).toEqualTypeOf<Resp>()
  })
})
