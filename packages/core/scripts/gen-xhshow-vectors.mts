/**
 * 录制 `sign/xhshow/` 内联副本的特征化基线。
 *
 * **为什么要它**：`xhshow` 的产物是签名与密文 —— 搬错、改错都不会有编译错误，只会在
 * 真机上被判 406 或静默返回空 data，那类失效从响应侧几乎反推不出来。所以内联时先把
 * 上游在**钉死随机源**下的输出录成基线，此后由 `xhshow-vectors.test.ts` 逐字节比对。
 *
 * **钉法**：实测只钉 `Math.random` + `Date.now` 即可让上游全部公开 API 确定化 ——
 * 随机性全部经 `Math.random`，`node:crypto.randomBytes` 不参与签名路径。
 * 每个向量调用前**重置随机序列**，所以同一份基线在任何机器上可复现。
 *
 * **什么时候该重跑**：只在确认行为变更是**有意**的（同步上游、平台换签名世代）时才重录，
 * 且**重录前必须先跑真机功能验证**（`work/xhs-guest-cookie/verify-guest.mts` 那类），
 * 确认新签名在真实接口上能拿到数据。基线失配本身是有价值的信号，别为了让测试变绿而重录。
 *
 * 改动本文件的钉法后，必须同步改 `test/platforms/xiaohongshu/xhshow-vectors.test.ts`
 * 的 `withPinnedSources` —— 两边不一致会产出「假红」。
 *
 * 用法：`pnpm --filter @ikenxuan/amagi run gen:xhshow-vectors`
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { CryptoConfig, FingerprintGenerator, Xhshow, xRapParam } from '../src/platforms/xiaohongshu/sign/xhshow'

/** 线性同余，确定性伪随机序列 —— 只为可复现，不追求统计性质 */
const makeSeq = (seed: number) => {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/** 固定时钟：真机抓包那一刻 */
const FIXED_NOW = 1791764538000
/** 真机抓到的游客 a1 */
const A1 = '1a12d7d253cpryk0kzlokcu2m978boveifqnqn4h350000355230'
/** 第二个 a1：不同输入才能覆盖 fingerprint 对 a1 的依赖 */
const A1_B = '1a12d7d2290xq7hg10c3w3mlaudszkkw5157zily0000abcdef'
/** 固定签名时间戳（秒），与 FIXED_NOW 对齐 */
const TS = 1791764538

/**
 * 每次调用前重置随机序列再执行。
 *
 * **必须与测试里的同名 helper 逐字一致** —— 基线录制与比对用的是同一套序列，
 * 改成「整块共用一个连续序列」会让各次调用取到不同随机值，产出假红。
 */
const at = <T,>(fn: () => T): T => {
  Math.random = makeSeq(0x5eed)
  Date.now = () => FIXED_NOW
  return fn()
}

const cfg = new CryptoConfig()
const x = new Xhshow(cfg)
const fpGen = new FingerprintGenerator(cfg)
const uri = '/api/sns/web/v1/user_posted'
const payload = { user_id: 'u1', num: 30, image_formats: 'jpg,webp,avif', xsec_source: 'pc_feed' }

const vectors: Record<string, unknown> = {
  'Xhshow.generateA1': at(() => Xhshow.generateA1()),
  'Xhshow.generateWebId': Xhshow.generateWebId(A1),
  'signXs.GET': at(() => x.signXs('GET', uri, A1, 'xhs-pc-web', payload, TS)),
  'signXs.POST': at(() => x.signXs('POST', '/api/sns/web/v1/feed', A1, 'xhs-pc-web', { a: 1 }, TS)),
  'signXyw.GET': at(() => x.signXyw('GET', uri, A1, 'xhs-pc-web', payload, TS)),
  'signXyw.POST': at(() => x.signXyw('POST', '/api/sns/web/v1/feed', A1, 'xhs-pc-web', { a: 1 }, TS)),
  'signXsCommon.dict': at(() => x.signXsCommon({ a1: A1 })),
  'signXsCommon.otherA1': at(() => x.signXsCommon({ a1: A1_B })),
  getXT: x.getXT(TS),
  getB3TraceId: at(() => x.getB3TraceId()),
  getXrayTraceId: at(() => x.getXrayTraceId(TS, 7)),
  getSearchId: at(() => x.getSearchId()),
  getSearchRequestId: at(() => x.getSearchRequestId()),
  xRapParam: at(() => xRapParam('//edith.xiaohongshu.com/api/sns/web/v1/feed', { a: 1 })),
  'fingerprint.b1': at(() => fpGen.generateB1(fpGen.generate({ a1: A1 }, cfg.PUBLIC_USERAGENT))),
  'fingerprint.keys': at(() => Object.keys(fpGen.generate({ a1: A1 }, cfg.PUBLIC_USERAGENT)).sort())
}

const out = fileURLToPath(new URL('../test/fixtures/xhshow-vectors.json', import.meta.url))
writeFileSync(out, `${JSON.stringify(vectors, null, 2)}\n`)

console.log(`[xhshow 基线] 已写入 ${out}`)
for (const [k, v] of Object.entries(vectors)) {
  console.log(`  ${k.padEnd(22)} len=${String(v).length}`)
}
