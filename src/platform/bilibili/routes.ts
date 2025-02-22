import express, { Request, Response, Router } from 'express'
import { BilibiliData } from 'amagi/platform/bilibili'
import { BilibiliDataOptionsMap } from 'amagi/types'

// @ts-ignore
export interface BilibiliRequest<T extends keyof BilibiliDataOptionsMap> extends Request {
  query: Omit<BilibiliDataOptionsMap[T]['opt'], 'methodType'>
}

/**
 * 注册B站相关的API接口路由
 * @param cookie - 有效的cookie
 */
export const registerBilibiliRoutes = (cookie: string): Router => {
  const router = express.Router()

  router.get('/new_login_qrcode', async (
    req: BilibiliRequest<'申请二维码'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '申请二维码',
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/check_qrcode', async (
    req: BilibiliRequest<'二维码状态'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '二维码状态',
      qrcode_key: req.query.qrcode_key
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/login_basic_info', async (
    req: BilibiliRequest<'登录基本信息'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '登录基本信息',
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_one_video', async (
    req: BilibiliRequest<'单个视频作品数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '单个视频作品数据',
      bvid: req.query.bvid
    }, req.headers.cookie || cookie)
    res.json(data)
  })


  router.get('/fetch_video_playurl', async (
    req: BilibiliRequest<'单个视频下载信息数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '单个视频下载信息数据',
      avid: req.query.avid,
      cid: req.query.cid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_work_comments', async (
    req: BilibiliRequest<'评论数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '评论数据',
      oid: Number(req.query.oid),
      number: Number(req.query.number),
      type: Number(req.query.type ?? 1)
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_work_comments', async (
    req: BilibiliRequest<'Emoji数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: 'Emoji数据',
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_bangumi_video_info', async (
    req: BilibiliRequest<'番剧基本信息数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '番剧基本信息数据',
      ep_id: req.query.ep_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_bangumi_video_playurl', async (
    req: BilibiliRequest<'番剧下载信息数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '番剧下载信息数据',
      cid: req.query.cid,
      ep_id: req.query.ep_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_user_dynamic', async (
    req: BilibiliRequest<'用户主页动态列表数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '用户主页动态列表数据',
      host_mid: req.query.host_mid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_dynamic_info', async (
    req: BilibiliRequest<'动态详情数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '动态详情数据',
      dynamic_id: req.query.dynamic_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_dynamic_card', async (
    req: BilibiliRequest<'动态卡片数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '动态卡片数据',
      dynamic_id: req.query.dynamic_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_user_profile', async (
    req: BilibiliRequest<'用户主页数据'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '用户主页数据',
      host_mid: req.query.host_mid
    }, req.headers.cookie || cookie)
    res.json(data)
  })


  router.get('/fetch_live_room_detail', async (
    req: BilibiliRequest<'直播间信息'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '直播间信息',
      room_id: req.query.room_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_liveroom_def', async (
    req: BilibiliRequest<'直播间初始化信息'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '直播间初始化信息',
      room_id: req.query.room_id
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/bv_to_av', async (
    req: BilibiliRequest<'BV转AV'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: 'BV转AV',
      bvid: req.query.bvid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/av_to_bv', async (
    req: BilibiliRequest<'AV转BV'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: 'AV转BV',
      avid: req.query.avid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  router.get('/fetch_user_full_view', async (
    req: BilibiliRequest<'获取UP主总播放量'>,
    res: Response
  ) => {
    const data = await BilibiliData({
      methodType: '获取UP主总播放量',
      host_mid: req.query.host_mid
    }, req.headers.cookie || cookie)
    res.json(data)
  })

  return router
}
