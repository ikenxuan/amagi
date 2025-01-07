import { BilibiliData, DouyinData, KuaishouData } from 'amagi/platform'
import { BilibiliDataOptions, BilibiliDataOptionsMap, DouyinDataOptions, DouyinDataOptionsMap, KuaishouDataOptions, KuaishouDataOptionsMap } from 'amagi/types'

/**
 * 获取抖音数据
 * @param type - 请求数据类型
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 * @example
 * ```ts
 * const data = await amagi.getDouyinData('搜索数据', 'User Cookies', {
 *   query: '114514',
 *   number: 10
 * })
 * ```
 */
export const getDouyinData = async <T extends keyof DouyinDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: DouyinDataOptions<T>
): Promise<any> => {
  const data = await DouyinData({ ...options as DouyinDataOptionsMap[T], methodType: type }, cookie)
  return data
}

/**
 * 获取B站数据
 * @param type - 请求数据类型
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 * @example
 * ```ts
 * const data = await amagi.getBilibiliData('单个视频作品数据', 'User Cookies', {
 *   bvid: 'BV1fK4y1q79u'
 * })
 * ```
 */
export async function getBilibiliData<T extends keyof BilibiliDataOptionsMap> (
  methodType: T,
  cookie?: string,
  options?: BilibiliDataOptions<T>
): Promise<any> {
  const data = await BilibiliData({ ...options as BilibiliDataOptionsMap[T], methodType }, cookie)
  return data
}

/**
 * 获取快手数据
 * @param type - 请求数据类型
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 * @example
 * ```ts
 * const data = await amagi.getKuaishouData('单个视频作品数据', 'User Cookies', {
 *   photoId: '3xdpv6sfi8yjsqy'
 * })
 * ```
 */
export const getKuaishouData = async <T extends keyof KuaishouDataOptionsMap> (
  methodType: T,
  cookie?: string,
  options?: KuaishouDataOptions<T>
): Promise<any> => {
  const data = await KuaishouData({ ...options as KuaishouDataOptionsMap[T], methodType }, cookie)
  return data
}

const b1 = await getBilibiliData('单个视频作品数据', '', { bvid: 'BV19jW4eJEaM' })
