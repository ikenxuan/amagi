export * from "amagi/business"
export * from "amagi/model"
export * from "amagi/server"
export * from "amagi/types"
export { amagi as Amagi, amagi as default }
import { DouyinResult, BilibiliResult } from 'amagi/business'
import { client } from "amagi/server"
import { DouyinDataOptionsMap, BilibiliDataType, BilibiliOptionsType, BilibiliDataOptionsMap } from 'amagi/types'

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
  cookie = '',
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
  cookie = '',
  options: BilibiliDataOptionsMap[T]
): Promise<any> => {
  const data = await BilibiliResult({ type, cookie }, options)
  return data.data
}