import type { XiaohongshuSessionInput } from '../contracts/cookie'
import type { DouyinAppOptions } from '../contracts/douyin-app'
import type { RequestConfig } from '../contracts/request'

export interface PlatformOptions {
  cookie?: string
  request?: RequestConfig
}
export interface DouyinOptions {
  request?: RequestConfig
  web?: PlatformOptions
  app?: DouyinAppOptions & { request?: RequestConfig }
}
export interface XiaohongshuOptions extends PlatformOptions {
  /** 与 Cookie 配对的 SSK/b1 等会话材料。 */
  session?: XiaohongshuSessionInput
}
/** 初始化配置按平台和端归类；网络选项由外到内覆盖。 */
export interface ClientOptions {
  douyin?: DouyinOptions
  bilibili?: PlatformOptions
  kuaishou?: PlatformOptions
  xiaohongshu?: XiaohongshuOptions
  request?: RequestConfig
  debug?: boolean
}
