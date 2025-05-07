import {
  getBilibiliData,
  getDouyinData,
  getKuaishouData,
  logger,
  logMiddleware
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
  KuaishouDataOptionsMap,
} from 'amagi/types'
import express from 'express'

export type cookiesOptions = {
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

export class amagiClient {
  private douyin: string
  private bilibili: string
  private kuaishou: string

  /**
   *
   * @param cookie - 包含抖音ck、B站ck、快手ck的对象
   */
  constructor (options: cookiesOptions) {
    this.douyin = options?.douyin ?? ''
    this.bilibili = options?.bilibili ?? ''
    this.kuaishou = options?.kuaishou ?? ''
  }

  /**
   * 启动本地 HTTP 服务
   * @param port - 监听端口
   * @defaultValue `port` 4567
   * @returns Express 应用实例
   */
  startClient (port = 4567): express.Application {
    const app = express()

    app.get('/', (_req, res) => {
      res.redirect(301, 'https://amagi.apifox.cn')
    })
    app.get('/docs', (_req, res) => {
      res.redirect(301, 'https://amagi.apifox.cn')
    })

    // 日志中间件
    app.use(logMiddleware(['/api/douyin', '/api/bilibili', '/api/kuaishou']))

    app.use('/api/douyin', registerDouyinRoutes(this.douyin))
    app.use('/api/bilibili', registerBilibiliRoutes(this.bilibili))
    app.use('/api/kuaishou', registerKuaishouRoutes(this.kuaishou))

    // 启动服务
    app.listen(port, '::', () => {
      logger.mark(`Amagi server listening on ${logger.green(`http://localhost:${port}`)} ${logger.yellow('API docs: https://amagi.apifox.cn ')}`)
    })

    return app
  }

  /**
   * 快捷获取抖音数据
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getDouyinData = async <T extends keyof DouyinDataOptionsMap, R extends 'strict' | 'loose'> (
    methodType: T,
    options?: DouyinDataOptions<T> & { typeMode?: R }
  ): Promise<R extends 'strict' ? DouyinDataOptionsMap[T]['data'] : any> => {
    const fullOptions = {
      methodType,
      ...options
    } as DouyinDataOptions<T>
    return await getDouyinData(methodType, this.douyin, fullOptions)
  }

  /**
   * 快捷获取B站数据
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getBilibiliData = async <T extends keyof BilibiliDataOptionsMap, R extends 'strict' | 'loose'> (
    methodType: T,
    options?: BilibiliDataOptions<T> & { typeMode?: R }
  ): Promise<R extends 'strict' ? BilibiliDataOptionsMap[T]['data'] : any> => {
    const fullOptions = {
      methodType,
      ...options
    } as BilibiliDataOptions<T>
    return await getBilibiliData(methodType, this.bilibili, fullOptions)
  }

  /**
   * 快捷获取快手数据
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getKuaishouData = async <T extends keyof KuaishouDataOptionsMap, R extends 'strict' | 'loose'> (
    methodType: T,
    options?: KuaishouDataOptions<T> & { typeMode?: R }
  ): Promise<R extends 'strict' ? KuaishouDataOptionsMap[T]['data'] : any> => {
    const fullOptions = {
      methodType,
      ...options
    } as KuaishouDataOptions<T>
    return await getKuaishouData(methodType, this.kuaishou, fullOptions)
  }
}

