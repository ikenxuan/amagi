import { createDouyinValidationMiddleware } from 'amagi/middleware/validation'
import { getDouyinData } from 'amagi/model/DataFetchers'
import { getDouyinDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { DouyinDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { ApiResponse, DouyinMethodType } from 'amagi/validation'
import { DouyinMethodRoutes } from 'amagi/validation/douyin'
import express from 'express'

/**
 * 创建抖音路由处理器
 * @param dataFetcher - 抖音数据获取函数
 * @param methodType - 抖音方法类型
 * @param cookie - Cookie字符串
 * @param requestConfig - 可选的请求配置
 * @returns Express路由处理器
 */
const createDouyinRouteHandler = <T extends DouyinMethodType> (
  dataFetcher: <K extends DouyinMethodType>(
    methodType: K,
    options?: Omit<DouyinDataOptionsMap[K]['opt'], 'methodType'>,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<ApiResponse<DouyinDataOptionsMap[T]['data']>>,
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig = getDouyinDefaultConfig(cookie)
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
 * 创建抖音路由
 * @param cookie - 抖音Cookie
 * @param requestConfig - 可选的请求配置
 * @returns Express路由器
 */
export const createDouyinRoutes = (cookie: string, requestConfig: RequestConfig = getDouyinDefaultConfig(cookie)): express.Router => {
  const router = express.Router()

  for (const [method, path] of Object.entries(DouyinMethodRoutes)) {
    router.get(path,
      createDouyinValidationMiddleware(method as DouyinMethodType),
      createDouyinRouteHandler(getDouyinData, method as DouyinMethodType, cookie, requestConfig)
    )
  }

  return router
}
