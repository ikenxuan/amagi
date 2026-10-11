import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createRequestModule } from 'amagi/client/request'
import { AmagiHeaders } from 'amagi/contracts/request'
import { isAxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { makeRequestCtx } from '../helpers/request-ctx'

const URL_DOUYIN = 'https://www.douyin.com/aweme/v1/web/aweme/detail/'

/**
 * B站形状的 ctx：judge 认 code，用来测「业务失败 → 失败信封」。
 *
 * 只是把固定的响应体喂给共享助手 —— 自己手搓一份会漏掉它注入的
 * `sleep: async () => {}`（这些用例一旦变成可重试就真睡 1s+2s+4s），
 * 也会与助手漂移（签名器表、UA、userAgent 都得跟着改）。
 */
const makeBilibiliCtx = (body: unknown) =>
  makeRequestCtx('bilibili', 'SESSDATA=x', (spec) => ({
    status: 200,
    statusText: 'OK',
    headers: new AmagiHeaders(),
    body,
    durationMs: 1,
    url: spec.url
  }))

describe('信封轨', () => {
  it('成功时给 success 信封，data 是平台原始载荷', async () => {
    const { ctx } = makeRequestCtx('douyin', 'ttwid=abc')
    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(r.success).toBe(true)
    expect(r.data).toEqual({ status_code: 0, aweme_detail: { aweme_id: '1' } })
  })

  it('平台业务失败时给失败信封，不抛', async () => {
    const { ctx } = makeBilibiliCtx({ code: -101, message: '账号未登录' })
    const r = await createRequestModule('bilibili', ctx).get('https://api.bilibili.com/x/web-interface/view')

    expect(r.success).toBe(false)
    // 守卫是给类型检查看的：`expect()` 不收窄，而 `test:types` 把 test/ 整棵树都编
    // （上一行已经把「真成功」挡掉了，所以这里不会空跑）
    if (!r.success) expect(r.error.kind).toBe('auth')
  })

  it('签名器抛错也收口成信封，不裸抛', async () => {
    const { ctx } = makeRequestCtx('douyin', '')
    // 相对 URL 不满足 a_bogus 的「必须是绝对地址」前置条件
    const r = await createRequestModule('douyin', ctx).get('/aweme/v1/web/aweme/detail/')

    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.kind).toBe('internal')
    expect(r.meta.attempts).toBe(0)
  })
})

describe('axios 轨', () => {
  it('成功时 resolve AxiosResponse，data 是信封、status 是真实 HTTP 状态', async () => {
    const { ctx } = makeRequestCtx('douyin', 'ttwid=abc')
    const res = await createRequestModule('douyin', ctx).axios.get(URL_DOUYIN)

    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
  })

  it('失败时 reject AxiosError，err.response.data 是信封', async () => {
    const { ctx } = makeBilibiliCtx({ code: -101, message: '账号未登录' })
    const request = createRequestModule('bilibili', ctx)

    await expect(request.axios.get('https://api.bilibili.com/x/web-interface/view')).rejects.toSatisfy(
      (e: unknown) => isAxiosError(e) && e.response?.data?.success === false && e.response.data.error.kind === 'auth'
    )
  })

  it('没拿到响应时 err.response 是 undefined', async () => {
    const { ctx } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await expect(request.axios.get('/aweme/v1/web/aweme/detail/')).rejects.toSatisfy(
      (e: unknown) => isAxiosError(e) && e.response === undefined
    )
  })
})

describe('自定义面', () => {
  it('请求拦截器两条轨都跑，且改的头真的到达请求', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)
    request.interceptors.request.use((config) => {
      config.headers.set('x-probe', '1')
      return config
    })

    await request.get(URL_DOUYIN)
    await request.axios.get(URL_DOUYIN)

    expect(calls).toHaveLength(2)
    // 拦截器改的头经 toRequestConfig 落进 requestConfig.headers，
    // 不在 spec.headers 上 —— 所以要断言 send 的第三参
    expect(calls[0]?.headers).toMatchObject({ 'x-probe': '1' })
    expect(calls[1]?.headers).toMatchObject({ 'x-probe': '1' })
  })

  it('request.create 继承默认值', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const derived = createRequestModule('douyin', ctx).create({ amagi: { sign: false } })

    await derived.get(URL_DOUYIN)

    expect(sent[0].url).not.toContain('a_bogus')
  })

  it('create 的 amagi 默认值不会被单次 amagi 整对象冲掉', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')
    const derived = createRequestModule('douyin', ctx).create({ amagi: { cookie: false } })

    await derived.get(URL_DOUYIN, { amagi: { sign: false } }).catch(() => undefined)

    expect(sent[0].dropHeaders).toEqual(['cookie'])
  })

  it('paramsSerializer 被尊重', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    // 走表外 path（emoji/list）：策略表内的 path 在没有访客 id 时整条 secsdk 加签
    // 会被跳过、有访客 id 时 canonicalQuery 会重写 query —— 两种都会动这条 URL 的
    // 形状。本条只验 paramsSerializer，选一条 secsdk 恒为无操作的 path 才是隔离的
    await request.get('https://www.douyin.com/aweme/v1/web/emoji/list', {
      params: { a: '1', b: '2' },
      paramsSerializer: {
        serialize: (p) =>
          Object.entries(p as Record<string, string>)
            .map(([k, v]) => `${k}:${v}`)
            .join('|')
      }
    })

    // 序列化结果原样到达线上（`:` / `|` 经 a_bogus 的 URLSearchParams 往返会被
    // 百分号编码，这与 serializer 无关）—— 默认序列化是 `a=1&b=2`，出现
    // `a%3A1%7Cb%3A2` 就证明自定义 serializer 生效了
    expect(sent[0].url).toContain('a%3A1%7Cb%3A2')
    expect(sent[0].url).not.toContain('a=1&b=2')
  })
})

describe('动词的实参落点', () => {
  it('post 的请求体来自 config.data，不是整份 config', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.post(URL_DOUYIN, { data: { a: 1 }, amagi: { sign: false } })

    // axios 自己的 post 是 `(url, data, config)`：config 直接当第二参会被当成**请求体**，
    // 于是整个 config（含 amagi 选项）发给平台，而 amagi 自己也静默失效
    expect(sent[0].body).toEqual({ a: 1 })
    expect(sent[0].url).not.toContain('a_bogus')
  })

  it('post 的 config 其它键没被 body 位吞掉', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.post(URL_DOUYIN, { data: { a: 1 }, timeout: 8000 })

    expect(calls[0]?.timeout).toBe(8000)
  })

  it('put 同样把请求体落在 data 位', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.put(URL_DOUYIN, { data: { b: 2 }, amagi: { sign: false } })

    expect(sent[0].method).toBe('PUT')
    expect(sent[0].body).toEqual({ b: 2 })
  })

  it('get 的 (url, config) 形态不变（回归保护）', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.get(URL_DOUYIN, { params: { aweme_id: '7' }, amagi: { sign: false } })

    expect(sent[0].url).toContain('aweme_id=7')
    expect(sent[0].body).toBeUndefined()
  })
})

/**
 * 抖音档案（`profile.ts`）的重试两件套在**组合起来**之后确实生效：
 * `retryOn: ['ANTIBOT_PAGE']` 让它重发，`retryFresh: true` 让重发的那次**重新签名**
 * 而不是重放同一个 `RequestSpec` —— 于是每次都拿到一套新的 `msToken` + `a_bogus`。
 * 「配上了没有」只有在真跑一遍管线时才会暴露：档案里的一个键写错就是静默不重试。
 *
 * 换 token 这件事现在**全部由重新签名提供**：`msToken` 出自签名 step
 * （`platforms/douyin/sign/steps.ts` 的 `msToken()`），每签一次就重抽一个。档案上
 * 曾有个 `refresh` 钩子读 URL 里已有的 msToken 再重抽，在 msToken 从 URL 构造器
 * 下沉到签名 step 之后它恒等于无操作，已删。
 */
describe('抖音档案的重试接线', () => {
  // 调用方自己拼在 URL 上的 msToken：签名 step 会**覆盖**它，所以连第一次发出去的
  // 请求都已经不是这个值了。选「覆盖」而非「有则不动」是刻意的 —— 后者会让
  // retryFresh 的重试一直复用调用方这个过期 token，而 Argus 按**单次请求的 token 组**
  // 判定，重放必然同样被拦，重试就白跑了。
  const CALLER_MS_TOKEN = 'A'.repeat(184)
  /** 184 是作品详情类接口真实的 msToken 长度，注册名那条路统一取这一档 */
  const MS_TOKEN_LEN = 184

  it('Argus 拦截后重发，两次各自签一套新 msToken（调用方给的那个被换掉）', async () => {
    let attempt = 0
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      // 第一次是一般 Argus 拦截（纯文本，judge 判 ANTIBOT_PAGE 且标了 retryable，
      // 于是走档案的 retryOn 重发），之后正常。不用点名签名的拦截文本：
      // 那种判 SIGNATURE_REFUSED、不可重试（见 judge ⑥）
      body: attempt++ === 0 ? 'Blocked by ArgusSecurityPlugin' : { status_code: 0, aweme_detail: { aweme_id: '1' } },
      durationMs: 1,
      url: spec.url
    }))

    const r = await createRequestModule('douyin', ctx).get(`${URL_DOUYIN}?msToken=${CALLER_MS_TOKEN}`)

    // 重试真的发生了（不是「重试逻辑看起来对」）：发出去的请求不止一次，最后成功
    expect(r.success).toBe(true)
    expect(sent.length).toBeGreaterThan(1)

    const msTokenOf = (url: string): string => new URL(url).searchParams.get('msToken') ?? ''
    // 两次都带一个长度正确的 msToken —— 签名 step 无条件写，长度是参数的一部分
    expect(msTokenOf(sent[0].url)).toHaveLength(MS_TOKEN_LEN)
    expect(msTokenOf(sent[1].url)).toHaveLength(MS_TOKEN_LEN)
    // 第一次就已经不是调用方那个值：msToken 出自签名 step，覆盖 URL 里原有的
    expect(msTokenOf(sent[0].url)).not.toBe(CALLER_MS_TOKEN)
    // 两次互不相同 —— retryFresh 真的重签了，而不是重放同一个 spec
    expect(msTokenOf(sent[1].url)).not.toBe(msTokenOf(sent[0].url))
  })

  /**
   * 滑块中间页**一次都不重发**。
   *
   * 它和上面那条 Argus 用例共用同一条 `retryOn` 通道，差别只在 judge 给的码：
   * 滑块判 `CAPTCHA_REQUIRED`（不在 `retryOn` 里），Argus 判 `ANTIBOT_PAGE`（在）。
   * 这一条钉的是「滑块永不自动重放」这条红线在 **request 这条路上**也成立 ——
   * 退避重发对要真人拖的验证毫无意义，只会放大风控。
   */
  it('滑块中间页只发 1 次，交出 CAPTCHA_REQUIRED 与验证页地址', async () => {
    const slider = readFileSync(fileURLToPath(new URL('../fixtures/douyin/slider_captcha.html', import.meta.url)), 'utf8')
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      body: slider,
      durationMs: 1,
      url: spec.url
    }))

    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(sent).toHaveLength(1)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.code).toBe('CAPTCHA_REQUIRED')
      expect(r.error.retryable).toBe(false)
      // 只中转不绕过：地址照旧交出去
      expect(r.error.challenge?.url).toMatch(/^https:\/\//)
    }
  })

  /**
   * 解算重放拿到「不是挑战页」的响应之后，**不再白发请求**。
   *
   * 线上形态（2026-10-11 实测，零 cookie 打首页）：第 1 发是 VMP 挑战页 + `__ac_nonce`，
   * solver 解出 `__ac_nonce + __ac_signature` 并立即重放；第 2 发拿到的是约 856KB 的真
   * 首页 —— 没有任何挑战锚点，solver 对它返回 `undefined`。
   *
   * 修这条之前：第 2 发被判成 `ANTIBOT_PAGE`（可重试），于是走档案的 `retryOn` 又退避
   * 重发 3 次，共 5 发、白等 1s+2s+4s，最后仍然失败。挑战已经解开了，后 3 发不可能
   * 有不同结果。
   */
  it('解算重放后 solver 不再出手时直接收口，恰好 2 发', async () => {
    const vmp = readFileSync(fileURLToPath(new URL('../fixtures/douyin/challenge-page.html', import.meta.url)), 'utf8')
    let attempt = 0
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => {
      const first = attempt++ === 0
      return {
        status: 200,
        statusText: 'OK',
        // 形状占位的 nonce，不是真值。VMP 的 nonce 只在响应头上
        headers: new AmagiHeaders(first ? { 'set-cookie': '__ac_nonce=0123456789abcdef01234; Path=/; Max-Age=1800' } : {}),
        // 第 2 发：无任何挑战锚点的 HTML（真首页的替身）
        body: first ? vmp : `<!doctype html><html><body>${'x'.repeat(4096)}</body></html>`,
        durationMs: 1,
        url: spec.url
      }
    })

    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(sent).toHaveLength(2)
    // 解算确实发生过：第 2 发带上了解出的那一对
    expect(new AmagiHeaders(sent[1].headers).get('cookie')).toContain('__ac_signature=')
    expect(r.success).toBe(false)
  })

  /**
   * 解算之后撞上**与挑战无关**的可重试失败：也收口，不换令牌重试。
   *
   * 这是 `runtime/execute.ts` 那条 `solvedOnce` 收口判据的**代价**，2026-10-11 离线
   * 实测钉在这里（此前只是推断）：第 1 发 VMP 挑战页 + `__ac_nonce` → 解出重放，
   * 第 2 发是 `Blocked by ArgusSecurityPlugin`。Argus 拦截与挑战无关、按单次请求的
   * token 组判定，换一套 `msToken` + `a_bogus` 重发**本来是有意义的**，但解算链已经
   *起过作用，于是就地收口。
   *
   * 两种 body 判出来的码相同（都是 `ANTIBOT_PAGE`，一条走 `verdictFromNonJsonBody`、
   * 一条走抖音自己的 `isDouyinArgusBody`），verdict 上没有能把它们分开的字段 ——
   * 要收窄判据得先改契约，取舍理由见 `execute.ts` 那段注释。收口后信封仍带
   * `retryable: true`，调用方自己重试不受影响，这一条也锁住。
   *
   * 下面那条「没解算过的纯 Argus 仍发 4 发」是本条的对照组：`retryOn` 这条路本身没变。
   */
  it('解算之后撞上 Argus：恰好 2 发就收口，不再换令牌重试（代价，实测）', async () => {
    const vmp = readFileSync(fileURLToPath(new URL('../fixtures/douyin/challenge-page.html', import.meta.url)), 'utf8')
    let attempt = 0
    const { ctx, sent, reasons } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => {
      const first = attempt++ === 0
      return {
        status: 200,
        statusText: 'OK',
        // 形状占位的 nonce，不是真值
        headers: new AmagiHeaders(first ? { 'set-cookie': '__ac_nonce=0123456789abcdef01234; Path=/; Max-Age=1800' } : {}),
        // 第 2 发：与挑战无关的 Argus 拦截（不点名签名 —— 那种判 SIGNATURE_REFUSED、不可重试）
        body: first ? vmp : 'Blocked by ArgusSecurityPlugin',
        durationMs: 1,
        url: spec.url
      }
    })

    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(sent).toHaveLength(2)
    expect(reasons).toEqual(['initial', 'challenge'])
    // 解算确实发生过：第 2 发带上了解出的那一对
    expect(new AmagiHeaders(sent[1].headers).get('cookie')).toContain('__ac_signature=')
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.code).toBe('ANTIBOT_PAGE')
      // 收口不改可重试性：调用方自己重试照旧有效
      expect(r.error.retryable).toBe(true)
    }
  })

  it('对照：没解算过的纯 Argus 仍走满 retryOn（4 发）—— 收口只影响解算链之后', async () => {
    const { ctx, sent, reasons } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      body: 'Blocked by ArgusSecurityPlugin',
      durationMs: 1,
      url: spec.url
    }))

    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(sent).toHaveLength(4)
    expect(reasons).toEqual(['initial', 'retry', 'retry', 'retry'])
    expect(r.success).toBe(false)
  })

  /**
   * 解算重放在 trace 里有自己的 reason。
   *
   * 此前它与业务重试共用 `'retry'`，于是「5 发是解了 4 次、还是解了 1 次之后退避了
   * 3 次」在 trace 上**分不出来** —— 实测中这两种猜法都能凑出 5 发，最后要靠插桩才
   * 定下来是后者。`'challenge'` 把这个区分放进 trace 自己。
   */
  it("解算重放的 reason 是 'challenge'，不与业务重试混同", async () => {
    const vmp = readFileSync(fileURLToPath(new URL('../fixtures/douyin/challenge-page.html', import.meta.url)), 'utf8')
    let attempt = 0
    const { ctx, reasons } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => {
      const first = attempt++ === 0
      return {
        status: 200,
        statusText: 'OK',
        headers: new AmagiHeaders(first ? { 'set-cookie': '__ac_nonce=0123456789abcdef01234; Path=/' } : {}),
        body: first ? vmp : `<!doctype html><html><body>${'x'.repeat(2048)}</body></html>`,
        durationMs: 1,
        url: spec.url
      }
    })

    await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(reasons).toEqual(['initial', 'challenge'])
  })

  it("业务重试的 reason 仍是 'retry'", async () => {
    let attempt = 0
    const { ctx, reasons } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      body: attempt++ === 0 ? 'Blocked by ArgusSecurityPlugin' : { status_code: 0 },
      durationMs: 1,
      url: spec.url
    }))

    await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(reasons).toEqual(['initial', 'retry'])
  })
})

/**
 * `responseType: 'text'` 是调用方声明「我要的就是一段文本」。
 *
 * 不声明时，非空字符串 body 一律判 `ANTIBOT_PAGE`（`verdictFromNonJsonBody`）——
 * 四个平台的端点打的都是 JSON 接口，一张 HTML 回来必然是出了事。但 `request` 是通用
 * 出口，打 HTML 页面是正当用法，而此前**结构上拿不回 HTML**：没有任何开关能让那条
 * 公共前置闭嘴。
 *
 * 借用 axios 自己的 `responseType` 而不是新开一个 `amagi` 键：「axios 能表达的就用
 * axios 的键」是这个模块的既有约定。
 *
 * **平台自己的判据照旧先判**，text 豁免只作用于「平台判据一条都没认出来」的字符串 ——
 * 所以抖音的滑块 / VMP / WAF / Argus、小红书的验证头在 text 模式下仍然是失败。
 */
describe('responseType: text 时非 JSON body 不再被判反爬页', () => {
  const html = `<!doctype html><html><body>${'x'.repeat(2048)}</body></html>`
  const textCtx = (platform: Parameters<typeof makeRequestCtx>[0], cookie: string, body: unknown = html) =>
    makeRequestCtx(platform, cookie, (spec) => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      body,
      durationMs: 1,
      url: spec.url
    }))

  const CASES: { platform: Parameters<typeof makeRequestCtx>[0]; cookie: string; url: string }[] = [
    { platform: 'douyin', cookie: 'ttwid=abc', url: URL_DOUYIN },
    { platform: 'bilibili', cookie: 'SESSDATA=x', url: 'https://www.bilibili.com/video/BV1' },
    { platform: 'kuaishou', cookie: 'did=x', url: 'https://www.kuaishou.com/short-video/1' },
    { platform: 'xiaohongshu', cookie: 'a1=x', url: 'https://www.xiaohongshu.com/explore/1' }
  ]

  for (const { platform, cookie, url } of CASES) {
    it(`${platform}：不写 responseType 时 HTML 仍判失败`, async () => {
      const { ctx } = textCtx(platform, cookie)
      const r = await createRequestModule(platform, ctx).get(url, { amagi: { sign: false } })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.code).toBe('ANTIBOT_PAGE')
    })

    it(`${platform}：写了 responseType: 'text' 时 HTML 判成功，data 是原文`, async () => {
      const { ctx } = textCtx(platform, cookie)
      const r = await createRequestModule(platform, ctx).get(url, { responseType: 'text', amagi: { sign: false } })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data).toBe(html)
    })
  }

  it("抖音：带 'text' 落到滑块中间页时仍是 CAPTCHA_REQUIRED，不许返回 success", async () => {
    const slider = readFileSync(fileURLToPath(new URL('../fixtures/douyin/slider_captcha.html', import.meta.url)), 'utf8')
    const { ctx, sent } = textCtx('douyin', 'ttwid=abc', slider)
    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN, { responseType: 'text' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.code).toBe('CAPTCHA_REQUIRED')
      expect(r.error.challenge?.url).toMatch(/^https:\/\//)
    }
    // 红线：text 模式也不重放滑块
    expect(sent).toHaveLength(1)
  })

  it("抖音：带 'text' 时 Argus 拦截文本仍判失败（平台判据先于 text 豁免）", async () => {
    const { ctx } = textCtx('douyin', 'ttwid=abc', 'Blocked by ArgusSecurityPlugin')
    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN, { responseType: 'text' })
    expect(r.success).toBe(false)
  })
})
