/**
 * 用户笔记列表（`/fetch_user_notes`）的实测快照。
 *
 * 形状是从 `platforms/xiaohongshu/endpoints/userNoteList.ts` 的本地 `UserNoteListData`
 * 原样搬过来的（映射表原先是 `any`）。
 *
 * 只有顶层有索引签名，`data` 与 `notes` 元素**刻意不补** —— 那是本地声明的原样，
 * 补上就不再是「搬家」而是改形状了。
 *
 * 索引签名用 `any` 而不是本地声明里的 `unknown`，理由同 `BiliLoginStatus_V0`。
 */
export type XiaohongshuUserNoteList_V0 = {
  code: number
  msg: string
  success: boolean
  data: Data

  /** 平台加字段不算 breaking（06-migration：类型是实测快照） */
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
