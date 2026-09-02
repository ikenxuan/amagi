/**
 * 快手 HTTP 路由（阶段 6 起从 v7 registry 派生）。
 *
 * 曾经的实现：`KuaishouMethodRoutes` 表逐条挂 handler，走 v6 的
 * `fetchKuaishouInternal`（校验中间件 + getdata + internal 双判定）。
 * 阶段 6 把路由面改道 v7 执行管线：`createRoutes` 从 `kuaishouRegistry`
 * 派生，路径唯一性在注册期校验，参数校验 / 判定 / 归一化全部发生在
 * 管线里 —— 与 fetcher 共用同一条执行路径。
 *
 * 对外签名不变：`createKuaishouRoutes(cookie, requestConfig?)`。
 *
 * @module platform/kuaishou/routes
 */

import { Router } from 'express'

import { makeClientCtx } from '../../client/runtime'
import type { RequestConfig } from '../../contracts/request'
import { kuaishouRegistry } from '../../platforms/kuaishou/endpoints'
import { createRoutes } from '../../server/routes'
import { getKuaishouDefaultConfig } from '../defaultConfigs'

/**
 * 创建快手路由
 * @param cookie - 快手Cookie
 * @param requestConfig - 可选的请求配置（默认取 v6 的快手默认配置）
 * @returns Express路由器
 */
export const createKuaishouRoutes = (cookie: string, requestConfig: RequestConfig = getKuaishouDefaultConfig(cookie)): Router => {
  return createRoutes('kuaishou', kuaishouRegistry, makeClientCtx('kuaishou', cookie, requestConfig, 'routes-kuaishou'))
}
