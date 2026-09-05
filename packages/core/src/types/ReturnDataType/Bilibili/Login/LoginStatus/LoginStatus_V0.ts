/**
 * 登录基本信息（`/login_basic_info`）的实测快照。
 *
 * 形状是从 `platforms/bilibili/endpoints/loginStatus.ts` 的本地 `LoginStatusData`
 * 原样搬过来的 —— 那份声明写在端点里、映射表这一格却是 `any`，于是公开面上多一个
 * 洞：走映射表的 v6 兼容读法（`getBilibiliData('登录基本信息')`）拿到的是 `any`，
 * 走 v7 端点拿到的却是精确类型。搬到这里后两条路读同一份声明。
 *
 * 索引签名用 `any` 而不是本地声明里的 `unknown`：`types/ReturnDataType/` 的稳定性
 * 承诺（`test/types/response-types.test-d.ts` 的文件头）说的是「读未声明字段不产生
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
