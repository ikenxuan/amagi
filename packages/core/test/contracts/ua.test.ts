import { browserOf, DEFAULT_UA, generateSecChUa } from 'amagi/contracts/ua'
import { describe, expect, it } from 'vitest'

const EDGE_154 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0'

describe('contracts/ua', () => {
  it('Edge UA 的 sec-ch-ua 与 2026-10-07 Edge 154 抓包逐字一致', () => {
    expect(generateSecChUa(EDGE_154)).toBe('"Chromium";v="154", "Microsoft Edge";v="154", "Not A(Brand";v="99"')
  })

  it('不带 Edg/ 的 UA 声明 Google Chrome，品牌位次与 GREASE 只由 Chromium 主版本决定', () => {
    expect(generateSecChUa(EDGE_154.replace(' Edg/154.0.0.0', ''))).toBe(
      '"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"'
    )
  })

  it('browserOf：Edge 先于 Chrome 认出，浏览器版本取 Edg/、内核版本取 Chrome/', () => {
    expect(browserOf(EDGE_154.replace('Edg/154.0.0.0', 'Edg/154.0.3.1'))).toEqual({
      name: 'Edge',
      version: '154.0.3.1',
      engineVersion: '154.0.0.0'
    })
    expect(browserOf(DEFAULT_UA)).toEqual({ name: 'Chrome', version: '142.0.0.0', engineVersion: '142.0.0.0' })
    expect(browserOf('SomeBot/1.0')).toEqual({ name: 'Chrome', version: '142.0.0.0', engineVersion: '142.0.0.0' })
  })
})
