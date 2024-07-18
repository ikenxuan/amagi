import fastify, { FastifyRequest } from 'fastify'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Result } from '@zuks/getdata'
import { Index } from '@zuks/model'
import { DataType, OptionsType } from '@zuks/types'

// 定义请求类型，包括OptionsType的属性
interface MyRequest extends FastifyRequest {
  Querystring: OptionsType
}

export default async function Fastify () {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const server = fastify({ logger: true })
  server.listen({ port: Index.cfg().port, host: '::' }, async function (_err: any, address: any) {
    console.log(`服务正在监听 ${address}`)
  })
  server.register(fastifyStatic, { root: join(__dirname), prefix: '/static' })

  server.get<MyRequest>('/api/aweme', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new Result(DataType['VideoData']).result({ url }))
  })

  server.get<MyRequest>('/api/comments', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new Result(DataType['CommentData']).result({ url }))
  })

  server.get<MyRequest>('/api/comments/reply', async (request, reply) => {
    const { aweme_id, comment_id } = request.query
    reply.type('application/json').send(await new Result(DataType['CommentReplyData']).result({ aweme_id, comment_id }))
  })

  server.get<MyRequest>('/api/userinfo', async (request, reply) => {
    const sec_uid = request.query.sec_uid
    reply.type('application/json').send(await new Result(DataType['UserInfoData']).result({ sec_uid }))
  })

  server.get<MyRequest>('/api/uservideoslist', async (request, reply) => {
    const sec_uid = request.query.sec_uid
    reply.type('application/json').send(await new Result(DataType['UserVideosListData']).result({ sec_uid }))
  })

  server.get<MyRequest>('/api/suggestwords', async (request, reply) => {
    const query = request.query.query
    reply.type('application/json').send(await new Result(DataType['SuggestWordsData']).result({ query }))
  })

  server.get<MyRequest>('/api/search', async (request, reply) => {
    const query = request.query.query
    reply.type('application/json').send(await new Result(DataType['SearchData']).result({ query }))
  })

  server.get<MyRequest>('/api/emoji', async (request, reply) => {
    reply.type('application/json').send(await new Result(DataType['EmojiData']).result())
  })

  server.get<MyRequest>('/api/expressionplus', async (request, reply) => {
    reply.type('application/json').send(await new Result(DataType['ExpressionPlusData']).result())
  })

  server.get<MyRequest>('/api/music', async (request, reply) => {
    const music_id = request.query.music_id
    reply.type('application/json').send(await new Result(DataType['MusicData']).result({ music_id }))
  })
}
