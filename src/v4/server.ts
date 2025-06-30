import {
  logger,
  logMiddleware
} from 'amagi/model'
import {
  getBilibiliData,
  getDouyinData,
  getKuaishouData,
} from './DataFetchers'
import {
  createBilibiliRoutes,
  createDouyinRoutes,
  createKuaishouRoutes
} from 'amagi/platform'
import {
  BilibiliDataOptions,
  BilibiliDataOptionsMap,
  DouyinDataOptions,
  DouyinDataOptionsMap,
  KuaishouDataOptions,
  KuaishouDataOptionsMap,
} from 'amagi/types'
import express, { Response } from 'express'

/**
 * v4兼容中间件 - 将v5的包装响应转换为v4的原始数据格式
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - Express下一个中间件函数
 */
const v4CompatibilityMiddleware = (req: any, res: Response, next: any) => {
  const originalJson = res.json

  res.json = function (data: any) {
    // 如果响应数据包含v5格式的包装（有data字段），则提取原始数据
    if (data && typeof data === 'object' && 'data' in data && 'message' in data && 'code' in data) {
      // 保留requestPath但返回原始数据
      const v4Response = {
        ...data.data,
        ...(data.requestPath && { requestPath: data.requestPath })
      }
      return originalJson.call(this, v4Response)
    }

    // 如果不是v5格式，直接返回原数据
    return originalJson.call(this, data)
  }

  next()
}

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
  #douyin: string
  #bilibili: string
  #kuaishou: string

  /**
   *
   * @param cookie - 包含抖音ck、B站ck、快手ck的对象
   */
  constructor (options: cookiesOptions) {
    this.#douyin = options?.douyin ?? ''
    this.#bilibili = options?.bilibili ?? ''
    this.#kuaishou = options?.kuaishou ?? ''
  }

  /**
   * 启动本地 HTTP 服务
   * @param port - 监听端口
   * @defaultValue `port` 4567
   * @returns Express 应用实例
   */
  public startClient = (port = 4567): express.Application => {
    const app = express()

    app.get('/', (_req, res) => {
      res.redirect(301, 'https://amagi.apifox.cn')
    })
    app.get('/docs', (_req, res) => {
      res.redirect(301, 'https://amagi.apifox.cn')
    })

    // 日志中间件
    app.use(logMiddleware(['/api/douyin', '/api/bilibili', '/api/kuaishou']))

    // v4兼容中间件 - 自动转换v5响应格式为v4格式
    app.use('/api/douyin', v4CompatibilityMiddleware)
    app.use('/api/bilibili', v4CompatibilityMiddleware)
    app.use('/api/kuaishou', v4CompatibilityMiddleware)

    // 使用v5的路由，但通过中间件自动转换响应格式
    app.use('/api/douyin', createDouyinRoutes(this.#douyin))
    app.use('/api/bilibili', createBilibiliRoutes(this.#bilibili))
    app.use('/api/kuaishou', createKuaishouRoutes(this.#kuaishou))

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
  public getDouyinData = async <T extends keyof DouyinDataOptionsMap, R extends 'strict' | 'loose'> (
    methodType: T,
    options?: DouyinDataOptions<T> & { typeMode?: R }
  ): Promise<R extends 'strict' ? DouyinDataOptionsMap[T]['data'] : any> => {
    const fullOptions = {
      methodType,
      ...options
    } as DouyinDataOptions<T>
    const result = await getDouyinData(methodType, this.#douyin, fullOptions)
    // 如果是v5格式的包装响应，提取data字段
    return result && typeof result === 'object' && 'data' in result ? result.data : result
  }

  /**
   * 快捷获取B站数据
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  public getBilibiliData = async <T extends keyof BilibiliDataOptionsMap, R extends 'strict' | 'loose'> (
    methodType: T,
    options?: BilibiliDataOptions<T> & { typeMode?: R }
  ): Promise<R extends 'strict' ? BilibiliDataOptionsMap[T]['data'] : any> => {
    const fullOptions = {
      methodType,
      ...options
    } as BilibiliDataOptions<T>
    const result = await getBilibiliData(methodType, this.#bilibili, fullOptions)
    // 如果是v5格式的包装响应，提取data字段
    return result && typeof result === 'object' && 'data' in result ? result.data : result
  }

  /**
   * 快捷获取快手数据
   * @param type - 请求数据类型
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  public getKuaishouData = async <T extends keyof KuaishouDataOptionsMap, R extends 'strict' | 'loose'> (
    methodType: T,
    options?: KuaishouDataOptions<T> & { typeMode?: R }
  ): Promise<R extends 'strict' ? KuaishouDataOptionsMap[T]['data'] : any> => {
    const fullOptions = {
      methodType,
      ...options
    } as KuaishouDataOptions<T>
    const result = await getKuaishouData(methodType, this.#kuaishou, fullOptions)
    // 如果是v5格式的包装响应，提取data字段
    return result && typeof result === 'object' && 'data' in result ? result.data : result
  }
}