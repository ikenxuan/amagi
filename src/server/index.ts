import express from 'express'
import { getDouyinData, getBilibiliData, getKuaishouData, ExtendedDouyinOptions, ExtendedBilibiliOptions, ExtendedKuaishouOptions, ConditionalReturnType, TypeMode } from 'amagi/model/DataFetchers'
import { logger } from 'amagi/model'
import { DouyinMethodType, BilibiliMethodType, KuaishouMethodType, ApiResponse } from 'amagi/validation'
import { createDouyinRoutes, createBilibiliRoutes, createKuaishouRoutes } from 'amagi/platform'
import { BilibiliDataOptionsMap, DouyinDataOptionsMap, KuaishouDataOptionsMap } from 'amagi/types'

/**
 * Cookie配置选项接口
 */
export type CookieOptions = {
  /** 抖音Cookie */
  douyin?: string
  /** B站Cookie */
  bilibili?: string
  /** 快手Cookie */
  kuaishou?: string
}

/**
 * 创建Amagi客户端实例
 * @param options - Cookie配置选项
 * @returns 包含数据获取方法和服务器启动方法的对象
 */
export const createAmagiClient = (options?: CookieOptions) => {
  const douyinCookie = options?.douyin ?? ''
  const bilibiliCookie = options?.bilibili ?? ''
  const kuaishouCookie = options?.kuaishou ?? ''

  /**
   * 启动本地HTTP服务
   * @param port - 监听端口，默认4567
   * @returns Express应用实例
   */
  const startServer = (port = 4567): express.Application => {
    const app = express()

    // 解析JSON请求体
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // 根路径重定向到文档
    app.get('/', (_req, res) => {
      res.redirect(301, 'https://amagi.apifox.cn')
    })

    app.get('/docs', (_req, res) => {
      res.redirect(301, 'https://amagi.apifox.cn')
    })

    // 注册平台路由
    app.use('/api/douyin', createDouyinRoutes(douyinCookie))
    app.use('/api/bilibili', createBilibiliRoutes(bilibiliCookie))
    app.use('/api/kuaishou', createKuaishouRoutes(kuaishouCookie))

    // 启动服务
    app.listen(port, '::', () => {
      logger.mark(`Amagi server listening on ${logger.green(`http://localhost:${port}`)} ${logger.yellow('API docs: https://amagi.apifox.cn ')}`)
    })

    return app
  }

  /**
   * 启动本地HTTP服务
   * @param port - 监听端口，默认4567
   * @returns Express应用实例
   * @deprecated 此方法已废弃，请使用 startServer 方法代替
   */
  const startClient = (port = 4567) => {
    return startServer(port)
  }

  /**
   * 获取抖音数据
   * @param methodType - 请求数据类型 ConditionalReturnType
   * @param options - 请求参数
   * @returns 返回包装在data字段中的数据
   */
  const getDouyinDataWithCookie = async <T extends DouyinMethodType, M extends TypeMode> (
    methodType: T,
    options?: ExtendedDouyinOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<DouyinDataOptionsMap[T]['data'], M>>> => {
    return await getDouyinData(methodType, options, douyinCookie)
  }

  /**
   * 获取B站数据
   * @param methodType - 请求数据类型
   * @param options - 请求参数
   * @returns 返回包装在data字段中的数据
   */
  const getBilibiliDataWithCookie = async <T extends BilibiliMethodType, M extends TypeMode> (
    methodType: T,
    options?: ExtendedBilibiliOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<BilibiliDataOptionsMap[T]['data'], M>>> => {
    return await getBilibiliData(methodType, options, bilibiliCookie)
  }

  /**
   * 获取快手数据
   * @param methodType - 请求数据类型
   * @param options - 请求参数
   * @returns 返回包装在data字段中的数据
   */
  const getKuaishouDataWithCookie = async <T extends KuaishouMethodType, M extends TypeMode> (
    methodType: T,
    options?: ExtendedKuaishouOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<KuaishouDataOptionsMap[T]['data'], M>>> => {
    return await getKuaishouData(methodType, options, kuaishouCookie)
  }

  return {
    startServer,
    /** @deprecated 此方法已废弃，请使用 startServer 方法代替 */
    startClient,
    getDouyinData: getDouyinDataWithCookie,
    getBilibiliData: getBilibiliDataWithCookie,
    getKuaishouData: getKuaishouDataWithCookie
  }
}

// 导出默认客户端创建函数
export default createAmagiClient
