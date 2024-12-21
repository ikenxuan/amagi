import { bilibiliResult, douyinResult, kuaishouResult } from 'amagi/business'
import { BilibiliDataOptionsMap, DouyinDataOptionsMap, KuaishouDataOptionsMap } from 'amagi/types'

/**
 * 获取抖音数据
 * @param type 请求数据类型
 * @param cookie 抖音用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据，失败返回false
 */
export const getDouyinData = async <T extends keyof DouyinDataOptionsMap = keyof DouyinDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: DouyinDataOptionsMap[T]
): Promise<boolean | any> => {
  const data = await douyinResult({ type, cookie }, options)
  if (!data.data) {
    return false
  }
  return data.data
}

/**
 * 获取B站数据
 * @param type 请求数据类型
 * @param cookie bilibili 用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据，失败返回false
 */
export const getBilibiliData = async <T extends keyof BilibiliDataOptionsMap = keyof BilibiliDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: BilibiliDataOptionsMap[T]
): Promise<boolean | any> => {
  const data = await bilibiliResult({ type, cookie }, options)
  if (!data.data) {
    return false
  }
  return data.data
}

/**
 * 获取快手数据
 * @param type 请求数据类型
 * @param cookie 快手 用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据，失败返回false
 */
export const getKuaishouData = async <T extends keyof KuaishouDataOptionsMap = keyof KuaishouDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: KuaishouDataOptionsMap[T]
): Promise<boolean | any> => {
  const data = await kuaishouResult({ type, cookie }, options)
  if (!data.data) {
    return false
  }
  return data.data
}

/**
 * 已废弃，请导入 getDouyinData 方法进行使用
 * @deprecated
 */
export const GetDouyinData = getDouyinData
/**
 * 已废弃，请导入 getBilibiliData 方法进行使用
 * @deprecated
 */
export const GetBilibiliData = getBilibiliData
