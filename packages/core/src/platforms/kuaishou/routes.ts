/**
 * 快手 HTTP 路由。
 *
 * `createRoutes` 从 `kuaishouRegistry` 派生，路径唯一性在注册期校验，
 * 参数校验 / 判定 / 归一化全部发生在管线里 —— 与 fetcher 共用同一条执行路径。
 *
 * 对外签名：`createKuaishouRoutes(cookie, requestConfig?)`。
 *
 * @module platform/kuaishou/routes
 */

import { Router } from 'express'

import { makeClientCtx } from '../../client/runtime'
import type { RequestConfig } from '../../contracts/request'
import { createRoutes } from '../../server/routes'
import { kuaishouRegistry } from './endpoints'

/**
 * 创建快手路由
 * @param cookie - 快手Cookie
 * @param requestConfig - 可选的请求配置（缺省时由运行期装配平台默认基线，见 client/runtime.ts）
 * @returns Express路由器
 */
export const createKuaishouRoutes = (cookie: string, requestConfig?: RequestConfig): Router => {
  return createRoutes('kuaishou', kuaishouRegistry, makeClientCtx('kuaishou', cookie, requestConfig, 'routes-kuaishou'))
}
