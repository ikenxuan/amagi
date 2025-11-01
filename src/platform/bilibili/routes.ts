import { createBilibiliValidationMiddleware } from 'amagi/middleware/validation'
import { getBilibiliData } from 'amagi/model/DataFetchers'
import { getBilibiliDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { BilibiliDataOptionsMap } from 'amagi/types'
import { handleError } from 'amagi/utils/errors'
import { ApiResponse, BilibiliMethodType } from 'amagi/validation'
import { Router } from 'express'

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
  ) => Promise<ApiResponse<BilibiliDataOptionsMap[T]['data']>>,
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
export const createBilibiliRoutes = (cookie: string, requestConfig: RequestConfig = getBilibiliDefaultConfig(cookie)): Router => {
  const router = Router()

  // 单个视频作品数据
  router.get('/fetch_one_video',
    createBilibiliValidationMiddleware('单个视频作品数据'),
    createBilibiliRouteHandler(getBilibiliData, '单个视频作品数据', cookie, requestConfig)
  )

  // 单个视频下载信息数据
  router.get('/fetch_video_playurl',
    createBilibiliValidationMiddleware('单个视频下载信息数据'),
    createBilibiliRouteHandler(getBilibiliData, '单个视频下载信息数据', cookie, requestConfig)
  )

  // 评论数据
  router.get('/fetch_work_comments',
    createBilibiliValidationMiddleware('评论数据'),
    createBilibiliRouteHandler(getBilibiliData, '评论数据', cookie, requestConfig)
  )

  // 指定评论的回复数据
  router.get('/fetch_comment_reply',
    createBilibiliValidationMiddleware('指定评论的回复'),
    createBilibiliRouteHandler(getBilibiliData, '指定评论的回复', cookie, requestConfig)
  )

  // 用户主页数据
  router.get('/fetch_user_profile',
    createBilibiliValidationMiddleware('用户主页数据'),
    createBilibiliRouteHandler(getBilibiliData, '用户主页数据', cookie, requestConfig)
  )

  // 用户主页动态列表数据
  router.get('/fetch_user_dynamic',
    createBilibiliValidationMiddleware('用户主页动态列表数据'),
    createBilibiliRouteHandler(getBilibiliData, '用户主页动态列表数据', cookie, requestConfig)
  )

  // Emoji数据
  router.get('/fetch_emoji_list',
    createBilibiliValidationMiddleware('Emoji数据'),
    createBilibiliRouteHandler(getBilibiliData, 'Emoji数据', cookie, requestConfig)
  )

  // 番剧基本信息数据
  router.get('/fetch_bangumi_video_info',
    createBilibiliValidationMiddleware('番剧基本信息数据'),
    createBilibiliRouteHandler(getBilibiliData, '番剧基本信息数据', cookie, requestConfig)
  )

  // 番剧下载信息数据
  router.get('/fetch_bangumi_video_playurl',
    createBilibiliValidationMiddleware('番剧下载信息数据'),
    createBilibiliRouteHandler(getBilibiliData, '番剧下载信息数据', cookie, requestConfig)
  )

  // 动态详情数据
  router.get('/fetch_dynamic_info',
    createBilibiliValidationMiddleware('动态详情数据'),
    createBilibiliRouteHandler(getBilibiliData, '动态详情数据', cookie, requestConfig)
  )

  // 动态卡片数据
  router.get('/fetch_dynamic_card',
    createBilibiliValidationMiddleware('动态卡片数据'),
    createBilibiliRouteHandler(getBilibiliData, '动态卡片数据', cookie, requestConfig)
  )

  // 直播间信息
  router.get('/fetch_live_room_detail',
    createBilibiliValidationMiddleware('直播间信息'),
    createBilibiliRouteHandler(getBilibiliData, '直播间信息', cookie, requestConfig)
  )

  // 直播间初始化信息
  router.get('/fetch_liveroom_def',
    createBilibiliValidationMiddleware('直播间初始化信息'),
    createBilibiliRouteHandler(getBilibiliData, '直播间初始化信息', cookie, requestConfig)
  )

  // 登录基本信息
  router.get('/login_basic_info',
    createBilibiliValidationMiddleware('登录基本信息'),
    createBilibiliRouteHandler(getBilibiliData, '登录基本信息', cookie, requestConfig)
  )

  // 申请二维码
  router.get('/new_login_qrcode',
    createBilibiliValidationMiddleware('申请二维码'),
    createBilibiliRouteHandler(getBilibiliData, '申请二维码', cookie, requestConfig)
  )

  // 二维码状态
  router.get('/check_qrcode',
    createBilibiliValidationMiddleware('二维码状态'),
    createBilibiliRouteHandler(getBilibiliData, '二维码状态', cookie, requestConfig)
  )

  // 获取UP主总播放量
  router.get('/fetch_user_full_view',
    createBilibiliValidationMiddleware('获取UP主总播放量'),
    createBilibiliRouteHandler(getBilibiliData, '获取UP主总播放量', cookie, requestConfig)
  )

  // AV转BV
  router.get('/av_to_bv',
    createBilibiliValidationMiddleware('AV转BV'),
    createBilibiliRouteHandler(getBilibiliData, 'AV转BV', cookie, requestConfig)
  )

  // BV转AV
  router.get('/bv_to_av',
    createBilibiliValidationMiddleware('BV转AV'),
    createBilibiliRouteHandler(getBilibiliData, 'BV转AV', cookie, requestConfig)
  )

  // 专栏正文内容
  router.get('/fetch_article_content',
    createBilibiliValidationMiddleware('专栏正文内容'),
    createBilibiliRouteHandler(getBilibiliData, '专栏正文内容', cookie, requestConfig)
  )

  // 专栏显示卡片信息
  router.get('/fetch_article_card',
    createBilibiliValidationMiddleware('专栏显示卡片信息'),
    createBilibiliRouteHandler(getBilibiliData, '专栏显示卡片信息', cookie, requestConfig)
  )

  // 专栏文章基本信息
  router.get('/fetch_article_info',
    createBilibiliValidationMiddleware('专栏文章基本信息'),
    createBilibiliRouteHandler(getBilibiliData, '专栏文章基本信息', cookie, requestConfig)
  )

  // 文集基本信息
  router.get('/fetch_column_info',
    createBilibiliValidationMiddleware('文集基本信息'),
    createBilibiliRouteHandler(getBilibiliData, '文集基本信息', cookie, requestConfig)
  )

  return router
}
