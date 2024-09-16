export * from "amagi/business"
export * from "amagi/model"
export * from "amagi/server"
export * from "amagi/types"
export { amagi as Amagi, amagi as default }
import { DouyinResult, BilibiliResult, XiaohongshuResult } from 'amagi/business'
import { client } from "amagi/server"
import { DouyinDataOptionsMap, BilibiliDataOptionsMap, XiaohongshuDataOptionsMap } from 'amagi/types'

const amagi = client

/**
 * 
 * @param type 请求数据类型
 * @param cookie 抖音用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export const GetDouyinData = async <T extends keyof DouyinDataOptionsMap> (
  type: T,
  cookie = '' as string,
  options: DouyinDataOptionsMap[T]
): Promise<any> => {
  const data = await DouyinResult({ type, cookie }, options)
  return data.data
}

/**
 * 
 * @param type 请求数据类型
 * @param cookie bilibili 用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export const GetBilibiliData = async <T extends keyof BilibiliDataOptionsMap> (
  type: T,
  cookie = '' as string,
  options: BilibiliDataOptionsMap[T]
): Promise<any> => {
  const data = await BilibiliResult({ type, cookie }, options)
  return data.data
}

export const GetXiaohongshuData = async <T extends keyof XiaohongshuDataOptionsMap> (
  type: T,
  cookie = '' as string,
  options: XiaohongshuDataOptionsMap[T]
): Promise<any> => {
  const data = await XiaohongshuResult({ type, cookie }, options)
  return data.data
}