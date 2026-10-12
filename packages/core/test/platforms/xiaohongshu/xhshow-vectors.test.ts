import { readFileSync } from 'node:fs'

/**
 * `sign/xhshow/` 内联副本的特征化回归测试。
 *
 * ## 为什么需要它
 *
 * 这个子树的产物是签名与密文：搬错、改错都不会有编译错误，只会在真机上被判 406 或
 * 静默返回空 data —— 那类失效从响应侧几乎反推不出来。所以内联时先把上游在**钉死随机源**
 * 下的输出录成基线，此后逐字节比对。
 *
 * 上游自 v1.2.0 起有了自己的 `tests/`（`node:test` 写的，多为结构断言），那些另行移植在
 * `xhshow-*.test.ts` 里；**本文件守的是另一件事** —— 逐字节的产物一致性，两边不重叠。
 *
 * ## 钉法
 *
 * 实测：只钉 `Math.random` 与 `Date.now` 即可让上游全部公开 API 确定化 ——
 * 随机性全部经 `Math.random`，`node:crypto.randomBytes` 不参与签名路径。
 * 每个用例调用前重置序列，因此同一份基线在任何机器上可复现。
 *
 * ## 基线怎么更新
 *
 * 基线由 `scripts/gen-xhshow-vectors.mts`（`pnpm --filter @ikenxuan/amagi run gen:xhshow-vectors`）
 * 录制。**只有确认行为变更是有意的**（同步上游、平台换签名世代）才重录，且**重录前必须先跑
 * 真机功能验证**，确认新签名在真实接口上拿得到数据 —— 失配本身是有价值的信号，
 * 别为了让测试变绿而重录。
 *
 * 基线当前对应上游 `b138a4b`（v1.2.0 + b1 编码修复）。**改脚本的钉法必须同步改本文件的
 * `withPinnedSources`**，两边不一致会产出假红。
 */
import { createXiaohongshuCryptoConfig } from 'amagi/platforms/xiaohongshu/sign/config'
import { Base64Encoder, CryptoConfig, FingerprintGenerator, Xhshow, xRapParam } from 'amagi/platforms/xiaohongshu/sign/xhshow'
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

/**
 * x-s-common 里 `x12` 是 `${Date.now()};<模块加载时刻>` —— **后半段在模块首次 import 时
 * 就固定了**（上游 v1.2.0 引入的会话起点），跨进程必然不同，所以基线里那两位没法逐字节比。
 * 比对前把 x12 抹平，**其余字段与编码本身照常逐字节比**。
 *
 * x12 自身的契约由「x12 每次都刷新」那条用例守着，不靠基线。
 */
const XS_COMMON_KEYS = new Set(['signXsCommon.dict', 'signXsCommon.otherA1'])

const normalizeXsCommon = (signed: string, cfg: CryptoConfig): string => {
  const decoded = JSON.parse(new Base64Encoder(cfg).decode(signed)) as Record<string, unknown>
  decoded.x12 = '<x12>'
  return JSON.stringify(decoded)
}

describe('sign/xhshow 内联副本：与上游基线逐字节一致', () => {
  it('全部签名向量与基线相符', () => {
    const cfg = new CryptoConfig()
    const x = new Xhshow(cfg)
    const fpGen = new FingerprintGenerator(cfg)
    const uri = '/api/sns/web/v1/user_posted'
    const payload = { user_id: 'u1', num: 30, image_formats: 'jpg,webp,avif', xsec_source: 'pc_feed' }

    /** 需要抹平 x12 的向量先归一化，其余原样 */
    const normalize = (key: string, value: unknown): unknown =>
      XS_COMMON_KEYS.has(key) && typeof value === 'string' ? normalizeXsCommon(value, cfg) : value

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
    const drifted = Object.keys(baseline).filter(
      (k) => JSON.stringify(normalize(k, actual[k])) !== JSON.stringify(normalize(k, baseline[k]))
    )
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

  it('两个信封的签名版本位同代（x-s 的 x0 与 x-s-common 的 x1）', () => {
    // 回归守卫：这两处必须是同一个签名版本。平台对「两个信封版本不一致」的处置是
    // **静默返回空 data**，不报错，从响应侧几乎反推不出来。
    // 上游 v1.2.0 已把两处默认值都对齐到真机的 4.4.3。
    const cfg = createXiaohongshuCryptoConfig()
    expect(cfg.SIGNATURE_DATA_TEMPLATE.x0).toBe(cfg.SIGNATURE_XSCOMMON_TEMPLATE.x1)
  })

  it('x-s-common 的 x4 取自 webBuild cookie（上游 v1.2.0 起的契约）', () => {
    // 配置里那个默认值只是兜底 —— 真实值来自 CK，所以调用方往 CK 里放什么，x4 就是什么。
    // 回归守卫：别再退回「用配置默认值硬顶 x4」那套（那会让 x4 与实际 webBuild 脱节）。
    const cfg = createXiaohongshuCryptoConfig()
    const signed = withPinnedSources(() => new Xhshow(cfg).signXsCommon({ a1: A1, webBuild: '9.9.9' }))
    const decoded = JSON.parse(new Base64Encoder(cfg).decode(signed)) as { x4?: string }
    expect(decoded.x4).toBe('9.9.9')

    // 不传 webBuild 时退回**模板**里的默认值 —— 注意不是 `DATA_WEB_BUILD`：
    // 后者是 amagi 往 CK 里写的值，要经 `cookieDict.webBuild` 才生效（见上一条）。
    // 实际流程里 CK 一定带 webBuild，所以运行时的 x4 恒等于 `DATA_WEB_BUILD`。
    const fallback = withPinnedSources(() => new Xhshow(cfg).signXsCommon({ a1: A1 }))
    const fallbackDecoded = JSON.parse(new Base64Encoder(cfg).decode(fallback)) as { x4?: string }
    expect(fallbackDecoded.x4).toBe(cfg.SIGNATURE_XSCOMMON_TEMPLATE.x4)
  })

  it('x-s-common 的 x12 每次都刷新（它是 getter，不是常量）', () => {
    // 回归守卫：x12 是 `${Date.now()};<会话起点>` 的 getter。曾经用对象字面量整个替换
    // SIGNATURE_XSCOMMON_TEMPLATE，会把它求值成一个固定字符串 —— 之后每个请求都带同一个
    // 时间戳，签名不再随时间滚动。这里用两个不同的时钟值验证它确实在求值。
    const cfg = createXiaohongshuCryptoConfig()
    const readX12 = (now: number): string => {
      const origRandom = Math.random
      const origNow = Date.now
      Math.random = makeSeq(0x5eed)
      Date.now = () => now
      try {
        const signed = new Xhshow(cfg).signXsCommon({ a1: A1 })
        return (JSON.parse(new Base64Encoder(cfg).decode(signed)) as { x12?: string }).x12 ?? ''
      } finally {
        Math.random = origRandom
        Date.now = origNow
      }
    }

    expect(readX12(FIXED_NOW)).not.toBe(readX12(FIXED_NOW + 60_000))
  })
})
