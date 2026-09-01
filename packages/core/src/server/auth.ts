import type { NextFunction, Request, Response, Router } from 'express'
import express from 'express'

/**
 * 可选 token 鉴权 + startServer。
 *
 * v6 的 `startServer` 没有任何鉴权（KNOWN-DEFECT 有一条测试锁死这个行为：
 * 「无需凭证即可用运营者的 cookie 代理请求」）。v7 保持默认行为一致，
 * 但新增可选 `token` 参数：传了 `token` 则无 token 请求返回 401，不传则
 * 行为完全不变 —— 这就是「不破坏」的判据。
 *
 * `host` 默认仍是 `'::'`（v6 的 `app.listen(port, '::')`），但启动时**额外
 * 打印一次警告**：监听在 `::` 上意味着同时暴露公网 IPv4/IPv6，v8 才会改默认值。
 */

/** `startServer` 的选项 */
export interface StartServerOptions {
  /** 监听端口，默认 4567（与 v6 一致） */
  port?: number
  /** 监听地址，默认 `'::'`（与 v6 一致），启动时打印一次警告 */
  host?: string
  /** 可选 token。传了则没有 `Authorization: Bearer <token>` 的请求返 401 */
  token?: string
  /** 要挂载的路由：`{ path, router }` 列表，如 `{ path: '/api/v7/douyin', router }` */
  routers?: Array<{ path: string; router: Router }>
  /**
   * 测试注入用：替代真实的 `app.listen`。默认实现会真正监听端口。
   * @param app - Express 应用
   * @param port - 端口
   * @param host - 监听地址
   */
  listen?: (app: express.Application, port: number, host: string) => void
}

/**
 * `host` 为默认值 `'::'` 时的警告文案。
 *
 * 抽成纯函数是为了能单测：警告逻辑与 startServer 的 listen 时序解耦。
 * 返回 `undefined` 表示不需要警告。
 * @param host - 监听地址
 * @returns 警告文案；不需要警告时返回 `undefined`
 */
export const hostWarningMessage = (host: string): string | undefined =>
  host === '::'
    ? `[amagi] ⚠️ startServer 默认监听 '::'（公网 IPv4/IPv6 双栈），` +
      `请显式传 host: '127.0.0.1' 或 'localhost' 限制访问范围（v8 将改默认值）。`
    : undefined

/**
 * 可选 token 校验中间件。
 *
 * 不传 token 时是直通中间件（行为与 v6 完全一致）；传了 `token` 时检查
 * `Authorization: Bearer <token>`，缺失或不匹配直接 401。
 * @param token - 可选 token 字符串
 * @returns Express 中间件
 */
export const authMiddleware = (token?: string): ((req: Request, res: Response, next: NextFunction) => void) => {
  if (!token) return (_req, _res, next) => next()
  return (req, res, next) => {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ') || header.slice('Bearer '.length) !== token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'token 无效或缺失' } })
      return
    }
    next()
  }
}

/**
 * 启动本地 HTTP 服务。
 *
 * 行为与 v6 `createAmagiClient().startServer` 对齐：
 * - 默认端口 4567、默认监听地址 `'::'`（v6 的 `app.listen(port, '::')`）。
 * - JSON 请求体解析 + 根路径 /docs 重定向（与 v6 一致）。
 * - **新增**：可选 token 鉴权；`host` 为默认值 `'::'` 时启动后打印一次警告。
 *
 * 返回 Express 应用实例（v6 也是返回 app），调用方拿到后可以继续挂路由。
 * @param options - 启动选项
 * @returns Express 应用实例（尚未 listen，由本函数内部完成 listen）
 */
export const startServer = (options: StartServerOptions = {}): express.Application => {
  const port = options.port ?? 4567
  const host = options.host ?? '::'
  const token = options.token

  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // 根路径重定向到文档（与 v6 一致）
  app.get('/', (_req, res) => res.redirect(301, 'https://amagi.apifox.cn'))
  app.get('/docs', (_req, res) => res.redirect(301, 'https://amagi.apifox.cn'))

  // 可选 token 鉴权：不传 token 时直通，与 v6 行为一致
  app.use(authMiddleware(token))

  // 挂载调用方传入的路由（v7 的 registry 派生路由在这里接入）
  for (const { path, router } of options.routers ?? []) {
    app.use(path, router)
  }

  const doListen = options.listen ?? ((target, p, h) => target.listen(p, h, () => undefined))
  doListen(app, port, host)

  const warning = hostWarningMessage(host)
  if (warning) console.warn(warning)

  return app
}