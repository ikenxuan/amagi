import { xiaohongshuApiUrls } from './API'
import { xiaohongshuSign } from './sign'
import { xiaohongshu } from './XiaohongshuApi'

export * from './XiaohongshuApi'
export { xiaohongshuApiUrls, xiaohongshuSign }

type xiaohongshuUtilsModel = {
  /** 签名算法相关 */
  sign: typeof import('amagi/platform/xiaohongshu/sign').xiaohongshuSign

  /**
   * 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据
   */
  xiaohongshuApiUrls: typeof import('amagi/platform/xiaohongshu/API').xiaohongshuApiUrls

  /**
   * 封装了所有小红书相关的API请求，采用对象化的方式组织。
   * 
   * 提供了一系列方法，用于与小红书相关的 API 进行交互。
   * 
   * 每个方法都接受参数和 Cookie，返回 Promise，解析为接口返回的原始数据。
   */
  api: typeof import('amagi/platform/xiaohongshu/XiaohongshuApi').xiaohongshu
}

/** 小红书相关功能模块 (工具集) */
export const xiaohongshuUtils: xiaohongshuUtilsModel = {
  sign: xiaohongshuSign,
  xiaohongshuApiUrls,
  api: xiaohongshu,
}