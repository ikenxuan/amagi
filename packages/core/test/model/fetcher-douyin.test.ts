import { createBoundDouyinFetcher, douyinFetcher } from 'amagi/model/fetchers'
/**
 * 抖音 fetcher 入口契约（阶段 6 改写版）。
 *
 * 阶段 6 起 `douyinFetcher`（静态）与 `createBoundDouyinFetcher` 从
 * `douyinRegistry` 派生，不再走 v6 的手写方法层（internal → getdata）。
 * 本文件锁定入口形态层面的契约（端点级细节由
 * `test/platforms/douyin/endpoints.test.ts` 锁）：
 * - 静态形态保持 v6 三参签名 `(options, cookie?, requestConfig?)`，返回 v7 信封
 * - 绑定形态 `(options, requestConfig?)`，cookie 在实例上
 * - 平台基线（UA 等）注入 + 单次调用覆盖生效（含用于签名）
 * - 失败全部是信封（不抛），业务码保留在 error 里
 * @see 06-migration.md「四种调用形态全部保留」
 */
import { describe, expect, it } from 'vitest'

import { constantAdapter, type AdapterHandle } from '../helpers/adapter'
import { AWEME_ID, douyinOk } from '../helpers/fixtures'

const COOKIE = 'sessionid=test; ttwid=abc'

/** 大小写无关地读请求头（axios 会按写入大小写保留，平台默认头用小写） */
const headerOf = (h: AdapterHandle, name: string): string | undefined => {
  const req = h.last()
  const key = Object.keys(req.headers).find((k) => k.toLowerCase() === name)
  return key === undefined ? undefined : (req.headers[key] as string | undefined)
}

describe('douyin 静态 fetcher（三参签名保持）', () => {
  it('返回 v7 成功信封，请求带上 aweme_id / a_bogus / Cookie', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: { aweme_id: AWEME_ID, desc: 'hi' } }))
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.aweme_detail?.desc).toBe('hi')
      expect(result.meta.endpoint).toBe('douyin.videoWork')
    }
    expect(h.last().query.aweme_id).toBe(AWEME_ID)
    expect(h.last().query.a_bogus).toBeTruthy()
    expect(headerOf(h, 'cookie')).toBe(COOKIE)
  })

  it('不传 cookie 也可调用（匿名），请求不带 Cookie 头', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, undefined, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(headerOf(h, 'cookie')).toBeUndefined()
  })

  it('平台基线注入浏览器 UA（集中维护的 DEFAULT_UA）', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(headerOf(h, 'user-agent')).toContain('Chrome/142')
    expect(headerOf(h, 'user-agent')).not.toContain('Edg')
  })

  it('单次调用 requestConfig 生效：UA 覆盖进请求头（并用于签名）', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, {
      adapter: h.adapter,
      headers: { 'User-Agent': 'MyAgent/1.0' }
    })

    expect(headerOf(h, 'user-agent')).toBe('MyAgent/1.0')
    expect(h.last().query.a_bogus).toBeTruthy() // 用覆盖后的 UA 签名没有炸
  })

  it('单次调用 headers.Cookie 覆盖绑定 cookie（大小写无关）', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, 'bound-ck', {
      adapter: h.adapter,
      headers: { cookie: 'override-ck' }
    })

    expect(headerOf(h, 'cookie')).toBe('override-ck')
  })
})

describe('douyin 失败路径（信封语义，不抛）', () => {
  it('status_code 非 0 → 失败信封，业务码保留', async () => {
    const h = constantAdapter({ status_code: 2154, status_msg: '风控拦截' })
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBeDefined()
      expect(result.error.platform?.code).toBe(2154)
    }
  })

  it('响应为空字符串 → auth / COOKIE_EXPIRED（v6 的 cookie 失效分支）', async () => {
    const h = constantAdapter('')
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('COOKIE_EXPIRED')
  })

  it('filter_detail.filter_reason → forbidden / PRIVATE（内容不可见）', async () => {
    const h = constantAdapter({ status_code: 0, filter_detail: { filter_reason: '私密账号' } })
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('PRIVATE')
  })

  it('参数校验失败 → validation 失败信封（v6 这里抛错）', async () => {
    const result = await douyinFetcher.fetchVideoWork({ aweme_id: '' }, COOKIE)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.kind).toBe('validation')
  })
})

describe('douyin 分页累积（fetchWorkComments）', () => {
  it('跨页累积评论，第二页的 cursor 带进请求', async () => {
    let page = 0
    const h = constantAdapter(() => {
      page += 1
      if (page === 1) return douyinOk({ cursor: 5, has_more: 1, comments: [{ cid: 'c1' }] })
      return douyinOk({ cursor: 0, has_more: 0, comments: [{ cid: 'c2' }] })
    })
    const result = await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 10 }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data.comments as Array<{ cid: string }>).map((c) => c.cid)).toEqual(['c1', 'c2'])
    }
    expect(h.count).toBe(2)
  })

  it('has_more 为 0 时单页即止', async () => {
    const h = constantAdapter(douyinOk({ cursor: 0, has_more: 0, comments: [{ cid: 'c1' }] }))
    const result = await douyinFetcher.fetchWorkComments({ aweme_id: AWEME_ID, number: 10 }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(h.count).toBe(1)
  })
})

describe('douyin 绑定 fetcher 与无参端点', () => {
  it('createBoundDouyinFetcher：cookie 绑在实例上，方法签名无 cookie 参', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    const bound = createBoundDouyinFetcher(COOKIE)
    const result = await bound.fetchVideoWork({ aweme_id: AWEME_ID }, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(headerOf(h, 'cookie')).toBe(COOKIE)
  })

  it('fetchEmojiList 无参：静态形态可不带 options，只传 cookie', async () => {
    const h = constantAdapter({ status_code: 0, emoji_list: [] })
    const result = await douyinFetcher.fetchEmojiList(undefined, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })
})

/**
 * 回归：HTTP 403 + 非 JSON 拦截页必须判失败。
 *
 * 真实现场（kkk 迁 v7 时撞到）：`parseWork` 拿到 HTTP 403，body 是一句纯文本
 * `Blocked by ArgusSecurityPlugin Uifid Not Found`，信封却是 `success: true`、
 * `data` 就是那句话。两个缺陷叠出来的：
 *
 * 1. `execute` 里「HTTP 2xx 即成功」只是**没有 judge 时**的兜底，四个平台都有
 *    judge，status 递进去就被丢掉（四个 judge 的签名当时都只写了 `(raw)`）。
 * 2. `douyinJudge` 有一句「非对象一律判成功，交给 normalize」，本意放过 `null`，
 *    实际放过了一切非对象 body —— 而 WAF 页恰好就是这个形状。
 *
 * 调用方因此在 `data.aweme_detail` 上才炸，报错点离原因隔着好几层。
 */
describe('回归：非 JSON 拦截页与非 2xx 状态', () => {
  const ARGUS = 'Blocked by ArgusSecurityPlugin Uifid Not Found'

  it('403 + 纯文本拦截页 → 失败信封 risk / ANTIBOT_PAGE，data 不再是那句话', async () => {
    const h = constantAdapter(ARGUS, 403)
    const result = await douyinFetcher.parseWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('risk')
      expect(result.error.code).toBe('ANTIBOT_PAGE')
      expect(result.error.http?.status).toBe(403)
    }
    // 关键：拦截页的文本不能作为 data 透出去
    expect(result.data).toBeUndefined()
  })

  it('200 + 纯文本拦截页同样判失败（WAF 也会用 200）', async () => {
    const h = constantAdapter(ARGUS, 200)
    const result = await douyinFetcher.parseWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('ANTIBOT_PAGE')
  })

  it('403 + 合法 JSON 但无业务码 → risk / RISK_CONTROL', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: { aweme_id: AWEME_ID } }), 403)
    const result = await douyinFetcher.parseWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('risk')
      expect(result.error.code).toBe('RISK_CONTROL')
    }
  })

  it('200 + 合法 JSON 仍然成功（不误伤正常路径）', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: { aweme_id: AWEME_ID, desc: 'ok' } }))
    const result = await douyinFetcher.parseWork({ aweme_id: AWEME_ID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.aweme_detail?.desc).toBe('ok')
  })
})
