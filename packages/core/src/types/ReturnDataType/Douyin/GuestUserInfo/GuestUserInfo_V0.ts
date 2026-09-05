/**
 * 抖音号（`unique_id`）转用户信息 —— iesdouyin v2 游客接口的响应。
 *
 * **字段清单未经 corpus 样本验证**：只钉住 #188 的示例与下游 `kkkkkk-10086`
 * 确实读到的那几个键（`user_info.sec_uid`），其余靠索引签名开放。这条接口免鉴权、
 * 是抖音最容易录样本的几条之一，`corpus/douyin/guestUserInfo/` 有样本之后
 * 应当由 typegen 生成的版本取代这份手写形状。
 */
export type DyGuestUserInfo_V0 = {
  status_code: number
  /** 抖音号不存在时这个键缺失，`status_code` 为 5 */
  user_info?: GuestUserInfo
  [property: string]: any
}

type GuestUserInfo = {
  /** 唯一免签名途径拿到的 sec_uid —— 这是这条接口存在的理由 */
  sec_uid: string
  [property: string]: any
}
