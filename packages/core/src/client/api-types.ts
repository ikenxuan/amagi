import type { RequestConfig } from '../contracts/request'
import type { LoginNamespace } from '../contracts/session'
import type { bilibiliRegistry } from '../platforms/bilibili/endpoints'
import type { douyinAppRegistry, douyinWebRegistry } from '../platforms/douyin/endpoints'
import type { checkDouyinLoginState } from '../platforms/douyin/loginState'
import type { kuaishouRegistry } from '../platforms/kuaishou/endpoints'
import type { xiaohongshuRegistry } from '../platforms/xiaohongshu/endpoints'
import type { AuthApi, DataApi } from './api'
import type { createLegacyClient } from './legacy-client'
import type { AmagiRequest } from './request'

type Runtime = ReturnType<typeof createLegacyClient>

/** 登录会话与登录态查询，绑定当前 Web Cookie。 */
export interface DouyinWebAuth extends AuthApi<'douyin', typeof douyinWebRegistry>, LoginNamespace {
  status(requestConfig?: RequestConfig): ReturnType<typeof checkDouyinLoginState>
}
export interface BilibiliAuth extends AuthApi<'bilibili', typeof bilibiliRegistry>, LoginNamespace {
  refresh: Runtime['bilibili']['refreshCredential']
}
export interface KuaishouAuth extends AuthApi<'kuaishou', typeof kuaishouRegistry>, LoginNamespace {}
export interface XiaohongshuAuth extends LoginNamespace {}

/** 抖音 Web 数据接口。 */
export interface DouyinWebApi extends DataApi<'douyin', typeof douyinWebRegistry> {
  request: AmagiRequest
  auth: DouyinWebAuth
}
/** 抖音 App 数据接口，身份与签名由配置的签名服务维护。 */
export interface DouyinAppApi extends DataApi<'douyin', typeof douyinAppRegistry> {
  request: AmagiRequest
}
export interface BilibiliApi extends DataApi<'bilibili', typeof bilibiliRegistry> {
  request: AmagiRequest
  auth: BilibiliAuth
}
export interface KuaishouApi extends DataApi<'kuaishou', typeof kuaishouRegistry> {
  request: AmagiRequest
  auth: KuaishouAuth
}
export interface XiaohongshuApi extends DataApi<'xiaohongshu', typeof xiaohongshuRegistry> {
  request: AmagiRequest
  auth: XiaohongshuAuth
}

/** 包根工厂返回的客户端；具名接口使 IDE 提示保持简洁。 */
export interface AmagiClient extends Pick<Runtime, 'startServer' | 'events' | 'on' | 'once'> {
  douyin: { web: DouyinWebApi; app: DouyinAppApi }
  bilibili: BilibiliApi
  kuaishou: KuaishouApi
  xiaohongshu: XiaohongshuApi
}
