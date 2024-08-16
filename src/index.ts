export * from "amagi/business"
export * from "amagi/model"
export * from "amagi/server"
export * from "amagi/types"
export { amagi as Amagi, amagi as default }
import { DouyinResult, BilibiliResult } from 'amagi/business'
import { client } from "amagi/server"
import { DouyinDataType, DouyinOptionsType, BilibiliDataType, BilibiliOptionsType } from 'amagi/types'

const amagi = client

/**
 * 
 * @param type 请求数据类型
 * @param cookie 抖音用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export const GetDouyinData = async (type: keyof typeof DouyinDataType, cookie = '' as string, options = {} as DouyinOptionsType): Promise<any> => {
  const data = await DouyinResult({ type, cookie }, options)
  return data
}

/**
 * 
 * @param type 请求数据类型
 * @param cookie bilibili 用户 ck
 * @param options 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export const GetBilibiliData = async (type: keyof typeof BilibiliDataType, cookie = '' as string, options = {} as BilibiliOptionsType): Promise<any> => {
  const data = await BilibiliResult({ type, cookie }, options)
  return data
}