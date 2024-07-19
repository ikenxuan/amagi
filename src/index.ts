import fastify, { FastifyRequest } from 'fastify'
import { DouyinResult } from 'amagi/business/douyin'
import { BilibiliResult } from './business/bilibili'
import { DouyinDataType, BilibiliDataType, DouyinOptionsType, BilibiliOptionsType } from 'amagi/types'
import { logger } from 'amagi/model'


// 定义请求类型，包括OptionsType的属性
interface DouyinRequest extends FastifyRequest {
  Querystring: DouyinOptionsType
}

interface BilibiliRequest extends FastifyRequest {
  Querystring: BilibiliOptionsType
}

export async function Fastify () {
  const server = fastify()
  server.listen({ port: 4567, host: '127.0.0.1' }, async function (_err: any, address) {
    logger.mark(`服务正在监听 ${address}`)
  })
  server.get<DouyinRequest>('/api/douyin/aweme', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['单个视频作品数据']).result({ url }))
  })

  server.get<DouyinRequest>('/api/douyin/comments', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['评论数据']).result({ url }))
  })

  server.get<DouyinRequest>('/api/douyin/comments/reply', async (request, reply) => {
    const { aweme_id, comment_id } = request.query
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['二级评论数据']).result({ aweme_id, comment_id }))
  })

  server.get<DouyinRequest>('/api/douyin/userinfo', async (request, reply) => {
    const sec_uid = request.query.sec_uid
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['用户主页数据']).result({ sec_uid }))
  })

  server.get<DouyinRequest>('/api/douyin/uservideoslist', async (request, reply) => {
    const sec_uid = request.query.sec_uid
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['用户主页视频列表数据']).result({ sec_uid }))
  })

  server.get<DouyinRequest>('/api/douyin/suggestwords', async (request, reply) => {
    const query = request.query.query
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['热点词数据']).result({ query }))
  })

  server.get<DouyinRequest>('/api/douyin/search', async (request, reply) => {
    const query = request.query.query
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['搜索数据']).result({ query }))
  })

  server.get<DouyinRequest>('/api/douyin/emoji', async (request, reply) => {
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['官方emoji数据']).result())
  })

  server.get<DouyinRequest>('/api/douyin/expressionplus', async (request, reply) => {
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['动态表情数据']).result())
  })

  server.get<DouyinRequest>('/api/douyin/music', async (request, reply) => {
    const music_id = request.query.music_id
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['音乐数据']).result({ music_id }))
  })
  ///////////////////////////////////////////////////////////////////////////////////////////
  server.get<BilibiliRequest>('/api/bilibili/work', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['单个视频作品数据']).result({ url }))
  })
}

await Fastify()
