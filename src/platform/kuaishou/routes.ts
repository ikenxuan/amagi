import { createKuaishouValidationMiddleware } from 'amagi/middleware/validation'
import { getKuaishouData } from 'amagi/model'
import { KuaishouDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { KuaishouMethodType } from 'amagi/validation'
import { Router } from 'express'

/**
 * 创建快手路由处理器
 * @param dataFetcher - 快手数据获取函数
 * @param methodType - 快手方法类型
 * @param cookie - Cookie字符串
 * @returns Express路由处理器
 */
const createKuaishouRouteHandler = <T extends KuaishouMethodType>(
  dataFetcher: <K extends KuaishouMethodType>(
    methodType: K,
    options?: Omit<KuaishouDataOptionsMap[K]['opt'], 'methodType'>,
    cookie?: string
  ) => Promise<any>,
  methodType: T,
  cookie: string
) => {
  return async (req: any, res: any) => {
    try {
      const result = await dataFetcher(methodType, req.validatedParams, cookie)
      res.json(result)
    } catch (error) {
      const errorResponse = handleError(error)
      res.status(errorResponse.code || 500).json(errorResponse)
    }
  }
}

/**
 * 创建快手路由
 * @param cookie - 快手Cookie
 * @returns Express路由器
 */
export const createKuaishouRoutes = (cookie: string): Router => {
  const router = Router()

  // 单个视频作品数据
  router.get('/fetch_one_work',
    createKuaishouValidationMiddleware('单个视频作品数据'),
    createKuaishouRouteHandler(getKuaishouData, '单个视频作品数据', cookie)
  )

  // 评论数据
  router.get('/fetch_work_comments',
    createKuaishouValidationMiddleware('评论数据'),
    createKuaishouRouteHandler(getKuaishouData, '评论数据', cookie)
  )

  // Emoji数据
  router.get('/fetch_emoji_list',
    createKuaishouValidationMiddleware('Emoji数据'),
    createKuaishouRouteHandler(getKuaishouData, 'Emoji数据', cookie)
  )

  return router
}