/**
 * 用户笔记列表（`/fetch_user_notes`）的实测快照。
 *
 * 形状与端点声明里的本地类型一致。
 *
 * 只有顶层有索引签名，`data` 与 `notes` 元素没有补 —— 保持本地声明的原样。
 *
 * 索引签名用 `any` 而不是 `unknown`，理由同 `BiliLoginStatus_V0`。
 */
export type XiaohongshuUserNoteList_V0 = {
  code: number
  msg: string
  success: boolean
  data: Data

  /** 平台加字段不算 breaking（类型是实测快照） */
  [property: string]: any
}

type Data = {
  cursor: string
  has_more: boolean
  notes: Note[]
}

type Note = {
  id: string
  type: string
  xsec_token: string
}
