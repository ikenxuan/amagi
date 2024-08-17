import { BilibiliResult } from 'amagi/business/bilibili'
import { DouyinResult } from 'amagi/business/douyin'
import {
  BilibiliDataType,
  BilibiliOptionsType,
  BilibiliRequest,
  DouyinDataType,
  DouyinOptionsType,
  DouyinRequest,
  GetDataResponseType
} from 'amagi/types'
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
  /**
   * amagi.GetDouyinData 已废弃，请直接导入 GetDouyinData 方法使用
   * @deprecated
   */
  GetDouyinData: (data: { type: keyof typeof DouyinDataType }) => Error | any
  /**
   * amagi.GetBilibiliData 已废弃！请直接导入 GetBilibiliData 方法使用
   * @deprecated
   */
  GetBilibiliData: (data: { type: keyof typeof BilibiliDataType }) => Error | any
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
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.单个视频作品数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/comments', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.评论数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/comments/reply', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.二级评论数据,
            cookie: this.douyin
          }, { aweme_id: request.query.aweme_id, comment_id: request.query.comment_id }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/userinfo', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.用户主页数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/uservideoslist', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.用户主页视频列表数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/suggestwords', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.热点词数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/search', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.搜索数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/emoji', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinResult({
          type: DouyinDataType.官方emoji数据,
          cookie: this.douyin
        })
      )
    })

    client.get<DouyinRequest>('/api/douyin/expressionplus', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinResult({
          type: DouyinDataType.动态表情数据,
          cookie: this.douyin
        })
      )
    })

    client.get<DouyinRequest>('/api/douyin/music', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.音乐数据,
            cookie: this.douyin
          }, { music_id: request.query.music_id }
        )
      )
    })

    client.get<DouyinRequest>('/api/douyin/liveimages', async (request, reply) => {

      reply.type('application/json').send(await DouyinResult({
        type: DouyinDataType.实况图片图集数据,
        cookie: this.douyin
      }, { url: request.query.url }))
    })

    client.get<BilibiliRequest>('/api/bilibili/generateqrcode', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.申请二维码,
        cookie: ''
      }, {}))
    })

    client.get<BilibiliRequest>('/api/bilibili/qrcodepoll', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.二维码状态,
        cookie: ''
      }, { qrcode_key: request.query.qrcode_key }))
    })

    client.get<BilibiliRequest>('/api/bilibili/login', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.登录基本信息,
        cookie: request.query.cookie as string
      }, {}))
    })

    client.get<BilibiliRequest>('/api/bilibili/work', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.单个视频作品数据,
        cookie: this.bilibili
      }, { url: request.query.url }))
    })

    client.get<BilibiliRequest>('/api/bilibili/downloadwork', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.单个视频下载信息数据,
        cookie: this.bilibili
      }, { url: request.query.url }))
    })

    client.get<BilibiliRequest>('/api/bilibili/comment', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.评论数据,
            cookie: this.bilibili
          }, { bvid: request.query.bvid }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/emoji', async (_request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult({
          type: BilibiliDataType.emoji数据,
          cookie: this.bilibili
        }, {})
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/bangumivideoinfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.番剧基本信息数据,
            cookie: this.bilibili
          }, { url: request.query.url }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/bangumivideodownloadlink', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.番剧下载信息数据,
            cookie: this.bilibili
          }, { cid: request.query.cid, ep_id: request.query.ep_id }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/dynamiclist', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.用户主页动态列表数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/dynamicinfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.动态详情数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/dynamicdard', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.动态卡片数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/userinfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.用户主页数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/liveroominfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.直播间信息,
            cookie: this.bilibili
          }, { room_id: request.query.room_id }
        )
      )
    })

    client.get<BilibiliRequest>('/api/bilibili/liveroominit', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.直播间初始化信息,
            cookie: this.bilibili
          }, { room_id: request.query.room_id }
        )
      )
    })


    return {
      Instance: client,
      GetDouyinData: this.GetDouyinData,
      GetBilibiliData: this.GetBilibiliData
    }
  }
  GetDouyinData = (data: { type: keyof typeof DouyinDataType, }): Error | any => {
    return {
      result: () => {
        throw new Error('该方法已废弃！请直接导入 GetBilibiliData 方法使用')
      }
    }
  }

  GetBilibiliData = (data: { type: keyof typeof BilibiliDataType, }) => {
    return {
      /**
       * @deprecated
       */
      result: async () => {
        throw new Error('该方法已废弃！请直接导入 GetBilibiliData 方法使用')
      }
    }
  }
}