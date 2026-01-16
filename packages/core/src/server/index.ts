/**
 * Amagi 服务器模块
 *
 * 提供客户端创建和 HTTP 服务器功能
 *
 * @module server
 */

import { amagiEvents, emitLogMark } from 'amagi/model/events'
import { createBoundBilibiliFetcher, createBoundDouyinFetcher, createBoundKuaishouFetcher, createBoundXiaohongshuFetcher } from 'amagi/model/fetchers'
import { bilibiliUtils, createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, douyinUtils, kuaishouUtils } from 'amagi/platform'
import { createBoundBilibiliApi } from 'amagi/platform/bilibili/BilibiliApi'
import { createBoundDouyinApi } from 'amagi/platform/douyin/DouyinApi'
import { createBoundKuaishouApi } from 'amagi/platform/kuaishou/KuaishouApi'
import { createBoundXiaohongshuApi, createXiaohongshuRoutes, xiaohongshuUtils } from 'amagi/platform/xiaohongshu'
import { checkDeprecation } from 'amagi/utils/deprecation'
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

  // ========== 废弃的 API 存根 ==========

  /**
   * @deprecated v6 已废弃，请使用 douyin.fetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  const getDouyinData = (..._args: any[]): never => {
    checkDeprecation('getDouyinData')
    throw new Error('getDouyinData 已废弃')
  }

  /**
   * @deprecated v6 已废弃，请使用 bilibili.fetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  const getBilibiliData = (..._args: any[]): never => {
    checkDeprecation('getBilibiliData')
    throw new Error('getBilibiliData 已废弃')
  }

  /**
   * @deprecated v6 已废弃，请使用 kuaishou.fetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  const getKuaishouData = (..._args: any[]): never => {
    checkDeprecation('getKuaishouData')
    throw new Error('getKuaishouData 已废弃')
  }

  /**
   * @deprecated v6 已废弃，请使用 xiaohongshu.fetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  const getXiaohongshuData = (..._args: any[]): never => {
    checkDeprecation('getXiaohongshuData')
    throw new Error('getXiaohongshuData 已废弃')
  }

  return {
    /** 启动本地HTTP服务 */
    startServer,
    /** 事件系统 */
    events: amagiEvents,
    /**
     * 注册事件监听器
     * @param event - 事件名称
     * @param listener - 事件处理函数
     */
    on: amagiEvents.on.bind(amagiEvents),
    /**
     * 注册一次性事件监听器
     * @param event - 事件名称
     * @param listener - 事件处理函数 (只触发一次)
     */
    once: amagiEvents.once.bind(amagiEvents),

    // ========== 废弃的 API (调用会抛出错误) ==========
    /** @deprecated v6 已废弃，请使用 douyin.fetcher 替代 */
    getDouyinData,
    /** @deprecated v6 已废弃，请使用 bilibili.fetcher 替代 */
    getBilibiliData,
    /** @deprecated v6 已废弃，请使用 kuaishou.fetcher 替代 */
    getKuaishouData,
    /** @deprecated v6 已废弃，请使用 xiaohongshu.fetcher 替代 */
    getXiaohongshuData,

    // ========== 平台模块 ==========
    douyin: {
      ...douyinUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundDouyinApi(douyinCookie, requestConfig),
      /** fetcher */
      fetcher: createBoundDouyinFetcher(douyinCookie, requestConfig)
    },
    bilibili: {
      ...bilibiliUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundBilibiliApi(bilibiliCookie, requestConfig),
      /** fetcher */
      fetcher: createBoundBilibiliFetcher(bilibiliCookie, requestConfig)
    },
    kuaishou: {
      ...kuaishouUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundKuaishouApi(kuaishouCookie, requestConfig),
      /** fetcher */
      fetcher: createBoundKuaishouFetcher(kuaishouCookie, requestConfig)
    },
    xiaohongshu: {
      ...xiaohongshuUtils,
      /** @deprecated 请使用 fetcher 替代 */
      api: createBoundXiaohongshuApi(xiaohongshuCookie, requestConfig),
      /** fetcher */
      fetcher: createBoundXiaohongshuFetcher(xiaohongshuCookie, requestConfig)
    }
  }
}

// 导出默认客户端创建函数
export default createAmagiClient
