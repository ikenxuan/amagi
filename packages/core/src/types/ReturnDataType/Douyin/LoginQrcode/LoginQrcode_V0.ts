/**
 * 登录二维码（`/fetch_login_qrcode`）的实测快照。
 *
 * 形状是从 `platforms/douyin/endpoints/loginQrcode.ts` 的本地 `LoginQrcodeData`
 * 原样搬过来的（映射表原先是 `any`）。
 *
 * 与 `DyPassportQrcode` 不是一回事，两个都要留：`DyPassportQrcode` 是扫码登录状态机
 * **归一化之后**的形状（`runtime/session` 用），这份是本端点的**原始响应**。
 *
 * 索引签名用 `any` 而不是本地声明里的 `unknown`，理由同 `BiliLoginStatus_V0`。
 */
export type DyLoginQrcode_V0 = {
  data?: Data
  [property: string]: any
}

type Data = {
  qrcode_index_url?: string
  [property: string]: any
}
