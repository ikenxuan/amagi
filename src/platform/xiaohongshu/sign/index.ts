import crypto from 'node:crypto'
import { Xhshow } from '@ikenxuan/xhshow-ts'

/**
 * 小红书签名算法类
 */
export class xiaohongshuSign {
  private static client = new Xhshow()

  /**
   * 生成GET请求的X-S签名
   * @param path - API路径
   * @param a1Cookie - a1 cookie值
   * @param clientType - 客户端类型，默认为 'xhs-pc-web'
   * @param params - 查询参数对象
   * @returns X-S签名
   */
  static generateXSGet (path: string, a1Cookie: string, clientType: string = 'xhs-pc-web', params: Record<string, any> = {}): string {
    return this.client.signXsGet(path, a1Cookie, clientType, params)
  }

  /**
   * 生成POST请求的X-S签名
   * @param path - API路径
   * @param a1Cookie - a1 cookie值
   * @param clientType - 客户端类型，默认为 'xhs-pc-web'
   * @param body - 请求体对象
   * @returns X-S签名
   */
  static generateXSPost (path: string, a1Cookie: string, clientType: string = 'xhs-pc-web', body: Record<string, any> = {}): string {
    return this.client.signXsPost(path, a1Cookie, clientType, body)
  }

  /**
   * 生成X-S签名（兼容旧接口）
   * @param url - 请求URL
   * @param body - 请求体
   * @param userAgent - User-Agent（暂未使用）
   * @param method - 请求方法，默认为 'POST'
   * @param a1Cookie - a1 cookie值
   * @returns X-S签名
   */
  static generateXS (url: string, body: any, userAgent: string, method: string = 'POST', a1Cookie: string = ''): string {
    try {
      // 从完整URL中提取路径
      const urlObj = new URL(url)
      const path = urlObj.pathname + urlObj.search

      if (method.toUpperCase() === 'GET') {
        // 对于GET请求，将body作为查询参数
        const params = typeof body === 'object' ? body : {}
        return this.generateXSGet(path, a1Cookie, 'xhs-pc-web', params)
      } else {
        // 对于POST请求
        const requestBody = typeof body === 'object' ? body : {}
        return this.generateXSPost(path, a1Cookie, 'xhs-pc-web', requestBody)
      }
    } catch (error) {
      console.error('生成X-S签名失败:', error)
      // 如果签名生成失败，返回一个默认值或抛出错误
      throw new Error(`签名生成失败: ${error}`)
    }
  }

  /**
   * 生成X-S-Common参数
   * @param length - 长度
   * @returns Base64编码的随机字符串
   */
  static generateXSCommon (length: number = 945): string {
    return crypto.randomBytes(length).toString('base64').replace(/=+$/, '')
  }

  /**
   * 生成X-T时间戳
   * @returns 当前时间戳字符串
   */
  static generateXT (): string {
    return Date.now().toString()
  }

  /**
   * 生成X-B3-Traceid
   * @returns 16位随机字符串
   */
  static generateXB3Traceid (): string {
    return Array.from({ length: 16 }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('')
  }

  /**
   * 从cookie字符串中提取a1值
   * @param cookieString - 完整的cookie字符串
   * @returns a1 cookie值
   */
  static extractA1FromCookie (cookieString: string): string {
    const match = cookieString.match(/a1=([^;]+)/)
    return match ? match[1] : ''
  }

  /**
   * 生成搜索ID
   * @returns 搜索ID字符串
   */
  static getSearchId = (): string => (BigInt(Date.now()) << 64n) + BigInt(Math.floor(Math.random() * 2147483646)).toString(36)
}