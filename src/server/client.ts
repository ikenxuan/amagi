import { BilibiliResult } from 'amagi/business/bilibili'
import { DouyinResult } from 'amagi/business/douyin'
import {
  BilibiliDataType,
  BilibiliRequest,
  DouyinDataType,
  DouyinRequest,
  DouyinDataOptionsMap,
  BilibiliDataOptionsMap
} from 'amagi/types'
import {
  getDouyinData,
  getBilibiliData
} from 'amagi/model/DataFetchers'
import Fastify, { FastifyInstance } from 'fastify'
import { logger } from 'amagi/model'

interface initClientParams {
  /** 抖音ck */
  douyin?: string
  /** B站ck */
  bilibili?: string
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
    options?: DouyinDataOptionsMap[T]
  ) => Promise<any>
  /**
   * amagi.getBilibiliData 可能在未来版本废弃，建议直接导入 getBilibiliData 方法使用
   * @deprecated
   */
  getBilibiliData: <T extends keyof BilibiliDataOptionsMap> (
    type: T,
    options?: BilibiliDataOptionsMap[T]
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
    this.douyin = data.douyin || ''
    /** B站ck */
    this.bilibili = data.bilibili || ''
    /** 小红书ck */
  }

  /**
   * 
   * @param port 监听端口
   * @default port 4567
   * @returns 
   */
  startClient (port: number = 4567): AmagiInstance {

    const Client = Fastify({
      logger: {
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

    Client.get<DouyinRequest>('/api/douyin/fetch_one_work', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.单个视频作品数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.评论数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_video_comment_replies', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.二级评论数据,
            cookie: this.douyin
          }, { aweme_id: request.query.aweme_id, comment_id: request.query.comment_id }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_info', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.用户主页数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_post_videos', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.用户主页视频列表数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_suggest_words', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.热点词数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_search_info', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.搜索数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_emoji_list', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinResult({
          type: DouyinDataType.官方emoji数据,
          cookie: this.douyin
        })
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_emoji_pro_list', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinResult({
          type: DouyinDataType.动态表情数据,
          cookie: this.douyin
        })
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_music_work', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinResult(
          {
            type: DouyinDataType.音乐数据,
            cookie: this.douyin
          }, { music_id: request.query.music_id }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_mix_videos', async (request, reply) => {
      reply.type('application/json').send(await DouyinResult({
        type: DouyinDataType.实况图片图集数据,
        cookie: this.douyin
      }, { url: request.query.url }))
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_live_videos', async (request, reply) => {
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

    Client.get<BilibiliRequest>('/api/bilibili/fetch_one_video', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.单个视频作品数据,
        cookie: this.bilibili
      }, { url: request.query.url }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_video_playurl', async (request, reply) => {
      reply.type('application/json').send(await BilibiliResult({
        type: BilibiliDataType.单个视频下载信息数据,
        cookie: this.bilibili
      }, { avid: request.query.avid, cid: request.query.cid }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.评论数据,
            cookie: this.bilibili
          }, { oid: Number(request.query.oid), number: Number(request.query.number), type: Number(request.query.type || 1) }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_emoji_list', async (_request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult({
          type: BilibiliDataType.emoji数据,
          cookie: this.bilibili
        }, {})
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_bangumi_video_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.番剧基本信息数据,
            cookie: this.bilibili
          }, { url: request.query.url }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_bangumi_video_playurl', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.番剧下载信息数据,
            cookie: this.bilibili
          }, { cid: request.query.cid, ep_id: request.query.ep_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_user_dynamic', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.用户主页动态列表数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_dynamic_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.动态详情数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_dynamic_card', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.动态卡片数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_user_profile', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.用户主页数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_live_room_detail', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.直播间信息,
            cookie: this.bilibili
          }, { room_id: request.query.room_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_liveroom_def', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.直播间初始化信息,
            cookie: this.bilibili
          }, { room_id: request.query.room_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/bv_to_av', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.BV转AV,
            cookie: this.bilibili
          }, { bvid: request.query.bvid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/av_to_bv', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliResult(
          {
            type: BilibiliDataType.AV转BV,
            cookie: this.bilibili
          }, { avid: request.query.avid }
        )
      )
    })

    Client.listen({ port: port, host: '::' }, (_err, _address) => {
      if (_err) Client.log.error(_err)
      logger.mark(`amagi server ${logger.green(`listening on ${port}`)} port. ${logger.yellow('API docs: https://amagi.apifox.cn')}`)
    })

    return {
      /** Fastify 实例 */
      Instance: Client,
      getDouyinData: this.getDouyinData,
      getBilibiliData: this.getBilibiliData,
    } as AmagiInstance
  }

  getDouyinData = async <T extends keyof DouyinDataOptionsMap> (
    type: T,
    options?: DouyinDataOptionsMap[T]
  ): Promise<any> => {
    return await getDouyinData(type, this.douyin, options)
  }

  getBilibiliData = async <T extends keyof BilibiliDataOptionsMap> (
    type: T,
    options?: BilibiliDataOptionsMap[T]
  ): Promise<any> => {
    return await getBilibiliData(type, this.bilibili, options)
  }
}