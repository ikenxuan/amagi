/**
 * `pnpm console` 的单进程入口 —— 一条命令同时起 Node 侧与浏览器侧。
 *
 * 为什么原先是两条命令：前后端本来就是两个进程（`packages/core` 是 Node-only，
 * 打不进浏览器包），而两个进程最直白的起法就是两个终端。代价是**忘了起一个**成了常态错误，
 * 而它的失败样子会骗人：只起浏览器侧时每个请求都失败，Vite 的代理打到空端口报
 * `Failed to fetch`、打到另一个在监听的服务上会回那个服务的 404 HTML。
 *
 * 所以这里不是把两个进程合成一个（做不到），是让**一个父进程**看着两个子进程：
 *
 * 1. **`build:core` 只跑一次。** 原先两条命令各自 `pnpm build:core`，等于把同一次构建
 *    做两遍 —— 而 tsdown 那一遍是这两条命令里最慢的一步。
 * 2. **同生共死。** 任一侧退出就把另一侧也收掉。少了这一条，`tsx watch` 因为语法错误
 *    退出之后 Vite 还在跑，界面照常打开、每个请求 500，而人以为服务还活着。
 * 3. **输出带前缀。** 两侧的日志混在一个终端里，不标出来分不清「端口被占」是谁在说。
 *
 * 命令行参数原样透传给 server 侧（`--host` / `--port` / `--token`），因为需要参数的
 * 只有它。Vite 那侧的端口由它自己挑（被占就往后找），`--host` 也不透传 ——
 * 那是两件不同的事：server 的 `--host` 决定 API 绑在哪，会触发「必须给口令」那道硬拒绝。
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describePortInUse, findPortHolder, isPortBusy } from '../server/port'

const HERE = dirname(fileURLToPath(import.meta.url))
/** `packages/web` —— 两个子进程的工作目录都是它 */
const WEB_ROOT = dirname(HERE)

const require = createRequire(import.meta.url)

/**
 * 解析一个包的可执行入口。
 *
 * **不能直接 `require.resolve('vite/bin/vite.js')`** —— vite 与 tsx 的 `exports` 都没有
 * 把 bin 列进去，那样会 `ERR_PACKAGE_PATH_NOT_EXPORTED`。`package.json` 是两边都导出的，
 * 从它的目录往下拼才稳。也不走 `node_modules/.bin/*`：pnpm 在 Windows 上那是 `.CMD` 垫片，
 * 用 `shell: true` 起它会多一层 cmd.exe，而那一层不转发信号（Ctrl+C 之后子进程会留下）。
 */
const binOf = (pkg: string, ...segments: string[]): string => {
  const path = join(dirname(require.resolve(`${pkg}/package.json`)), ...segments)
  if (!existsSync(path)) throw new Error(`找不到 ${pkg} 的入口：${path} —— 依赖没装全？先跑 pnpm install`)
  return path
}

const VITE_BIN = binOf('vite', 'bin', 'vite.js')
const TSX_BIN = binOf('tsx', 'dist', 'cli.mjs')

/** `server/index.ts` 的 `DEFAULT_PORT`。这里要它只为把真实端口告诉 Vite 的代理 */
const DEFAULT_API_PORT = 7345

/**
 * 从透传给 server 的参数里读出 API 端口，交给 Vite 的代理。
 *
 * 少了这一步，`pnpm console --port 7346` 会起一个监听 7346 的 server 和一个把 `/api/*`
 * 代理到 7345 的 Vite —— 两侧的启动日志都说自己好了，而界面上每个请求都 `Failed to fetch`。
 * 参数的两种写法（`--port 7346` 与 `--port=7346`）都要认，与 server 那侧的 `argOf` 一致。
 */
const apiPortOf = (args: readonly string[]): number => {
  const withEquals = args.find((arg) => arg.startsWith('--port='))
  const index = args.indexOf('--port')
  const raw = withEquals !== undefined ? withEquals.slice('--port='.length) : index < 0 ? undefined : args[index + 1]
  if (raw === undefined) return DEFAULT_API_PORT
  const port = Number(raw)
  // 值不合法就交给 server 去报错（它对 `--port abc` 有一句人话），这边照旧回默认值
  return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : DEFAULT_API_PORT
}

/**
 * ANSI 色。子进程的输出前缀要一眼分得清，这两个色在浅色/深色终端上都读得出来。
 *
 * 写成 `\u001b` 转义而不是裸 ESC 字节：裸控制字符在 diff、review 与编辑器里完全不可见，
 * 而 ripgrep 会因为它把整个文件当二进制跳过内容搜索。
 */
const CYAN = '\u001b[36m'
const MAGENTA = '\u001b[35m'
const DIM = '\u001b[2m'
const RESET = '\u001b[0m'

const children: ChildProcess[] = []
/** 已经在收摊了 —— 防止「A 退出 → 杀 B → B 的 exit 又触发一次收摊」这种回环 */
let shuttingDown = false

/**
 * 把子进程的输出逐行加上前缀。
 *
 * 逐行而不是逐 chunk：一次 `data` 事件可能是半行，也可能是三行，直接拼前缀会把前缀
 * 插到行中间。尾部不完整的那一段留到下一次（`pending`），Vite 的启动横幅正好会这样切开。
 */
const prefixed = (stream: NodeJS.ReadableStream | null, label: string, color: string): void => {
  if (stream === null) return
  let pending = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    const lines = (pending + chunk).split('\n')
    pending = lines.pop() ?? ''
    for (const line of lines) process.stdout.write(`${color}${label}${RESET} ${line}\n`)
  })
  stream.on('end', () => {
    if (pending !== '') process.stdout.write(`${color}${label}${RESET} ${pending}\n`)
  })
}

/**
 * 收摊：杀掉所有还活着的子进程，然后按给定码退出。
 *
 * Windows 上 `child.kill()` 只结束那一个进程、不动它的子孙，而 `tsx watch` 底下还有一个
 * 真正跑 server 的 node —— 所以那边要用 `taskkill /T`（整棵树）。POSIX 上 `SIGTERM`
 * 就够（两个子进程都不自己 fork）。
 */
const shutdown = (code: number): void => {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) continue
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => child.kill())
    } else {
      child.kill('SIGTERM')
    }
  }
  // 给 taskkill / SIGTERM 一点时间落地，否则 Node 可能先退出、留下孤儿
  setTimeout(() => process.exit(code), 300)
}

const start = (label: string, color: string, bin: string, args: string[], extraEnv: Record<string, string> = {}): ChildProcess => {
  const child = spawn(process.execPath, [bin, ...args], {
    cwd: WEB_ROOT,
    // `FORCE_COLOR`：管道化之后 Vite 与 chalk 都会关掉颜色，而 Vite 的启动横幅
    // （那个可点的 Local 地址）没了颜色可读性掉得很明显
    env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? '1', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  prefixed(child.stdout, label, color)
  prefixed(child.stderr, label, color)
  child.on('error', (error) => {
    process.stderr.write(`${color}${label}${RESET} 起不来：${error.message}\n`)
    shutdown(1)
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    const how = signal === null ? `退出码 ${code}` : `收到 ${signal}`
    process.stderr.write(`${color}${label}${RESET} ${how} —— 另一侧也一起收掉\n`)
    shutdown(code ?? 1)
  })
  children.push(child)
  return child
}

/**
 * 起子进程之前先看一眼 API 端口。
 *
 * **为什么要抢在 `build:core` 之前**：那一步要几秒、刷几十行 tsdown 日志，而端口被占
 * 是必然失败的 —— 让人等完构建再看到报错，且报错还被日志推到屏幕外，是最差的顺序。
 * `server/index.ts` 里那道 `EADDRINUSE` 提示仍然留着（两条命令分开跑时靠它），
 * 这里只是把同一段话提前。
 */
const preflight = (apiPort: number): void => {
  const holder = findPortHolder(apiPort)
  if (holder === undefined && !isPortBusy(apiPort)) return
  process.stderr.write(describePortInUse({ port: apiPort, host: '127.0.0.1', pid: holder, platform: process.platform }))
  process.exit(1)
}

/** `pnpm build:core`。**同步等它结束**：两侧都要 `dist` 在位才起得来 */
const buildCore = (): Promise<void> =>
  new Promise((resolve, reject) => {
    process.stdout.write(`${DIM}先构建 core（两侧都要 dist —— exports 里那个 development 条件在 Node 下不启用）${RESET}\n`)
    // pnpm 在 Windows 上是 `.CMD`，只有走 shell 才认；这一步是一次性的、不需要信号转发，
    // 所以 `shell: true` 在这里没有上面那个代价
    const build = spawn('pnpm', ['--filter', '@ikenxuan/amagi', 'run', 'build'], {
      cwd: WEB_ROOT,
      stdio: 'inherit',
      shell: true
    })
    build.on('error', reject)
    build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build:core 失败（退出码 ${code}）`))))
  })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    process.stdout.write(`\n${DIM}收到 ${signal}，两侧一起停${RESET}\n`)
    shutdown(0)
  })
}

// 参数原样透传给 server —— 需要参数的只有这一侧
const forwarded = process.argv.slice(2)
const apiPort = apiPortOf(forwarded)

// 端口检查在构建**之前**：构建要几秒、刷几十行日志，而端口被占是必然失败的
preflight(apiPort)

try {
  await buildCore()
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}

// server 先起：Vite 的代理目标是它，先起来能少一次「界面已经在拉数据而 API 还没监听」的失败。
// `AMAGI_CONSOLE_API_PORT` 同时是给 server 的信号「浏览器侧我起了」，它据此不再打
// 「浏览器界面另一个进程」那句话
start('[server]', CYAN, TSX_BIN, ['watch', join(WEB_ROOT, 'server', 'index.ts'), ...forwarded], {
  AMAGI_CONSOLE_API_PORT: String(apiPort)
})
// 同一个变量在 Vite 那侧是代理目标端口（`vite.config.ts` 读它）
start('[web]   ', MAGENTA, VITE_BIN, [], { AMAGI_CONSOLE_API_PORT: String(apiPort) })
