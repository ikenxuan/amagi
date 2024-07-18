/**
 * 最终返回数据
 */
export interface GetDataResponseType {
  /**
   * 响应状态码
   */
  code: number,
  /**
   * 响应信息
   */
  message: string,
  /**
   * 响应数据
   */
  data: any
}