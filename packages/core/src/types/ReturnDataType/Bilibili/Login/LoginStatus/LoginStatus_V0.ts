/**
 * 登录基本信息（`/login_basic_info`）的实测快照。
 *
 * 形状与端点声明里的本地类型一致 —— 映射表这一格两边读的是同一份声明。
 *
 * 索引签名用 `any` 而不是 `unknown`：本目录的稳定性承诺是「读未声明字段不产生
 * 编译错误」，`unknown` 只做到「读得到」，往下一步用就得先收窄，等于承诺没兑现。
 */
export type BiliLoginStatus_V0 = {
  code?: number
  data?: Data
  message?: string
  [property: string]: any
}

type Data = {
  isLogin?: boolean
  vipStatus?: number
  [property: string]: any
}
