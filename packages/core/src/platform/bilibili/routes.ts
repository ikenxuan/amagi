/**
 * B站 HTTP 路由模块
 *
 * 提供 B站 API 的 HTTP 路由处理
 *
 * @module platform/bilibili/routes
 */

import { createBilibiliValidationMiddleware } from 'amagi/middleware/validation'
import { fetchBilibiliInternal } from 'amagi/model/fetchers/bilibili/internal'
import { getBilibiliDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { handleError } from 'amagi/utils/errors'
import { BilibiliMethodType } from 'amagi/validation'
import { BilibiliMethodRoutes } from 'amagi/validation/bilibili'
import express from 'express'

/**
 * 创建B站路由处理器
 * @param methodType - B站方法类型
 * @param cookie - Cookie字符串
 * @param requestConfig - 可选的请求配置
 * @returns Express路由处理器
 */
const createBilibiliRouteHandler = <T extends BilibiliMethodType> (
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig = getBilibiliDefaultConfig(cookie)
) => {
  return async (req: any, res: any) => {
    try {
      const result = await fetchBilibiliInternal(methodType, req.validatedParams, {
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
 * 创建B站路由
 * @param cookie - B站Cookie
 * @param requestConfig - 可选的请求配置
 * @returns Express路由器
 */
export const createBilibiliRoutes = (cookie: string, requestConfig: RequestConfig = getBilibiliDefaultConfig(cookie)): express.Router => {
  const router = express.Router()

  for (const [method, path] of Object.entries(BilibiliMethodRoutes)) {
    router.get(path,
      createBilibiliValidationMiddleware(method as BilibiliMethodType),
      createBilibiliRouteHandler(method as BilibiliMethodType, cookie, requestConfig)
    )
  }

  return router
}
