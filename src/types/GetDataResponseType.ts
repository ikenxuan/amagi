/**
 * 最终返回数据
 */
export type GetDataResponseType = {
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
  data: boolean | any
}
