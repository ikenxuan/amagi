import { isPlatform, PLATFORMS } from 'amagi/contracts/platform'
/**
 * contracts/platform 的运行时契约。
 *
 * 类型层断言（`Platform` 恰好是四个平台的联合）在
 * `test/types/contracts.test-d.ts`，由 `pnpm test:types` 运行。
 */
import { describe, expect, it } from 'vitest'

describe('contracts/platform', () => {
  it('PLATFORMS 恰好是四个平台，顺序被锁定', () => {
    expect(PLATFORMS).toEqual(['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'])
  })

  it('PLATFORMS 无重复项', () => {
    expect(new Set(PLATFORMS).size).toBe(PLATFORMS.length)
  })

  it('isPlatform 对四个平台名返回 true', () => {
    for (const p of PLATFORMS) {
      expect(isPlatform(p)).toBe(true)
    }
  })

  it('isPlatform 对非平台值返回 false', () => {
    for (const v of ['Douyin', 'weibo', '', 'douyin ', null, undefined, 0, {}, ['douyin']]) {
      expect(isPlatform(v)).toBe(false)
    }
  })
})
