import { douyinApiUrls } from './API'
import * as douyinPassport from './passport'
import { douyinSign } from './sign'

export * from './routes'
export { douyinApiUrls, douyinPassport, douyinSign }

type douyinUtilsModel = {
  /** 签名算法相关 */
  sign: typeof import('amagi/platform/douyin/sign').douyinSign

  /**
   * passport 扫码登录协议（签名、CookieJar、响应解析）
   *
   * 日常调用请优先用 `douyinFetcher` 上的 `requestPassportQrcode` 等方法，
   * 这里暴露的是底层构件，便于自行编排或做单元测试。
   */
  passport: typeof import('amagi/platform/douyin/passport')

  /**
   * 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据
   *
   * 缺少 `a_bougs` 参数，请自行生成拼接
   */
  douyinApiUrls: typeof import('amagi/platform/douyin/API').douyinApiUrls
}

/** 抖音相关功能模块 (工具集) */
export const douyinUtils: douyinUtilsModel = {
  sign: douyinSign,
  passport: douyinPassport,
  douyinApiUrls
}
