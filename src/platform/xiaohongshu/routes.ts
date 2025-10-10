import { createXiaohongshuValidationMiddleware } from 'amagi/middleware/validation'
import { getXiaohongshuData } from 'amagi/model/DataFetchers'
import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { ApiResponse, XiaohongshuMethodType } from 'amagi/validation'
import { Router } from 'express'
import { getXiaohongshuDefaultConfig } from 'amagi/platform/defaultConfigs'

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
export const createXiaohongshuRoutes = (cookie: string, requestConfig: RequestConfig = getXiaohongshuDefaultConfig(cookie)): Router => {
  const router = Router()

  // 首页推荐数据
  router.get('/fetch_home_feed',
    createXiaohongshuValidationMiddleware('首页推荐数据'),
    createXiaohongshuRouteHandler(getXiaohongshuData, '首页推荐数据', cookie, requestConfig)
  )

  // 单个笔记数据
  router.get('/fetch_one_note',
    createXiaohongshuValidationMiddleware('单个笔记数据'),
    createXiaohongshuRouteHandler(getXiaohongshuData, '单个笔记数据', cookie, requestConfig)
  )

  // 评论数据
  router.get('/fetch_note_comments',
    createXiaohongshuValidationMiddleware('评论数据'),
    createXiaohongshuRouteHandler(getXiaohongshuData, '评论数据', cookie, requestConfig)
  )

  // 用户数据
  router.get('/fetch_user_profile',
    createXiaohongshuValidationMiddleware('用户数据'),
    createXiaohongshuRouteHandler(getXiaohongshuData, '用户数据', cookie, requestConfig)
  )

  // 用户笔记数据
  router.get('/fetch_user_notes',
    createXiaohongshuValidationMiddleware('用户笔记数据'),
    createXiaohongshuRouteHandler(getXiaohongshuData, '用户笔记数据', cookie, requestConfig)
  )

  // 表情列表
  router.get('/fetch_emoji_list',
    createXiaohongshuValidationMiddleware('表情列表'),
    createXiaohongshuRouteHandler(getXiaohongshuData, '表情列表', cookie, requestConfig)
  )

  // 搜索笔记
  router.get('/fetch_search_notes',
    createXiaohongshuValidationMiddleware('搜索笔记'),
    createXiaohongshuRouteHandler(getXiaohongshuData, '搜索笔记', cookie, requestConfig)
  )

  return router
}