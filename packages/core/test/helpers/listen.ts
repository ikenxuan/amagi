/**
 * 测试用的「起一台服务、拿到 base URL」辅助。
 *
 * 三个 server 测试文件（`routes.test.ts` / `v7-routes.test.ts` /
 * `openapi-route.test.ts`）原先各自抄了一份同样的 6 行，且都带着两个坑：
 *
 * 1. **端口兜底成 0。** 原写法是
 *    `const port = typeof address === 'object' && address ? address.port : 0`
 *    —— `address()` 返回 `null`（服务没在监听）时 base 变成 `http://127.0.0.1:0`，
 *    于是报错现场是 `fetch` 抛的 `TypeError: fetch failed / Caused by: bad port`，
 *    栈指向发请求的那一行，与真正的原因（拿不到端口）毫无关系。这里改成**直接抛**，
 *    错误就落在成因上。
 * 2. **模块级 `server` 单例 + `afterEach` 共读共写。** 一条用例里调两次
 *    `listen` 就会把第一台服务的句柄冲掉、永远关不上（`openapi-route.test.ts`
 *    为此手写过一个 `closeCurrentServer()` 绕过去）；共享可变状态本身也招竞态。
 *    这里改成**每次调用各自持有句柄**：返回 `{ base, close }`，
 *    并由 {@link closeAllServers} 在 `afterEach` 里兜底关掉没显式关的那些。
 */
import { createServer, type Server } from 'node:http'
import type { RequestListener } from 'node:http'

/** 一台起好的测试服务 */
export interface ListeningServer {
  /** 形如 `http://127.0.0.1:54321`，可直接拼路径 */
  base: string
  /** 关掉这台服务；重复调用是安全的（幂等） */
  close: () => Promise<void>
  /** 底层 server 句柄，需要断言连接数之类的场合用 */
  server: Server
}

/** 本进程内还没关掉的服务，供 {@link closeAllServers} 兜底 */
const open = new Set<ListeningServer>()

/**
 * 在随机端口上起一台 HTTP 服务。
 *
 * 端口取 `0` 让内核分配，避免测试之间抢固定端口；拿不到端口就抛，
 * **不再兜底成 0**（见本文件头部第 1 条）。
 * @param handler - Express 应用或任意 `RequestListener`
 * @returns base URL、关闭函数与底层句柄
 */
export const listenOnRandomPort = async (handler: RequestListener): Promise<ListeningServer> => {
  const server = createServer(handler)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (typeof address !== 'object' || address === null) {
    // 兜底成 0 会把这个事实伪装成 `fetch` 的 `bad port`，那是最难查的一种绿转红
    await new Promise<void>((resolve) => server.close(() => resolve()))
    throw new Error(`listen 之后拿不到端口：server.address() 返回 ${JSON.stringify(address)}`)
  }

  let closed = false
  const entry: ListeningServer = {
    base: `http://127.0.0.1:${address.port}`,
    close: async () => {
      if (closed) return
      closed = true
      open.delete(entry)
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
    server
  }
  open.add(entry)
  return entry
}

/**
 * 关掉本文件起过、还没显式关的所有服务。
 *
 * 挂在 `afterEach` 上做兜底 —— 用例中途断言失败时它的 `close()` 不会执行，
 * 漏一台服务就是一个悬空 handle（vitest 会卡在退出前等它）。
 * @returns 全部关闭后 resolve
 */
export const closeAllServers = async (): Promise<void> => {
  await Promise.all([...open].map((entry) => entry.close()))
}
