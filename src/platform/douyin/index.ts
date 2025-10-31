import { douyinApiUrls } from './API'
import { douyin } from './DouyinApi'
import { douyinSign } from './sign'

export * from './DouyinApi'
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

  /**
   * 封装了所有抖音相关的API请求，采用对象化的方式组织。
   *
   * 提供了一系列方法，用于与抖音相关的 API 进行交互。
   *
   * 每个方法都接受参数和 Cookie，返回 Promise，解析为接口返回的原始数据。
   */
  api: typeof import('amagi/platform/douyin/DouyinApi').douyin
}

/** 抖音相关功能模块 (工具集) */
export const douyinUtils: douyinUtilsModel = {
  sign: douyinSign,
  douyinApiUrls,
  api: douyin
}
