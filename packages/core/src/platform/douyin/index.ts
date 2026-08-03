import { douyinApiUrls } from './API'
import { douyinSign } from './sign'

export * from './routes'
export { douyinApiUrls, douyinSign }

type douyinUtilsModel = {
  /** 签名算法相关 */
  sign: typeof import('amagi/platform/douyin/sign').douyinSign

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
  douyinApiUrls
}
