import { BilibiliData, DouyinData, KuaishouData } from 'amagi/platform'
import {
  BilibiliDataOptions,
  BilibiliDataOptionsMap,
  DouyinDataOptions,
  DouyinDataOptionsMap,
  Fnc,
  KuaishouDataOptions,
  KuaishouDataOptionsMap,
} from 'amagi/types'


/**
 * 获取抖音数据
 * @param type - 请求数据类型
 * @param cookie - 有效的用户Cookie
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export async function getDouyinData<T extends keyof DouyinDataOptionsMap, R extends 'strict' | 'loose'> (
  type: T,
  cookie: string,
  options?: DouyinDataOptions<T> & { typeMode?: R }
): Promise<Fnc<DouyinDataOptionsMap[T], R>>

/**
 * 获取抖音数据
 * @param type - 请求数据类型
 * @param options - 请求参数，是一个对象
 * @param cookie - 有效的用户Cookie
 * @returns 返回接口的原始数据
 */
export async function getDouyinData<T extends keyof DouyinDataOptionsMap, R extends 'strict' | 'loose'> (
  type: T,
  options?: DouyinDataOptions<T> & { typeMode?: R },
  cookie?: string
): Promise<Fnc<DouyinDataOptionsMap[T], R>>

export async function getDouyinData<T extends keyof DouyinDataOptionsMap, R extends 'strict' | 'loose'> (
  type: T,
  arg2?: string | (DouyinDataOptions<T> & { typeMode?: R }),
  arg3?: string | (DouyinDataOptions<T> & { typeMode?: R })
): Promise<Fnc<DouyinDataOptionsMap[T], R>> {
  let cookie: string | undefined
  let options: DouyinDataOptions<T> & { typeMode?: R } | undefined
  if (typeof arg2 === 'string') {
    cookie = arg2
    options = arg3 as DouyinDataOptions<T> & { typeMode?: R }
  } else {
    options = arg2 as DouyinDataOptions<T> & { typeMode?: R }
    cookie = arg3 as string | undefined
  }
  const data = await DouyinData({ ...options as DouyinDataOptionsMap[T]['opt'], methodType: type }, cookie)
  return data
}

/**
 * 获取B站数据
 * @param type - 请求数据类型
 * @param cookie - 有效的用户Cookie
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export async function getBilibiliData<T extends keyof BilibiliDataOptionsMap, R extends 'strict' | 'loose'> (
  methodType: T,
  cookie?: string,
  options?: BilibiliDataOptions<T> & { typeMode?: R }
): Promise<Fnc<BilibiliDataOptionsMap[T], R>>

/**
 * 获取B站数据
 * @param type - 请求数据类型
 * @param options - 请求参数，是一个对象
 * @param cookie - 有效的用户Cookie
 * @returns 返回接口的原始数据
 */
export async function getBilibiliData<T extends keyof BilibiliDataOptionsMap, R extends 'strict' | 'loose'> (
  methodType: T,
  options?: BilibiliDataOptions<T> & { typeMode?: R },
  cookie?: string
): Promise<Fnc<BilibiliDataOptionsMap[T], R>>

export async function getBilibiliData<T extends keyof BilibiliDataOptionsMap, R extends 'strict' | 'loose'> (
  methodType: T,
  arg2?: string | (BilibiliDataOptions<T> & { typeMode?: R }),
  arg3?: string | (BilibiliDataOptions<T> & { typeMode?: R }),
): Promise<Fnc<BilibiliDataOptionsMap[T], R>> {
  let cookie: string | undefined
  let options: BilibiliDataOptions<T> & { typeMode?: R } | undefined
  if (typeof arg2 === 'string') {
    cookie = arg2
    options = arg3 as BilibiliDataOptions<T> & { typeMode?: R }
  } else {
    options = arg2 as BilibiliDataOptions<T> & { typeMode?: R }
    cookie = arg3 as string | undefined
  }
  const data = await BilibiliData({ ...options as BilibiliDataOptionsMap[T]['opt'], methodType }, cookie)
  return data
}

/**
 * 获取快手数据
 * @param type - 请求数据类型
 * @param cookie - 有效的用户Cookie
 * @param options - 请求参数，是一个对象
 * @returns 返回接口的原始数据
 */
export async function getKuaishouData<T extends keyof KuaishouDataOptionsMap, R extends 'strict' | 'loose'> (
  methodType: T,
  cookie?: string,
  options?: KuaishouDataOptions<T> & { typeMode?: R }
): Promise<Fnc<KuaishouDataOptionsMap[T], R>>

/**
 * 获取快手数据
 * @param type - 请求数据类型
 * @param options - 请求参数，是一个对象
 * @param cookie - 有效的用户Cookie
 * @returns 返回接口的原始数据
 */
export async function getKuaishouData<T extends keyof KuaishouDataOptionsMap, R extends 'strict' | 'loose'> (
  methodType: T,
  options?: KuaishouDataOptions<T> & { typeMode?: R },
  cookie?: string
): Promise<Fnc<KuaishouDataOptionsMap[T], R>>


export async function getKuaishouData<T extends keyof KuaishouDataOptionsMap, R extends 'strict' | 'loose'> (
  methodType: T,
  arg2?: string | (KuaishouDataOptions<T> & { typeMode?: R }),
  arg3?: string | (KuaishouDataOptions<T> & { typeMode?: R }),
): Promise<Fnc<KuaishouDataOptionsMap[T], R>> {
  let cookie: string | undefined
  let options: KuaishouDataOptions<T> & { typeMode?: R } | undefined
  if (typeof arg2 === 'string') {
    cookie = arg2
    options = arg3 as KuaishouDataOptions<T> & { typeMode?: R }
  } else {
    options = arg2 as KuaishouDataOptions<T> & { typeMode?: R }
    cookie = arg3 as string | undefined
  }
  const data = await KuaishouData({ ...options as KuaishouDataOptionsMap[T]['opt'], methodType }, cookie)
  return data
}

export const fetchDouyinData = getDouyinData
export const fetchBilibiliData = getBilibiliData
export const fetchKuaishouData = getKuaishouData
