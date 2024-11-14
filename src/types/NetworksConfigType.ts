export type NetworksConfigType = {
  /**
   * 请求地址
   */
  url?: string
  /**
   * 请求方法
   */
  method?: string
  /**
   * 请求头
   */
  headers?: any
  /**
   * 返回数据类型，默认json
   */
  type?: string
  /**
   * 请求体
   */
  body?: object | string
  /**
   * 超时时间，单位毫秒
   */
  timeout?: number
  /**
   * 默认跟随重定向到: 'follow'，不跟随: manual
   */
  redirect?: RequestRedirect
}
