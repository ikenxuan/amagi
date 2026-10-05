import vm from 'node:vm'

/** acrawler VMP 解算产物：签名与来源页 */
export interface AcrawlerResult {
  /** `__ac_signature` 的值；脚本没产出时为 `undefined`（解算失败） */
  signature?: string
  /** `__ac_referer` 的值；脚本没写时为 `undefined` */
  referer?: string
}

/** 挑战页正文里按 `<script>...</script>` 拆出的脚本段 */
const extractScripts = (html: string): string[] => [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])

/**
 * 造一个「够让 acrawler VMP 跑起来」的浏览器沙箱。
 *
 * 约束来自两周的实测：VMP 只依赖 window / document / location / navigator /
 * localStorage 这些常见对象的基本行为，但有些细节会直接决定成败：
 *
 * - **不要设 `sb.URL`** —— `vm` 上下文里会自动注入 Node 的全局 `URL`
 *   构造器，把 `sb.URL` 赋成我们的值会**遮蔽**掉它，VMP 用到 `URL` 就炸。
 * - **`document.cookie` 用 `Object.defineProperty` 装** —— VMP 用
 *   `document.cookie` 读 `__ac_nonce`、写 `__ac_signature`，普通对象属性满足不了。
 * - **`cookieSet` 要跳过属性键** —— `document.cookie` 赋值可带
 *   `expires` / `path` 等属性片段，不跳过会把垃圾键存进来。
 * - **`fetch` 返回永不 resolve 的 Promise** —— VMP 可能用它做上报，不想真的
 *   发请求，挂起最安全（脚本主体不 await 它）。
 * - **`plugins` / `mimeTypes` 给空数组形状** —— 直接给 `[]` 会触发 VMP 的
 *   `for...of` 报错，必须给 `{ length: 0 }` 这种数组样子。
 *
 * 每次调用新建独立的 cookie 容器与 sandbox，避免多次解算相互污染。
 * @param opts - 沙箱参数（UA 指纹、页面地址、来源页）
 * @returns 沙箱对象；`cookie` 是脚本读写 document.cookie 的唯一出入口
 */
export const buildAcrawlerSandbox = (opts: {
  userAgent: string
  pageUrl: string
  referrer: string
}): { sb: Record<string, unknown>; cookie: Record<string, string> } => {
  const cookie: Record<string, string> = {}

  const cookieGet = (): string =>
    Object.entries(cookie)
      .map(([k, value]) => `${k}=${value}`)
      .join('; ')
  const cookieSet = (s: string): void => {
    for (const part of String(s || '').split(/[;&]/)) {
      const eq = part.indexOf('=')
      if (eq === -1) continue
      const k = part.slice(0, eq).trim()
      const value = part.slice(eq + 1).trim()
      if (!k || /^(expires|path|domain|max-age|samesite|secure|httponly)$/i.test(k)) continue
      cookie[k] = value
    }
  }

  const el = () => ({
    setAttribute() {},
    getAttribute: () => null,
    style: {},
    appendChild() {},
    addEventListener() {},
    removeEventListener() {},
    getContext: () => ({ measureText: () => ({ width: 0 }) })
  })

  const chromeVersion = /Chrome\/([\d.]+)/.exec(opts.userAgent)?.[1] ?? '151.0.0.0'
  const navigator = {
    userAgent: opts.userAgent,
    platform: 'Win32',
    language: 'zh-CN',
    languages: ['zh-CN', 'zh'],
    appVersion: `5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`,
    cookieEnabled: true,
    onLine: true,
    maxTouchPoints: 0,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    webdriver: false,
    plugins: { length: 0 },
    mimeTypes: { length: 0 }
  }

  const xhrStub = function () {
    return {
      open() {},
      send() {},
      setRequestHeader() {},
      withCredentials: false,
      readyState: 0,
      responseText: '',
      status: 0,
      getAllResponseHeaders: () => '',
      getResponseHeader: () => null,
      onreadystatechange: null,
      onload: null,
      onerror: null
    }
  }

  const locationFields = (() => {
    try {
      const u = new URL(opts.pageUrl)
      return {
        href: u.href,
        protocol: u.protocol,
        host: u.host,
        hostname: u.hostname,
        origin: u.origin,
        pathname: u.pathname,
        search: u.search,
        hash: u.hash
      }
    } catch {
      return {
        href: opts.pageUrl,
        protocol: 'https:',
        host: 'www.douyin.com',
        hostname: 'www.douyin.com',
        origin: 'https://www.douyin.com',
        pathname: '/',
        search: '',
        hash: ''
      }
    }
  })()

  const base: Record<string, unknown> = {
    window: null,
    self: null,
    top: null,
    parent: null,
    globalThis: null,
    document: {
      referrer: opts.referrer,
      URL: opts.pageUrl,
      title: '',
      readyState: 'complete',
      createElement: el,
      getElementById: () => null,
      getElementsByTagName: () => [],
      querySelectorAll: () => [],
      addEventListener() {},
      removeEventListener() {},
      documentElement: { style: {} },
      body: el(),
      head: el()
    },
    location: { ...locationFields, reload() {}, replace() {}, assign() {} },
    navigator,
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24, availWidth: 1920, availHeight: 1040 },
    history: { length: 1, back() {}, forward() {}, go() {}, pushState() {}, replaceState() {} },
    XMLHttpRequest: xhrStub,
    fetch: () => new Promise(() => {}),
    localStorage: {
      getItem: (k: string) => cookie[k] ?? null,
      setItem: (k: string, value: string) => (cookie[k] = String(value)),
      removeItem: (k: string) => delete cookie[k]
    },
    sessionStorage: {
      getItem: (k: string) => cookie[`__ss_${k}`] ?? null,
      setItem: (k: string, value: string) => (cookie[`__ss_${k}`] = String(value)),
      removeItem: (k: string) => delete cookie[`__ss_${k}`]
    },
    performance: { now: () => Date.now(), timing: { navigationStart: Date.now() - 1000 }, getEntries: () => [] },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (cb: () => void) => setTimeout(cb, 16),
    cancelAnimationFrame: clearTimeout,
    Proxy,
    Reflect,
    Symbol,
    pow: Math.pow,
    devicePixelRatio: 1,
    open: () => null
  }
  // window / self / top / parent / globalThis 都指向沙箱自身
  const sb: Record<string, unknown> = base
  for (const key of ['window', 'self', 'top', 'parent', 'globalThis']) base[key] = sb
  // document.cookie 走 getter/setter（普通对象属性满足不了 VMP 的读写）
  Object.defineProperty(base.document as object, 'cookie', { get: cookieGet, set: cookieSet })

  return { sb, cookie }
}

/**
 * 在一个 VM 上下文里执行 acrawler VMP 挑战页，算出 `__ac_signature`。
 *
 * 挑战页尾部脚本先 `byted_acrawler.init(...)` 再
 * `byted_acrawler.sign('', __ac_nonce)` —— `__ac_nonce` 由沙箱的
 * `document.cookie` 读出，所以调用前要把 nonce 注入 cookie 容器。
 * 签名算完后脚本把 `__ac_signature` / `__ac_referer` 写回 document.cookie，
 * 从 cookie 容器取回即可。
 *
 * @param html - VMP 挑战页正文（含两段脚本：VMP 主体 + init/sign 调用段）
 * @param nonce - 响应 `Set-Cookie` 下发的 `__ac_nonce`
 * @param opts - 沙箱参数（UA、页面地址、参照页），需与导致挑战的请求一致
 * @returns 解算产物；脚本没产出签名叫当次执行失败
 */
export const solveAcrawlerVmp = (
  html: string,
  nonce: string,
  opts: { userAgent: string; pageUrl: string; referrer: string }
): AcrawlerResult => {
  const scripts = extractScripts(html)
  if (scripts.length === 0) return {}
  const { sb, cookie } = buildAcrawlerSandbox(opts)
  cookie.__ac_nonce = nonce

  const ctx = vm.createContext(sb)
  vm.runInContext(scripts[0], ctx, { filename: 'acrawler_vmp.js' })
  if (scripts.length > 1) vm.runInContext(scripts[1], ctx, { filename: 'acrawler_call.js' })

  return {
    ...(cookie.__ac_signature === undefined ? {} : { signature: cookie.__ac_signature }),
    ...(cookie.__ac_referer === undefined ? {} : { referer: cookie.__ac_referer })
  }
}
