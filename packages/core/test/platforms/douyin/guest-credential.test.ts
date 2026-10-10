import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RawResponse, type RequestConfig } from 'amagi/contracts/request'
import { DEFAULT_UA } from 'amagi/contracts/ua'
import { configureDouyinGuestCache, mintDouyinGuestCookie } from 'amagi/platforms/douyin/guestCredential'
import { computeAcSignature } from 'amagi/platforms/douyin/sign/acSignature'
import axios, { type AxiosAdapter, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const reply = (body: unknown, setCookie: string[] = []): RawResponse => ({
  body,
  setCookie,
  status: 200,
  durationMs: 0,
  headers: new AmagiHeaders(),
  url: 'https://www.douyin.com/'
})
/** 签名纯算、响应体不进签名器：这段若真被执行，发出去的签名就会是 `signed-<nonce>` */
const challenge = '<script>window.byted_acrawler = { init() {}, sign(_, nonce) { return "signed-" + nonce } }</script>'

/**
 * 断言发出去的 `__ac_signature` 就是纯算对同一 nonce + UA 的输出。签名带整秒时间戳，
 * 握手那一刻可能落在 before / after 两个整秒上，两端各算一份、命中其一即可。
 */
const expectPureSignature = (sent: string | undefined, nonce: string, userAgent: string, before: number, after: number): void => {
  const signature = /__ac_signature=([^;]+)/.exec(sent ?? '')?.[1]
  expect(signature).toHaveLength(47)
  expect([computeAcSignature(nonce, userAgent, before), computeAcSignature(nonce, userAgent, after)]).toContain(signature)
}

const originalAdapter = axios.defaults.adapter

/**
 * 建一个临时目录并记账，`afterEach` 统一删。
 *
 * 不记账的裸 `mkdtemp` 会在系统临时目录里留下永不回收的空目录 —— 本文件三处用例
 * 各留一个、其中一处还是 `it.each` 跑三遍，实测攒到过 321 个。
 */
const tempDirs: string[] = []
const tempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'amagi-douyin-guest-test-'))
  tempDirs.push(dir)
  return dir
}

beforeEach(() => configureDouyinGuestCache(null))
afterEach(async () => {
  axios.defaults.adapter = originalAdapter
  // 缓存路径还指向待删目录时，后续用例写盘会重建它，所以先摘掉指向
  configureDouyinGuestCache(null)
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('douyin guest handshake', () => {
  it('preserves nonce cookies and collects tokens across both handshake responses', async () => {
    let calls = 0
    let sent: string | undefined
    const send: EndpointCtx['send'] = async (spec, reason, config) => {
      calls++
      expect(reason).toBe('prepare')
      expect(config?.maxRedirects).toBe(0)
      expect(new AmagiHeaders(spec.headers).get('user-agent')).toBe('test-UA')
      if (calls === 1) return reply(challenge, ['__ac_nonce=nonce; Path=/', 'ttwid=first-device; Path=/'])
      sent = new AmagiHeaders(spec.headers).get('cookie')
      return reply('', ['UIFID_TEMP=test-device; Path=/'])
    }
    const before = Date.now()
    const cookie = await mintDouyinGuestCookie({ send, userAgent: 'test-UA' })
    const after = Date.now()
    expect(cookie).toBe('ttwid=first-device; UIFID_TEMP=test-device')
    // 第二发原样带回首发的 nonce 与 ttwid，再加纯算签名
    expect(sent).toMatch(/^__ac_nonce=nonce; ttwid=first-device; __ac_signature=[^;]+$/)
    expectPureSignature(sent, 'nonce', 'test-UA', before, after)
    expect(await mintDouyinGuestCookie({ send, userAgent: 'test-UA' })).toBe(cookie)
    expect(calls).toBe(2)
  })

  it('reuses a server-supplied token without running a challenge', async () => {
    const send: EndpointCtx['send'] = async () => reply('', ['UIFID=device; Path=/', 'ttwid=id; Path=/'])
    expect(await mintDouyinGuestCookie({ send })).toBe('ttwid=id; UIFID=device')
  })

  it('握手的响应体上限要高过首页实际大小，否则取不到 UIFID', async () => {
    /*
     * 回归 2026-10-05：这里曾是 1MiB。过完挑战的首页是 0.90MB ~ 1.06MB（UTF-8 字节），
     * 上限正好卡在区间里，三次里约两次抛 `maxContentLength size of 1048576 exceeded`，
     * `doMint` 捕获后回 null —— 于是没有 `UIFID_TEMP`，签名层发不出 `uifid`，
     * 受保护端点 403。症状像签名算错，根因在这个上限。
     *
     * 只断言「有余量」而不钉死 8MiB：具体数值可以调，卡回 1MiB 量级不行。
     * 注意上限按**字节**算，页面有中文，字节数比字符数多约 1.7%，
     * 所以阈值要比按字符数估出来的更高。
     */
    const caps: unknown[] = []
    const send: EndpointCtx['send'] = async (_spec, _reason, config) => {
      caps.push(config?.maxContentLength)
      return reply('', ['UIFID_TEMP=device; Path=/'])
    }
    await mintDouyinGuestCookie({ send, userAgent: 'cap-UA' })
    expect(caps.length).toBeGreaterThan(0)
    for (const cap of caps) {
      expect(typeof cap).toBe('number')
      expect(cap as number).toBeGreaterThan(2 * 1024 * 1024)
    }
  })

  /*
   * 首发响应体不进签名器：签名只由 nonce + UA + 整秒算出。下面每一种首发 body
   * 若被执行，要么签名变成别的、要么卡死 / 逃逸 / 抛错 —— 实际都走同一条纯算路径。
   * 这几条顶替了原先守 vm 沙箱的用例：没有执行路径，沙箱也就无从谈起。
   */
  const CHALLENGE_PAGE = readFileSync(new URL('../../fixtures/douyin/challenge-page.html', import.meta.url), 'utf8')
  it.each<[string, unknown]>([
    ['the real challenge page', CHALLENGE_PAGE],
    [
      'a library that would rewrite the signature',
      '<script>window["byted_" + "acrawler"] = { init() {}, sign(_, n) { return "lib-" + n } }</script>'
    ],
    ['a nonterminating signer', '<script>window.byted_acrawler={sign(){while(true){}}}</script>'],
    [
      'a Function-constructor escape',
      '<script>window.byted_acrawler={sign(){return this.constructor.constructor("return process")().version}}</script>'
    ],
    ['an async rejection', '<script>window.byted_acrawler={sign(){Promise.reject(new Error("x"));return "signed"}}</script>'],
    ['an empty body', ''],
    ['a non-string body', { not: 'html' }]
  ])('signs from the nonce alone when the first body is %s', async (_label, body) => {
    const sent: string[] = []
    const send: EndpointCtx['send'] = async (spec) => {
      const cookie = new AmagiHeaders(spec.headers).get('cookie')
      if (!cookie) return reply(body, ['__ac_nonce=n; Path=/'])
      sent.push(cookie)
      return reply('', ['UIFID_TEMP=device; Path=/'])
    }
    const before = Date.now()
    // scriptTimeoutMs 已废弃、不生效：传了也照常出货
    expect(await mintDouyinGuestCookie({ send, userAgent: 'test-UA', scriptTimeoutMs: 1 })).toBe('UIFID_TEMP=device')
    const after = Date.now()
    expect(sent).toHaveLength(1)
    expectPureSignature(sent[0], 'n', 'test-UA', before, after)
  })

  it('has no script execution path in the guest handshake sources', () => {
    // 注释里会提到这些词（记录历史实现），剥掉注释再查
    for (const file of ['guestChallenge.ts', 'guestCredential.ts']) {
      const src = readFileSync(new URL(`../../../src/platforms/douyin/${file}`, import.meta.url), 'utf8')
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(code, file).not.toMatch(/node:vm|worker_threads|\bWorker\b|\beval\b|new\s+Function/)
    }
  })

  it('separates cached guest identities when a shared sender uses different proxy configs', async () => {
    const firstConfig: RequestConfig = { proxy: { host: 'first-proxy.invalid', port: 8080 } }
    const secondConfig: RequestConfig = { proxy: { host: 'second-proxy.invalid', port: 8080 } }
    let requests = 0
    const send: EndpointCtx['send'] = async (_spec, _reason, config) => {
      requests++
      const proxy = config?.proxy
      return reply('', [`UIFID_TEMP=${proxy && typeof proxy === 'object' ? proxy.host : 'missing'}`])
    }
    expect(await mintDouyinGuestCookie({ send, requestConfig: firstConfig })).toBe('UIFID_TEMP=first-proxy.invalid')
    expect(await mintDouyinGuestCookie({ send, requestConfig: secondConfig })).toBe('UIFID_TEMP=second-proxy.invalid')
    expect(await mintDouyinGuestCookie({ send, requestConfig: firstConfig })).toBe('UIFID_TEMP=first-proxy.invalid')
    expect(await mintDouyinGuestCookie({ send, requestConfig: secondConfig })).toBe('UIFID_TEMP=second-proxy.invalid')
    expect(requests).toBe(2)
  })

  it('does not merge in-flight handshakes across proxy configs sharing a sender', async () => {
    const send: EndpointCtx['send'] = async (_spec, _reason, config) => {
      await Promise.resolve()
      const proxy = config?.proxy
      return reply('', [`UIFID_TEMP=${proxy && typeof proxy === 'object' ? proxy.host : 'missing'}`])
    }
    const values = await Promise.all([
      mintDouyinGuestCookie({ send, requestConfig: { proxy: { host: 'first-proxy.invalid', port: 8080 } } }),
      mintDouyinGuestCookie({ send, requestConfig: { proxy: { host: 'second-proxy.invalid', port: 8080 } } })
    ])
    expect(values).toEqual(['UIFID_TEMP=first-proxy.invalid', 'UIFID_TEMP=second-proxy.invalid'])
  })

  it('does not persist an old in-flight result after the cache path changes', async () => {
    const dir = await tempDir()
    const first = join(dir, 'first.json')
    const second = join(dir, 'second.json')
    configureDouyinGuestCache(first)
    let release!: (response: AxiosResponse) => void
    let start!: () => void
    const started = new Promise<void>((resolve) => {
      start = resolve
    })
    const adapter: AxiosAdapter = (config) =>
      new Promise((resolve) => {
        release = (response) => resolve({ ...response, config })
        start()
      })
    axios.defaults.adapter = adapter
    const old = mintDouyinGuestCookie()
    await started
    configureDouyinGuestCache(second)
    release({ data: '', status: 200, statusText: 'OK', headers: { 'set-cookie': ['UIFID_TEMP=old-device'] } } as AxiosResponse)
    await old
    await expect(readFile(second, 'utf8')).rejects.toHaveProperty('code', 'ENOENT')
  })

  it.each(['future', 'expired', 'malformed'])('ignores %s disk entries', async (kind) => {
    const dir = await tempDir()
    const file = join(dir, 'cache.json')
    const mintedAt = kind === 'future' ? Date.now() + 60000 : Date.now() - 3 * 60 * 60 * 1000
    await writeFile(file, kind === 'malformed' ? '{' : JSON.stringify({ cookie: 'UIFID_TEMP=stale', mintedAt, userAgent: DEFAULT_UA }))
    configureDouyinGuestCache(file)
    axios.defaults.adapter = async (config) => ({
      data: '',
      status: 200,
      statusText: 'OK',
      config,
      headers: { 'set-cookie': ['UIFID_TEMP=new-device'] }
    })
    expect(await mintDouyinGuestCookie()).toBe('UIFID_TEMP=new-device')
    expect(JSON.parse(await readFile(file, 'utf8')).cookie).toBe('UIFID_TEMP=new-device')
  })

  it('reuses a valid disk entry after resetting the in-memory cache', async () => {
    const dir = await tempDir()
    const file = join(dir, 'cache.json')
    configureDouyinGuestCache(file)
    let calls = 0
    axios.defaults.adapter = async (config) => {
      calls++
      return { data: '', status: 200, statusText: 'OK', config, headers: { 'set-cookie': ['UIFID_TEMP=persistent-device'] } }
    }
    expect(await mintDouyinGuestCookie()).toBe('UIFID_TEMP=persistent-device')
    configureDouyinGuestCache(file)
    expect(await mintDouyinGuestCookie()).toBe('UIFID_TEMP=persistent-device')
    expect(calls).toBe(1)
  })
})
