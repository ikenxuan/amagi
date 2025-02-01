import { DouyinData } from 'amagi/platform'
import { DouyinDataOptionsMap } from 'amagi/types'
import { FastifyInstance, FastifyRequest } from 'fastify'

interface DouyinRequest<T extends keyof DouyinDataOptionsMap> extends FastifyRequest {
  Querystring: Omit<DouyinDataOptionsMap[T]['opt'], 'methodType'>
}

/**
 * 注册抖音相关的API接口路由
 * @param fastify  - fastify 实例
 * @param cookie - 有效的cookie
 */
export const registerDouyinRoutes = (fastify: FastifyInstance, cookie: string) => {
  fastify.register(async (fastify) => {
    await Promise.resolve()
    fastify.get<DouyinRequest<'视频作品数据'>>('/fetch_one_work', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '视频作品数据',
          aweme_id: request.query.aweme_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'评论数据'>>('/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '评论数据',
          aweme_id: request.query.aweme_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'指定评论回复数据'>>('/fetch_video_comment_replies', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '指定评论回复数据',
          aweme_id: request.query.aweme_id,
          comment_id: request.query.comment_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'用户主页数据'>>('/fetch_user_info', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '用户主页数据',
          sec_uid: request.query.sec_uid
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'用户主页视频列表数据'>>('/fetch_user_post_videos', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '用户主页视频列表数据',
          sec_uid: request.query.sec_uid
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'热点词数据'>>('/fetch_suggest_words', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '热点词数据',
          query: request.query.query
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'搜索数据'>>('/fetch_search_info', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '搜索数据',
          query: request.query.query,
          number: request.query.number
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'Emoji数据'>>('/fetch_emoji_list', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: 'Emoji数据'
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'动态表情数据'>>('/fetch_emoji_pro_list', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '动态表情数据'
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'音乐数据'>>('/fetch_music_work', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '音乐数据',
          music_id: request.query.music_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'合辑作品数据'>>('/fetch_user_mix_videos', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '合辑作品数据',
          aweme_id: request.query.aweme_id
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<DouyinRequest<'直播间信息数据'>>('/fetch_user_live_videos', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '直播间信息数据',
          sec_uid: request.query.sec_uid
        }, request.headers.cookie ?? cookie)
      )
    })
  }, { prefix: '/api/douyin' })
}
