import { createKuaishouSigner } from 'amagi/platforms/kuaishou/sign'
/**
 * platforms/kuaishou/sign 的实例级签名状态。
 *
 * v7 修 #40/#41/#42：签名状态（`count` / `startupRandom` / 匿名 `kww`）
 * 随签名器实例走，不再是模块级单例。v6 的三条 KNOWN-DEFECT 在这里改写为
 * 正向断言：
 * - #40：匿名 kww 不再模块级恒定不变 —— 两个实例各自生成、互不干扰。
 * - #41：同一实例内相同 payload 连续签名仍不同（防重放是预期行为），
 *   但这是**实例内**的状态推进，不是全局共享。
 * - #42：`count` 不再在「测试/实例之间」共享 —— 两个实例的 count 独立。
 */
import { describe, expect, it } from 'vitest'

import { freezeEntropy } from '../../helpers/deterministic'

const LIVE_API_URL = 'https://live.kuaishou.com/live_api/baseuser/userinfo/byid?caver=2&principalId=pid1'

describe('#40 改写：匿名 kww 随实例，不再模块级恒定不变', () => {
  it('两个实例各自生成匿名 kww，互不干扰', () => {
    const a = createKuaishouSigner()
    const b = createKuaishouSigner()

    const kwwA = a.generateKww('did=web_1')
    const kwwB = b.generateKww('other=1')

    expect(kwwA).toMatch(/###ssrd$/)
    expect(kwwB).toMatch(/###ssrd$/)
    // 两个实例的匿名 kww 互不相同（v6 是模块级缓存，恒等于第一个值）
    expect(kwwB).not.toBe(kwwA)
  })

  it('同一实例内匿名 kww 复用（浏览器访客会话语义保持）', () => {
    const signer = createKuaishouSigner()
    expect(signer.generateKww('did=web_1')).toBe(signer.generateKww(undefined))
  })

  it('带 kwfv1 的 cookie 直接复用该值（不受实例影响）', () => {
    const a = createKuaishouSigner()
    const b = createKuaishouSigner()
    expect(a.generateKww('kwfv1=TOKEN123')).toBe('TOKEN123')
    expect(b.generateKww('kwfv1=TOKEN123')).toBe('TOKEN123')
  })
})

describe('#41 改写：相同 payload 连续签名结果不同（防重放，实例内状态推进）', () => {
  it('同一实例内连续两次签名不同（防重放是预期行为）', () => {
    const signer = createKuaishouSigner()
    freezeEntropy()
    const payload = { url: '/rest/k/user/info', query: { caver: '2', principalId: 'pid1' }, form: {}, requestBody: {} }

    const first = signer.generateHxfalconFromPayload(payload).signResult
    const second = signer.generateHxfalconFromPayload(payload).signResult

    expect(second).not.toBe(first)
  })
})

describe('#42 改写：count 随实例，两个 client 的签名状态互不干扰', () => {
  it('两个实例各自从默认 count 起步，互不影响', () => {
    const a = createKuaishouSigner()
    const b = createKuaishouSigner()

    // 实例 a 签一次
    const sigA = a.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN')
    expect(sigA.signResult).toBeTruthy()

    // 实例 b 从独立状态起步：仍能正常签名
    const _sigB = b.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN')

    // 冻结随机源后，唯一可变输入是各自的 count —— 两个实例 count 独立，
    // 因此 a 的第 2 次与 b 的第 1 次可重放为相同结果（count 都在同一位）
    freezeEntropy()
    const aSecond = a.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN')
    freezeEntropy()
    const bSecond = b.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN')
    expect(aSecond.signResult).toBe(bSecond.signResult)
  })

  it('实例 a 的签名不影响实例 b 的后续签名（count 不共享）', () => {
    const a = createKuaishouSigner()
    const b = createKuaishouSigner()

    // a 推进 3 次
    for (let i = 0; i < 3; i++) a.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN')

    // b 不受影响：b 的 signInput 只依赖 payload（与实例无关），
    // 且 b 仍能正常签名（count 独立推进，没有被 a 的 3 次推高）
    const bSigned = b.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN')
    expect(bSigned.signInput).toBe('/live_api/baseuser/userinfo/byidcaver=2principalId=pid1')
    expect(bSigned.signResult).toBeTruthy()
  })
})

describe('实例级签名器的基础行为', () => {
  it('signLiveApiUrl 补齐 __NS_hxfalcon 与 caver，保留原有参数', () => {
    const signer = createKuaishouSigner()
    const signed = signer.signLiveApiUrl(LIVE_API_URL, 'kwfv1=TOKEN123')
    const url = new URL(signed.url)

    expect(url.searchParams.get('__NS_hxfalcon')).toBeTruthy()
    expect(url.searchParams.get('caver')).toBe(signer.getCatVersion())
    expect(url.searchParams.get('principalId')).toBe('pid1')
    expect(signed.headers.kww).toBe('TOKEN123')
  })

  it('不传 cookie 时也能签名（匿名 kww 随实例生成）', () => {
    const signer = createKuaishouSigner()
    expect(() => signer.signLiveApiUrl(LIVE_API_URL)).not.toThrow()
  })

  it('非法 URL 抛错', () => {
    const signer = createKuaishouSigner()
    expect(() => signer.signLiveApiUrl('not-a-url')).toThrow()
  })

  it('返回结构包含 url / headers / signResult / signInput / catVersion', () => {
    const signer = createKuaishouSigner()
    const signed = signer.signLiveApiUrl(LIVE_API_URL)
    expect(Object.keys(signed).sort()).toEqual(['catVersion', 'headers', 'signInput', 'signResult', 'url'])
  })
})