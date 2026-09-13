/**
 * 抖音号（`unique_id`）转用户信息 —— iesdouyin v2 游客接口的响应。
 *
 * **字段清单未经完整样本验证**：只钉住确实读取到的那几个键（`user_info.sec_uid`），
 * 其余靠索引签名开放。这条接口免鉴权、容易录到样本，有完整样本后应由生成式类型取代。
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
