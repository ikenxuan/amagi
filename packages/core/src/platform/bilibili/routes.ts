/**
 * B站 HTTP 路由（阶段 6 起从 v7 registry 派生）。
 *
 * 曾经的实现：`BilibiliMethodRoutes` 表逐条挂 handler，走 v6 的
 * `fetchBilibiliInternal`（校验中间件 + getdata + internal 双判定）。
 * 阶段 6 把路由面改道 v7 执行管线：`createRoutes` 从 `bilibiliRegistry`
 * 派生，路径唯一性在注册期校验，参数校验 / 判定 / 归一化全部发生在
 * 管线里 —— 与 fetcher 共用同一条执行路径。
 *
 * 对外签名不变：`createBilibiliRoutes(cookie, requestConfig?)`。
 *
 * @module platform/bilibili/routes
 */

import { Router } from 'express'

import { makeClientCtx } from '../../client/runtime'
import type { RequestConfig } from '../../contracts/request'
import { bilibiliRegistry } from '../../platforms/bilibili/endpoints'
import { createRoutes } from '../../server/routes'
import { getBilibiliDefaultConfig } from '../defaultConfigs'

/**
 * 创建B站路由
 * @param cookie - B站Cookie
 * @param requestConfig - 可选的请求配置（默认取 v6 的 B站默认配置）
 * @returns Express路由器
 */
export const createBilibiliRoutes = (cookie: string, requestConfig: RequestConfig = getBilibiliDefaultConfig(cookie)): Router => {
  return createRoutes('bilibili', bilibiliRegistry, makeClientCtx('bilibili', cookie, requestConfig, 'routes-bilibili'))
}
