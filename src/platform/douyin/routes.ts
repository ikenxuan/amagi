import { getDouyinData } from 'amagi/model/DataFetchers'
import { createDouyinValidationMiddleware } from 'amagi/middleware/validation'
import { DouyinDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { DouyinMethodType } from 'amagi/validation'
import { Router } from 'express'
import { RequestConfig } from 'amagi/server'

/**
 * 创建抖音路由处理器
 * @param dataFetcher - 抖音数据获取函数
 * @param methodType - 抖音方法类型
 * @param cookie - Cookie字符串
 * @returns Express路由处理器
 */
const createDouyinRouteHandler = <T extends DouyinMethodType> (
  dataFetcher: <K extends DouyinMethodType>(
    methodType: K,
    options?: Omit<DouyinDataOptionsMap[K]['opt'], 'methodType'>,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<any>,
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig
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
 * @returns Express路由器
 */
export const createDouyinRoutes = (cookie: string, requestConfig: RequestConfig): Router => {
  const router = Router()

  // 聚合解析
  router.get('/fetch_one_work',
    createDouyinValidationMiddleware('聚合解析'),
    createDouyinRouteHandler(getDouyinData, '聚合解析', cookie, requestConfig)
  )

  // 视频作品数据
  router.get('/fetch_one_work',
    createDouyinValidationMiddleware('视频作品数据'),
    createDouyinRouteHandler(getDouyinData, '视频作品数据', cookie, requestConfig)
  )

  // 图集作品数据
  router.get('/fetch_one_work',
    createDouyinValidationMiddleware('图集作品数据'),
    createDouyinRouteHandler(getDouyinData, '图集作品数据', cookie, requestConfig)
  )

  // 合辑作品数据
  router.get('/fetch_one_work',
    createDouyinValidationMiddleware('合辑作品数据'),
    createDouyinRouteHandler(getDouyinData, '合辑作品数据', cookie, requestConfig)
  )

  // 评论数据
  router.get('/fetch_work_comments',
    createDouyinValidationMiddleware('评论数据'),
    createDouyinRouteHandler(getDouyinData, '评论数据', cookie, requestConfig)
  )

  // 用户主页数据
  router.get('/fetch_user_info',
    createDouyinValidationMiddleware('用户主页数据'),
    createDouyinRouteHandler(getDouyinData, '用户主页数据', cookie, requestConfig)
  )

  // 用户主页视频列表数据
  router.get('/fetch_user_post_videos',
    createDouyinValidationMiddleware('用户主页视频列表数据'),
    createDouyinRouteHandler(getDouyinData, '用户主页视频列表数据', cookie, requestConfig)
  )

  // 搜索数据
  router.get('/fetch_search_info',
    createDouyinValidationMiddleware('搜索数据'),
    createDouyinRouteHandler(getDouyinData, '搜索数据', cookie, requestConfig)
  )

  // 热点词数据
  router.get('/fetch_suggest_words',
    createDouyinValidationMiddleware('热点词数据'),
    createDouyinRouteHandler(getDouyinData, '热点词数据', cookie, requestConfig)
  )

  // 音乐数据
  router.get('/fetch_music_work',
    createDouyinValidationMiddleware('音乐数据'),
    createDouyinRouteHandler(getDouyinData, '音乐数据', cookie, requestConfig)
  )

  // Emoji数据
  router.get('/fetch_emoji_list',
    createDouyinValidationMiddleware('Emoji数据'),
    createDouyinRouteHandler(getDouyinData, 'Emoji数据', cookie, requestConfig)
  )

  // 动态表情数据
  router.get('/fetch_emoji_pro_list',
    createDouyinValidationMiddleware('动态表情数据'),
    createDouyinRouteHandler(getDouyinData, '动态表情数据', cookie, requestConfig)
  )

  // 直播间信息数据
  router.get('/fetch_user_live_videos',
    createDouyinValidationMiddleware('直播间信息数据'),
    createDouyinRouteHandler(getDouyinData, '直播间信息数据', cookie, requestConfig)
  )

  // 指定评论回复数据
  router.get('/fetch_video_comment_replies',
    createDouyinValidationMiddleware('指定评论回复数据'),
    createDouyinRouteHandler(getDouyinData, '指定评论回复数据', cookie, requestConfig)
  )

  return router
}