import { BilibiliResult } from 'amagi/business/bilibili'
import { DouyinResult } from 'amagi/business/douyin'
import { BilibiliDataType, BilibiliRequest, DouyinDataType, DouyinRequest } from 'amagi/types'
import Fastify, { FastifyInstance } from 'fastify'

interface initClientParams {
  /** 抖音ck */
  douyin: string
  /** B站ck */
  bilibili: string
}

interface amagiInstance {
  /** Fastify 实例 */
  Instance: FastifyInstance
  /** 获取抖音接口数据 */
  GetDouyinData: (data: { type: keyof typeof DouyinDataType }) => DouyinResult
  /** 获取B站接口数据 */
  GetBilibiliData: (data: { type: keyof typeof BilibiliDataType }) => BilibiliResult
}

export class client {
  /** douyin cookies */
  douyin: string
  /** bilibili cookes */
  bilibili: string

  /**
   * 
   * @param cookies 包含抖音和B站cookie的参数对象
   */
  constructor (cookies: initClientParams) {
    /** 抖音ck */
    this.douyin = cookies.douyin
    /** B站ck */
    this.bilibili = cookies.bilibili
  }

  /**
   * 初始化 fastify 实例
   * @param log 是否启用日志
   * @returns fastify 实例
   */
  async initServer (log: boolean = false): Promise<amagiInstance> {
    const client = Fastify({
      logger: log && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-MM-dd HH:mm:ss',
            ignore: 'pid,hostname,reqId,res,responseTime,req.hostname,req.method,req.remotePort',
            messageFormat: '{msg}'
          }
        }
      }
    })

    client.get('/', async (_request, reply) => {
      reply.redirect('https://amagi.apifox.cn', 301)
    })

    client.get('/docs', async (_request, reply) => {
      reply.redirect('https://amagi.apifox.cn', 301)
    })

    client.get<DouyinRequest>('/api/douyin/aweme', async (request, reply) => {
      const url = request.query.url
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.单个视频作品数据, this.douyin).result({ url }))
    })

    client.get<DouyinRequest>('/api/douyin/comments', async (request, reply) => {
      const url = request.query.url
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.评论数据, this.douyin).result({ url }))
    })

    client.get<DouyinRequest>('/api/douyin/comments/reply', async (request, reply) => {
      const { aweme_id, comment_id } = request.query
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.二级评论数据, this.douyin).result({ aweme_id, comment_id }))
    })

    client.get<DouyinRequest>('/api/douyin/userinfo', async (request, reply) => {
      const sec_uid = request.query.sec_uid
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.用户主页数据, this.douyin).result({ sec_uid }))
    })

    client.get<DouyinRequest>('/api/douyin/uservideoslist', async (request, reply) => {
      const sec_uid = request.query.sec_uid
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.用户主页视频列表数据, this.douyin).result({ sec_uid }))
    })

    client.get<DouyinRequest>('/api/douyin/suggestwords', async (request, reply) => {
      const query = request.query.query
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.热点词数据, this.douyin).result({ query }))
    })

    client.get<DouyinRequest>('/api/douyin/search', async (request, reply) => {
      const query = request.query.query
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.搜索数据, this.douyin).result({ query }))
    })

    client.get<DouyinRequest>('/api/douyin/emoji', async (_request, reply) => {
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.官方emoji数据, this.douyin).result())
    })

    client.get<DouyinRequest>('/api/douyin/expressionplus', async (_request, reply) => {
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.动态表情数据, this.douyin).result())
    })

    client.get<DouyinRequest>('/api/douyin/music', async (request, reply) => {
      const music_id = request.query.music_id
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.音乐数据, this.douyin).result({ music_id }))
    })

    client.get<DouyinRequest>('/api/douyin/liveimages', async (request, reply) => {
      const music_id = request.query.music_id
      reply.type('application/json').send(await new DouyinResult(DouyinDataType.实况图片图集数据, this.douyin).result({ music_id }))
    })

    client.get<BilibiliRequest>('/api/bilibili/work', async (request, reply) => {
      const url = request.query.url
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.单个视频作品数据, this.bilibili).result({ url }))
    })

    client.get<BilibiliRequest>('/api/bilibili/comment', async (request, reply) => {
      const bvid = request.query.bvid
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.评论数据, this.bilibili).result({ bvid }))
    })

    client.get<BilibiliRequest>('/api/bilibili/emoji', async (_request, reply) => {
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.emoji数据, this.bilibili).result())
    })

    client.get<BilibiliRequest>('/api/bilibili/bangumivideoinfo', async (request, reply) => {
      const url = request.query.url
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.番剧基本信息数据, this.bilibili).result({ url }))
    })

    client.get<BilibiliRequest>('/api/bilibili/bangumivideodownloadlink', async (request, reply) => {
      const { cid, ep_id } = request.query
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.番剧下载信息数据, this.bilibili).result({ cid, ep_id }))
    })

    client.get<BilibiliRequest>('/api/bilibili/dynamiclist', async (request, reply) => {
      const host_mid = request.query.host_mid
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.用户主页动态列表数据, this.bilibili).result({ host_mid }))
    })

    client.get<BilibiliRequest>('/api/bilibili/dynamicinfo', async (request, reply) => {
      const dynamic_id = request.query.dynamic_id
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.动态详情数据, this.bilibili).result({ dynamic_id }))
    })

    client.get<BilibiliRequest>('/api/bilibili/dynamicdard', async (request, reply) => {
      const dynamic_id = request.query.dynamic_id
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.动态卡片数据, this.bilibili).result({ dynamic_id }))
    })

    client.get<BilibiliRequest>('/api/bilibili/userinfo', async (request, reply) => {
      const host_mid = request.query.host_mid
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.用户主页数据, this.bilibili).result({ host_mid }))
    })

    client.get<BilibiliRequest>('/api/bilibili/liveroominfo', async (request, reply) => {
      const room_id = request.query.room_id
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.直播间信息, this.bilibili).result({ room_id }))
    })

    client.get<BilibiliRequest>('/api/bilibili/liveroominit', async (request, reply) => {
      const room_id = request.query.room_id
      reply.type('application/json').send(await new BilibiliResult(BilibiliDataType.直播间初始化信息, this.bilibili).result({ room_id }))
    })

    return {
      Instance: client,
      GetDouyinData: this.GetDouyinData,
      GetBilibiliData: this.GetBilibiliData
    }
  }
  GetDouyinData = (data: { type: keyof typeof DouyinDataType, }): DouyinResult => {
    return new DouyinResult(data.type as DouyinDataType, this.douyin, true)
  }

  GetBilibiliData = (data: { type: keyof typeof BilibiliDataType, }): BilibiliResult => {
    return new BilibiliResult(data.type as BilibiliDataType, this.bilibili, true)
  }
}

