import { douyinSign as v7Sign } from 'amagi/platforms/douyin/sign'
/**
 * platforms/douyin/sign 的契约。
 *
 * 判据：**v6 的 `sign-douyin.test.ts` 快照一字不变**。与小红书/快手同一策略：
 * v6 快照由 `test/platform/sign-douyin.test.ts` 锁死，v7 签名输出与 v6
 * 逐项 `toBe` 对照（冻结熵源后）。
 */
import { douyinSign as v6Sign } from 'amagi/platform/douyin/sign'
import { describe, expect, it } from 'vitest'

import { freezeEntropy } from '../../helpers/deterministic'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const URL_WITH_QUERY = 'https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&aweme_id=7123456789'

describe('platforms/douyin/sign 与 v6 逐项对照', () => {
  it('AB (a_bogus)：冻结熵源后与 v6 输出一致', () => {
    freezeEntropy()
    const v7 = (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY, UA)
    freezeEntropy()
    const v6 = (v6Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY, UA)
    expect(v7).toBe(v6)
  })

  it('AB：省略 UA 时回落内置默认 UA（与 v6 一致）', () => {
    freezeEntropy()
    const v7 = (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY)
    freezeEntropy()
    const v6 = (v6Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY)
    expect(v7).toBe(v6)
  })

  it('AB：中文查询串与 v6 输出一致', () => {
    const url = 'https://www.douyin.com/a?q=中文'
    freezeEntropy()
    const v7 = (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(url, UA)
    freezeEntropy()
    const v6 = (v6Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(url, UA)
    expect(v7).toBe(v6)
  })

  it('XB (X-Bogus)：冻结熵源后与 v6 输出一致', () => {
    freezeEntropy()
    const v7 = (v7Sign as unknown as { XB: (u: string, ua?: string) => string }).XB(URL_WITH_QUERY, UA)
    freezeEntropy()
    const v6 = (v6Sign as unknown as { XB: (u: string, ua?: string) => string }).XB(URL_WITH_QUERY, UA)
    expect(v7).toBe(v6)
  })

  it('XB：省略 UA 时与 v6 一致', () => {
    freezeEntropy()
    const v7 = (v7Sign as unknown as { XB: (u: string, ua?: string) => string }).XB(URL_WITH_QUERY)
    freezeEntropy()
    const v6 = (v6Sign as unknown as { XB: (u: string, ua?: string) => string }).XB(URL_WITH_QUERY)
    expect(v7).toBe(v6)
  })

  it('VerifyFpManager：形状与 v6 一致（verify_ 前缀 + 36 位）', () => {
    const v7 = (v7Sign as unknown as { VerifyFpManager: () => string }).VerifyFpManager()
    const v6 = (v6Sign as unknown as { VerifyFpManager: () => string }).VerifyFpManager()
    expect(v7.startsWith('verify_')).toBe(true)
    expect(v7.length).toBe(v6.length)
  })

  it('Mstoken：返回指定长度的随机串（与 v6 同字符集）', () => {
    const v7 = (v7Sign as unknown as { Mstoken: (n: number) => string }).Mstoken(116)
    expect(v7).toHaveLength(116)
    expect(v7).toMatch(/^[A-Za-z0-9]+$/)
  })
})

describe('platforms/douyin/sign 行为与 v6 一致', () => {
  it('URL 不同则签名不同', () => {
    freezeEntropy()
    const a = (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY, UA)
    freezeEntropy()
    const b = (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY + '&extra=1', UA)
    expect(b).not.toBe(a)
  })

  it('UA 不同则签名不同', () => {
    freezeEntropy()
    const a = (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY, UA)
    freezeEntropy()
    const b = (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(URL_WITH_QUERY, UA.replace('125', '130'))
    expect(b).not.toBe(a)
  })

  it('边界输入不抛错（无查询串 / 空查询串 / 含中文）', () => {
    for (const url of ['https://www.douyin.com/aweme/v1/web/aweme/detail/', 'https://www.douyin.com/a?', 'https://www.douyin.com/a?q=中文']) {
      expect(() => (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(url, UA)).not.toThrow()
    }
  })
})