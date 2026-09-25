import type { AnyEndpointDef, Registry } from 'amagi/contracts/endpoint'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
/**
 * 分页端点的声明规则。
 *
 * 收尾从端点级 `normalize` 搬进 `paginate.merge` 之后，`execute` 的分页分支
 * **只调 `paginate.merge`、不看 `def.normalize`**（`runtime/execute.ts`）。所以分页端点上
 * 残留的 `normalize` 会被**静默忽略** —— 编译不报、运行时也不报，只是整形那步没跑，
 * 返回的是翻页内部结构（`{ lastPage, items }`）而不是声明的形状。老肌肉记忆、从 git 历史
 * 拷旧端点、或看到 `EndpointDef` 上有 `normalize` 就用，都会踩。这条把这类误写钉在 CI 上。
 */
import { describe, expect, it } from 'vitest'

const REGISTRIES: ReadonlyArray<readonly [platform: string, registry: Registry]> = [
  ['douyin', douyinRegistry],
  ['bilibili', bilibiliRegistry],
  ['kuaishou', kuaishouRegistry],
  ['xiaohongshu', xiaohongshuRegistry]
]

const allEndpoints = REGISTRIES.flatMap(([platform, registry]) =>
  Object.entries(registry).map(([short, def]) => ({ platform, short, def: def as AnyEndpointDef }))
)

describe('分页端点声明规则', () => {
  it('声明了 paginate 的端点一律不得再声明 normalize（收尾写在 paginate.merge 里）', () => {
    const offenders = allEndpoints
      .filter(({ def }) => def.paginate !== undefined && def.normalize !== undefined)
      .map(({ platform, short }) => `${platform}.${short}`)
    // execute 分页分支只调 paginate.merge，这里的 normalize 会被静默吞掉 —— 把收尾搬进 merge
    expect(offenders).toEqual([])
  })

  it('当前恰好 10 个分页端点（防这条测试自己被改瞎）', () => {
    const paged = allEndpoints.filter(({ def }) => def.paginate !== undefined)
    expect(paged).toHaveLength(10)
  })
})

/**
 * 同构分段并发端点的声明规则（与上面的 paginate 同一个道理）。
 *
 * 收尾写在 `aggregate` 里之后，`execute` 的多请求分支**优先调 `aggregate`、不看
 * `def.normalize`**（`runtime/execute.ts`）。所以这类端点上残留的 `normalize` 会被
 * **静默忽略** —— 从 normalize 迁到 aggregate 时忘删旧的、或拷旧端点带进来，都会踩。
 * 这条把误写钉在 CI 上。
 */
describe('分段并发端点声明规则', () => {
  it('声明了 aggregate 的端点一律不得再声明 normalize（收尾写在 aggregate 里）', () => {
    const offenders = allEndpoints
      .filter(({ def }) => def.aggregate !== undefined && def.normalize !== undefined)
      .map(({ platform, short }) => `${platform}.${short}`)
    // execute 多请求分支只调 aggregate，这里的 normalize 会被静默吞掉 —— 把收尾搬进 aggregate
    expect(offenders).toEqual([])
  })

  it('当前恰好 2 个分段并发端点（防这条测试自己被改瞎）', () => {
    const aggregated = allEndpoints.filter(({ def }) => def.aggregate !== undefined)
    expect(aggregated).toHaveLength(2)
  })
})
