import { mergeConfig } from 'axios'

import type { RequestConfig } from '../contracts/request'
import { bilibiliRegistry } from '../platforms/bilibili/endpoints'
import { awemeRegistry, douyinWebRegistry, douyinGuestAppRegistry } from '../platforms/douyin/registry'
import { checkDouyinLoginState } from '../platforms/douyin/web/loginState'
import { kuaishouRegistry } from '../platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from '../platforms/xiaohongshu/endpoints'
import { createApi } from './api'
import type { AmagiClient } from './api-types'
import { createLegacyClient } from './legacy-client'
import type { ClientOptions } from './options'

export type { ClientOptions, PlatformOptions, DouyinOptions, XiaohongshuOptions } from './options'
export type { FacadeServerOptions } from './legacy-client'
export { MIGRATED } from './legacy-client'

const requests = (...layers: Array<RequestConfig | undefined>): RequestConfig =>
  layers.reduce<RequestConfig>((base, layer) => mergeConfig(base, layer ?? {}), {})

/** 包根客户端：抖音按端选择，其他平台直接调用；工具集中在包根 tools。 */
export const createClient = (options: ClientOptions = {}): AmagiClient => {
  const douyinCookie = options.douyin?.web?.cookie ?? ''
  const douyinWeb = requests(options.request, options.douyin?.request, options.douyin?.web?.request)
  const douyinApp = requests(options.request, options.douyin?.request, options.douyin?.app?.request)
  const bilibili = requests(options.request, options.bilibili?.request)
  const kuaishou = requests(options.request, options.kuaishou?.request)
  const xiaohongshu = requests(options.request, options.xiaohongshu?.request)
  const runtime = createLegacyClient({
    cookies: {
      douyin: douyinCookie,
      bilibili: options.bilibili?.cookie,
      kuaishou: options.kuaishou?.cookie,
      xiaohongshu: options.xiaohongshu?.cookie
    },
    douyinApp: { signerUrl: options.douyin?.app?.signerUrl ?? '' },
    xiaohongshuSession: options.xiaohongshu?.session,
    request: options.request,
    platformRequests: { douyin: douyinWeb, douyinApp, bilibili, kuaishou, xiaohongshu },
    debug: options.debug
  })
  const web = createApi('douyin', douyinWebRegistry, runtime.douyin.fetcher)
  const app = createApi('douyin', awemeRegistry, runtime.douyin.fetcher.aweme)
  const guestApp = createApi('douyin', douyinGuestAppRegistry, runtime.douyin.fetcher)
  const bili = createApi('bilibili', bilibiliRegistry, runtime.bilibili.fetcher)
  const ks = createApi('kuaishou', kuaishouRegistry, runtime.kuaishou.fetcher)
  const xhs = createApi('xiaohongshu', xiaohongshuRegistry, runtime.xiaohongshu.fetcher)
  return {
    startServer: runtime.startServer,
    events: runtime.events,
    on: runtime.on,
    once: runtime.once,
    douyin: {
      web: {
        ...web.data,
        request: runtime.douyin.request,
        auth: {
          ...web.auth,
          ...runtime.douyin.login,
          status: (requestConfig?: RequestConfig) =>
            checkDouyinLoginState(douyinCookie, { requestConfig: requestConfig ? requests(douyinWeb, requestConfig) : douyinWeb })
        }
      },
      app: { ...app.data, ...guestApp.data, request: runtime.douyin.appRequest }
    },
    bilibili: {
      ...bili.data,
      request: runtime.bilibili.request,
      auth: { ...bili.auth, ...runtime.bilibili.login, refresh: runtime.bilibili.refreshCredential }
    },
    kuaishou: { ...ks.data, request: runtime.kuaishou.request, auth: { ...ks.auth, ...runtime.kuaishou.login } },
    xiaohongshu: { ...xhs.data, request: runtime.xiaohongshu.request, auth: { ...xhs.auth, ...runtime.xiaohongshu.login } }
  }
}
