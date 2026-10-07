/**
 * 端点声明的响应类型必须能解析到一个公开的响应类型。
 *
 * 生成的响应类型来自真实语料录制。手写的协议扩展放在 generated/ 之外，
 * 并在 protocols/README.md 里列出依据。生成类型取而代之时必须显式下线对应的协议扩展；
 * 既不允许悄悄回退到 any，也不允许出现重复的公开名。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import { describe, expect, it } from 'vitest'

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const RESPONSES = join(CORE, '..', 'response-types', 'src')
const GENERATED = join(RESPONSES, 'generated')
const PROTOCOL_BARREL = join(RESPONSES, 'protocols', 'index.ts')

const PLATFORMS: Record<string, string> = {
  bilibili: 'Bilibili',
  douyin: 'Douyin',
  kuaishou: 'Kuaishou',
  xiaohongshu: 'Xiaohongshu'
}
const REGISTRIES = { bilibili: bilibiliRegistry, douyin: douyinRegistry, kuaishou: kuaishouRegistry, xiaohongshu: xiaohongshuRegistry }
const COMPUTE_ENDPOINTS = ['bilibili/avToBv', 'bilibili/bvToAv']

const exportedNames = (file: string): Set<string> => {
  if (!existsSync(file)) return new Set()
  return new Set([...readFileSync(file, 'utf8').matchAll(/^export type \{ \w+ as (\w+Response) \} from /gm)].map((m) => m[1]!))
}
const generatedNames = (platform: string): Set<string> => exportedNames(join(GENERATED, platform, 'index.ts'))
const protocolNames = exportedNames(PROTOCOL_BARREL)
// 现有录制是 HTML 里的 state；v7 端点现在改读 snake_case 的 user/otherinfo 接口。
const precisionNames = [
  ...readFileSync(PROTOCOL_BARREL, 'utf8').matchAll(/^export type \{ \w+ as (\w+Response) \} from '\.\/douyin-safe-integers'/gm)
].map((match) => match[1]!)
const PROTOCOL_REPLACEMENTS = new Set(['XiaohongshuUserProfileResponse', ...precisionNames])
const availableNames = (platform: string): Set<string> => new Set([...generatedNames(platform), ...protocolNames])

const declaredResponse = (platform: string, endpoint: string): string => {
  const source = readFileSync(join(CORE, 'src', 'platforms', platform, 'endpoints', `${endpoint}.ts`), 'utf8')
  return /^\s*response: type<(.+)>\(\),?$/m.exec(source)?.[1] ?? ''
}

// 读真实的注册表：endpoints/ 下的辅助模块不是端点声明。
const allEndpoints = Object.entries(REGISTRIES).flatMap(([platform, registry]) =>
  Object.keys(registry).map((endpoint) => ({ platform, endpoint }))
)

describe('端点声明的响应类型与公开类型源一致', () => {
  it('登记了全部 78 个端点，包括快手 PC REST 搜索与账号资料', () => {
    expect(allEndpoints).toHaveLength(78)
    for (const endpoint of ['searchUser', 'searchWorkList', 'loginUserProfile']) {
      expect(allEndpoints).toContainEqual({ platform: 'kuaishou', endpoint })
    }
    expect(COMPUTE_ENDPOINTS).toHaveLength(2)
    expect(allEndpoints).toContainEqual({ platform: 'douyin', endpoint: 'mixAweme' })
    for (const endpoint of ['liveRoom', 'liveSquare', 'liveStatus', 'searchHotList', 'searchUser', 'subComments']) {
      expect(allEndpoints).toContainEqual({ platform: 'xiaohongshu', endpoint })
    }
  })

  it('每个网络端点显式声明可公开使用的响应类型或尚未补全的 any', () => {
    const missing: string[] = []
    for (const { platform, endpoint } of allEndpoints) {
      if (COMPUTE_ENDPOINTS.includes(`${platform}/${endpoint}`)) continue
      const declared = declaredResponse(platform, endpoint)
      if (declared === 'any') continue
      if (!availableNames(platform).has(declared))
        missing.push(`${platform}/${endpoint}: ${declared || '缺少 response 声明'} 未在 response-types 公开源中导出`)
    }
    expect(missing).toEqual([])
  })

  it('有公开类型后不再允许端点保留 any', () => {
    const stale: string[] = []
    for (const { platform, endpoint } of allEndpoints) {
      if (declaredResponse(platform, endpoint) !== 'any') continue
      const wanted = `${PLATFORMS[platform]!}${endpoint[0]!.toUpperCase()}${endpoint.slice(1)}Response`
      if (availableNames(platform).has(wanted))
        stale.push(`${platform}/${endpoint}: 改用 type<${wanted}>() 并更新 response-mapping.test-d.ts`)
    }
    expect(stale).toEqual([])
  })

  it('录到真实样本后必须显式移除同名手写协议扩展', () => {
    const duplicated = Object.keys(PLATFORMS).flatMap((platform) =>
      [...generatedNames(platform)].filter((name) => protocolNames.has(name) && !PROTOCOL_REPLACEMENTS.has(name))
    )
    expect(duplicated, '生成类型应接替同名协议扩展，避免两个来源同时导出同名类型').toEqual([])
  })

  it('compute 端点保留本地声明', () => {
    for (const entry of COMPUTE_ENDPOINTS) {
      const [platform, endpoint] = entry.split('/') as [string, string]
      const declared = declaredResponse(platform, endpoint)
      expect(declared).not.toBe('')
      expect(declared).not.toBe('any')
    }
  })
})
