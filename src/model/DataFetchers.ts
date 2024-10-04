import { DouyinDataOptionsMap, BilibiliDataOptionsMap } from 'amagi/types'
import { DouyinResult, BilibiliResult } from 'amagi/business'


/**
 * 获取抖音数据
 * @param type 请求数据类型
 * @param cookie 抖音用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export const getDouyinData = async <T extends keyof DouyinDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: DouyinDataOptionsMap[T]
): Promise<any> => {
  const data = await DouyinResult({ type, cookie }, options)
  return data.data
}

/**
 * 获取B站数据
 * @param type 请求数据类型
 * @param cookie bilibili 用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export const getBilibiliData = async <T extends keyof BilibiliDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: BilibiliDataOptionsMap[T]
): Promise<any> => {
  const data = await BilibiliResult({ type, cookie }, options)
  return data.data
}


/**
 * 已废弃，请直接使用 getDouyinData 方法
 * @deprecated
 */
export const GetDouyinData = getDouyinData
/**
 * 已废弃，请直接使用 getBilibiliData 方法
 * @deprecated
 */
export const GetBilibiliData = getBilibiliData