import { readFileSync } from 'node:fs'

/**
 * `sign/xhshow/` 内联副本的特征化回归测试。
 *
 * ## 为什么需要它
 *
 * 上游 `@ikenxuan/xhshow-ts` **没有任何测试**，而它的产物是签名与密文：搬错了不会有
 * 编译错误，只会在真机上被判 406 或静默返回空 data —— 那类失效从响应侧几乎反推不出来。
 * 所以内联时先把上游在**钉死随机源**下的输出录成基线，此后逐字节比对。
 *
 * ## 钉法
 *
 * 实测：只钉 `Math.random` 与 `Date.now` 即可让上游全部公开 API 确定化 ——
 * 随机性全部经 `Math.random`，`node:crypto.randomBytes` 不参与签名路径。
 * 每个用例调用前重置序列，因此同一份基线在任何机器上可复现。
 *
 * ## 基线怎么更新
 *
 * **只有在确认行为变更是有意的**（例如平台换了签名版本）才更新基线，且更新后必须
 * 用真机抓包复核。基线文件：`test/fixtures/xhshow-vectors.json`。
 */
import { createXiaohongshuCryptoConfig } from 'amagi/platforms/xiaohongshu/sign/config'
import { CryptoConfig, FingerprintGenerator, Xhshow, xRapParam } from 'amagi/platforms/xiaohongshu/sign/xhshow'
import { describe, expect, it } from 'vitest'

/** 与录制基线时同一套线性同余序列 */
const makeSeq = (seed: number) => {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

const FIXED_NOW = 1791764538000
const A1 = '1a12d7d253cpryk0kzlokcu2m978boveifqnqn4h350000355230'
const A1_B = '1a12d7d2290xq7hg10c3w3mlaudszkkw5157zily0000abcdef'
const TS = 1791764538

const baseline = JSON.parse(readFileSync(new URL('../../fixtures/xhshow-vectors.json', import.meta.url), 'utf8')) as Record<string, unknown>

/**
 * 每次调用前重置随机序列再执行 —— **必须与录制基线时同一钉法**。
 *
 * 基线录制时每个用例都从种子重新起序列；若改成「整块共用一个连续序列」，
 * 各次调用取到的随机值不同，会得到一份假红。别改成包一层。
 */
const withPinnedSources = <T>(fn: () => T): T => {
  const origRandom = Math.random
  const origNow = Date.now
  Math.random = makeSeq(0x5eed)
  Date.now = () => FIXED_NOW
  try {
    return fn()
  } finally {
    Math.random = origRandom
    Date.now = origNow
  }
}

describe('sign/xhshow 内联副本：与上游基线逐字节一致', () => {
  it('全部签名向量与基线相符', () => {
    const cfg = new CryptoConfig()
    const x = new Xhshow(cfg)
    const fpGen = new FingerprintGenerator(cfg)
    const uri = '/api/sns/web/v1/user_posted'
    const payload = { user_id: 'u1', num: 30, image_formats: 'jpg,webp,avif', xsec_source: 'pc_feed' }

    const actual: Record<string, unknown> = {
      'Xhshow.generateA1': withPinnedSources(() => Xhshow.generateA1()),
      'Xhshow.generateWebId': Xhshow.generateWebId(A1),
      'signXs.GET': withPinnedSources(() => x.signXs('GET', uri, A1, 'xhs-pc-web', payload, TS)),
      'signXs.POST': withPinnedSources(() => x.signXs('POST', '/api/sns/web/v1/feed', A1, 'xhs-pc-web', { a: 1 }, TS)),
      'signXyw.GET': withPinnedSources(() => x.signXyw('GET', uri, A1, 'xhs-pc-web', payload, TS)),
      'signXyw.POST': withPinnedSources(() => x.signXyw('POST', '/api/sns/web/v1/feed', A1, 'xhs-pc-web', { a: 1 }, TS)),
      'signXsCommon.dict': withPinnedSources(() => x.signXsCommon({ a1: A1 })),
      'signXsCommon.otherA1': withPinnedSources(() => x.signXsCommon({ a1: A1_B })),
      getXT: x.getXT(TS),
      getB3TraceId: withPinnedSources(() => x.getB3TraceId()),
      getXrayTraceId: withPinnedSources(() => x.getXrayTraceId(TS, 7)),
      getSearchId: withPinnedSources(() => x.getSearchId()),
      getSearchRequestId: withPinnedSources(() => x.getSearchRequestId()),
      xRapParam: withPinnedSources(() => xRapParam('//edith.xiaohongshu.com/api/sns/web/v1/feed', { a: 1 })),
      'fingerprint.b1': withPinnedSources(() => fpGen.generateB1(fpGen.generate({ a1: A1 }, cfg.PUBLIC_USERAGENT))),
      'fingerprint.keys': withPinnedSources(() => Object.keys(fpGen.generate({ a1: A1 }, cfg.PUBLIC_USERAGENT)).sort())
    }

    // 逐键比对而不是整体 toEqual：失配时能直接指出是哪个 API 漂了
    const drifted = Object.keys(baseline).filter((k) => JSON.stringify(actual[k]) !== JSON.stringify(baseline[k]))
    expect(drifted, `以下向量与基线不符：${drifted.join(', ')}`).toEqual([])
    expect(Object.keys(actual).sort()).toEqual(Object.keys(baseline).sort())
  })

  it('a1 结构符合真机格式：hex(ts) + 30 随机 + "50000" + crc32', () => {
    const a1 = withPinnedSources(() => Xhshow.generateA1())
    expect(a1).toHaveLength(52)
    // 常量段必须是 50000（旧手搓实现写成 5000，会导致 a1 内部 crc 算错）
    expect(a1.slice(41, 46)).toBe('50000')
    expect(a1.slice(0, 11)).toMatch(/^[0-9a-f]{11}$/)
  })

  it('createXiaohongshuCryptoConfig 的版本位跨信封一致', () => {
    // 回归守卫：x-s 本体 x0 与 x-s-common x1 必须是同一个签名版本。
    // 平台对「两个信封版本不一致」的处置是静默返回空 data，不报错。
    const cfg = createXiaohongshuCryptoConfig()
    expect(cfg.SIGNATURE_DATA_TEMPLATE.x0).toBe(cfg.SIGNATURE_XSCOMMON_TEMPLATE.x1)
    expect(cfg.DATA_SDK_VERSION).toBe(cfg.SIGNATURE_DATA_TEMPLATE.x0)
    expect(cfg.DATA_WEB_BUILD).toBe(cfg.SIGNATURE_XSCOMMON_TEMPLATE.x4)
  })
})
