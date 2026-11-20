import type { AppGuestSnapshot } from './guest/state'

/** 抖音 Android 接口配置。amagi 管理设备和 Cookie，服务只执行原生密码操作。 */
export interface DouyinAppOptions {
  /** 签名服务站点地址，例如 http://127.0.0.1:8787；默认空，调用时返回配置错误信封。 */
  signerBaseUrl?: string
  /** 本地会话文件；默认包根 data/douyin-app-session.json，保存设备与完整 CookieJar，重启后复用。 */
  sessionFile?: string
  /** 导入已有 App 会话；false 仅用于兼容旧的服务端身份协议。 */
  session?: AppGuestSnapshot | false
}
