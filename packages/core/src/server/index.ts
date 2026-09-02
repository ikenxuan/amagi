/**
 * Amagi 服务器模块
 *
 * 提供客户端创建和 HTTP 服务器功能
 *
 * @module server
 */

import { amagiEvents, emitLogMark } from '../model/events'
import type { AmagiEventMap, AmagiEventType } from '../model/events'
import {
  createBoundBilibiliFetcher,
  createBoundDouyinFetcher,
  createBoundKuaishouFetcher,
  createBoundXiaohongshuFetcher
} from '../model/fetchers'
import { bilibiliUtils, createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, douyinUtils, kuaishouUtils } from '../platform'
import { createXiaohongshuRoutes, xiaohongshuUtils } from '../platform/xiaohongshu'
import { GENERATED_REFERENCE_URL, mountOpenApiSpec } from './auth'
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
   * @param serverOptions - 可选：`openapi` 为 `true` 时自托管规范
   *   （`GET /openapi.json` 现算现返，`/docs` 改跳生成的端点参考）。默认不挂，行为与 v6 一致
   * @returns Express应用实例
   */
  const startServer = (port = 4567, serverOptions: { openapi?: boolean } = {}): express.Application => {
    const app = express()

    // 解析JSON请求体
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // 根路径重定向到文档
    app.get('/', (_req, res) => {
      res.redirect(301, 'https://amagi.apifox.cn')
    })

    // 开了 openapi 时 /docs 指向生成的端点参考。302 而非 301：301 会被浏览器
    // 永久缓存，先访问过未开 openapi 的服务就再也跳不过来了
    app.get('/docs', (_req, res) => {
      if (serverOptions.openapi === true) {
        res.redirect(302, GENERATED_REFERENCE_URL)
        return
      }
      res.redirect(301, 'https://amagi.apifox.cn')
    })

    // 自托管规范：与选项版 startServer 共用同一个挂载函数
    if (serverOptions.openapi === true) {
      mountOpenApiSpec(app)
    }

    // 注册平台路由
    app.use('/api/douyin', createDouyinRoutes(douyinCookie, requestConfig))
    app.use('/api/bilibili', createBilibiliRoutes(bilibiliCookie, requestConfig))
    app.use('/api/kuaishou', createKuaishouRoutes(kuaishouCookie, requestConfig))
    app.use('/api/xiaohongshu', createXiaohongshuRoutes(xiaohongshuCookie, requestConfig))

    // 启动服务
    app.listen(port, '::', () => {
      emitLogMark(
        `Amagi server listening on ${chalk.green(`http://localhost:${port}`)} ${chalk.yellow('API docs: https://amagi.apifox.cn ')}`
      )
    })

    return app
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
    on: <K extends AmagiEventType>(event: K, listener: (data: AmagiEventMap[K]) => void) => amagiEvents.on(event, listener),
    /**
     * 注册一次性事件监听器
     * @param event - 事件名称
     * @param listener - 事件处理函数 (只触发一次)
     */
    once: <K extends AmagiEventType>(event: K, listener: (data: AmagiEventMap[K]) => void) => amagiEvents.once(event, listener),

    // ========== 平台模块 ==========
    douyin: {
      ...douyinUtils,
      /** fetcher */
      fetcher: createBoundDouyinFetcher(douyinCookie, requestConfig)
    },
    bilibili: {
      ...bilibiliUtils,
      /** fetcher */
      fetcher: createBoundBilibiliFetcher(bilibiliCookie, requestConfig)
    },
    kuaishou: {
      ...kuaishouUtils,
      /** fetcher */
      fetcher: createBoundKuaishouFetcher(kuaishouCookie, requestConfig)
    },
    xiaohongshu: {
      ...xiaohongshuUtils,
      /** fetcher */
      fetcher: createBoundXiaohongshuFetcher(xiaohongshuCookie, requestConfig)
    }
  }
}

// 导出默认客户端创建函数
export default createAmagiClient
