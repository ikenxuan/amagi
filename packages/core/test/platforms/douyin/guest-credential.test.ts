import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RawResponse, type RequestConfig } from 'amagi/contracts/request'
import { DEFAULT_UA } from 'amagi/contracts/ua'
import { configureDouyinGuestCache, mintDouyinGuestCookie } from 'amagi/platforms/douyin/guestCredential'
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
const challenge = '<script>window.byted_acrawler = { init() {}, sign(_, nonce) { return "signed-" + nonce } }</script>'

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
    const send: EndpointCtx['send'] = async (spec, reason, config) => {
      calls++
      expect(reason).toBe('prepare')
      expect(config?.maxRedirects).toBe(0)
      expect(new AmagiHeaders(spec.headers).get('user-agent')).toBe('test-UA')
      if (calls === 1) return reply(challenge, ['__ac_nonce=nonce; Path=/', 'ttwid=first-device; Path=/'])
      expect(new AmagiHeaders(spec.headers).get('cookie')).toBe('__ac_nonce=nonce; ttwid=first-device; __ac_signature=signed-nonce')
      return reply('', ['UIFID_TEMP=test-device; Path=/'])
    }
    const cookie = await mintDouyinGuestCookie({ send, userAgent: 'test-UA' })
    expect(cookie).toBe('ttwid=first-device; UIFID_TEMP=test-device')
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

  it('runs the obfuscated library script that precedes the challenge caller', async () => {
    // 线上首页：库脚本里没有 byted_acrawler 字面量，后一段才调用 init/sign
    const page =
      '<script>window["byted_" + "acrawler"] = { init() {}, sign(_, nonce) { return "lib-" + nonce } }</script>' +
      '<script>window.byted_acrawler.init({ aid: 99999999, dfp: 0 }); window.location.reload()</script>'
    const send: EndpointCtx['send'] = async (spec) =>
      new AmagiHeaders(spec.headers).get('cookie') ? reply('', ['UIFID_TEMP=device; Path=/']) : reply(page, ['__ac_nonce=n; Path=/'])
    const signed: string[] = []
    const record: EndpointCtx['send'] = async (spec, ...rest) => {
      const cookie = new AmagiHeaders(spec.headers).get('cookie')
      if (cookie) signed.push(cookie)
      return send(spec, ...rest)
    }
    expect(await mintDouyinGuestCookie({ send: record })).toBe('UIFID_TEMP=device')
    expect(signed).toEqual(['__ac_nonce=n; __ac_signature=lib-n'])
  })

  it('bounds challenge signing time as well as script initialization', async () => {
    const send: EndpointCtx['send'] = async () => reply('<script>window.byted_acrawler={sign(){while(true){}}}</script>', ['__ac_nonce=n'])
    expect(await mintDouyinGuestCookie({ send, scriptTimeoutMs: 20 })).toBeNull()
  })

  it('never exposes a host Function constructor to downloaded challenge code', async () => {
    const send: EndpointCtx['send'] = async () =>
      reply('<script>window.byted_acrawler={sign(){return this.constructor.constructor("return process")().version}}</script>', [
        '__ac_nonce=n'
      ])
    expect(await mintDouyinGuestCookie({ send, scriptTimeoutMs: 20 })).toBeNull()
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

  it.each(['initialization', 'signing'])(
    'contains unhandled challenge rejections during %s without exiting the host',
    (stage) => {
      const source =
        stage === 'initialization'
          ? 'window.byted_acrawler={sign(){return "signed"}}; Promise.reject(new Error("challenge rejected"))'
          : 'window.byted_acrawler={sign(){Promise.reject(new Error("challenge rejected"));return "signed"}}'
      const moduleUrl = new URL('../../../src/platforms/douyin/guestCredential.ts', import.meta.url).href
      const script = `
      import { mintDouyinGuestCookie } from ${JSON.stringify(moduleUrl)};
      let calls = 0;
      const send = async spec => ({
        body: ++calls === 1 ? ${JSON.stringify('<script>' + source + '</script>')} : '',
        status: 200, durationMs: 0, headers: {}, url: spec.url,
        setCookie: calls === 1 ? ['__ac_nonce=test-nonce'] : ['UIFID_TEMP=test-guest']
      });
      const result = await mintDouyinGuestCookie({ send, scriptTimeoutMs: 100 });
      setTimeout(() => console.log(JSON.stringify({ result, calls, alive: true })), 10);
    `
      const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
        cwd: fileURLToPath(new URL('../../../', import.meta.url)),
        encoding: 'utf8',
        timeout: 8000
      })
      expect(child.status, child.stderr || child.error?.message).toBe(0)
      expect(JSON.parse(child.stdout.trim())).toEqual({ result: null, calls: 1, alive: true })
    },
    10000
  )

  it('keeps the host event loop responsive while timing out a nonterminating challenge', async () => {
    let hostRan = false
    const tick = setImmediate(() => {
      hostRan = true
    })
    try {
      const send: EndpointCtx['send'] = async () =>
        reply('<script>window.byted_acrawler={sign(){while(true){}}}</script>', ['__ac_nonce=n'])
      expect(await mintDouyinGuestCookie({ send, scriptTimeoutMs: 50 })).toBeNull()
      expect(hostRan).toBe(true)
    } finally {
      clearImmediate(tick)
    }
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
