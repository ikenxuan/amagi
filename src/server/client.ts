import {
  getBilibiliData,
  getDouyinData,
  getKuaishouData,
  logger
} from 'amagi/model'
import {
  registerBilibiliRoutes,
  registerDouyinRoutes,
  registerKuaishouRoutes
} from 'amagi/platform'
import {
  BilibiliDataOptions,
  BilibiliDataOptionsMap,
  DouyinDataOptions,
  DouyinDataOptionsMap,
  KuaishouDataOptions,
  KuaishouDataOptionsMap
} from 'amagi/types'
import Fastify from 'fastify'

export type ckParams = {
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
   * @param cookie - 包含抖音ck、B站ck、快手ck的对象
   */
  constructor (data: ckParams) {
    this.douyin = data.douyin ?? ''
    this.bilibili = data.bilibili ?? ''
    this.kuaishou = data.kuaishou ?? ''
  }

  /**
   * 启动本地http服务
   * @param port - 监听端口
   * @defaultValue `port` 4567
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

    registerDouyinRoutes(Client, this.douyin)
    registerBilibiliRoutes(Client, this.bilibili)
    registerKuaishouRoutes(Client, this.kuaishou)

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
   * import Client from '@ikenxuan/amagi'
   *
   * const amagi = new Client({
   *  douyin: '' // 有效的抖音ck
   * })
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
   * import Client from '@ikenxuan/amagi'
   *
   * const amagi = new Client({
   *  bilibili: '' // 有效的B站ck
   * })
   * const data = await amagi.getBilibiliData('单个视频作品数据', {
   *  bvid: 'BV1fK4y1q79u'
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
   * import Client from '@ikenxuan/amagi'
   *
   * const amagi = new Client({
   *  kuaishou: '' // 有效的快手ck
   * })
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
