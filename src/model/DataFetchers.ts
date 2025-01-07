import { BilibiliData, DouyinData, KuaishouData } from 'amagi/platform'
import { BilibiliDataOptionsMap, DouyinDataOptionsMap, KuaishouDataOptionsMap } from 'amagi/types'

/**
 * 获取抖音数据
 * @param type - 请求数据类型
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 * @example
 * ```ts
 * const data = await amagi.getDouyinData('搜索数据', {
 *   query: '114514',
 *   number: 10
 * })
 * ```
 */
export const getDouyinData = async <T extends keyof DouyinDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: Omit<DouyinDataOptionsMap[T], 'methodType'>
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
 * const data = await amagi.getBilibiliData('单个视频作品数据', {
 *   bvid: 'BV1fK4y1q79u'
 * })
 * ```
 */
export async function getBilibiliData<T extends keyof BilibiliDataOptionsMap> (
  methodType: T,
  cookie?: string,
  options?: Omit<BilibiliDataOptionsMap[T], 'methodType'>
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
 * const data = await amagi.getKuaishouData('单个视频作品数据', {
 *   photoId: '3xdpv6sfi8yjsqy'
 * })
 * ```
 */
export const getKuaishouData = async <T extends keyof KuaishouDataOptionsMap> (
  methodType: T,
  cookie?: string,
  options?: Omit<KuaishouDataOptionsMap[T], 'methodType'>
): Promise<any> => {
  const data = await KuaishouData({ ...options as KuaishouDataOptionsMap[T], methodType }, cookie)
  return data
}
