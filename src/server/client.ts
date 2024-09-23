import { BilibiliResult } from 'amagi/business/bilibili'
import { DouyinResult } from 'amagi/business/douyin'
import {
  BilibiliDataType,
  BilibiliRequest,
  DouyinDataType,
  DouyinRequest,
  DouyinDataOptionsMap,
  BilibiliDataOptionsMap,
  XiaohongshuDataOptionsMap
} from 'amagi/types'
import {
  getDouyinData,
  getBilibiliData,
  getXiaohongshuData
} from 'amagi/model/DataFetchers'
import Fastify, { FastifyInstance } from 'fastify'

interface initClientParams {
  /** 抖音ck */
  douyin: string
  /** B站ck */
  bilibili: string
}

interface AmagiInstance {
  /** Fastify 实例 */
  Instance: FastifyInstance
  /**
   * amagi.getDouyinData 可能在未来版本废弃，建议直接导入 getDouyinData 方法使用
   * @deprecated
   */
  getDouyinData: <T extends keyof DouyinDataOptionsMap> (
    type: T,
    cookie: string,
    options: DouyinDataOptionsMap[T]
  ) => Promise<any>
  /**
   * amagi.getBilibiliData 可能在未来版本废弃，建议直接导入 getBilibiliData 方法使用
   * @deprecated
   */
  getBilibiliData: <T extends keyof BilibiliDataOptionsMap> (
    type: T,
    cookie: string,
    options: BilibiliDataOptionsMap[T]
  ) => Promise<any>

  /**
   * amagi.getXiaohongshuiData 可能在未来版本废弃，建议直接导入 getXiaohongshuiData 方法使用
   * @deprecated
   */
  getXiaohongshuData: <T extends keyof XiaohongshuDataOptionsMap> (
    type: T,
    cookie: string,
    options: XiaohongshuDataOptionsMap[T]
  ) => Promise<any>
}

export class amagi {
  private douyin: string
  private bilibili: string

  /**
   *
   * @param data 一个对象，里面包含 douyin 和 bilibili 两个字段，分别对应抖音和B站cookie
   */
  constructor (data: initClientParams) {
    /** 抖音ck */
    this.douyin = data.douyin
    /** B站ck */
    this.bilibili = data.bilibili
  }


  /**
   * 初始化 fastify 实例
   * @param log log 是否启用日志，默认为 false
   * @returns amagi 实例
   */
  initServer (log: boolean = false): AmagiInstance {
    const Client = Fastify({
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

    Client.get('/', async (_request, reply) => {
      reply.redirect('https://amagi.apifox.cn', 301)
    })

    Client.get('/docs', async (_request, reply) => {
      reply.redirect('https://amagi.apifox.cn', 301)
    })

    Client.get<DouyinRequest>('/api/douyin/aweme', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.单个视频作品数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/comments', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.评论数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/comments/reply', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.二级评论数据,
            cookie: this.douyin
          }, { aweme_id: request.query.aweme_id, comment_id: request.query.comment_id }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/userinfo', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.用户主页数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/uservideoslist', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.用户主页视频列表数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/suggestwords', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.热点词数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/search', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.搜索数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/emoji', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinResult({
          type: DouyinDataType.官方emoji数据,
          cookie: this.douyin
        })
      )
    })

    Client.get<DouyinRequest>('/api/douyin/expressionplus', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinResult({
          type: DouyinDataType.动态表情数据,
          cookie: this.douyin
        })
      )
    })

    Client.get<DouyinRequest>('/api/douyin/music', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.音乐数据,
            cookie: this.douyin
          }, { music_id: request.query.music_id }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/liveimages', async (request, reply) => {
      reply.type('application/json').send(await DouyinResult({
        type: DouyinDataType.实况图片图集数据,
        cookie: this.douyin
      }, { url: request.query.url }))
    })

    Client.get<DouyinRequest>('/api/douyin/livedata', async (request, reply) => {
      reply.type('application/json').send(await DouyinResult({
        type: DouyinDataType.直播间信息数据,
        cookie: this.douyin
      }, { sec_uid: request.query.sec_uid }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/generateqrcode', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.申请二维码,
        cookie: ''
      }, {}))
    })

    Client.get<BilibiliRequest>('/api/bilibili/qrcodepoll', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.二维码状态,
        cookie: ''
      }, { qrcode_key: request.query.qrcode_key }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/login', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.登录基本信息,
        cookie: request.headers.cookie as string
      }, {}))
    })

    Client.get<BilibiliRequest>('/api/bilibili/work', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.单个视频作品数据,
        cookie: this.bilibili
      }, { url: request.query.url }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/downloadwork', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.单个视频下载信息数据,
        cookie: this.bilibili
      }, { avid: request.query.avid, cid: request.query.cid }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/comment', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.评论数据,
            cookie: this.bilibili
          }, { bvid: request.query.bvid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/emoji', async (_request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult({
          type: BilibiliDataType.emoji数据,
          cookie: this.bilibili
        }, {})
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/bangumivideoinfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.番剧基本信息数据,
            cookie: this.bilibili
          }, { url: request.query.url }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/bangumivideodownloadlink', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.番剧下载信息数据,
            cookie: this.bilibili
          }, { cid: request.query.cid, ep_id: request.query.ep_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/dynamiclist', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.用户主页动态列表数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/dynamicinfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.动态详情数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/dynamicdard', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.动态卡片数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/userinfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.用户主页数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/liveroominfo', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.直播间信息,
            cookie: this.bilibili
          }, { room_id: request.query.room_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/liveroominit', async (request, reply) => {
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
      Instance: Client,
      getDouyinData,
      getBilibiliData,
      getXiaohongshuData
    }
  }
}