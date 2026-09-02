/**
 * 小红书 HTTP 路由（阶段 6 起从 v7 registry 派生）。
 *
 * 曾经的实现：`XiaohongshuMethodRoutes` 表逐条挂 handler，走 v6 的
 * `fetchXiaohongshuInternal`（校验中间件 + getdata + internal 双判定）。
 * 阶段 6 把路由面改道 v7 执行管线：`createRoutes` 从 `xiaohongshuRegistry`
 * 派生，路径唯一性在注册期校验，参数校验 / 判定 / 归一化全部发生在
 * 管线里 —— 与 fetcher 共用同一条执行路径。
 *
 * 对外签名不变：`createXiaohongshuRoutes(cookie, requestConfig?)`。
 *
 * @module platform/xiaohongshu/routes
 */

import { Router } from 'express'

import { makeClientCtx } from '../../client/runtime'
import type { RequestConfig } from '../../contracts/request'
import { xiaohongshuRegistry } from '../../platforms/xiaohongshu/endpoints'
import { createRoutes } from '../../server/routes'
import { getXiaohongshuDefaultConfig } from '../defaultConfigs'

/**
 * 创建小红书路由
 * @param cookie - 小红书Cookie
 * @param requestConfig - 可选的请求配置（默认取 v6 的小红书默认配置）
 * @returns Express路由器
 */
export const createXiaohongshuRoutes = (
  cookie: string,
  requestConfig: RequestConfig = getXiaohongshuDefaultConfig(cookie)
): Router => {
  return createRoutes('xiaohongshu', xiaohongshuRegistry, makeClientCtx('xiaohongshu', cookie, requestConfig, 'routes-xiaohongshu'))
}
