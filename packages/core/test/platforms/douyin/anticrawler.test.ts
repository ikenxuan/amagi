import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { parseDouyinSliderPage } from 'amagi/platforms/douyin/anticrawler/captcha'
import { detectAnticrawler, detectAnticrawlerCookie } from 'amagi/platforms/douyin/anticrawler/detect'
import { solveDouyinAnticrawler } from 'amagi/platforms/douyin/anticrawler/solver'
import { solveWafChallenge, WAF_CHALLENGE_COOKIE } from 'amagi/platforms/douyin/anticrawler/waf'
import { parseDouyinCaptcha } from 'amagi/platforms/douyin/captcha'
import { douyinJudge } from 'amagi/platforms/douyin/judge'
import { computeAcSignature } from 'amagi/platforms/douyin/sign/acSignature'
/**
 * 抖音 Argus 反爬三条通道的契约，全部跑在**真实挑战页** fixture 上。
 *
 * - `waf_challenge.html`（2492B）：WAF 工作量证明页，`cs="…"` 内嵌挑战载荷
 * - `challenge-page.html`（72914B）：acrawler VMP 页。**现在解得开** —— 签名由
 *   `sign/acSignature.ts` 纯算，本目录仍不引入任何脚本执行路径
 * - `slider_captcha.html`（6347B）：TTGCaptcha 滑块中间页，`verify_data` 单行 JSON
 *
 * ⚠️ **VMP 挑战页就是铸造链路用的那张挑战页。** 本次移植的参考实现里那份 VMP fixture
 * 与本仓既有的 `challenge-page.html`（`mint.test.ts` 读的那份）**md5 相同**
 * （`98536c93ffddc5cd9956b56ba058f7c7`，都是 72914 字节），所以两处**共用这一份
 * fixture**，参考实现那份重复文件已删。
 *
 * 这个事实必须留在代码里：不写出来，后人会以为「VMP 挑战」与「铸造挑战页」是两回事，
 * 从而再写一份重复的处理逻辑。正是这次 md5 比对判定出参考实现里那条 VMP 解算路径解的就是本仓
 * `mint.ts` / `guestChallenge.ts` 已经在解的同一张页、没有真实增量，才没有重做一遍。
 *
 * WAF / 滑块两份 fixture 取自本次移植的参考实现所带的抓包，**我们未自行复测线上形状**，
 * 这两条通道**没有线上命中记录**（主 agent 实测游客流量 240 发跨 5 条端点一次验证挑战
 * 都没撞到，要撞得上登录态 cookie）。**VMP 这条有实测**：2026-10-11 零 cookie 打首页
 * 必弹挑战页 + `__ac_nonce`，正常页面与 API 响应一条 Set-Cookie 都不发（形态记录见
 * `anticrawler/detect.ts` 的 `detectAnticrawlerCookie`）。
 *
 * 分工与红线：
 * - WAF 是纯 sha256 计算，自动解 —— 这里做**算法级**验证（独立复算摘要，参照取自
 *   页面自己声明的难度条件，不信实现的中间量）。那份 fixture 的答案是 `i = 1`，
 *   只用它断言的话「只试 0 和 1」的假实现也能过，所以**另造一个高 `i` 的用例**
 *   真正验证暴搜
 * - VMP 的签名是纯算的，自动解 —— 断言「解出的 pair 与 `computeAcSignature` 一致」，
 *   不在这里重做签名算法的验证（那是 `ac-signature.test.ts` 的 289 组 oracle 对照）
 * - 滑块要真人拖，**只提取不求解**，且永不进自动重放
 * - 值不进仓库：只断言长度与形状，不断言 `fp` / `detail` / cookie 的具体值
 */
import { describe, expect, it } from 'vitest'

const readFixture = (name: string): string => readFileSync(fileURLToPath(new URL(`../../fixtures/douyin/${name}`, import.meta.url)), 'utf8')

const WAF = readFixture('waf_challenge.html')
// 与 mint.test.ts 的 CHALLENGE_HTML 是同一份文件（md5 相同，见模块注释）
const VMP = readFixture('challenge-page.html')
const SLIDER = readFixture('slider_captcha.html')

describe('形态识别 detectAnticrawler', () => {
  it('三种挑战页各自认得出', () => {
    expect(detectAnticrawler(WAF)).toBe('waf')
    expect(detectAnticrawler(VMP)).toBe('vmp')
    expect(detectAnticrawler(SLIDER)).toBe('captcha')
  })

  it('正常页面的水合数据与随机文本都不是挑战', () => {
    expect(detectAnticrawler('window._ROUTER_DATA = {...}')).toBe('data')
    expect(detectAnticrawler('<html>随便一段文本</html>')).toBe('none')
    expect(detectAnticrawler('')).toBe('none')
  })
})

/** 造一份 `JudgeHeaders`：只实现按名取值，与管线传进来的那份同形 */
const judgeHeaders = (map: Record<string, string>) => ({
  get: (name: string): string | undefined => map[name.toLowerCase()]
})

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/** 实测形态：两条同名 Set-Cookie 被 `'; '` join 成一条（值是合成的） */
const NONCE = '06ac3511900128cbdbb8c'
const NONCE_SET_COOKIE = `__ac_nonce=${NONCE}; Path=/; Max-Age=1800; Secure; SameSite=None; __ac_nonce=${NONCE}; Path=/; Max-Age=1800; Secure; SameSite=None`

describe('响应头通道 detectAnticrawlerCookie（2026-10-11 实测形态）', () => {
  it('join 过的双份 __ac_nonce 认得出', () => {
    expect(detectAnticrawlerCookie(judgeHeaders({ 'set-cookie': NONCE_SET_COOKIE }))).toBe('vmp')
  })

  it('单条 __ac_nonce 也认', () => {
    expect(detectAnticrawlerCookie(judgeHeaders({ 'set-cookie': `__ac_nonce=${NONCE}; Path=/` }))).toBe('vmp')
  })

  it('大小写不敏感（头容器自己保证，这里钉住调用方式）', () => {
    expect(detectAnticrawlerCookie({ get: (n) => (n.toLowerCase() === 'set-cookie' ? `__ac_nonce=${NONCE}` : undefined) })).toBe('vmp')
  })

  it('铸造那一发的四个 cookie 不是挑战（实测：ttwid / enter_pc_once / web_sign_token / UIFID_TEMP）', () => {
    const minted = 'ttwid=1%7Cx; Domain=.douyin.com; Path=/; enter_pc_once=1; path=/; web_sign_token=y; path=/; UIFID_TEMP=z; path=/'
    expect(detectAnticrawlerCookie(judgeHeaders({ 'set-cookie': minted }))).toBe('none')
  })

  it('没有 Set-Cookie / 没有头 / 空串 → none（API 响应实测 0 条 Set-Cookie）', () => {
    expect(detectAnticrawlerCookie(judgeHeaders({}))).toBe('none')
    expect(detectAnticrawlerCookie(undefined)).toBe('none')
    expect(detectAnticrawlerCookie(judgeHeaders({ 'set-cookie': '' }))).toBe('none')
  })

  it('同名后缀不算命中（锚在串首或 `; ` 之后）', () => {
    expect(detectAnticrawlerCookie(judgeHeaders({ 'set-cookie': 'foo___ac_nonce=x; Path=/' }))).toBe('none')
  })
})

/** 挑战页载荷：`v.a` 前缀字节、`v.c` 期望摘要原始字节、`s` 签名（都是 base64） */
interface WafPayload {
  v: { a: string; b: number; c: string }
  s: string
}

/**
 * 从挑战页自己的 `cs="…"` 里取载荷。
 *
 * 断言的参照只能来自**页面**，不能来自实现 —— 否则「实现算的和实现说的一致」
 * 这种同义反复测不出任何东西。
 */
const wafPayload = (html: string): WafPayload => {
  const match = /cs="([^"]+)"/.exec(html)
  if (!match) throw new Error('fixture 里没有 cs="…"')
  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')) as WafPayload
}

/** 解算产物：cookie 值解 base64 后是回填了 `d` 的同一份载荷 */
const solvedPayload = (value: string): WafPayload & { d: string } =>
  JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as WafPayload & { d: string }

describe('WAF 工作量证明 solveWafChallenge（算法级）', () => {
  const page = wafPayload(WAF)
  const value = solveWafChallenge(WAF)

  it('真实挑战页解得出答案', () => {
    expect(value).toBeTypeOf('string')
    expect(value!.length).toBeGreaterThan(0)
  })

  it('解出的答案满足挑战页声明的难度条件：sha256(prefix ‖ utf8(i)) 与 expect 全等', () => {
    const answer = Buffer.from(solvedPayload(value!).d, 'base64').toString('utf8')
    // 页面搜的是非负整数 i（`i++`、`i>1e6` 停），答案必须是那个形状
    expect(answer).toMatch(/^\d+$/)
    expect(Number(answer)).toBeLessThanOrEqual(1_000_000)

    // 独立复算：prefix 与 expect 全部取自页面的 cs，摘要自己算一遍。
    // 难度条件是**整串 hex 全等**，不是前导零那种前缀匹配
    const digest = createHash('sha256').update(Buffer.from(page.v.a, 'base64')).update(answer, 'utf8').digest('hex')
    expect(digest).toBe(Buffer.from(page.v.c, 'base64').toString('hex'))
  })

  it('回填只多一个 d：挑战载荷与签名原样带回（服务端要按它校验）', () => {
    const answered = solvedPayload(value!)
    expect(answered.v).toEqual(page.v)
    expect(answered.s).toBe(page.s)
    // 键序与页面 `JSON.stringify(c)` 一致
    expect(Object.keys(answered)).toEqual(['v', 's', 'd'])
  })

  it('真实挑战页的答案是 i = 1 —— 一个样本，证明不了暴搜（见下一条）', () => {
    expect(Buffer.from(solvedPayload(value!).d, 'base64').toString('utf8')).toBe('1')
  })

  it('不是 WAF 页就不硬解', () => {
    expect(solveWafChallenge('<html>普通页面</html>')).toBeUndefined()
    expect(solveWafChallenge('')).toBeUndefined()
    // VMP 页里 JS 不少，但没有 cs="…" 锚点，不能误解
    expect(solveWafChallenge(VMP)).toBeUndefined()
  })

  it('cs 解不开 / 载荷缺字段时安全返回 undefined', () => {
    expect(solveWafChallenge('cs="not-base64-json"')).toBeUndefined()
    expect(solveWafChallenge(`cs="${Buffer.from('{"v":{}}').toString('base64')}"`)).toBeUndefined()
    expect(solveWafChallenge(`cs="${Buffer.from('[]').toString('base64')}"`)).toBeUndefined()
  })
})

describe('WAF 暴搜：合成的高 i 挑战（fixture 的 i=1 测不出这件事）', () => {
  /**
   * 按真实页面的载荷形状造一份挑战页。
   *
   * prefix 取 32 字节（与实测的 `v.a` 同长），期望摘要直接按目标 `i` 正算出来 ——
   * 于是「求解器能不能搜到那个 i」变成一个有确定答案的问题。
   * @param answer - 预设的答案 i
   * @returns 只含 `cs="…"` 的最小挑战页
   */
  const syntheticWafPage = (answer: number): string => {
    const prefix = Buffer.from(Array.from({ length: 32 }, (_, k) => (k * 7 + 3) & 0xff))
    const expect32 = createHash('sha256').update(prefix).update(String(answer), 'utf8').digest()
    const payload = {
      v: { a: prefix.toString('base64'), b: 1_791_158_900, c: expect32.toString('base64') },
      s: 'c3ludGhldGljLXNpZ25hdHVyZQ=='
    }
    return `<html><script>var wci="_wafchallengeid",cs="${Buffer.from(JSON.stringify(payload)).toString('base64')}"</script></html>`
  }

  it('答案在 54321 时也搜得到 —— 这一条才真正验证了暴搜', () => {
    const page = syntheticWafPage(54_321)
    const solved = solveWafChallenge(page)
    expect(solved).toBeTypeOf('string')
    expect(Buffer.from(solvedPayload(solved!).d, 'base64').toString('utf8')).toBe('54321')
  })

  it('i = 0 这种边界也算得对（循环从 0 开始，不是从 1）', () => {
    const solved = solveWafChallenge(syntheticWafPage(0))
    expect(Buffer.from(solvedPayload(solved!).d, 'base64').toString('utf8')).toBe('0')
  })

  // 这条是本文件唯一要跑满 `MAX_PROBE`（1e6 次 sha256）的用例，空闲时约 2.5s。默认 5s
  // 超时在满仓 `pnpm test`（159 个 worker 抢 CPU）下不够用，显式放宽到 30s —— 缩小搜索
  // 范围就测不出「上界内无解时返回 undefined」这件事了，所以放宽超时而不是改被测行为。
  it('答案落在上界之外时不空转到超时之后撒谎，而是返回 undefined', () => {
    // 期望摘要取一串随机字节：它不是任何 i 的 sha256，暴搜必然走完上界
    const prefix = Buffer.alloc(32, 9)
    const payload = { v: { a: prefix.toString('base64'), b: 1, c: Buffer.alloc(32, 1).toString('base64') }, s: 'x' }
    const page = `<html>cs="${Buffer.from(JSON.stringify(payload)).toString('base64')}"</html>`
    expect(solveWafChallenge(page)).toBeUndefined()
  }, 30_000)
})

describe('解算编排 solveDouyinAnticrawler', () => {
  it('WAF 页：解出 cookie 段并保留入参 cookie 里的每一条', () => {
    const solved = solveDouyinAnticrawler(WAF, { cookie: 'ttwid=abc; foo=1' })
    expect(solved).toBeTypeOf('string')
    expect(solved).toContain('ttwid=abc')
    expect(solved).toContain('foo=1')
    expect(solved).toContain(`${WAF_CHALLENGE_COOKIE}=`)
  })

  it('空 cookie 下只有解出来的那一段', () => {
    expect(solveDouyinAnticrawler(WAF, { cookie: '' })).toMatch(new RegExp(`^${WAF_CHALLENGE_COOKIE}=[A-Za-z0-9+/=]+$`))
  })

  it('滑块页永不自动解 —— 红线：滑块只能由真人拖', () => {
    expect(solveDouyinAnticrawler(SLIDER, { cookie: 'ttwid=abc' })).toBeUndefined()
  })

  it('滑块页即使同时发了 __ac_nonce 也不解 —— 红线不被头通道绕过', () => {
    const solved = solveDouyinAnticrawler(SLIDER, {
      cookie: 'ttwid=abc',
      userAgent: UA,
      headers: judgeHeaders({ 'set-cookie': NONCE_SET_COOKIE })
    })
    expect(solved).toBeUndefined()
  })

  it('非挑战输入安全返回 undefined', () => {
    for (const raw of ['<html>普通页面</html>', 'window._ROUTER_DATA = {}', '', null, undefined, 42, { status_code: 0 }]) {
      expect(solveDouyinAnticrawler(raw, { cookie: 'ttwid=abc' })).toBeUndefined()
    }
  })
})

describe('VMP 纯算解算（头通道为主，响应体锚点兜底）', () => {
  /** 从解出的 cookie 串里取一项 */
  const valueOf = (cookie: string | undefined, name: string): string | undefined =>
    cookie
      ?.split('; ')
      .find((p) => p.startsWith(name + '='))
      ?.slice(name.length + 1)

  it('响应头有 __ac_nonce：解出的 pair 与 computeAcSignature 一致，原 cookie 一条不丢', () => {
    const before = Date.now()
    const solved = solveDouyinAnticrawler(VMP, {
      cookie: 'ttwid=abc; foo=1',
      userAgent: UA,
      headers: judgeHeaders({ 'set-cookie': NONCE_SET_COOKIE })
    })
    const after = Date.now()

    expect(solved).toBeTypeOf('string')
    expect(valueOf(solved, 'ttwid')).toBe('abc')
    expect(valueOf(solved, 'foo')).toBe('1')
    expect(valueOf(solved, '__ac_nonce')).toBe(NONCE)
    // 签名体带整秒时间戳：解算那一刻的秒落在 before / after 之一
    expect([
      computeAcSignature(NONCE, UA, before, { href: 'https://www.douyin.com/' }),
      computeAcSignature(NONCE, UA, after, { href: 'https://www.douyin.com/' })
    ]).toContain(valueOf(solved, '__ac_signature'))
  })

  it('不依赖响应体：body 是空串、只有响应头也解得出（挑战页改版不影响）', () => {
    const solved = solveDouyinAnticrawler('', {
      cookie: '',
      userAgent: UA,
      headers: judgeHeaders({ 'set-cookie': NONCE_SET_COOKIE })
    })
    expect(valueOf(solved, '__ac_nonce')).toBe(NONCE)
    expect(valueOf(solved, '__ac_signature')).toMatch(/^_02B4Z6wo00f01[0-9A-Za-z.\-_]{31}[0-9a-f]{2}$/)
  })

  it('认出是 VMP 但响应头没有 nonce → undefined（nonce 只在头上，算不出签名）', () => {
    expect(solveDouyinAnticrawler(VMP, { cookie: 'ttwid=abc', userAgent: UA })).toBeUndefined()
    expect(solveDouyinAnticrawler(VMP, { cookie: 'ttwid=abc', userAgent: UA, headers: judgeHeaders({}) })).toBeUndefined()
  })

  it('缺 UA → undefined（签名摘 UA，拿假 UA 算出来的签名与重放请求不自洽）', () => {
    const solved = solveDouyinAnticrawler(VMP, { cookie: 'ttwid=abc', headers: judgeHeaders({ 'set-cookie': NONCE_SET_COOKIE }) })
    expect(solved).toBeUndefined()
  })

  it('nonce 是空值（`__ac_nonce=;`）→ undefined，不拿空串去算', () => {
    const solved = solveDouyinAnticrawler('', {
      cookie: '',
      userAgent: UA,
      headers: judgeHeaders({ 'set-cookie': '__ac_nonce=; Path=/' })
    })
    expect(solved).toBeUndefined()
  })

  it('WAF 页优先按 WAF 解 —— 即使它同时发了 __ac_nonce', () => {
    const solved = solveDouyinAnticrawler(WAF, {
      cookie: 'ttwid=abc',
      userAgent: UA,
      headers: judgeHeaders({ 'set-cookie': NONCE_SET_COOKIE })
    })
    expect(valueOf(solved, WAF_CHALLENGE_COOKIE)).toBeTypeOf('string')
    expect(valueOf(solved, '__ac_signature')).toBeUndefined()
  })

  it('同一 cookie 里已有旧 pair 时后写覆盖，不出现两份同名', () => {
    const solved = solveDouyinAnticrawler('', {
      cookie: '__ac_nonce=old; __ac_signature=old; ttwid=abc',
      userAgent: UA,
      headers: judgeHeaders({ 'set-cookie': NONCE_SET_COOKIE })
    })
    expect(solved!.match(/__ac_nonce=/g)).toHaveLength(1)
    expect(valueOf(solved, '__ac_nonce')).toBe(NONCE)
    expect(valueOf(solved, '__ac_signature')).not.toBe('old')
  })
})

describe('滑块中间页提取 parseDouyinSliderPage', () => {
  const page = parseDouyinSliderPage(SLIDER)

  it('取出 SDK 地址与 verify_data', () => {
    expect(page?.jsSdkUrl).toMatch(/^https:\/\/.+captcha\/index\.js$/)
    expect(page?.verifyData).toBeTypeOf('object')
  })

  it('verifyText 是页面原文，JSON.parse 回来与 verifyData 一致', () => {
    expect(JSON.parse(page!.verifyText)).toEqual(page!.verifyData)
  })

  it('verify_data 自带 fp —— 这正是响应体通道拼得出地址的依据（只断言形状）', () => {
    const fp = page!.verifyData.fp
    expect(fp).toBeTypeOf('string')
    expect(String(fp)).toMatch(/^verify_/)
    expect(String(fp)).toHaveLength(52)
  })

  it('实测 aid 是 0、detail 是 408 字符的票据 —— aid 为 0 是自建验证页存在的理由', () => {
    expect(page!.verifyData.aid).toBe(0)
    expect(page!.verifyData.detail).toBeTypeOf('string')
    expect(String(page!.verifyData.detail)).toHaveLength(408)
    expect(page!.verifyData.subtype).toBe('slide')
  })

  it('server_sdk_env 内部带 } 也不会把整行吃断', () => {
    expect(JSON.parse(String(page!.verifyData.server_sdk_env))).toEqual({ idc: 'lf', region: 'CN', server_type: 'whale' })
  })

  it('不是滑块页 / 不是字符串一律不认', () => {
    for (const raw of [WAF, VMP, '<html>普通页面</html>', '', null, undefined, 42, { detail: 'x' }]) {
      expect(parseDouyinSliderPage(raw)).toBeUndefined()
    }
  })

  it('verify_data 解不开时不认', () => {
    expect(parseDouyinSliderPage('const verify_data = {坏掉的 JSON}')).toBeUndefined()
  })
})

describe('parseDouyinCaptcha 的两条通道', () => {
  /** 响应头通道的验证参数（值全是合成的，与 captcha.test.ts 同一套做法） */
  const headerParams = JSON.stringify({ code: 10000, subtype: 'text', fp: 'verify_synthetic_fp', aid: 6383 })
  const headersOf = (value: string) => ({
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'x-vc-bdturing-parameters' ? value : undefined) }
  })
  const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64')

  it('响应体通道：滑块中间页拼出验证页地址，fp / aid 取自 verify_data', () => {
    const challenge = parseDouyinCaptcha(SLIDER)
    const url = new URL(challenge?.url ?? 'about:blank')
    expect(`${url.origin}${url.pathname}`).toBe('https://rmc.bytedance.com/verifycenter/captcha/v2')
    expect(url.searchParams.get('fp')).toBe(String(parseDouyinSliderPage(SLIDER)!.verifyData.fp))
    expect(url.searchParams.get('aid')).toBe('0')
    // 验证页 JSON.parse 回来的要与页面下发的一字不差
    expect(JSON.parse(url.searchParams.get('verify_data') ?? 'null')).toEqual(parseDouyinSliderPage(SLIDER)!.verifyData)
  })

  it('响应体通道带齐自建验证页的三样材料：jsSdkUrl / session / verifyData', () => {
    const challenge = parseDouyinCaptcha(SLIDER)
    expect(challenge?.jsSdkUrl).toMatch(/captcha\/index\.js$/)
    expect(challenge?.session).toHaveLength(408)
    expect(challenge?.verifyData?.subtype).toBe('slide')
    expect(challenge?.type).toBe('slide')
    // 平台原值不翻译：中间页里 code 是**字符串** "10000"（响应头那边是数字 10000）
    expect(challenge?.result).toBe('10000')
  })

  it('响应头优先：两条通道同时有料时，交出的是头上那一份', () => {
    const challenge = parseDouyinCaptcha(SLIDER, headersOf(b64(headerParams)))
    const url = new URL(challenge?.url ?? 'about:blank')
    expect(url.searchParams.get('aid')).toBe('6383')
    expect(challenge?.type).toBe('text')
    expect(challenge?.result).toBe(10000)
    // 头通道不交 session / verifyData / jsSdkUrl —— 放行挂在 fp 上，重发即可
    expect(challenge?.session).toBeUndefined()
    expect(challenge?.verifyData).toBeUndefined()
    expect(challenge?.jsSdkUrl).toBeUndefined()
  })

  it('头上拼不出地址时继续试响应体 —— 两条通道互补，不是互相覆盖', () => {
    // 缺 fp 的验证头：判定照样认，但拼不出能过的地址
    const noFp = b64(JSON.stringify({ code: 10000, subtype: 'slide', aid: 6383 }))
    const challenge = parseDouyinCaptcha(SLIDER, headersOf(noFp))
    expect(challenge?.jsSdkUrl).toMatch(/captcha\/index\.js$/)
    expect(new URL(challenge!.url).searchParams.get('aid')).toBe('0')
  })

  it('两条通道都不认时 undefined（WAF 页不是验证页）', () => {
    expect(parseDouyinCaptcha(WAF, { status: 200, headers: { get: () => undefined } })).toBeUndefined()
    expect(parseDouyinCaptcha('')).toBeUndefined()
  })
})

describe('挑战页能走到风控钩子（接线前提）', () => {
  it('挑战页 body 是 HTML 字符串，judge 判成 kind: risk', () => {
    // challenge 与 solveChallenge 都只在 kind: 'risk' 时才被调用 —— 这一条钉住
    // 「HTML 挑战页确实会落进那个分支」，否则两条通道装了也永不触发
    for (const html of [WAF, SLIDER, VMP]) {
      const verdict = douyinJudge(html, { status: 200 })
      expect(verdict.ok).toBe(false)
      expect(verdict.kind).toBe('risk')
    }
  })

  it('自动解得开的两种（WAF / VMP）判 ANTIBOT_PAGE 且可重试', () => {
    for (const html of [WAF, VMP]) {
      const verdict = douyinJudge(html, { status: 200 })
      expect(verdict.code).toBe('ANTIBOT_PAGE')
      expect(verdict.retryable).toBe(true)
    }
  })

  // 这一条原先钉的是 SLIDER → ANTIBOT_PAGE。改期望值的理由：
  // ① `ANTIBOT_PAGE` 在抖音是**可重试**码（`DOUYIN_RISK_RETRY` 与 request 档案的
  //    `retryOn` 都含它），于是滑块中间页会被退避重发 3 次、每次重新签名 ——
  //    滑块要真人拖，重发一次都是白发，还放大风控；
  // ② 交出去的码是 `ANTIBOT_PAGE`，调用方按 `CAPTCHA_REQUIRED` 分支判「要人过验证」
  //    的代码接不到这一支，而验证头通道（同一张滑块、带 `bdturing-verify` 时）给的
  //    就是 `CAPTCHA_REQUIRED` —— 同一件事两个码。
  // `kind` 仍是 `risk`，所以 `parseDouyinCaptcha` / `solveDouyinAnticrawler` 的调用
  // 前提不变（后者对 captcha 恒返回 undefined，红线不动）。
  it('滑块中间页判 CAPTCHA_REQUIRED 且不可重试（没有验证头也一样）', () => {
    const verdict = douyinJudge(SLIDER, { status: 200 })
    expect(verdict.ok).toBe(false)
    expect(verdict.kind).toBe('risk')
    expect(verdict.code).toBe('CAPTCHA_REQUIRED')
    expect(verdict.retryable).toBe(false)
  })

  it('滑块中间页仍能提取出验证页地址（响应体通道照旧工作）', () => {
    const challenge = parseDouyinCaptcha(SLIDER, { status: 200, headers: { get: () => undefined } })
    expect(challenge?.url).toMatch(/^https:\/\//)
  })
})
