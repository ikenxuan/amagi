import { createBilibiliValidationMiddleware } from 'amagi/middleware/validation'
import { getBilibiliData } from 'amagi/model/DataFetchers'
import { getBilibiliDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { BilibiliDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { BilibiliMethodType, Result } from 'amagi/validation'
import { BilibiliMethodRoutes } from 'amagi/validation/bilibili'
import express from 'express'

/**
 * 创建B站路由处理器
 * @param dataFetcher - B站数据获取函数
 * @param methodType - B站方法类型
 * @param cookie - Cookie字符串
 * @returns Express路由处理器
 */
const createBilibiliRouteHandler = <T extends BilibiliMethodType> (
  dataFetcher: <K extends BilibiliMethodType>(
    methodType: K,
    options?: Omit<BilibiliDataOptionsMap[K]['opt'], 'methodType'>,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<BilibiliDataOptionsMap[T]['data']>>,
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig = getBilibiliDefaultConfig(cookie)
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
      createBilibiliRouteHandler(getBilibiliData, method as BilibiliMethodType, cookie, requestConfig)
    )
  }

  return router
}
