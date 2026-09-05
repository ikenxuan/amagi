import { xiaohongshuApiUrls } from './API'
import { xiaohongshuSign } from './sign'

export * from './routes'
export { xiaohongshuApiUrls, xiaohongshuSign }

type xiaohongshuUtilsModel = {
  /** 签名算法相关 */
  sign: typeof import('../../platform/xiaohongshu/sign').xiaohongshuSign

  /**
   * 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据
   */
  xiaohongshuApiUrls: typeof import('../../platform/xiaohongshu/API').xiaohongshuApiUrls
}

/** 小红书相关功能模块 (工具集) */
export const xiaohongshuUtils: xiaohongshuUtilsModel = {
  sign: xiaohongshuSign,
  xiaohongshuApiUrls
}
