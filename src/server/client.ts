import { kuaishouResult } from 'amagi/business'
import { bilibiliResult } from 'amagi/business/bilibili'
import { douyinResult } from 'amagi/business/douyin'
import { logger } from 'amagi/model'
import {
  getBilibiliData,
  getDouyinData,
  getKuaishouData
} from 'amagi/model/DataFetchers'
import {
  BilibiliDataOptionsMap,
  BilibiliDataType,
  BilibiliRequest,
  DouyinDataOptionsMap,
  DouyinDataType,
  DouyinRequest,
  KuaishouDataOptionsMap,
  KuaishouDataType,
  KusiahouRequest
} from 'amagi/types'
import Fastify from 'fastify'

export type initClientParams = {
  /**
   * 抖音ck
   * @default ''
   */
  douyin?: string
  /**
   * B站ck
   * @default ''
   */
  bilibili?: string
  /**
   * 快手ck
   * @default ''
   */
  kuaishou?: string
}

export class amagi {
  private douyin: string
  private bilibili: string
  private kuaishou: string

  /**
   *
   * @param data 一个对象，里面包含 douyin 和 bilibili 两个字段，分别对应抖音和B站cookie
   */
  constructor (data: initClientParams) {
    /** 抖音ck */
    this.douyin = data.douyin ?? ''
    /** B站ck */
    this.bilibili = data.bilibili ?? ''
    /** 快手ck */
    this.kuaishou = data.kuaishou ?? ''
  }

  /**
   *
   * @param port 监听端口
   * @default port 4567
   * @returns
   */
  startClient (port: number = 4567) {
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
        await douyinResult(
          {
            type: DouyinDataType.单个视频作品数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await douyinResult(
          {
            type: DouyinDataType.评论数据,
            cookie: this.douyin
          }, { url: request.query.url }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_video_comment_replies', async (request, reply) => {
      reply.type('application/json').send(
        await douyinResult(
          {
            type: DouyinDataType.二级评论数据,
            cookie: this.douyin
          }, { aweme_id: request.query.aweme_id, comment_id: request.query.comment_id }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_info', async (request, reply) => {
      reply.type('application/json').send(
        await douyinResult(
          {
            type: DouyinDataType.用户主页数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_post_videos', async (request, reply) => {
      reply.type('application/json').send(
        await douyinResult(
          {
            type: DouyinDataType.用户主页视频列表数据,
            cookie: this.douyin
          }, { sec_uid: request.query.sec_uid }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_suggest_words', async (request, reply) => {
      reply.type('application/json').send(
        await douyinResult(
          {
            type: DouyinDataType.热点词数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_search_info', async (request, reply) => {
      reply.type('application/json').send(
        await douyinResult(
          {
            type: DouyinDataType.搜索数据,
            cookie: this.douyin
          }, { query: request.query.query }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_emoji_list', async (_request, reply) => {
      reply.type('application/json').send(
        await douyinResult({
          type: DouyinDataType.Emoji数据,
          cookie: this.douyin
        })
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_emoji_pro_list', async (_request, reply) => {
      reply.type('application/json').send(
        await douyinResult({
          type: DouyinDataType.动态表情数据,
          cookie: this.douyin
        })
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_music_work', async (request, reply) => {
      reply.type('application/json').send(
        await douyinResult(
          {
            type: DouyinDataType.音乐数据,
            cookie: this.douyin
          }, { music_id: request.query.music_id }
        )
      )
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_mix_videos', async (request, reply) => {
      reply.type('application/json').send(await douyinResult({
        type: DouyinDataType.实况图片图集数据,
        cookie: this.douyin
      }, { url: request.query.url }))
    })

    Client.get<DouyinRequest>('/api/douyin/fetch_user_live_videos', async (request, reply) => {
      reply.type('application/json').send(await douyinResult({
        type: DouyinDataType.直播间信息数据,
        cookie: this.douyin
      }, { sec_uid: request.query.sec_uid }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/new_login_qrcode', async (request, reply) => {
      reply.type('application/json').send(await bilibiliResult({
        type: BilibiliDataType.申请二维码,
        cookie: ''
      }, {}))
    })

    Client.get<BilibiliRequest>('/api/bilibili/check_qrcode', async (request, reply) => {
      reply.type('application/json').send(await bilibiliResult({
        type: BilibiliDataType.二维码状态,
        cookie: ''
      }, { qrcode_key: request.query.qrcode_key }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/login_basic_info', async (request, reply) => {
      reply.type('application/json').send(await bilibiliResult({
        type: BilibiliDataType.登录基本信息,
        cookie: request.headers.cookie
      }, {}))
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_one_video', async (request, reply) => {
      reply.type('application/json').send(await bilibiliResult({
        type: BilibiliDataType.单个视频作品数据,
        cookie: this.bilibili
      }, { url: request.query.url }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_video_playurl', async (request, reply) => {
      reply.type('application/json').send(await bilibiliResult({
        type: BilibiliDataType.单个视频下载信息数据,
        cookie: this.bilibili
      }, { avid: request.query.avid, cid: request.query.cid }))
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.评论数据,
            cookie: this.bilibili
          }, { oid: Number(request.query.oid), number: Number(request.query.number), type: Number(request.query.type ?? 1) }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_emoji_list', async (_request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult({
          type: BilibiliDataType.Emoji数据,
          cookie: this.bilibili
        })
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_bangumi_video_info', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.番剧基本信息数据,
            cookie: this.bilibili
          }, { url: request.query.url }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_bangumi_video_playurl', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.番剧下载信息数据,
            cookie: this.bilibili
          }, { cid: request.query.cid, ep_id: request.query.ep_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_user_dynamic', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.用户主页动态列表数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_dynamic_info', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.动态详情数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_dynamic_card', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.动态卡片数据,
            cookie: this.bilibili
          }, { dynamic_id: request.query.dynamic_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_user_profile', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.用户主页数据,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_live_room_detail', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.直播间信息,
            cookie: this.bilibili
          }, { room_id: request.query.room_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_liveroom_def', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.直播间初始化信息,
            cookie: this.bilibili
          }, { room_id: request.query.room_id }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/bv_to_av', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.BV转AV,
            cookie: this.bilibili
          }, { bvid: request.query.bvid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/av_to_bv', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.AV转BV,
            cookie: this.bilibili
          }, { avid: request.query.avid }
        )
      )
    })

    Client.get<BilibiliRequest>('/api/bilibili/fetch_user_full_view', async (request, reply) => {
      reply.type('application/json').send(
        await bilibiliResult(
          {
            type: BilibiliDataType.获取UP主总播放量,
            cookie: this.bilibili
          }, { host_mid: request.query.host_mid }
        )
      )
    })

    Client.get<KusiahouRequest>('/api/kuaishou/fetch_one_work', async (request, reply) => {
      reply.type('application/json').send(
        await kuaishouResult(
          {
            type: KuaishouDataType.单个视频作品数据,
            cookie: this.kuaishou
          }, { photoId: request.query.photoId }
        )
      )
    })

    Client.get<KusiahouRequest>('/api/kuaishou/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await kuaishouResult(
          {
            type: KuaishouDataType.评论数据,
            cookie: this.kuaishou
          }, { photoId: request.query.photoId }
        )
      )
    })

    Client.get<KusiahouRequest>('/api/kuaishou/fetch_emoji_list', async (request, reply) => {
      reply.type('application/json').send(
        await kuaishouResult({
          type: KuaishouDataType.Emoji数据,
          cookie: this.kuaishou
        })
      )
    })

    Client.listen({ port, host: '::' }, (_err, _address) => {
      if (_err) Client.log.error(_err)
      logger.mark(`amagi server ${logger.green(`listening on ${port}`)} port. ${logger.yellow('API docs: https://amagi.apifox.cn')}`)
    })

    return Client
  }

  /**
   * 获取抖音数据
   * @param type 请求数据类型
   * @param options 请求参数，是一个对象
   * @returns 返回接口的原始数据，失败返回false
   */
  getDouyinData = async <T extends keyof DouyinDataOptionsMap = keyof DouyinDataOptionsMap> (
    type: T,
    options?: DouyinDataOptionsMap[T]
  ): Promise<boolean | any> => {
    return await getDouyinData(type, this.douyin, options)
  }

  /**
   * 获取B站数据
   * @param type 请求数据类型
   * @param options 请求参数，是一个对象
   * @returns 返回接口的原始数据，失败返回false
   */
  getBilibiliData = async <T extends keyof BilibiliDataOptionsMap = keyof BilibiliDataOptionsMap> (
    type: T,
    options?: BilibiliDataOptionsMap[T]
  ): Promise<boolean | any> => {
    return await getBilibiliData(type, this.bilibili, options)
  }

  /**
   * 获取快手数据
   * @param type 请求数据类型
   * @param options 请求参数，是一个对象
   * @returns 返回接口的原始数据，失败返回false
   */
  getKuaishouData = async <T extends keyof KuaishouDataOptionsMap = keyof KuaishouDataOptionsMap> (
    type: T,
    options?: KuaishouDataOptionsMap[T]
  ): Promise<boolean | any> => {
    return await getKuaishouData(type, this.kuaishou, options)
  }
}
