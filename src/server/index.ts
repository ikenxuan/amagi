import express from 'express'
import { getDouyinData, getBilibiliData, getKuaishouData, ExtendedDouyinOptions, ExtendedBilibiliOptions, ExtendedKuaishouOptions, ConditionalReturnType, TypeMode } from 'amagi/model/DataFetchers'
import { logger } from 'amagi/model'
import { DouyinMethodType, BilibiliMethodType, KuaishouMethodType, ApiResponse } from 'amagi/validation'
import { createDouyinRoutes, createBilibiliRoutes, createKuaishouRoutes, douyinUtils, bilibiliUtils, kuaishouUtils } from 'amagi/platform'
import { BilibiliDataOptionsMap, DouyinDataOptionsMap, KuaishouDataOptionsMap } from 'amagi/types'
import { createBoundDouyinApi } from 'amagi/platform/douyin/DouyinApi'
import { createBoundBilibiliApi } from 'amagi/platform/bilibili/BilibiliApi'
import { createBoundKuaishouApi } from 'amagi/platform/kuaishou/KuaishouApi'
import { AxiosRequestConfig } from 'axios'

/**
 * 请求配置选项接口
 */
export type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>


/**
 * Cookie配置选项接口
 */
export type CookieConfig = {
  /** 抖音Cookie */
  douyin?: string
  /** B站Cookie */
  bilibili?: string
  /** 快手Cookie */
  kuaishou?: string
}

/**
 * 客户端配置选项接口
 */
export type Options = {
  /** Cookie配置 */
  cookies?: CookieConfig
  /** 请求配置 */
  request?: Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>
}

/**
 * 创建Amagi客户端实例
 * @param options - 客户端配置选项，包含Cookie和请求配置
 * @returns 包含数据获取方法、服务器启动方法、绑定Cookie的平台工具集和API对象的对象
 */
export const createAmagiClient = (options?: Options) => {
  const douyinCookie = options?.cookies?.douyin ?? ''
  const bilibiliCookie = options?.cookies?.bilibili ?? ''
  const kuaishouCookie = options?.cookies?.kuaishou ?? ''
  const requestConfig = options?.request ?? {}

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
    app.use('/api/douyin', createDouyinRoutes(douyinCookie, requestConfig))
    app.use('/api/bilibili', createBilibiliRoutes(bilibiliCookie, requestConfig))
    app.use('/api/kuaishou', createKuaishouRoutes(kuaishouCookie, requestConfig))

    // 启动服务
    app.listen(port, '::', () => {
      logger.mark(`Amagi server listening on ${logger.green(`http://localhost:${port}`)} ${logger.yellow('API docs: https://amagi.apifox.cn ')}`)
    })

    return app
  }

  /**
   * 获取抖音数据
   * @param methodType - 请求数据类型
   * @param options - 请求参数
   * @returns 返回包装在data字段中的数据
   */
  const getDouyinDataWithCookie = async <T extends DouyinMethodType, M extends TypeMode> (
    methodType: T,
    options?: ExtendedDouyinOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<DouyinDataOptionsMap[T]['data'], M>>> => {
    return await getDouyinData(methodType, options, douyinCookie, requestConfig)
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
    return await getBilibiliData(methodType, options, bilibiliCookie, requestConfig)
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
    return await getKuaishouData(methodType, options, kuaishouCookie, requestConfig)
  }

  return {
    /** 启动本地HTTP服务 */
    startServer,
    getDouyinData: getDouyinDataWithCookie,
    getBilibiliData: getBilibiliDataWithCookie,
    getKuaishouData: getKuaishouDataWithCookie,
    douyin: {
      ...douyinUtils,
      /** 绑定了cookie和请求配置的抖音API对象，调用时不需要传递cookie */
      api: createBoundDouyinApi(douyinCookie, requestConfig)
    },
    bilibili: {
      ...bilibiliUtils,
      /** 绑定了cookie和请求配置的B站API对象，调用时不需要传递cookie */
      api: createBoundBilibiliApi(bilibiliCookie, requestConfig)
    },
    kuaishou: {
      ...kuaishouUtils,
      /** 绑定了cookie和请求配置的快手API对象，调用时不需要传递cookie */
      api: createBoundKuaishouApi(kuaishouCookie, requestConfig)
    },
  }
}

// 导出默认客户端创建函数
export default createAmagiClient