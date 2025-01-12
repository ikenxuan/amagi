import { KuaishouData } from 'amagi/platform'
import { KuaishouDataOptionsMap } from 'amagi/types'
import { FastifyInstance, FastifyRequest } from 'fastify'

interface KusiahouRequest<T extends keyof KuaishouDataOptionsMap> extends FastifyRequest {
  Querystring: Omit<KuaishouDataOptionsMap[T], 'methodType'>
}

/**
 * 注册快手相关的API接口路由
 * @param fastify  - fastify 实例
 * @param cookie - 有效的cookie
 */
export const registerKuaishouRoutes = (fastify: FastifyInstance, cookie: string) => {
  fastify.register(async (fastify) => {
    await Promise.resolve()
    fastify.get<KusiahouRequest<'单个视频作品数据'>>('/fetch_one_work', async (request, reply) => {
      reply.type('application/json').send(
        await KuaishouData({
          methodType: '单个视频作品数据',
          photoId: request.query.photoId
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<KusiahouRequest<'评论数据'>>('/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await KuaishouData({
          methodType: '评论数据',
          photoId: request.query.photoId
        }, request.headers.cookie ?? cookie)
      )
    })

    fastify.get<KusiahouRequest<'Emoji数据'>>('/fetch_emoji_list', async (request, reply) => {
      reply.type('application/json').send(
        await KuaishouData({
          methodType: 'Emoji数据'
        }, request.headers.cookie ?? cookie)
      )
    })
  }, { prefix: '/api/kuaishou' })
}
