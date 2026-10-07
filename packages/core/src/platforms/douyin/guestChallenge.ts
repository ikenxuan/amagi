import { Worker } from 'node:worker_threads'

/** 所有浏览器垫片都在 context 内部创建；不让任何宿主函数或构造器进入其中。 */
const BROWSER_SHIM = `
const noop = () => {};
globalThis.window = globalThis.self = globalThis.top = globalThis.parent = globalThis;
const element = () => ({ style: {}, setAttribute: noop, getContext: () => ({}), appendChild: noop });
let storedCookie = '';
globalThis.document = {
  referrer: '', documentElement: {}, createElement: element,
  getElementsByTagName: () => [{ appendChild: noop }], addEventListener: noop,
  attachEvent: noop, head: { appendChild: noop }, body: { appendChild: noop }
};
Object.defineProperty(document, 'cookie', {
  get: () => storedCookie,
  set: value => { storedCookie += (storedCookie ? '; ' : '') + String(value).split(';')[0] }
});
globalThis.navigator = {
  userAgent: __ua, appName: 'Netscape', appVersion: __ua, platform: 'Win32',
  language: 'zh-CN', languages: ['zh-CN'], cookieEnabled: true, webdriver: false,
  hardwareConcurrency: 16, deviceMemory: 8, plugins: { length: 0 }, mimeTypes: { length: 0 }
};
globalThis.screen = { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 };
globalThis.location = { href: 'https://www.douyin.com/', protocol: 'https:', host: 'www.douyin.com',
  hostname: 'www.douyin.com', pathname: '/', search: '', hash: '', reload: noop, replace: noop, assign: noop };
globalThis.history = { pushState: noop, replaceState: noop };
globalThis.performance = { now: () => Date.now(), timing: { navigationStart: Date.now() } };
globalThis.setTimeout = globalThis.setInterval = () => 0;
globalThis.clearTimeout = globalThis.clearInterval = globalThis.addEventListener = globalThis.removeEventListener = globalThis.attachEvent = noop;
globalThis.localStorage = globalThis.sessionStorage = { getItem: () => null, setItem: noop, removeItem: noop };
globalThis.XMLHttpRequest = function () { this.open = this.send = this.setRequestHeader = noop };
globalThis.console = { log: noop, warn: noop, error: noop };
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
globalThis.btoa = value => {
  const text = String(value); let result = '';
  for (let i = 0; i < text.length; i += 3) {
    const a = text.charCodeAt(i), b = text.charCodeAt(i + 1), c = text.charCodeAt(i + 2);
    if (a > 255 || b > 255 || c > 255) throw new Error('Invalid base64 input');
    result += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)]
      + (Number.isNaN(b) ? '=' : alphabet[((b & 15) << 2) | (c >> 6)])
      + (Number.isNaN(c) ? '=' : alphabet[c & 63]);
  }
  return result;
};
globalThis.atob = value => {
  const text = String(value).replace(/=+$/, ''); let result = '', bits = 0, buffer = 0;
  for (const char of text) {
    const digit = alphabet.indexOf(char); if (digit < 0) throw new Error('Invalid base64 input');
    buffer = (buffer << 6) | digit; bits += 6;
    if (bits >= 8) { bits -= 8; result += String.fromCharCode((buffer >> bits) & 255) }
  }
  return result;
};
`

// 刻意内联纯 JavaScript，使 ESM/CJS 产物无需附带单独的 worker 文件。
const WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
const vm = require('node:vm');
const { setup, script, invoke, timeout } = workerData;
try {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate'
  });
  vm.runInContext(setup, context, { timeout });
  vm.runInContext(script, context, { timeout });
  const value = vm.runInContext(invoke, context, { timeout });
  // Let pending rejection events run before a successful result can leave the worker.
  setImmediate(() => {
    parentPort.postMessage(typeof value === 'string' ? value : null);
    parentPort.close();
  });
} catch {
  parentPort.postMessage(null);
  parentPort.close();
}
`

const INVOKE_SIGNER = `(() => {
  if (typeof globalThis.byted_acrawler?.sign !== 'function') return null;
  try { globalThis.byted_acrawler.init?.({ aid: 99999999, dfp: 0 }) } catch {}
  const value = globalThis.byted_acrawler.sign('', __nonce);
  return typeof value === 'string' ? value : null;
})()`

/**
 * 把脚本故障隔离在一次性 worker 中；VM 限制只是纵深防御，不是安全边界。
 * 下载的代码不会在宿主事件循环上执行。
 */
export const signDouyinGuestChallenge = (
  html: string,
  nonce: string,
  userAgent: string,
  scriptTimeoutMs = 1000
): Promise<string | null> => {
  // 2026-09 的首页有两段内联脚本：前一段是混淆后的 acrawler 库（源码里不出现
  // `byted_acrawler` 字面量），后一段才调用 `byted_acrawler.init/sign`。只执行后一段
  // 拿不到库，所以按页面顺序执行到第一段提到 `byted_acrawler` 的脚本为止。
  const inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1])
  const caller = inline.findIndex((source) => source.includes('byted_acrawler'))
  const script = caller >= 0 ? inline.slice(0, caller + 1).join(';\n') : ''
  if (!script || script.length > 512 * 1024) return Promise.resolve(null)
  const timeout = Number.isFinite(scriptTimeoutMs) ? Math.max(1, Math.min(8000, Math.trunc(scriptTimeoutMs))) : 1000
  const setup = `const __ua = ${JSON.stringify(userAgent)}; const __nonce = ${JSON.stringify(nonce)};\n${BROWSER_SHIM}`

  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: { setup, script, invoke: INVOKE_SIGNER, timeout },
        // 不继承 loader/调试器，也不继承会吞掉 rejected promise 的策略。
        execArgv: ['--unhandled-rejections=strict'],
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 }
      })
    } catch {
      resolve(null)
      return
    }

    let result: string | null = null
    let settled = false
    // 覆盖 worker 启动、全部三个 VM 阶段、异步任务以及 worker 关闭。
    const deadline = setTimeout(() => finish(null), 3 * timeout + 1000)
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      void worker.terminate().catch(() => {})
      resolve(value)
    }
    worker.on('message', (value: unknown) => {
      if (typeof value === 'string' && value.length > 0 && !/[;\r\n]/.test(value)) result = value
    })
    worker.once('messageerror', () => finish(null))
    worker.once('error', () => finish(null))
    // 已回传的签名只有在 worker 干净退出（包括没有异步 rejection）后才采纳。
    worker.once('exit', (code) => finish(code === 0 ? result : null))
  })
}
