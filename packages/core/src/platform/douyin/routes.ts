/**
 * 抖音 HTTP 路由（阶段 6 起从 v7 registry 派生）。
 *
 * 曾经的实现：`DouyinMethodRoutes` 表逐条挂 handler，走 v6 的
 * `fetchDouyinInternal`（校验中间件 + getdata + internal 双判定）。
 * 阶段 6 把路由面改道 v7 执行管线：`createRoutes` 从 `douyinRegistry`
 * 派生，路径唯一性在注册期校验（修 #47/#48/#54），参数校验 / 判定 /
 * 归一化全部发生在管线里 —— 与 fetcher 共用同一条执行路径。
 *
 * 对外签名不变：`createDouyinRoutes(cookie, requestConfig?)`。
 * HTTP 表面变化见 06-migration.md「新增 HTTP 路径」：`/fetch_one_work`
 * 现在只服务 parseWork，其余 4 个作品 methodType（videoWork /
 * imageAlbumWork / slidesWork / textWork）各自独立成新路径
 * （v6 里它们注册在 `/fetch_one_work` 下但被 parseWork 遮蔽、HTTP 不可达）。
 *
 * @module platform/douyin/routes
 */

import { Router } from 'express'

import { makeClientCtx } from '../../client/runtime'
import type { RequestConfig } from '../../contracts/request'
import { douyinRegistry } from '../../platforms/douyin/endpoints'
import { createRoutes } from '../../server/routes'
import { getDouyinDefaultConfig } from '../defaultConfigs'

/**
 * 创建抖音路由
 * @param cookie - 抖音Cookie
 * @param requestConfig - 可选的请求配置（默认取 v6 的抖音默认配置）
 * @returns Express路由器
 */
export const createDouyinRoutes = (cookie: string, requestConfig: RequestConfig = getDouyinDefaultConfig(cookie)): Router => {
  return createRoutes('douyin', douyinRegistry, makeClientCtx('douyin', cookie, requestConfig, 'routes-douyin'))
}
