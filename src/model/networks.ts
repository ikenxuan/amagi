import { logger } from 'amagi/model'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { NetworksConfigType } from '../types'

interface HeadersObject {
  [key: string]: string
}

export default class Networks {
  url: string
  method: string
  headers: HeadersObject
  type: string
  body?: any
  axiosInstance: any
  isGetResult: boolean
  timeout: number
  timer: NodeJS.Timeout | undefined
  data: {}

  constructor (data: NetworksConfigType) {
    this.headers = data.headers || {}
    this.url = data.url || ''
    this.type = data.type || 'json'
    this.method = data.method || 'GET'
    this.body = data.body || null
    this.data = {}
    this.timeout = data.timeout || 5000
    this.isGetResult = false
    this.timer = undefined

    // 创建axios实例
    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: this.headers
    })
  }

  get config (): AxiosRequestConfig {
    let config: AxiosRequestConfig = {
      url: this.url,
      method: this.method,
      headers: this.headers
    }

    if (this.method === 'POST' && this.body) {
      config.data = this.body
    }

    return config
  }

  async getfetch (): Promise<AxiosResponse | boolean> {
    try {
      const result = await this.returnResult()
      if (result.status === 504) {
        return result
      }
      this.isGetResult = true
      return result
    } catch (error) {
      logger.info(error)
      return false
    }
  }

  async returnResult (): Promise<AxiosResponse> {
    return await this.axiosInstance(this.config)
  }

  /** 最终地址（跟随重定向） */
  async getLongLink (): Promise<string> {
    try {
      const result = await this.returnResult()
      return result.request.res.responseUrl // axios中获取最终的请求URL
    } catch (error) {
      logger.error(error)
      return ''
    }
  }

  /** 获取首个302 */
  async getLocation (): Promise<string> {
    try {
      const response = await this.axiosInstance({
        method: 'GET',
        url: this.url,
        maxRedirects: 0, // 禁止跟随重定向
        validateStatus: (status: number) => status >= 300 && status < 400 // 仅处理3xx响应
      })
      return response.headers['location'] as string
    } catch (error) {
      logger.error(error)
      return ''
    }
  }

  /** 获取数据并处理数据的格式化，默认json */
  async getData (new_fetch = ''): Promise<any | boolean> {
    try {
      if (!new_fetch) {
        const result = await this.returnResult()
        if (result.status === 504) {
          return result
        }
        if (result.status === 429) {
          logger.warn('HTTP 响应状态码: 429')
          throw new Error('ratelimit triggered, 触发 https://www.douyin.com/ 的速率限制！！！')
        }

        this.axiosInstance = result
        this.isGetResult = true
      } else {
        this.axiosInstance = new_fetch
      }

      switch (this.type) {
        case 'json':
          await this.Tojson()
          break
        case 'text':
          await this.ToText()
          break
        case 'arrayBuffer':
          await this.ToArrayBuffer()
          break
        case 'blob':
          await this.ToBlob()
          break
        default:
      }

      return this.axiosInstance
    } catch (error) {
      logger.error(error)
      return false
    }
  }

  /** 获取响应头 */
  async getHeaders (): Promise<HeadersObject | null> {
    try {
      this.axiosInstance = await this.returnResult()

      if (this.axiosInstance) {
        if (this.axiosInstance.headers) {
          return this.axiosInstance.headers
        } else {
          logger.error('未获取到响应头')
          return null
        }
      } else {
        logger.error('未获取到响应对象')
        return null
      }
    } catch (error) {
      logger.error('获取响应头失败:', error)
      return null
    }
  }

  /** 一次性获取响应头和响应体 */
  async getHeadersAndData (): Promise<object> {
    try {
      this.axiosInstance = await this.returnResult()

      let headers: HeadersObject | null = null
      let data: any = null

      if (this.axiosInstance) {
        headers = this.axiosInstance.headers

        switch (this.type) {
          case 'json':
            data = this.axiosInstance.data
            break
          case 'text':
            data = this.axiosInstance.data
            break
          case 'arrayBuffer':
            data = await this.ToArrayBuffer()
            break
          case 'blob':
            data = await this.ToBlob()
            break
          default:
        }
      } else {
        logger.error('未获取到响应对象')
      }

      return { headers, data }
    } catch (error) {
      logger.error('获取响应头和数据失败:', error)
      return { headers: null, data: null }
    }
  }

  async Tojson (): Promise<any> {
    if (this.axiosInstance.headers['content-type'].includes('json')) {
      this.axiosInstance = this.axiosInstance.data
    } else {
      this.axiosInstance = this.axiosInstance.data as string
      this.type = 'text'
    }
  }

  async ToText () {
    this.axiosInstance = this.axiosInstance.data as string
  }

  async ToArrayBuffer () {
    this.axiosInstance = this.axiosInstance.data as Buffer
  }

  async ToBlob () {
    // axios 没有直接支持blob, 需要使用arraybuffer然后转换
    this.axiosInstance = new Blob([new Uint8Array(this.axiosInstance.data)])
  }

}
