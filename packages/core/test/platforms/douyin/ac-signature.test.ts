import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

import {
  computeAcSignature,
  fingerprintAcrawler,
  KNOWN_AC_SIGNATURE_PROFILE,
  KNOWN_ACRAWLER_FINGERPRINT,
  resolveAcSignatureProfile
} from 'amagi/platforms/douyin/sign/acSignature'
/**
 * `__ac_signature` 的 **oracle 测试** —— 拿站点自己那份 JSVMP 本体的输出验纯算实现。
 *
 * ## 为什么必须是 oracle 而不是快照
 *
 * 纯算实现是从 JSVMP 字节码里 lift 出来的（给解释器取指点插桩，读出每条字节码的
 * 栈顶值），不是对输出做拟合。一份拟合出来的实现可以在几十组样本上对上、在第
 * 几百组上崩 —— 唯一能证伪它的办法是拿**同一份挑战页**在 `vm` 里的真值逐位对照。
 * 自生成快照结构上做不到这件事：实现错了，快照跟着错。
 *
 * 所以这个文件里有 `node:vm` —— 它是 oracle 的一部分。被测的
 * {@link computeAcSignature} 本身不含 `vm` / `eval` / `new Function` / 字节码数组，
 * 「产物不带解释器」这条由 {@link 不含解释器痕迹} 那组用例直接 grep 源码来守。
 *
 * ## 覆盖
 *
 * 本文件的 oracle 比对共 289 组：UA（40/80/111/150 四档 + 四个真实 UA）× nonce 长度
 * （1/2/7/21/32/48）× 整秒内偏移（0/1/499/500/999）240 组，10 位秒进位与 2^31 / 2^32
 * 边界 22 组，href 变体 15 组，时钟定义域 11 组（含 0），`new Date()` 与 `Date.now()`
 * 错开的判别 1 组。完整的 4206 组跑在仓库外（分项见 {@link computeAcSignature}）；
 * 这里取结构上最有区分度的一部分，保证单测时长可控。
 *
 * fixture 自 `cd0c7836` 起冻在 git 里，这些用例**守不住线上换版** —— 那由
 * {@link resolveAcSignatureProfile} 的指纹在运行时把关。
 */
import { describe, expect, it, vi } from 'vitest'

const CHALLENGE_HTML = fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', 'douyin', 'challenge-page.html'), 'utf8')

/** 从挑战页里取出 acrawler 本体与引导 aid（与 mint.ts 的判据一致：最大内联块） */
const parseChallenge = (): { source: string; aid: number } => {
  const blocks = [...CHALLENGE_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  const source = blocks.reduce((a, b) => (b.length > a.length ? b : a))
  const bootstrap = blocks.find((b) => b !== source && b.includes('byted_acrawler') && b.includes('sign('))
  return { source, aid: Number(bootstrap?.match(/aid:(\d+)/)?.[1]) }
}

/**
 * 真值发生器：在 `vm` 里跑站点本体，时钟可变、UA 可换。
 *
 * UA 是**签名时现读**的（不是 `init()` 时缓存），href 则在 `init()` 时就被取走 ——
 * 所以换 UA / 换时钟可以复用同一个实例，换 href 必须重建。
 *
 * `new Date()` 直接用 `super(nowMs)`，界外 / NaN 的 `nowMs` 会得到 Invalid Date，
 * 与浏览器里时钟越界时一致。
 * @param nowSkewMs - `Date.now()` 比 `new Date()` 快多少毫秒，用来判别本体读的是哪个
 */
const makeOracle = (userAgent: string, href = 'https://www.douyin.com/', nowSkewMs = 0) => {
  let nowMs = 0
  const RealDate = Date
  class ShimDate extends RealDate {
    // 空元组这一支是必须的：`ConstructorParameters<typeof Date>` 只取 Date 的最后一条
    // 重载（1 个参数），`args.length` 于是是字面量 `1`，与 `0` 比较会被 tsc 判成
    // 「不可能相交」。站点本体调的正是 `new Date()`，零参数分支不能省。
    constructor(...args: [] | ConstructorParameters<typeof Date>) {
      if (args.length === 0) super(nowMs)
      else super(...args)
    }

    static now(): number {
      return nowMs + nowSkewMs
    }
  }
  const doc: Record<string, unknown> = {}
  Object.defineProperty(doc, 'cookie', { get: () => '', set: () => {} })
  const url = new URL(href)
  const w: Record<string, unknown> = {
    document: doc,
    location: {
      href,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: '',
      origin: url.origin,
      reload: () => {}
    },
    navigator: { userAgent, language: 'zh-CN', platform: 'Win32' },
    screen: { width: 2560, height: 1440 },
    history: { length: 2 },
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Object,
    Array,
    Symbol,
    Error,
    TypeError,
    JSON,
    Math,
    Date: ShimDate,
    Promise,
    Reflect,
    Map,
    Set,
    Number,
    String,
    Boolean,
    RegExp,
    Function,
    parseInt,
    parseFloat,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    TextEncoder,
    URL,
    URLSearchParams,
    performance
  }
  w.window = w
  w.self = w
  w.top = w
  w.parent = w
  w.globalThis = w

  const { source, aid } = parseChallenge()
  vm.runInContext(source, vm.createContext(w), { timeout: 20_000 })
  const ac = w.byted_acrawler as { init: (c: unknown) => void; sign: (a: string, b: string) => string }
  ac.init({ aid, dfp: 0 })
  return {
    setUserAgent: (ua: string) => {
      ;(w.navigator as { userAgent: string }).userAgent = ua
    },
    sign: (nonce: string, ms: number) => {
      nowMs = ms
      return ac.sign('', nonce)
    }
  }
}

const UA_BASE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const uaOfLength = (len: number): string => (len <= UA_BASE.length ? UA_BASE.slice(0, len) : UA_BASE + 'x'.repeat(len - UA_BASE.length))

const REAL_UAS = [
  UA_BASE,
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
]

/** 确定性 nonce 生成，免得用例之间互相影响 */
const NONCE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_'
const nonceOfLength = (len: number, seed: number): string => {
  let s = ''
  let x = seed >>> 0
  for (let i = 0; i < len; i++) {
    x = (x * 1103515245 + 12345) >>> 0
    s += NONCE_CHARS[(x >>> 7) % NONCE_CHARS.length]
  }
  return s
}

const T0 = 1791417600000
const DEFAULT_NONCE = '0123456789abcdefghij0'

describe('douyin __ac_signature 纯算实现', () => {
  describe('与挑战页本体逐位一致', () => {
    it('UA 长度各档 × nonce 长度各档 × 整秒内外都对得上', () => {
      const oracle = makeOracle(UA_BASE)
      const uas = [uaOfLength(40), uaOfLength(80), uaOfLength(111), uaOfLength(150), ...REAL_UAS]
      let seed = 1
      let count = 0
      for (const ua of uas) {
        oracle.setUserAgent(ua)
        for (const nonceLen of [1, 2, 7, 21, 32, 48]) {
          for (const delta of [0, 1, 499, 500, 999]) {
            const nonce = nonceOfLength(nonceLen, seed++)
            expect(computeAcSignature(nonce, ua, T0 + delta)).toBe(oracle.sign(nonce, T0 + delta))
            count++
          }
        }
      }
      expect(count).toBe(240)
    })

    it('跨 10 位秒进位、2^31 与 2^32 边界都对得上', () => {
      const oracle = makeOracle(UA_BASE)
      // 2^32 处站点把秒数当 uint32 回绕，被哈希的串从 10 位塌成 1 位
      const seconds = [
        999999999, 1000000000, 1000000001, 2147483647, 2147483648, 2147483649, 3000000000, 4294967295, 4294967296, 4294967297, 9999999999
      ]
      for (const sec of seconds) {
        for (const ms of [sec * 1000, sec * 1000 + 999]) {
          expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, ms)).toBe(oracle.sign(DEFAULT_NONCE, ms))
        }
      }
    })

    it('href 的协议 / 路径 / 查询串变体都对得上', () => {
      const hrefs = [
        'https://www.douyin.com/',
        'https://www.douyin.com/?a=1',
        'https://www.douyin.com/user/abc',
        'http://www.douyin.com/',
        'https://sso.douyin.com/p/q?r=1'
      ]
      for (const href of hrefs) {
        const oracle = makeOracle(UA_BASE, href)
        for (const delta of [0, 999, 54321]) {
          expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0 + delta, { href })).toBe(oracle.sign(DEFAULT_NONCE, T0 + delta))
        }
      }
    })

    it('href 不带尾斜杠与带尾斜杠必须算出不同签名', () => {
      // 载荷是 `href.substring(protocol.length + 2)`，尾斜杠在里面
      const withSlash = computeAcSignature(DEFAULT_NONCE, UA_BASE, T0, { href: 'https://www.douyin.com/' })
      const withoutSlash = computeAcSignature(DEFAULT_NONCE, UA_BASE, T0, { href: 'https://www.douyin.com' })
      expect(withSlash).not.toBe(withoutSlash)
    })
  })

  describe('时钟', () => {
    it('同一整秒内结果一致，跨秒才变', () => {
      const a = computeAcSignature(DEFAULT_NONCE, UA_BASE, T0)
      expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0 + 999)).toBe(a)
      expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0 + 1000)).not.toBe(a)
    })

    it('Date 合法范围两侧、负毫秒、非有限值都与本体逐位一致', () => {
      // 站点做的是 `(new Date().getTime() / 1000) >>> 0`：界外 / NaN → 0 秒，负毫秒向零截断
      const oracle = makeOracle(UA_BASE)
      const MAX = 8.64e15
      const clocks = [0, MAX, -MAX, MAX + 1, -(MAX + 1), -1, -999, -1000, Number.NaN, Infinity, -Infinity]
      for (const ms of clocks) {
        expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, ms)).toBe(oracle.sign(DEFAULT_NONCE, ms))
      }
      const atZero = computeAcSignature(DEFAULT_NONCE, UA_BASE, 0)
      for (const ms of [MAX + 1, -(MAX + 1), -1, -999, Number.NaN, Infinity, -Infinity]) {
        expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, ms)).toBe(atZero)
      }
      expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, -1000)).not.toBe(atZero)
    })

    it('本体读的是 new Date() 而不是 Date.now()', () => {
      // Date.now() 比 new Date() 快 5 秒：本体只可能跟随其中一个
      const oracle = makeOracle(UA_BASE, 'https://www.douyin.com/', 5000)
      const sig = oracle.sign(DEFAULT_NONCE, T0)
      expect(sig).toBe(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0))
      expect(sig).not.toBe(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0 + 5000))
    })

    it('不传 atMs 时走 Date.now()', () => {
      const spy = vi.spyOn(Date, 'now').mockReturnValue(T0 + 777)
      try {
        expect(computeAcSignature(DEFAULT_NONCE, UA_BASE)).toBe(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0 + 777))
        expect(spy).toHaveBeenCalled()
      } finally {
        spy.mockRestore()
      }
    })
  })

  describe('形状', () => {
    it('恒为 47 字符，前 14 字符是固定头，末 2 位是十六进制校验位', () => {
      for (const nonceLen of [1, 5, 21, 40]) {
        const sig = computeAcSignature(nonceOfLength(nonceLen, nonceLen), UA_BASE, T0)
        expect(sig).toHaveLength(47)
        expect(sig.slice(0, 14)).toBe(computeAcSignature('x', 'y', T0 + 12345).slice(0, 14))
        expect(sig.slice(45)).toMatch(/^[0-9a-f]{2}$/)
      }
    })

    it('正文 31 字符只用 base64 变体字符集（无 + 与 /）', () => {
      const sig = computeAcSignature(DEFAULT_NONCE, UA_BASE, T0)
      expect(sig.slice(14, 45)).toMatch(/^[A-Za-z0-9\-.]{31}$/)
    })

    it('UA 与 nonce 各自改动都会改签名', () => {
      const base = computeAcSignature(DEFAULT_NONCE, UA_BASE, T0)
      expect(computeAcSignature(DEFAULT_NONCE + 'z', UA_BASE, T0)).not.toBe(base)
      expect(computeAcSignature(DEFAULT_NONCE, UA_BASE + 'z', T0)).not.toBe(base)
    })
  })

  describe('入参', () => {
    it('空 nonce 与空 UA 直接报错，不去复刻站点的兜底路径', () => {
      // 空 nonce 会让站点那份实现改去哈希一个内部兜底串（乘数 65599 的乘法 216 → 221 次），
      // 那条路不是真实调用形态
      expect(() => computeAcSignature('', UA_BASE, T0)).toThrow(/nonce/)
      expect(() => computeAcSignature(DEFAULT_NONCE, '', T0)).toThrow(/userAgent/)
    })

    it('nonce 长度不是硬约束：1 到 48 字符都算得出且各不相同', () => {
      const seen = new Set<string>()
      for (let len = 1; len <= 48; len++) {
        const sig = computeAcSignature(nonceOfLength(len, 7), UA_BASE, T0)
        expect(sig).toHaveLength(47)
        seen.add(sig)
      }
      expect(seen.size).toBe(48)
    })
  })

  describe('版本档案', () => {
    it('fixture 本体认得出，给出已知档案', () => {
      const { source } = parseChallenge()
      expect(fingerprintAcrawler(source)).toEqual(KNOWN_ACRAWLER_FINGERPRINT)
      expect(resolveAcSignatureProfile(source)).toBe(KNOWN_AC_SIGNATURE_PROFILE)
    })

    it('本体改 1 个字符或长度变了就不认', () => {
      const { source } = parseChallenge()
      const codeAt = source.search(/[0-9a-f]{1000,}/i)
      expect(codeAt).toBeGreaterThan(0)
      // 开头、指令流中段、末尾各翻一位
      for (const at of [0, codeAt + 1000, source.length - 1]) {
        const mutated = source.slice(0, at) + String.fromCharCode(source.charCodeAt(at) ^ 1) + source.slice(at + 1)
        expect(mutated).toHaveLength(source.length)
        expect(resolveAcSignatureProfile(mutated)).toBeUndefined()
      }
      expect(resolveAcSignatureProfile(source + ' ')).toBeUndefined()
      expect(resolveAcSignatureProfile(source.slice(1))).toBeUndefined()
    })

    it('options.profile 生效，不传等于传已知档案', () => {
      const byDefault = computeAcSignature(DEFAULT_NONCE, UA_BASE, T0)
      expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0, { profile: KNOWN_AC_SIGNATURE_PROFILE })).toBe(byDefault)
      expect(byDefault.slice(0, 14)).toBe(KNOWN_AC_SIGNATURE_PROFILE.header)

      const other = { ...KNOWN_AC_SIGNATURE_PROFILE, fieldMask: 0x80120 }
      expect(computeAcSignature(DEFAULT_NONCE, UA_BASE, T0, { profile: other })).not.toBe(byDefault)
    })
  })

  describe('不含解释器痕迹', () => {
    it('产物源码里没有 vm / eval / new Function / 字节码数组', () => {
      const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'src', 'platforms', 'douyin', 'sign', 'acSignature.ts'), 'utf8')
      // 注释里会提到这些词，所以剥掉注释再查
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(code).not.toMatch(/node:vm/)
      expect(code).not.toMatch(/\beval\b/)
      expect(code).not.toMatch(/new\s+Function/)
      expect(code).not.toMatch(/\bimport\b|\brequire\b/)
      // 字节码数组/长十六进制串
      expect(code).not.toMatch(/[0-9a-f]{64,}/i)
    })
  })
})
