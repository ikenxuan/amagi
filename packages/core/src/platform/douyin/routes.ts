/**
 * 抖音 HTTP 路由。
 *
 * `createRoutes` 从 `douyinRegistry` 派生，路径唯一性在注册期校验，
 * 参数校验 / 判定 / 归一化全部发生在管线里 —— 与 fetcher 共用同一条
 * 执行路径。
 *
 * `/fetch_one_work` 只服务 parseWork，其余 4 个作品 methodType
 * （videoWork / imageAlbumWork / slidesWork / textWork）各自独立成路径。
 *
 * 对外签名：`createDouyinRoutes(cookie, requestConfig?)`。
 *
 * @module platform/douyin/routes
 */

import { Router } from 'express'

import { makeClientCtx } from '../../client/runtime'
import type { RequestConfig } from '../../contracts/request'
import { douyinRegistry } from '../../platforms/douyin/endpoints'
import { createRoutes } from '../../server/routes'

/**
 * 创建抖音路由
 * @param cookie - 抖音Cookie
 * @param requestConfig - 可选的请求配置（缺省时由运行期装配平台默认基线，见 client/runtime.ts）
 * @returns Express路由器
 */
export const createDouyinRoutes = (cookie: string, requestConfig?: RequestConfig): Router => {
  return createRoutes('douyin', douyinRegistry, makeClientCtx('douyin', cookie, requestConfig, 'routes-douyin'))
}
