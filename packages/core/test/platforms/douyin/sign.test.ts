import { douyinSign as v7Sign } from 'amagi/platforms/douyin/sign'
/**
 * platforms/douyin/sign 的契约。
 *
 * ## 这个文件证明不了什么（说清楚，免得下一个人误信）
 *
 * 它对照 v7 与 legacy 两个类的输出。但两个类**现在是同一批函数**——legacy
 * `import` 的就是 `platforms/douyin/sign/` 下的 `a_bogus` / `x_bogus` / `tokens`，
 * 所以 AB / XB 那几条 `expect(v7).toBe(v6)` 等于把函数和自己比。
 * 它们只在一个意义上有效：**守住 legacy 不再退回自带一份实现**——曾经它就是这么做的，
 * 于是 v7 修好 `VerifyFpManager` 的时钟来源之后，legacy 那份还留着缺陷，而这里的
 * 「逐项对照」因为只比长度，毫无反应。
 *
 * 真正能证伪实现的是 `abogus-oracle.test.ts`：它拿真实浏览器产出的签名反推，
 * 有一份不随被测代码变化的外部锚点。算法契约以那份为准。
 */
import { douyinSign as v6Sign } from 'amagi/platforms/legacy/douyin/sign'
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
    for (const url of [
      'https://www.douyin.com/aweme/v1/web/aweme/detail/',
      'https://www.douyin.com/a?',
      'https://www.douyin.com/a?q=中文'
    ]) {
      expect(() => (v7Sign as unknown as { AB: (u: string, ua?: string) => string }).AB(url, UA)).not.toThrow()
    }
  })
})
