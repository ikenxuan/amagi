/**
 * 「端口被谁占着」——查出来，并给出一条能直接粘贴执行的命令。
 *
 * 为什么值得单独一个文件：`EADDRINUSE` 是这个工具最常见的一次性故障，而它的常见成因
 * **不是「你自己起了两遍」**，是一个幽灵进程：
 *
 * - VSCode 的 auto attach 会给终端里的 node 注入 `--inspect`。这种进程收到 kill 之后
 *   不立刻退出，先打一句 `Waiting for the debugger to disconnect...` 并**继续占着端口**。
 *   在 VSCode 里「停止调试」只断开调试器，那个 node 可能已经没人管了。
 * - `tsx watch` 崩溃重启时旧 socket 偶尔没释放。
 * - 关掉终端标签页不一定杀掉子进程（Windows 上尤其）。
 *
 * 三种成因的共同点是：**任务管理器里它只是一个普通的 `node.exe`，认不出来。** 所以
 * 提示里必须带上真实 PID 和当前系统的杀进程命令 —— 让人「知道怎么查」是不够的。
 *
 * 查询与格式化分开：`findPortHolder` 要 spawn 子进程（不纯、平台相关），
 * `describePortInUse` 与 `killCommandFor` 是纯函数、有测试。
 */

import { execFileSync } from 'node:child_process'

/** 支持到什么程度：认得出的平台给精确命令，认不出的给一句人话 */
export type KnownPlatform = 'win32' | 'darwin' | 'linux'

export interface PortInUseInput {
  port: number
  host: string
  /** 查到的占用者 PID。查不到就 `undefined` —— 那时给的是「先查再杀」两步命令 */
  pid?: number
  /** `process.platform` 原样传进来，纯函数不读全局 */
  platform: string
}

/**
 * 杀掉占用者的命令。
 *
 * 拿到 PID 时给一条能直接粘的；拿不到时给「查 + 杀」两步 —— 后者仍然比「换个端口」有用。
 *
 * Windows 用 `taskkill /F`：被调试器挂住的进程不响应普通终止，`/F` 才动得了它。
 * 不加 `/T`（杀整棵树）是有意的：这里要杀的是**别人留下的**那一个进程，
 * 而它的父进程可能是终端本身 —— 连着树一起杀会把用户的终端也带走。
 */
export const killCommandFor = (platform: string, port: number, pid?: number): string => {
  if (platform === 'win32') {
    return pid === undefined
      ? `netstat -ano | findstr :${port}    然后    taskkill /PID <最后一列那个数字> /F`
      : `taskkill /PID ${pid} /F`
  }
  // macOS 与 Linux 都有 lsof，且 `-ti` 的输出正好能直接喂给 kill。
  // Linux 的 `fuser -k ${port}/tcp` 更短但不是所有发行版默认装了 psmisc
  return pid === undefined ? `lsof -ti tcp:${port} | xargs kill -9` : `kill -9 ${pid}`
}

/**
 * 查出占用某端口的 PID。**查不到就回 `undefined`，绝不抛** ——
 * 这个函数只服务于「把报错说得更清楚」，它自己失败不该盖掉原来那条 `EADDRINUSE`。
 *
 * 两个平台的解析都刻意宽松（只认「行里有 LISTEN 且含这个端口」），因为这两个命令的
 * 列宽、大小写、IPv6 写法在不同系统版本上都不一样，而严格解析失败的代价是丢掉 PID。
 */
export const findPortHolder = (port: number): number | undefined => {
  try {
    if (process.platform === 'win32') {
      // `-ano`：不解析主机名（快）、显示 PID。`netstat` 在 Windows 上一定有
      const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8', timeout: 3000, windowsHide: true })
      for (const line of out.split('\n')) {
        if (!line.includes('LISTENING')) continue
        // 本地地址那一列以 `:<port>` 结尾。`:73450` 不能命中 `:7345`，所以要连着空白一起比
        if (!/\s\S*:(\d+)\s/.test(line)) continue
        const columns = line.trim().split(/\s+/)
        const local = columns[1] ?? ''
        if (!local.endsWith(`:${port}`)) continue
        const pid = Number(columns[columns.length - 1])
        if (Number.isInteger(pid) && pid > 0) return pid
      }
      return undefined
    }
    // `-t` 只输出 PID，一行一个；多个进程共用端口时取第一个
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8', timeout: 3000 })
    const pid = Number(out.trim().split('\n')[0])
    return Number.isInteger(pid) && pid > 0 ? pid : undefined
  } catch {
    // 命令不存在、超时、没权限、什么都没匹配上 —— 一律当「查不到」
    return undefined
  }
}

/**
 * 端口现在是不是被占着。
 *
 * 与 `findPortHolder` 分开是因为两者会在不同情况下失败：**查不到 PID 不等于端口空着**
 * （容器里没 `lsof`、Windows 上没权限看别人的进程都会让 PID 查询回 `undefined`）。
 * 这个函数只回答「能不能绑上」，判据就是真去绑一次 —— 那与 `server.listen` 用的是同一条路。
 */
export const isPortBusy = (port: number, host = '127.0.0.1'): boolean => {
  // 同步地问「能不能绑」没有标准 API，所以借 net 模块试一次。这在 preflight 里跑，
  // 那时还没有任何子进程，多花几毫秒无所谓
  try {
    execFileSync(
      process.execPath,
      [
        '-e',
        `const s=require('node:net').createServer();s.once('error',e=>process.exit(e.code==='EADDRINUSE'?1:0));s.once('listening',()=>s.close(()=>process.exit(0)));s.listen(${port},${JSON.stringify(host)})`
      ],
      { timeout: 3000, stdio: 'ignore', windowsHide: true }
    )
    return false
  } catch (error) {
    // 退出码 1 = EADDRINUSE。别的失败（超时、node 起不来）当「没占用」——
    // 那时交给 `server.listen` 去报真实错误，preflight 不该凭猜测拦住启动
    return (error as { status?: number }).status === 1
  }
}

/** 框线宽度。够放下最长的那条命令，又不至于在 80 列终端里折行 */
const WIDTH = 74

/** 目视宽度：CJK 与全角标点占两列，`padEnd` 按码位数算会让框线右边参差不齐 */
const displayWidth = (text: string): number => {
  let width = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    const wide =
      (code >= 0x1100 && code <= 0x115f) || // 韩文字母
      (code >= 0x2e80 && code <= 0xa4cf) || // CJK 部首 … 彝文
      (code >= 0xac00 && code <= 0xd7a3) || // 韩文音节
      (code >= 0xf900 && code <= 0xfaff) || // CJK 兼容
      (code >= 0xfe30 && code <= 0xfe6f) || // CJK 兼容形式
      (code >= 0xff00 && code <= 0xff60) || // 全角
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x3fffd) // CJK 扩展 B+
    width += wide ? 2 : 1
  }
  return width
}

/**
 * 一行内容。总目视宽度**必须正好是 `WIDTH`** —— 与上下边框一致，否则右边框歪掉。
 *
 * 算式：`│ `(2) + 文字 + 填充 + ` │`(2) = WIDTH，所以填充是 `WIDTH - 4 - 文字宽`。
 * 写错成 `WIDTH - 2 - 文字宽` 的话每行都比边框宽两列，而那在窄终端里表现为整段折行。
 */
const line = (text: string): string => `│ ${text}${' '.repeat(Math.max(0, WIDTH - 4 - displayWidth(text)))} │`

/**
 * 端口被占用时打出来的那一段。
 *
 * **上下各留一个空行、四周有框** —— 这是用户明确要的，理由也实在：它出现在一大段
 * 构建日志之后（tsdown 那几十行、Vite 的启动横幅），不圈起来会被当成又一行日志滚过去。
 *
 * 返回字符串而不是直接 `console.error`：这样它是纯函数、可测，
 * 而且调用方能决定往 stdout 还是 stderr 写。
 */
export const describePortInUse = (input: PortInUseInput): string => {
  const { port, host, pid, platform } = input
  const top = `╭${'─'.repeat(WIDTH - 2)}╮`
  const bottom = `╰${'─'.repeat(WIDTH - 2)}╯`
  const rows = [
    `${host}:${port} 已经被占用了。`,
    '',
    pid === undefined
      ? '没查出是谁占着（下面那条命令会先查再杀）：'
      : `占着它的是 PID ${pid} —— 复制这条命令杀掉它：`,
    '',
    `    ${killCommandFor(platform, port, pid)}`,
    '',
    '如果你确信自己没在跑第二个控制台，那大概是个幽灵进程：',
    'VSCode 的 auto attach 会给 node 注入 --inspect，这种进程收到终止信号',
    '之后会先「Waiting for the debugger to disconnect...」并继续占着端口，',
    '而在 VSCode 里停止调试只断开调试器、不结束它。',
    '',
    `也可以换个端口绕过去：pnpm console --port ${port + 1}`
  ]
  return ['', top, ...rows.map(line), bottom, ''].join('\n')
}
