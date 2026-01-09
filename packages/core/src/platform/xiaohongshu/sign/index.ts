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
   * 生成X-S-Common参数
   * @param cookies - cookie字符串
   * @returns Base64编码的随机字符串
   */
  static generateXSCommon (cookies: string): string {
    return this.client.signXsCommon(cookies)
  }

  /**
   * 生成X-T时间戳
   * @returns 当前时间戳字符串
   */
  static generateXT (): number {
    return this.client.getXT()
  }

  /**
   * 生成X-B3-Traceid
   * @returns 16位随机字符串
   */
  static generateXB3Traceid (): string {
    return this.client.getB3TraceId()
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
