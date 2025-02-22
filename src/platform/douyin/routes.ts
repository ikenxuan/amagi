import { Request, Response, Router } from 'express'
import { DouyinData } from 'amagi/platform'
import { DouyinDataOptionsMap, OmitMethodType } from 'amagi/types'

export interface DouyinRequest<T extends keyof DouyinDataOptionsMap> extends Request {
  query: {
    [K in keyof OmitMethodType<DouyinDataOptionsMap[T]['opt']>]: string
  }
}

/**
 * 注册抖音相关的API接口路由
 * @param router - 路由实例
 * @param cookie - 有效的cookie
 */
export const registerDouyinRoutes = (router: Router, cookie: string) => {
  router.get('/fetch_one_work', async (
    req: DouyinRequest<'聚合解析'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '聚合解析',
      aweme_id: req.query.aweme_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_work_comments', async (
    req: DouyinRequest<'评论数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '评论数据',
      aweme_id: req.query.aweme_id,
      number: parseInt(req.query.number ?? '50'),
      cursor: parseInt(req.query.cursor ?? '0')
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_video_comment_replies', async (
    req: DouyinRequest<'指定评论回复数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '指定评论回复数据',
      aweme_id: req.query.aweme_id,
      comment_id: req.query.comment_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_user_info', async (
    req: DouyinRequest<'用户主页数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '用户主页数据',
      sec_uid: req.query.sec_uid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_user_post_videos', async (
    req: DouyinRequest<'用户主页视频列表数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '用户主页视频列表数据',
      sec_uid: req.query.sec_uid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_suggest_words', async (
    req: DouyinRequest<'热点词数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '热点词数据',
      query: req.query.query
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_search_info', async (
    req: DouyinRequest<'搜索数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '搜索数据',
      query: req.query.query,
      number: parseInt(req.query.number ?? '10'),
      search_id: req.query.search_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_emoji_list', async (
    req: DouyinRequest<'Emoji数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: 'Emoji数据',
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_emoji_pro_list', async (
    req: DouyinRequest<'动态表情数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '动态表情数据',
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_music_work', async (
    req: DouyinRequest<'音乐数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '音乐数据',
      music_id: req.query.music_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_user_mix_videos', async (
    req: DouyinRequest<'合辑作品数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '合辑作品数据',
      aweme_id: req.query.aweme_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_user_live_videos', async (
    req: DouyinRequest<'直播间信息数据'>,
    res: Response
  ) => {
    const data = await DouyinData({
      methodType: '直播间信息数据',
      sec_uid: req.query.sec_uid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  return router
}
