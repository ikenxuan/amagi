/**
 * `server/port.ts` —— 端口被占用时那段提示。
 *
 * 只测两个纯函数（`killCommandFor` / `describePortInUse`）。`findPortHolder` 要 spawn
 * `netstat` / `lsof`，那是**平台相关的不纯操作**，放进单元测试里等于把 CI 的行为绑在
 * 宿主系统上（Linux 容器里通常没有 `lsof`）—— 它的契约只有一条「绝不抛」，
 * 而那一条靠的是整个函数体裹在 try/catch 里，读代码比测它更可靠。
 *
 * 为什么这段提示值得测：它是**一次性故障时唯一的向导**，而一次性故障的特点是
 * 「人当时正忙着别的事」。命令写错一个字（`taskkill` 少了 `/F`、`lsof` 少了 `-t`）
 * 的后果不是报错，是那条命令看着执行成功、端口还占着。
 */

import { describe, expect, it } from 'vitest'

import { describePortInUse, killCommandFor } from '../server/port'

describe('killCommandFor', () => {
  it('Windows 有 PID 时给 taskkill /F —— 被调试器挂住的进程不响应普通终止', () => {
    expect(killCommandFor('win32', 7345, 39336)).toBe('taskkill /PID 39336 /F')
  })

  it('Windows 没 PID 时给「先查再杀」两步，而不是只说一句「换个端口」', () => {
    const command = killCommandFor('win32', 7345)
    expect(command).toContain('netstat -ano')
    expect(command).toContain(':7345')
    expect(command).toContain('taskkill')
    expect(command).toContain('/F')
  })

  it('macOS / Linux 有 PID 时给 kill -9', () => {
    expect(killCommandFor('darwin', 7345, 812)).toBe('kill -9 812')
    expect(killCommandFor('linux', 7345, 812)).toBe('kill -9 812')
  })

  it('macOS / Linux 没 PID 时走 lsof -ti，`-t` 不能少 —— 少了它输出喂不进 kill', () => {
    const command = killCommandFor('darwin', 7345)
    expect(command).toBe('lsof -ti tcp:7345 | xargs kill -9')
  })

  it('认不出的平台回落到 POSIX 那套，而不是回空串', () => {
    expect(killCommandFor('freebsd', 7345, 99)).toBe('kill -9 99')
  })

  it('端口原样进命令，不做任何改写', () => {
    expect(killCommandFor('win32', 65535, 1)).toContain('/PID 1 /F')
    expect(killCommandFor('linux', 1024)).toContain('tcp:1024')
  })
})

describe('describePortInUse', () => {
  const win = { port: 7345, host: '127.0.0.1', pid: 39336, platform: 'win32' as const }

  it('上下各留一个空行 —— 它出现在一大段构建日志之后，不留白会被当成又一行日志', () => {
    const lines = describePortInUse(win).split('\n')
    expect(lines[0]).toBe('')
    expect(lines[lines.length - 1]).toBe('')
  })

  it('四周有框，且每一行右边框对齐（CJK 按两列算）', () => {
    const lines = describePortInUse(win).split('\n').slice(1, -1)
    expect(lines[0].startsWith('╭')).toBe(true)
    expect(lines[lines.length - 1].startsWith('╰')).toBe(true)
    // 所有行的**目视**长度一致。这一条是 `displayWidth` 存在的理由：
    // 按 `String.length` 算的话中文行会短一截，右边框参差不齐
    const widths = new Set(lines.map((line) => [...line].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 0x2e7f ? 2 : 1), 0)))
    expect(widths.size).toBe(1)
  })

  it('带上真实 PID 与可直接粘贴的命令', () => {
    const text = describePortInUse(win)
    expect(text).toContain('PID 39336')
    expect(text).toContain('taskkill /PID 39336 /F')
  })

  it('查不到 PID 时不假装知道，改给「先查再杀」', () => {
    const text = describePortInUse({ ...win, pid: undefined })
    expect(text).toContain('没查出是谁占着')
    expect(text).not.toContain('PID undefined')
    expect(text).toContain('netstat -ano')
  })

  it('解释幽灵进程，并点名 VSCode auto attach —— 那是最常见的成因', () => {
    const text = describePortInUse(win)
    expect(text).toContain('幽灵进程')
    expect(text).toContain('auto attach')
    expect(text).toContain('--inspect')
    expect(text).toContain('debugger')
  })

  it('给出换端口这条退路，端口号是当前端口 +1', () => {
    expect(describePortInUse(win)).toContain('pnpm console --port 7346')
  })

  it('平台跟着参数走，不读 process.platform', () => {
    expect(describePortInUse({ ...win, platform: 'darwin' })).toContain('kill -9 39336')
    expect(describePortInUse({ ...win, platform: 'darwin' })).not.toContain('taskkill')
  })

  it('host 原样出现 —— 绑局域网时人要看到自己绑的是哪个地址', () => {
    expect(describePortInUse({ ...win, host: '0.0.0.0' })).toContain('0.0.0.0:7345')
  })
})
