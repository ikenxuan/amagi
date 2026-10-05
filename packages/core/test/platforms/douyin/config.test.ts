import {
  createDouyinConfig,
  DOUYIN_DESKTOP_SEC_CH_UA,
  DOUYIN_DESKTOP_UA,
  DOUYIN_DTRAIT,
  DOUYIN_WEB_SEC_CH_UA,
  DOUYIN_WEB_UA,
  resolveDouyinUifid
} from 'amagi/platforms/douyin/config'
/**
 * platforms/douyin/config 的契约。
 *
 * 基线形态按「能否拿到 uifid」切换（v2.43.5 起）：
 * - **有 uifid**（cookie 的 uifid 系键值）→ 完整桌面客户端形态：Edge 151 UA +
 *   Edge sec-ch-ua + `x-tt-session-dtrait`，外部 UA 透传。
 * - **无 uifid** → 普通 Chrome 桌面形态：不伪装 Edge、不挂 dtrait。桌面特征被
 *   Argus 识别为桌面客户端后会强制校验 uifid，缺失即「Uifid Not Found」403，
 *   所以无 uifid 时外部显式传入的 Edge UA 也被强制降级。
 */
import { describe, expect, it } from 'vitest'

describe('resolveDouyinUifid - uifid 解析口径', () => {
  it('空 cookie → 空串', () => {
    expect(resolveDouyinUifid()).toBe('')
    expect(resolveDouyinUifid('')).toBe('')
  })

  it('cookie 的 uifid 系键值可提取（大小写变体）', () => {
    expect(resolveDouyinUifid('UIFID=aabbccdd; odin_tt=xx')).toBe('aabbccdd')
    expect(resolveDouyinUifid('uifid=11223344; passport_csrf_token=yy')).toBe('11223344')
  })

  it('只命中 uifid_temp 时也提取', () => {
    expect(resolveDouyinUifid('uifid_temp=deadbeef; ttwid=zz')).toBe('deadbeef')
  })
})

describe('无 uifid：普通浏览器形态（v2.43.5 起不再伪装桌面客户端）', () => {
  it('默认 UA 为普通 Chrome（非 Edge），sec-ch-ua 与其描述同一浏览器', () => {
    const { headers } = createDouyinConfig('ck')
    expect(headers.get('user-agent')).toBe(DOUYIN_WEB_UA)
    expect(headers.get('user-agent')).not.toContain('Edg/')
    expect(headers.get('sec-ch-ua')).toBe(DOUYIN_WEB_SEC_CH_UA)
  })

  it('不挂 x-tt-session-dtrait（桌面会话特征头）', () => {
    const { headers } = createDouyinConfig('ck')
    expect(headers.get('x-tt-session-dtrait')).toBeUndefined()
  })

  it('外部显式传入 Edge UA 也被强制降级为普通 Chrome（避免 Argus 校验 uifid）', () => {
    const edgeUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0'
    const { headers } = createDouyinConfig('ck', { headers: { 'User-Agent': edgeUa } })
    expect(headers.get('user-agent')).toBe(DOUYIN_WEB_UA)
    expect(headers.get('user-agent')).not.toContain('Edg/')
  })
})

describe('有 uifid：完整桌面客户端形态', () => {
  it('cookie 含 uifid：默认 Edge 151 UA + Edge sec-ch-ua + dtrait', () => {
    const { headers } = createDouyinConfig('uifid=aabbccdd; ck')
    expect(headers.get('user-agent')).toBe(DOUYIN_DESKTOP_UA)
    expect(headers.get('sec-ch-ua')).toBe(DOUYIN_DESKTOP_SEC_CH_UA)
    expect(headers.get('x-tt-session-dtrait')).toBeDefined()
  })

  it('外部非 Edge UA 原样透传，sec-ch-ua 按该 UA 现场计算', () => {
    const ua = 'Mozilla/5.0 CustomAgent Chrome/140.0.0.0 Safari/537.36'
    const { headers } = createDouyinConfig('UIFID=1234; ck', { headers: { 'User-Agent': ua } })
    expect(headers.get('user-agent')).toBe(ua)
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="140"')
    expect(headers.get('sec-ch-ua')).toContain('"Google Chrome";v="140"')
  })

  it('外部 Edge UA 原样透传且用 Edge 专属 sec-ch-ua', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0'
    const { headers } = createDouyinConfig('uifid=1234; ck', { headers: { 'User-Agent': ua } })
    expect(headers.get('user-agent')).toBe(ua)
    expect(headers.get('sec-ch-ua')).toBe(DOUYIN_DESKTOP_SEC_CH_UA)
  })
})

describe('platforms/douyin/config - 基线结构', () => {
  it('method 由端点声明，config 不设（端点各自声明 GET / POST）', () => {
    expect((createDouyinConfig('ck').requestConfig as Record<string, unknown>).method).toBeUndefined()
  })

  it('默认 timeout 10000，外部 timeout 优先', () => {
    expect(createDouyinConfig('ck').requestConfig.timeout).toBe(10000)
    expect(createDouyinConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('cookie 被 trim，undefined 时为空串', () => {
    expect(createDouyinConfig('  ck  ').headers.get('cookie')).toBe('ck')
    expect(createDouyinConfig(undefined).headers.get('cookie')).toBe('')
  })

  it('返回 AmagiHeaders 容器（不是普通对象）', () => {
    const { headers } = createDouyinConfig('ck')
    expect(typeof headers.get).toBe('function')
    expect(headers.size).toBeGreaterThan(0)
  })

  it('抖音必填基线头都在', () => {
    const { headers } = createDouyinConfig('ck')
    for (const name of ['accept', 'referer', 'user-agent', 'cookie', 'sec-ch-ua', 'sec-fetch-site']) {
      expect(headers.get(name), name + ' 缺失').toBeDefined()
    }
    expect(headers.get('referer')).toBe('https://www.douyin.com/')
    expect(headers.get('sec-fetch-site')).toBe('same-origin')
  })

  it('外部 requestConfig 的其他字段被透传', () => {
    expect(createDouyinConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('外部 headers 覆盖同名默认头', () => {
    const { headers } = createDouyinConfig('ck', { headers: { Referer: 'https://custom/' } })
    expect(headers.get('referer')).toBe('https://custom/')
  })
})

describe('DOUYIN_DTRAIT 兜底值存在（桌面形态可用）', () => {
  it('内置一份已知有效的会话特征值', () => {
    expect(typeof DOUYIN_DTRAIT).toBe('string')
    expect(DOUYIN_DTRAIT.length).toBeGreaterThan(100)
  })
})
