import { createKuaishouValidationMiddleware } from 'amagi/middleware/validation'
import { getKuaishouData } from 'amagi/model/DataFetchers'
import { RequestConfig } from 'amagi/server'
import { KuaishouDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { ApiResponse, KuaishouMethodType } from 'amagi/validation'
import { Router } from 'express'
import { getKuaishouDefaultConfig } from 'amagi/platform/defaultConfigs'

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
  ) => Promise<ApiResponse<KuaishouDataOptionsMap[T]['data']>>,
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
export const createKuaishouRoutes = (cookie: string, requestConfig: RequestConfig = getKuaishouDefaultConfig(cookie)): Router => {
  const router = Router()

  // 单个视频作品数据
  router.get('/fetch_one_work',
    createKuaishouValidationMiddleware('单个视频作品数据'),
    createKuaishouRouteHandler(getKuaishouData, '单个视频作品数据', cookie, requestConfig)
  )

  // 评论数据
  router.get('/fetch_work_comments',
    createKuaishouValidationMiddleware('评论数据'),
    createKuaishouRouteHandler(getKuaishouData, '评论数据', cookie, requestConfig)
  )

  // Emoji数据
  router.get('/fetch_emoji_list',
    createKuaishouValidationMiddleware('Emoji数据'),
    createKuaishouRouteHandler(getKuaishouData, 'Emoji数据', cookie, requestConfig)
  )

  return router
}