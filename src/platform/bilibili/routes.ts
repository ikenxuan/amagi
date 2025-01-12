import { BilibiliData } from 'amagi/platform/bilibili'
import { BilibiliDataOptionsMap } from 'amagi/types'
import { FastifyInstance, FastifyRequest } from 'fastify'

interface BilibiliRequest<T extends keyof BilibiliDataOptionsMap> extends FastifyRequest {
  Querystring: Omit<BilibiliDataOptionsMap[T], 'methodType'>
}

/**
 * 注册B站相关的API接口路由
 * @param fastify  - fastify 实例
 * @param cookie - 有效的cookie
 */
export const registerBilibiliRoutes = (fastify: FastifyInstance, cookie: string) => {
  fastify.register(async (fastify) => {
    await Promise.resolve()
    fastify.get<BilibiliRequest<'申请二维码'>>('/new_login_qrcode', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '申请二维码'
        })
      )
    })

    fastify.get<BilibiliRequest<'二维码状态'>>('/check_qrcode', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '二维码状态',
          qrcode_key: request.query.qrcode_key
        })
      )
    })

    fastify.get<BilibiliRequest<'登录基本信息'>>('/login_basic_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '登录基本信息'
        }, request.headers.cookie))
    })

    fastify.get<BilibiliRequest<'单个视频作品数据'>>('/fetch_one_video', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '单个视频作品数据',
          bvid: request.query.bvid
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'单个视频下载信息数据'>>('/fetch_video_playurl', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '单个视频下载信息数据',
          avid: request.query.avid,
          cid: request.query.cid
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'评论数据'>>('/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '评论数据',
          oid: Number(request.query.oid),
          number: Number(request.query.number),
          type: Number(request.query.type ?? 1)
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'Emoji数据'>>('/fetch_emoji_list', async (_request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: 'Emoji数据'
        })
      )
    })

    fastify.get<BilibiliRequest<'番剧基本信息数据'>>('/fetch_bangumi_video_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '番剧基本信息数据',
          ep_id: request.query.ep_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'番剧下载信息数据'>>('/fetch_bangumi_video_playurl', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '番剧下载信息数据',
          cid: request.query.cid,
          ep_id: request.query.ep_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'用户主页动态列表数据'>>('/fetch_user_dynamic', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '用户主页动态列表数据',
          host_mid: request.query.host_mid
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'动态详情数据'>>('/fetch_dynamic_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '动态详情数据',
          dynamic_id: request.query.dynamic_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'动态卡片数据'>>('/fetch_dynamic_card', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData(
          {
            methodType: '动态卡片数据',
            dynamic_id: request.query.dynamic_id
          }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'用户主页数据'>>('/fetch_user_profile', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData(
          {
            methodType: '用户主页数据',
            host_mid: request.query.host_mid
          }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'直播间信息'>>('/fetch_live_room_detail', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '直播间信息',
          room_id: request.query.room_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'直播间初始化信息'>>('/fetch_liveroom_def', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '直播间初始化信息',
          room_id: request.query.room_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<BilibiliRequest<'BV转AV'>>('/bv_to_av', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: 'BV转AV',
          bvid: request.query.bvid
        })
      )
    })

    fastify.get<BilibiliRequest<'AV转BV'>>('/av_to_bv', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: 'AV转BV',
          avid: request.query.avid
        })
      )
    })

    fastify.get<BilibiliRequest<'获取UP主总播放量'>>('/fetch_user_full_view', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '获取UP主总播放量',
          host_mid: request.query.host_mid
        }, request.headers.cookie ?? cookie)
      )
    })
  }, { prefix: '/api/bilibili' })
}
