import { Request, Response, Router } from 'express'
import { KuaishouData } from 'amagi/platform'
import { KuaishouDataOptionsMap, OmitMethodType } from 'amagi/types'

export interface KusiahouRequest<T extends keyof KuaishouDataOptionsMap> extends Request {
  query: {
    [K in keyof OmitMethodType<KuaishouDataOptionsMap[T]['opt']>]: string
  }
}

/**
 * 注册快手相关的API接口路由
 * @param router - 路由实例
 * @param cookie - 有效的cookie
 */
export const registerKuaishouRoutes = (router: Router, cookie: string): Router => {
  router.get('/fetch_one_work', async (
    req: KusiahouRequest<'单个视频作品数据'>,
    res: Response
  ) => {
    const data = await KuaishouData({
      methodType: '单个视频作品数据',
      photoId: req.query.photoId
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_work_comments', async (
    req: KusiahouRequest<'评论数据'>,
    res: Response
  ) => {
    const data = await KuaishouData({
      methodType: '评论数据',
      photoId: req.query.photoId
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_emoji_list', async (
    req: KusiahouRequest<'Emoji数据'>,
    res: Response
  ) => {
    const data = await KuaishouData({
      methodType: 'Emoji数据'
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  return router
}