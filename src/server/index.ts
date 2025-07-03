import express from 'express'
import { getDouyinData, getBilibiliData, getKuaishouData, ExtendedDouyinOptions, ExtendedBilibiliOptions, ExtendedKuaishouOptions, ConditionalReturnType, TypeMode } from 'amagi/model/DataFetchers'
import { logger } from 'amagi/model'
import { DouyinMethodType, BilibiliMethodType, KuaishouMethodType, ApiResponse } from 'amagi/validation'
import { createDouyinRoutes, createBilibiliRoutes, createKuaishouRoutes, douyinUtils, bilibiliUtils, kuaishouUtils } from 'amagi/platform'
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
 * 绑定Cookie的抖音API类型定义
 */
type BoundDouyinApi = {
  [K in keyof typeof douyinUtils.api]: (
    options: Parameters<typeof douyinUtils.api[K]>[0]
  ) => ReturnType<typeof douyinUtils.api[K]>
}

/**
 * 绑定Cookie的B站API类型定义
 */
type BoundBilibiliApi = {
  [K in keyof typeof bilibiliUtils.api]: (
    options: Parameters<typeof bilibiliUtils.api[K]>[0]
  ) => ReturnType<typeof bilibiliUtils.api[K]>
}

/**
 * 绑定Cookie的快手API类型定义
 */
type BoundKuaishouApi = {
  [K in keyof typeof kuaishouUtils.api]: (
    options: Parameters<typeof kuaishouUtils.api[K]>[0]
  ) => ReturnType<typeof kuaishouUtils.api[K]>
}

/**
 * 绑定Cookie的抖音工具集类型定义
 */
type BoundDouyinUtils = Omit<typeof douyinUtils, 'api'> & {
  /** 此方法所有接口均已自动携带 Cookie */
  api: BoundDouyinApi
}

/**
 * 绑定Cookie的B站工具集类型定义
 */
type BoundBilibiliUtils = Omit<typeof bilibiliUtils, 'api'> & {
  /** 此方法所有接口均已自动携带 Cookie */
  api: BoundBilibiliApi
}

/**
 * 绑定Cookie的快手工具集类型定义
 */
type BoundKuaishouUtils = Omit<typeof kuaishouUtils, 'api'> & {
  /** 此方法所有接口均已自动携带 Cookie */
  api: BoundKuaishouApi
}

/**
 * 创建绑定Cookie的抖音工具集
 * @param cookie - 抖音Cookie
 * @returns 绑定了Cookie的抖音工具集
 */
const createBoundDouyinUtils = (cookie: string): BoundDouyinUtils => {
  const boundApi = {} as BoundDouyinApi

    // 为每个API方法创建绑定Cookie的版本
    ; (Object.keys(douyinUtils.api) as Array<keyof typeof douyinUtils.api>).forEach(key => {
      boundApi[key] = async (options: any) => {
        return await douyinUtils.api[key](options, cookie)
      }
    })

  return {
    ...douyinUtils,
    api: boundApi
  }
}

/**
 * 创建绑定Cookie的B站工具集
 * @param cookie - B站Cookie
 * @returns 绑定了Cookie的B站工具集
 */
const createBoundBilibiliUtils = (cookie: string): BoundBilibiliUtils => {
  const boundApi = {} as BoundBilibiliApi

    // 为每个API方法创建绑定Cookie的版本
    ; (Object.keys(bilibiliUtils.api) as Array<keyof typeof bilibiliUtils.api>).forEach(key => {
      boundApi[key] = async (options: any) => {
        return await bilibiliUtils.api[key](options, cookie)
      }
    })

  return {
    ...bilibiliUtils,
    api: boundApi
  }
}

/**
 * 创建绑定Cookie的快手工具集
 * @param cookie - 快手Cookie
 * @returns 绑定了Cookie的快手工具集
 */
const createBoundKuaishouUtils = (cookie: string): BoundKuaishouUtils => {
  const boundApi = {} as BoundKuaishouApi

    // 为每个API方法创建绑定Cookie的版本
    ; (Object.keys(kuaishouUtils.api) as Array<keyof typeof kuaishouUtils.api>).forEach(key => {
      boundApi[key] = async (options: any) => {
        return await kuaishouUtils.api[key](options, cookie)
      }
    })

  return {
    ...kuaishouUtils,
    api: boundApi
  }
}

/**
 * 创建Amagi客户端实例
 * @param options - Cookie配置选项
 * @returns 包含数据获取方法、服务器启动方法和绑定Cookie的平台工具集的对象
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
    /** 启动本地HTTP服务 */
    startServer,
    /** @deprecated 此方法已废弃，请使用 startServer 方法代替 */
    startClient,
    getDouyinData: getDouyinDataWithCookie,
    getBilibiliData: getBilibiliDataWithCookie,
    getKuaishouData: getKuaishouDataWithCookie,

    /** 抖音相关功能模块 (工具集) */
    douyin: createBoundDouyinUtils(douyinCookie),
    /** B站相关功能模块 (工具集) */
    bilibili: createBoundBilibiliUtils(bilibiliCookie),
    /** 快手相关功能模块 (工具集) */
    kuaishou: createBoundKuaishouUtils(kuaishouCookie)
  }
}

// 导出默认客户端创建函数
export default createAmagiClient