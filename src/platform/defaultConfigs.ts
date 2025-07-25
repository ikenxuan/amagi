import { AxiosRequestConfig } from 'axios'
import { RequestConfig } from 'amagi/server'

/**
 * 根据User-Agent生成对应的Sec-Ch-Ua值
 * @param userAgent - 用户代理字符串
 * @returns 对应的Sec-Ch-Ua值
 */
const generateSecChUa = (userAgent: string): string => {
  // 提取Chrome版本号
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/)
  const chromeVersion = chromeMatch ? chromeMatch[1] : '125'

  return `"Not)A;Brand";v="8", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`
}

/**
 * 抖音平台默认请求配置
 * @param cookie - 用户Cookie
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 合并后的请求配置
 */
export const getDouyinDefaultConfig = (cookie?: string, requestConfig?: RequestConfig): AxiosRequestConfig => {
  const finalUserAgent = requestConfig?.headers?.['User-Agent'] ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

  const defHeaders: RequestConfig['headers'] = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    Cookie: cookie ? cookie.replace(/\s+/g, '') : '',
    Priority: 'u=1, i',
    Referer: 'https://www.douyin.com/',
    'Sec-Ch-Ua': generateSecChUa(finalUserAgent),
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': finalUserAgent,
  }

  return {
    method: 'GET',
    timeout: 10000,
    ...requestConfig,
    headers: {
      ...defHeaders,
      ...(requestConfig?.headers || {})
    }
  }
}

/**
 * B站平台默认请求配置
 * @param cookie - 用户Cookie
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 合并后的请求配置
 */
export const getBilibiliDefaultConfig = (cookie?: string, requestConfig?: RequestConfig): AxiosRequestConfig => {
  const defHeaders: RequestConfig['headers'] = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'Cache-Control': 'max-age=0',
    Priority: 'u=0, i',
    'Sec-Ch-Ua': '\"Microsoft Edge\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '\"Windows\"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    Referer: 'https://www.bilibili.com/',
    Cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }

  return {
    method: 'GET',
    timeout: 10000,
    ...requestConfig,
    headers: {
      ...defHeaders,
      ...(requestConfig?.headers || {})
    }
  }
}

/**
 * 快手平台默认请求配置
 * @param cookie - 用户Cookie
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 合并后的请求配置
 */
export const getKuaishouDefaultConfig = (cookie?: string, requestConfig?: RequestConfig): AxiosRequestConfig => {
  const defHeaders: RequestConfig['headers'] = {
    Referer: 'https://www.kuaishou.com/new-reco',
    Origin: 'https://www.kuaishou.com',
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Content-Type': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    Priority: 'u=0, i',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    Cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }

  return {
    method: 'POST',
    timeout: 10000,
    ...requestConfig,
    headers: {
      ...defHeaders,
      ...(requestConfig?.headers || {})
    }
  }
}