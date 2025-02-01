import { BilibiliData, DouyinData, KuaishouData } from 'amagi/platform'
import { BilibiliDataOptions, BilibiliDataOptionsMap, DouyinDataOptions, DouyinDataOptionsMap, KuaishouDataOptions, KuaishouDataOptionsMap } from 'amagi/types'

/**
 * 获取抖音数据
 * @param type - 请求数据类型
 * @param cookie - 有效的用户Cookie
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 * @example
 * ```ts
 * const data = await getDouyinData('搜索数据', 'User Cookies', {
 *   query: '114514',
 *   number: 10
 * })
 * ```
 */
export const getDouyinData = async <T extends keyof DouyinDataOptionsMap> (
  type: T,
  cookie?: string,
  options?: DouyinDataOptions<T>
): Promise<DouyinDataOptionsMap[T]['data']> => {
  const data = await DouyinData({ ...options as DouyinDataOptionsMap[T]['opt'], methodType: type }, cookie)
  return data
}

/**
 * 获取B站数据
 * @param type - 请求数据类型
 * @param cookie - 有效的用户Cookie
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 * @example
 * ```ts
 * const data = await getBilibiliData('单个视频作品数据', 'User Cookies', {
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
 * @param cookie - 有效的用户Cookie
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 * @example
 * ```ts
 * const data = await getKuaishouData('单个视频作品数据', 'User Cookies', {
 *   photoId: '3xdpv6sfi8yjsqy'
 * })
 * ```
 */
export const getKuaishouData = async <T extends keyof KuaishouDataOptionsMap> (
  methodType: T,
  cookie?: string,
  options?: KuaishouDataOptions<T>
): Promise<KuaishouDataOptionsMap[T]['data']> => {
  const data = await KuaishouData({ ...options as KuaishouDataOptionsMap[T]['opt'], methodType }, cookie)
  return data
}

export const fetchDouyinData = getDouyinData
export const fetchBilibiliData = getBilibiliData
export const fetchKuaishouData = getKuaishouData
