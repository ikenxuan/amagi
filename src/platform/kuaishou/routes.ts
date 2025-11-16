import { createKuaishouValidationMiddleware } from 'amagi/middleware/validation'
import { getKuaishouData } from 'amagi/model/DataFetchers'
import { getKuaishouDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { KuaishouDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { KuaishouMethodType, Result } from 'amagi/validation'
import { KuaishouMethodRoutes } from 'amagi/validation/kuaishou'
import express from 'express'

/**
 * 创建快手路由处理器
 * @param dataFetcher - 快手数据获取函数
 * @param methodType - 快手方法类型
 * @param cookie - Cookie字符串
 * @returns Express路由处理器
 */
const createKuaishouRouteHandler = <T extends KuaishouMethodType> (
  dataFetcher: <K extends KuaishouMethodType>(
    methodType: K,
    options?: Omit<KuaishouDataOptionsMap[K]['opt'], 'methodType'>,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<KuaishouDataOptionsMap[T]['data']>>,
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig = getKuaishouDefaultConfig(cookie)
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
      createKuaishouRouteHandler(getKuaishouData, method as KuaishouMethodType, cookie, requestConfig)
    )
  }

  return router
}
