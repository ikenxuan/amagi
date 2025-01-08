import { logger } from 'amagi/model'
import {
  getBilibiliData,
  getDouyinData,
  getKuaishouData
} from 'amagi/model/DataFetchers'
import { DouyinData, KuaishouData } from 'amagi/platform'
import { BilibiliData } from 'amagi/platform/bilibili'
import {
  BilibiliDataOptions,
  BilibiliDataOptionsMap,
  DouyinDataOptions,
  DouyinDataOptionsMap,
  KuaishouDataOptions,
  KuaishouDataOptionsMap,
  KuaishouDataType
} from 'amagi/types'
import Fastify, { FastifyRequest } from 'fastify'

interface DouyinRequest<T extends keyof DouyinDataOptionsMap> extends FastifyRequest {
  Querystring: Omit<DouyinDataOptionsMap[T], 'methodType'>
}

interface BilibiliRequest<T extends keyof BilibiliDataOptionsMap> extends FastifyRequest {
  Querystring: Omit<BilibiliDataOptionsMap[T], 'methodType'>
}

interface KusiahouRequest<T extends keyof KuaishouDataOptionsMap> extends FastifyRequest {
  Querystring: Omit<KuaishouDataOptionsMap[T], 'methodType'>
}

export type initClientParams = {
  /**
   * 抖音ck
   * @defaultValue ''
   */
  douyin?: string
  /**
   * B站ck
   * @defaultValue ''
   */
  bilibili?: string
  /**
   * 快手ck
   * @defaultValue ''
   */
  kuaishou?: string
}

export class amagi {
  private douyin: string
  private bilibili: string
  private kuaishou: string

  /**
   *
   * @param data - 一个对象，里面包含 douyin 和 bilibili 两个字段，分别对应抖音和B站cookie
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
   * 启动本地http服务
   * @param port - 监听端口
   * @defaultValue port 4567
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

    Client.get<DouyinRequest<'单个视频作品数据'>>('/api/douyin/fetch_one_work', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '单个视频作品数据',
          aweme_id: request.query.aweme_id
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'评论数据'>>('/api/douyin/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '评论数据',
          aweme_id: request.query.aweme_id
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'二级评论数据'>>('/api/douyin/fetch_video_comment_replies', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '二级评论数据',
          aweme_id: request.query.aweme_id,
          comment_id: request.query.comment_id
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'用户主页数据'>>('/api/douyin/fetch_user_info', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '用户主页数据',
          sec_uid: request.query.sec_uid
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'用户主页视频列表数据'>>('/api/douyin/fetch_user_post_videos', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '用户主页视频列表数据',
          sec_uid: request.query.sec_uid
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'热点词数据'>>('/api/douyin/fetch_suggest_words', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '热点词数据',
          query: request.query.query
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'搜索数据'>>('/api/douyin/fetch_search_info', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '搜索数据',
          query: request.query.query,
          number: request.query.number
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'Emoji数据'>>('/api/douyin/fetch_emoji_list', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: 'Emoji数据'
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'动态表情数据'>>('/api/douyin/fetch_emoji_pro_list', async (_request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '动态表情数据'
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'音乐数据'>>('/api/douyin/fetch_music_work', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '音乐数据',
          music_id: request.query.music_id
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'合辑作品数据'>>('/api/douyin/fetch_user_mix_videos', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '合辑作品数据',
          aweme_id: request.query.aweme_id
        }, this.douyin)
      )
    })

    Client.get<DouyinRequest<'直播间信息数据'>>('/api/douyin/fetch_user_live_videos', async (request, reply) => {
      reply.type('application/json').send(
        await DouyinData({
          methodType: '直播间信息数据',
          sec_uid: request.query.sec_uid
        }, this.douyin)
      )
    })
    Client.get<BilibiliRequest<'申请二维码'>>('/api/bilibili/new_login_qrcode', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '申请二维码'
        })
      )
    })

    Client.get<BilibiliRequest<'二维码状态'>>('/api/bilibili/check_qrcode', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '二维码状态',
          qrcode_key: request.query.qrcode_key
        })
      )
    })

    Client.get<BilibiliRequest<'登录基本信息'>>('/api/bilibili/login_basic_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '登录基本信息'
        }, request.headers.cookie))
    })

    Client.get<BilibiliRequest<'单个视频作品数据'>>('/api/bilibili/fetch_one_video', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '单个视频作品数据',
          bvid: request.query.bvid
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'单个视频下载信息数据'>>('/api/bilibili/fetch_video_playurl', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '单个视频下载信息数据',
          avid: request.query.avid,
          cid: request.query.cid
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'评论数据'>>('/api/bilibili/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '评论数据',
          oid: Number(request.query.oid),
          number: Number(request.query.number),
          type: Number(request.query.type ?? 1)
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'Emoji数据'>>('/api/bilibili/fetch_emoji_list', async (_request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: 'Emoji数据'
        })
      )
    })

    Client.get<BilibiliRequest<'番剧基本信息数据'>>('/api/bilibili/fetch_bangumi_video_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '番剧基本信息数据',
          ep_id: request.query.ep_id
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'番剧下载信息数据'>>('/api/bilibili/fetch_bangumi_video_playurl', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '番剧下载信息数据',
          cid: request.query.cid,
          ep_id: request.query.ep_id
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'用户主页动态列表数据'>>('/api/bilibili/fetch_user_dynamic', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '用户主页动态列表数据',
          host_mid: request.query.host_mid
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'动态详情数据'>>('/api/bilibili/fetch_dynamic_info', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '动态详情数据',
          dynamic_id: request.query.dynamic_id
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'动态卡片数据'>>('/api/bilibili/fetch_dynamic_card', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData(
          {
            methodType: '动态卡片数据',
            dynamic_id: request.query.dynamic_id
          }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'用户主页数据'>>('/api/bilibili/fetch_user_profile', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData(
          {
            methodType: '用户主页数据',
            host_mid: request.query.host_mid
          }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'直播间信息'>>('/api/bilibili/fetch_live_room_detail', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '直播间信息',
          room_id: request.query.room_id
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'直播间初始化信息'>>('/api/bilibili/fetch_liveroom_def', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '直播间初始化信息',
          room_id: request.query.room_id
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'BV转AV'>>('/api/bilibili/bv_to_av', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: 'BV转AV',
          bvid: request.query.bvid
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'AV转BV'>>('/api/bilibili/av_to_bv', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: 'AV转BV',
          avid: request.query.avid
        }, this.bilibili)
      )
    })

    Client.get<BilibiliRequest<'获取UP主总播放量'>>('/api/bilibili/fetch_user_full_view', async (request, reply) => {
      reply.type('application/json').send(
        await BilibiliData({
          methodType: '获取UP主总播放量',
          host_mid: request.query.host_mid
        }, this.bilibili)
      )
    })

    Client.get<KusiahouRequest<'单个视频作品数据'>>('/api/kuaishou/fetch_one_work', async (request, reply) => {
      reply.type('application/json').send(
        await KuaishouData({
          methodType: '单个视频作品数据',
          photoId: request.query.photoId
        }, this.kuaishou)
      )
    })

    Client.get<KusiahouRequest<'评论数据'>>('/api/kuaishou/fetch_work_comments', async (request, reply) => {
      reply.type('application/json').send(
        await KuaishouData({
          methodType: '评论数据',
          photoId: request.query.photoId
        }, this.kuaishou)
      )
    })

    Client.get<KusiahouRequest<'Emoji数据'>>('/api/kuaishou/fetch_emoji_list', async (request, reply) => {
      reply.type('application/json').send(
        await KuaishouData({
          methodType: 'Emoji数据'
        }, this.kuaishou)
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
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   * @example
   * ```ts
   * const data = await amagi.getDouyinData('搜索数据', {
   *   query: '114514',
   *   number: 10
   * })
   * ```
   */
  getDouyinData = async <T extends keyof DouyinDataOptionsMap = keyof DouyinDataOptionsMap> (
    methodType: T,
    options?: DouyinDataOptions<T>
  ): Promise<any> => {
    const fullOptions: DouyinDataOptionsMap[T] = {
      methodType,
      ...options
    } as DouyinDataOptionsMap[T]
    return await getDouyinData(methodType, this.douyin, fullOptions)
  }

  /**
   * 获取B站数据
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   * @example
   * ```ts
   * const data = await amagi.getBilibiliData('单个视频作品数据', {
   *   bvid: 'BV1fK4y1q79u'
   * })
   * ```
   */
  getBilibiliData = async <T extends keyof BilibiliDataOptionsMap = keyof BilibiliDataOptionsMap> (
    methodType: T,
    options?: BilibiliDataOptions<T>
  ): Promise<any> => {
    const fullOptions: BilibiliDataOptionsMap[T] = {
      methodType,
      ...options
    } as BilibiliDataOptionsMap[T]
    return await getBilibiliData(methodType, this.bilibili, fullOptions)
  }

  /**
   * 获取快手数据
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   * @example
   * ```ts
   * const data = await amagi.getKuaishouData('单个视频作品数据', {
   *   photoId: '3xdpv6sfi8yjsqy'
   * })
   * ```
   */
  getKuaishouData = async <T extends keyof KuaishouDataOptionsMap = keyof KuaishouDataOptionsMap> (
    methodType: T,
    options?: KuaishouDataOptions<T>
  ): Promise<any> => {
    const fullOptions: KuaishouDataOptionsMap[T] = {
      methodType,
      ...options
    } as KuaishouDataOptionsMap[T]
    return await getKuaishouData(methodType, this.kuaishou, fullOptions)
  }
}
