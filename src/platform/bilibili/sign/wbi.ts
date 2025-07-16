import axios from 'axios'
import crypto from 'node:crypto'

/**
 * 混合密钥编码表，用于对 imgKey 和 subKey 进行字符顺序打乱编码
 */
const mixinKeyEncTab: readonly number[] = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26,
  17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]

/**
 * WBI 响应数据接口定义
 */
type WbiResponseData = {
  data: {
    wbi_img: {
      img_url: string
      sub_url: string
    }
  }
}

/**
 * WBI 密钥对接口定义
 */
type WbiKeys = {
  img_key: string
  sub_key: string
}

/**
 * 请求参数类型定义
 */
type RequestParams = Record<string, string | number | boolean>

/**
 * 对 imgKey 和 subKey 进行字符顺序打乱编码
 * @param orig - 原始字符串数组，通常是 img_key + sub_key 的字符数组
 * @returns 返回经过编码表打乱后的32位字符串
 */
const getMixinKey = (orig: string): string =>
  mixinKeyEncTab
    .map((n) => orig[n])
    .join('')
    .slice(0, 32)

/**
 * 为请求参数进行 WBI 签名
 * @param params - 请求参数对象，键值对形式
 * @param img_key - 图片密钥
 * @param sub_key - 子密钥
 * @returns 返回包含时间戳和签名的查询字符串
 */
const encWbi = (params: RequestParams, img_key: string, sub_key: string): string => {
  const mixin_key = getMixinKey(img_key + sub_key)
  const curr_time = Math.round(Date.now() / 1000)
  const chr_filter = /[!'()*]/g

  Object.assign(params, { wts: curr_time }) // 添加 wts 字段
  // 按照 key 重排参数
  const query = Object.keys(params)
    .sort()
    .map((key) => {
      // 过滤 value 中的 "!'()*" 字符
      const value = params[key].toString().replace(chr_filter, '')
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  const wbi_sign = crypto.createHash('md5').update(query + mixin_key).digest('hex') // 计算 w_rid

  return `&wts=${curr_time}&w_rid=${wbi_sign}`
}

/**
 * 获取最新的 img_key 和 sub_key
 * @param cookie - 有效的用户 Cookie 字符串
 * @returns 返回包含 img_key 和 sub_key 的对象
 * @throws 当网络请求失败或响应格式不正确时抛出错误
 */
const getWbiKeys = async (cookie: string): Promise<WbiKeys> => {
  const res = await axios('https://api.bilibili.com/x/web-interface/nav', {
    headers: {
      Cookie: cookie
    }
  })

  const response: WbiResponseData = res.data as WbiResponseData // 类型断言

  // 确保 response 是 WbiResponseData 类型后再解构
  const {
    data: {
      wbi_img: { img_url, sub_url }
    }
  } = response

  return {
    img_key: img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.')),
    sub_key: sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'))
  }
}

/**
 * 对请求链接进行 WBI 签名
 * @param BASEURL - 完整的请求地址，可以是字符串或 URL 对象
 * @param cookie - 有效的用户 Cookie 字符串
 * @returns 返回包含 WBI 签名的查询字符串
 * @throws 当获取 WBI 密钥失败或 URL 解析失败时抛出错误
 */
export const wbi_sign = async (BASEURL: string | URL, cookie: string): Promise<string> => {
  const web_keys = await getWbiKeys(cookie)
  const url = new URL(BASEURL)
  const params: RequestParams = {}

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value
  }

  const query = encWbi(params, web_keys.img_key, web_keys.sub_key)
  return query
}