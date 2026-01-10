/**
 * 快手 HTTP 路由模块
 *
 * 提供快手 API 的 HTTP 路由处理
 *
 * @module platform/kuaishou/routes
 */

import { createKuaishouValidationMiddleware } from 'amagi/middleware/validation'
import { fetchKuaishouInternal } from 'amagi/model/fetchers/kuaishou/internal'
import { getKuaishouDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { handleError } from 'amagi/utils/errors'
import { KuaishouMethodType } from 'amagi/validation'
import { KuaishouMethodRoutes } from 'amagi/validation/kuaishou'
import express from 'express'

/**
 * 创建快手路由处理器
 * @param methodType - 快手方法类型
 * @param cookie - Cookie字符串
 * @param requestConfig - 可选的请求配置
 * @returns Express路由处理器
 */
const createKuaishouRouteHandler = <T extends KuaishouMethodType> (
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig = getKuaishouDefaultConfig(cookie)
) => {
  return async (req: any, res: any) => {
    try {
      const result = await fetchKuaishouInternal(methodType, req.validatedParams, {
        cookie,
        requestConfig
      })
      res.json({
        ...result,
        requestPath: req.originalUrl
      })
    } catch (error) {
      const errorResponse = handleError(error)
      res.status(errorResponse.code || 500).json({
        ...errorResponse,
        requestPath: req.originalUrl
      })
    }
  }
}

/**
 * 创建快手路由
 * @param cookie - 快手Cookie
 * @param requestConfig - 可选的请求配置
 * @returns Express路由器
 */
export const createKuaishouRoutes = (cookie: string, requestConfig: RequestConfig = getKuaishouDefaultConfig(cookie)): express.Router => {
  const router = express.Router()

  for (const [method, path] of Object.entries(KuaishouMethodRoutes)) {
    router.get(path,
      createKuaishouValidationMiddleware(method as KuaishouMethodType),
      createKuaishouRouteHandler(method as KuaishouMethodType, cookie, requestConfig)
    )
  }

  return router
}
