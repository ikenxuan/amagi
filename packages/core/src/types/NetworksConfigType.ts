export type NetworksConfigType = {
  /**
   * 请求地址
   */
  url: string
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
  responseType?: string
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
  /**
   * 拓展参数，该次请求数据什么数据类型，注意是平台接口的类型定义，不是请求参数
   */
  methodType?: string
}
