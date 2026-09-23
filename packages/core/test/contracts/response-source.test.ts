/**
 * 端点声明的响应类型**与生成树对得上**—— `type<any>()` 的登记册。
 *
 * ## 为什么要这条
 *
 * 2026-09-11 端点声明的 `response` 换成了 `@ikenxuan/amagi-response-types` 的生成类型；
 * 当时 65 个端点里只有 42 个有生成类型，其余 21 个按决定回退 `any`。**那 21 个是洞，
 * 得有人补样本**——而「补完样本之后怎么知道该动哪一行」原先没有答案：
 * `response-mapping.test-d.ts` 里那些 `toBeAny()` 只断言端点是 `any`，生成树里多出一个
 * 类型并不会让它们变红。也就是说**闭不上环**。
 *
 * 这条把环闭上：两端都是**已提交的文件**（端点声明 + 生成树 barrel），所以它零样本可跑、
 * CI 上有效。规则三条：
 *
 * 1. 声明了 `<平台><端点>Response` 的端点，那个名字必须在生成树里存在；
 * 2. 声明了 `any` 的端点，生成树里**必须还没有**对应的名字 —— 一旦有，这条会红，
 *    提醒把那行换成真类型（**这就是补样本之后的动作项**）；
 * 3. 不在任何一侧的端点（`compute` 那两个：本地算完就返回、从不发请求）进白名单。
 *
 * 失败信息里直接写修法，省得下一个人去翻 PRD。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const GENERATED = join(CORE, '..', 'response-types', 'src', 'generated')

/** 平台目录名 → 生成树里的公共名前缀（与 `typegen` 的 `pascal()` 同一口径） */
const PLATFORMS: Record<string, string> = {
  bilibili: 'Bilibili',
  douyin: 'Douyin',
  kuaishou: 'Kuaishou',
  xiaohongshu: 'Xiaohongshu'
}

/**
 * 白名单：`compute` 端点。本地算完就返回、一个网络请求都不发，永远录不到「响应」，
 * 所以它们没有、也不会有生成类型，保留各自的本地声明是唯一正确的做法。
 */
const COMPUTE_ENDPOINTS = ['bilibili/avToBv', 'bilibili/bvToAv']

/** 生成树里可用的公共名：`<平台>/index.ts` 的 `export type { X as XxxYyyResponse }` */
const availableNames = (platform: string): Set<string> => {
  const barrel = readFileSync(join(GENERATED, platform, 'index.ts'), 'utf8')
  return new Set([...barrel.matchAll(/^export type \{ \w+ as (\w+Response) \} from /gm)].map((m) => m[1]!))
}

/** 端点声明里 `response:` 那一行用的类型表达式 */
const declaredResponse = (platform: string, endpoint: string): string => {
  const source = readFileSync(join(CORE, 'src', 'platforms', platform, 'endpoints', `${endpoint}.ts`), 'utf8')
  const match = /^\s*response: type<(.+)>\(\),?$/m.exec(source)
  return match?.[1] ?? ''
}

const endpointsOf = (platform: string): string[] =>
  readdirSync(join(CORE, 'src', 'platforms', platform, 'endpoints'))
    .filter((name) => name.endsWith('.ts') && name !== 'index.ts' && name !== 'define.ts')
    .map((name) => name.replace(/\.ts$/, ''))
    .sort()

const allEndpoints = Object.keys(PLATFORMS).flatMap((platform) => endpointsOf(platform).map((endpoint) => ({ platform, endpoint })))

describe('端点声明的响应类型与生成树一致', () => {
  it('端点列表与白名单都不空（防这条测试自己被改瞎）', () => {
    expect(allEndpoints.length).toBe(65)
    expect(COMPUTE_ENDPOINTS).toHaveLength(2)
  })

  it('声明了生成类型的端点，那个名字在树里存在', () => {
    const missing: string[] = []
    for (const { platform, endpoint } of allEndpoints) {
      const declared = declaredResponse(platform, endpoint)
      if (declared === 'any' || declared.endsWith('Data')) continue
      if (!availableNames(platform).has(declared)) missing.push(`${platform}/${endpoint} 声明了 ${declared}，但生成树里没有这个名字`)
    }
    expect(missing).toEqual([])
  })

  it('**声明 `any` 的端点，生成树里必须还没有对应类型** —— 有了就该换掉了', () => {
    const stale: string[] = []
    for (const { platform, endpoint } of allEndpoints) {
      if (COMPUTE_ENDPOINTS.includes(`${platform}/${endpoint}`)) continue
      if (declaredResponse(platform, endpoint) !== 'any') continue
      const wanted = `${PLATFORMS[platform]!}${endpoint[0]!.toUpperCase()}${endpoint.slice(1)}Response`
      if (availableNames(platform).has(wanted)) {
        stale.push(
          `${platform}/${endpoint}：生成树里已经有 ${wanted} 了，把 response 换成 type<${wanted}>()，并把 response-mapping.test-d.ts 里那条 toBeAny() 改成 toEqualTypeOf<${wanted}>()`
        )
      }
    }
    expect(stale).toEqual([])
  })

  it('白名单里的两个 compute 端点确实还在（它们不该有生成类型）', () => {
    for (const entry of COMPUTE_ENDPOINTS) {
      const [platform, endpoint] = entry.split('/') as [string, string]
      expect(declaredResponse(platform, endpoint)).not.toBe('any')
    }
  })
})
