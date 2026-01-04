import { ConditionalReturnType, ExtendedBilibiliOptions, ExtendedDouyinOptions, ExtendedKuaishouOptions, ExtendedXiaohongshuOptions, getBilibiliData, getDouyinData, getKuaishouData, getXiaohongshuData, TypeMode } from 'amagi/model/DataFetchers'
import { amagiEvents, emitLogMark } from 'amagi/model/events'
import { createBoundBilibiliFetcher, createBoundDouyinFetcher, createBoundKuaishouFetcher, createBoundXiaohongshuFetcher } from 'amagi/model/fetchers'
import { bilibiliUtils, createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, douyinUtils, kuaishouUtils } from 'amagi/platform'
import { createBoundBilibiliApi } from 'amagi/platform/bilibili/BilibiliApi'
import { createBoundDouyinApi } from 'amagi/platform/douyin/DouyinApi'
import { createBoundKuaishouApi } from 'amagi/platform/kuaishou/KuaishouApi'
import { createBoundXiaohongshuApi, createXiaohongshuRoutes, xiaohongshuUtils } from 'amagi/platform/xiaohongshu'
import { BilibiliDataOptionsMap, DouyinDataOptionsMap, KuaishouDataOptionsMap, XiaohongshuDataOptionsMap } from 'amagi/types'
import { BilibiliMethodType, DouyinMethodType, KuaishouMethodType, Result } from 'amagi/validation'
import { XiaohongshuMethodType } from 'amagi/validation/xiaohongshu'
import { AxiosRequestConfig } from 'axios'
import { Chalk } from 'chalk'
import express from 'express'

const chalk = new Chalk()

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
  /** 小红书Cookie */
  xiaohongshu?: string
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
  const xiaohongshuCookie = options?.cookies?.xiaohongshu ?? ''
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
    app.use('/api/xiaohongshu', createXiaohongshuRoutes(xiaohongshuCookie, requestConfig))

    // 启动服务
    app.listen(port, '::', () => {
      emitLogMark(`Amagi server listening on ${chalk.green(`http://localhost:${port}`)} ${chalk.yellow('API docs: https://amagi.apifox.cn ')}`)
    })

    return app
  }

  /**
   * 获取抖音数据
   * @param methodType - 请求数据类型
   * @param options - 请求参数
   * @returns 返回包装在data字段中的数据
   */
  const getDouyinDataWithCookie = async <
    const T extends DouyinMethodType,
    const Opts extends ExtendedDouyinOptions<T>,
    M extends TypeMode = Opts extends { typeMode: infer Mode extends TypeMode } ? Mode : 'loose'
  > (
    methodType: T,
    options?: Opts
  ): Promise<Result<
    T extends '搜索数据'
      ? Opts extends { type: infer SearchType }
        ? SearchType extends '综合'
          ? import('amagi/types/ReturnDataType/Douyin/SearchInfo').SearchInfoGeneralData
          : SearchType extends '用户'
            ? import('amagi/types/ReturnDataType/Douyin/SearchInfo').SearchInfoUser
            : SearchType extends '视频'
              ? import('amagi/types/ReturnDataType/Douyin/SearchInfo').SearchInfoVideo
              : DouyinDataOptionsMap[T]['data']
        : DouyinDataOptionsMap[T]['data']
      : ConditionalReturnType<DouyinDataOptionsMap[T]['data'], M>
  >> => {
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
  ): Promise<Result<ConditionalReturnType<BilibiliDataOptionsMap[T]['data'], M>>> => {
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
  ): Promise<Result<ConditionalReturnType<KuaishouDataOptionsMap[T]['data'], M>>> => {
    return await getKuaishouData(methodType, options, kuaishouCookie, requestConfig)
  }
  /**
   * 获取小红书数据
   * @param methodType - 请求数据类型
   * @param options - 请求参数
   * @returns 返回包装在data字段中的数据
   */
  const getXiaohongshuDataWithCookie = async <T extends XiaohongshuMethodType, M extends TypeMode> (
    methodType: T,
    options?: ExtendedXiaohongshuOptions<T> & { typeMode?: M }
  ): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap[T]['data'], M>>> => {
    return await getXiaohongshuData(methodType, options, xiaohongshuCookie, requestConfig)
  }

  return {
    /** 启动本地HTTP服务 */
    startServer,
    /** 事件系统 */
    events: amagiEvents,

    // ========== 旧 API (已废弃，保持向后兼容) ==========
    /** @deprecated 请使用 douyin.fetcher 替代 */
    getDouyinData: getDouyinDataWithCookie,
    /** @deprecated 请使用 bilibili.fetcher 替代 */
    getBilibiliData: getBilibiliDataWithCookie,
    /** @deprecated 请使用 kuaishou.fetcher 替代 */
    getKuaishouData: getKuaishouDataWithCookie,
    /** @deprecated 请使用 xiaohongshu.fetcher 替代 */
    getXiaohongshuData: getXiaohongshuDataWithCookie,

    // ========== 平台模块 ==========
    douyin: {
      ...douyinUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundDouyinApi(douyinCookie, requestConfig),
      /** v6 新 API - 绑定了 cookie 的英文方法名 fetcher */
      fetcher: createBoundDouyinFetcher(douyinCookie, requestConfig)
    },
    bilibili: {
      ...bilibiliUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundBilibiliApi(bilibiliCookie, requestConfig),
      /** v6 新 API - 绑定了 cookie 的英文方法名 fetcher */
      fetcher: createBoundBilibiliFetcher(bilibiliCookie, requestConfig)
    },
    kuaishou: {
      ...kuaishouUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundKuaishouApi(kuaishouCookie, requestConfig),
      /** v6 新 API - 绑定了 cookie 的英文方法名 fetcher */
      fetcher: createBoundKuaishouFetcher(kuaishouCookie, requestConfig)
    },
    xiaohongshu: {
      ...xiaohongshuUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundXiaohongshuApi(xiaohongshuCookie, requestConfig),
      /** v6 新 API - 绑定了 cookie 的英文方法名 fetcher */
      fetcher: createBoundXiaohongshuFetcher(xiaohongshuCookie, requestConfig)
    }
  }
}

// 导出默认客户端创建函数
export default createAmagiClient
