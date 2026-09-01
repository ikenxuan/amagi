import { Router, type Request, type Response } from 'express'

import type { ClientCtx } from '../client/fetcher'
import { callEndpoint } from '../client/fetcher'
import type { Registry } from '../contracts/endpoint'
import type { Platform } from '../contracts/platform'
import type { AmagiResult } from '../contracts/result'

/**
 * 从端点注册表派生 Express 路由。
 *
 * 一个端点一份声明，路由是派生物之一：`route` 字段就是 Express 路径。
 * 两条硬约束：
 * 1. **同平台内路由路径必须唯一**。重复路由在 `createRoutes` 调用时**同步抛错**，
 *    不等请求进来 —— 这是 `#47/#48/#54` 的根治点：v6 里 5 个 methodType 共用
 *    `/fetch_one_work`，Express 只会命中第一个注册的，其余 4 个通过 HTTP 不可达
 *    （KNOWN-DEFECT 有测试锁死这个错误行为，v7 在注册时就拒绝）。
 * 2. **所有路由注册为 GET**，与 v6 一致（v6 各平台的 routes.ts 全注册为 GET）。
 *
 * 每个路由的处理逻辑：query 参数 → 端点自己的 zod schema 校验（在管线里）→
 * callEndpoint 走与 fetcher 同一条执行路径 → JSON 信封，附 requestPath
 * 兼容 v6 的响应形状。
 *
 * @param platform - 平台
 * @param registry - 该平台的端点注册表
 * @param ctx - 客户端上下文（含绑定 cookie 与 transport 的 send）
 * @returns Express 路由器
 */
export const createRoutes = (platform: Platform, registry: Registry, ctx: ClientCtx): Router => {
  // 唯一性校验：同平台内 route 不能重复，重复即抛错（修 #47/#48/#54）
  const seen = new Map<string, string>()
  for (const [endpoint, def] of Object.entries(registry)) {
    const existing = seen.get(def.route)
    if (existing !== undefined) {
      throw new Error(
        `路由注册失败：端点「${endpoint}」的 route「${def.route}」与端点「${existing}」重复，` +
          '同平台内 route 必须唯一，否则 Express 只会命中第一个注册的处理函数'
      )
    }
    seen.set(def.route, endpoint)
  }

  const router = Router()

  for (const def of Object.values(registry)) {
    router.get(def.route, async (req: Request, res: Response) => {
      // Express 会把多值 query 解析成数组，取最后一个（与 v6 中间件行为一致）
      const params: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(req.query)) {
        params[key] = Array.isArray(value) ? value[value.length - 1] : value
      }

      const result: AmagiResult<unknown> = await callEndpoint(def, { ...ctx, platform }, params)
      res.json({ ...result, requestPath: req.originalUrl })
    })
  }

  return router
}

/**
 * 取某个 registry 的所有路由路径。
 * @param registry - 端点注册表
 * @returns 路由路径数组
 */
export const routePathsOf = (registry: Registry): string[] => Object.values(registry).map((def) => def.route)