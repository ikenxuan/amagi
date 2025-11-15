import { createXiaohongshuValidationMiddleware } from 'amagi/middleware/validation'
import { getXiaohongshuData } from 'amagi/model/DataFetchers'
import { getXiaohongshuDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { ApiResponse, XiaohongshuMethodType } from 'amagi/validation'
import { XiaohongshuMethodRoutes } from 'amagi/validation/xiaohongshu'
import express from 'express'

/**
 * 创建小红书路由处理器
 * @param dataFetcher - 小红书数据获取函数
 * @param methodType - 小红书方法类型
 * @param cookie - Cookie字符串
 * @param requestConfig - 可选的请求配置
 * @returns Express路由处理器
 */
const createXiaohongshuRouteHandler = <T extends XiaohongshuMethodType> (
  dataFetcher: <K extends XiaohongshuMethodType>(
    methodType: K,
    options?: Omit<XiaohongshuDataOptionsMap[K]['opt'], 'methodType'>,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<ApiResponse<XiaohongshuDataOptionsMap[T]['data']>>,
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig = getXiaohongshuDefaultConfig(cookie)
) => {
  return async (req: any, res: any) => {
    try {
      const result = await dataFetcher(methodType, req.validatedParams, cookie, requestConfig)
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
 * 创建小红书路由
 * @param cookie - 小红书Cookie
 * @param requestConfig - 可选的请求配置
 * @returns Express路由器
 */
export const createXiaohongshuRoutes = (cookie: string, requestConfig: RequestConfig = getXiaohongshuDefaultConfig(cookie)): express.Router => {
  const router = express.Router()

  for (const [method, path] of Object.entries(XiaohongshuMethodRoutes)) {
    router.get(path,
      createXiaohongshuValidationMiddleware(method as XiaohongshuMethodType),
      createXiaohongshuRouteHandler(getXiaohongshuData, method as XiaohongshuMethodType, cookie, requestConfig)
    )
  }

  return router
}
