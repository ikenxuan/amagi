import fetch, { Response } from 'node-fetch'
import { NetworksConfigType } from '../types'
import { logger } from 'amagi/model'

interface HeadersObject {
  [key: string]: string // 指定headersObject可以接受任何字符串键，并且值为字符串
}

export default class Networks {
  url: string | URL
  method: string
  Headers: any
  type: string
  body?: string
  fetch: any
  isGetResult: boolean
  timeout: number
  timer: NodeJS.Timeout | undefined
  data: {}
  redirect: string
  constructor (data: NetworksConfigType) {
    this.Headers = new Headers()
    if (data.headers && Object.keys(data.headers).length > 0) {
      for (const [key, value] of Object.entries(data.headers)) {
        this.Headers.append(key, value)
      }
    } else this.Headers = {}

    this.url = data.url || ''
    this.type = data.type || 'json'
    this.method = data.method || 'GET'
    this.body = data.body || '' // 用于POST请求
    this.data = {}
    this.timeout = data.timeout || 15000
    this.isGetResult = false
    this.timer = undefined
    this.redirect = 'follow' // 默认跟随重定向
  }

  get config (): NetworksConfigType {
    let data: NetworksConfigType = {
      headers: this.Headers,
      method: this.method,
    }
    if (this.method === 'POST') {
      data = { ...data, body: JSON.stringify(this.body) || '' }
    }
    return data
  }

  async getfetch (): Promise<Response | boolean> {
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

  async returnResult () {
    return await fetch(this.url, this.config)
  }

  /** 最终地址（跟随重定向） */
  async getLongLink (): Promise<string> {
    try {
      const result = await this.returnResult()
      return result.url
    } catch (error) {
      logger.error(error)
      return ''
    }
  }

  /** 获取首个302 */
  async getLocation (): Promise<string> {
    try {
      const response = await fetch(this.url, {
        method: 'GET',
        redirect: 'manual', // 不跟随重定向
      })
      // 取location返回
      return response.headers.get('location') as string
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
        this.fetch = result
        this.isGetResult = true
      } else {
        this.fetch = new_fetch
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
      }
      return this.fetch
    } catch (error) {
      logger.error(error)
      return false
    }
  }

  /** 获取响应头 */
  async getHeaders (): Promise<HeadersObject | null> {
    try {
      this.fetch = await this.returnResult()

      if (this.fetch) {
        if (this.fetch.headers) {
          const headers = this.fetch.headers
          const headersObject: HeadersObject = {}
          for (const [key, value] of headers.entries()) {
            headersObject[key] = value
          }
          return headersObject
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
      // 发起网络请求获取响应对象
      this.fetch = await this.returnResult()

      // 初始化响应头和响应数据
      let headers: any = null
      let data: any = null

      if (this.fetch) {
        // 获取响应头
        if (this.fetch.headers) {
          headers = {}
          const fetchHeaders = this.fetch.headers
          for (const [key, value] of fetchHeaders.entries()) {
            headers[key] = value
          }
        } else {
          logger.error('未获取到响应头')
        }

        // 获取响应数据
        switch (this.type) {
          case 'json':
            data = await this.fetch.json()
            break
          case 'text':
            data = await this.fetch.text()
            break
          case 'arrayBuffer':
            data = await this.ToArrayBuffer()
            break
          case 'blob':
            data = await this.ToBlob()
            break
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
    if (this.fetch.headers.get('content-type').includes('json')) {
      this.fetch = await this.fetch.json()
    } else {
      this.fetch = await this.fetch.text()
      this.type = 'text'
    }
  }

  async ToText () {
    this.fetch = await this.fetch.text() as string
  }

  async ToArrayBuffer () {
    this.fetch = await this.fetch.arrayBuffer() as Buffer
  }

  async ToBlob () {
    this.fetch = await this.fetch.blob() as Blob
  }

  timeoutPromise (timeout: number): Promise<Response> {
    const controller = new AbortController()
    return new Promise<Response>((resolve, reject) => {
      this.timer = setTimeout(() => {
        logger.info('执行力')
        controller.abort()
        resolve(new Response('timeout', { status: 504, statusText: 'timeout' }))
      }, timeout)
    })
  }
}
