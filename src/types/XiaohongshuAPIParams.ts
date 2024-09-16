type NoteInfoParams = {
  /** 笔记ID */
  source_note_id: string,
  /** web端的路径参数xsec_token */
  xsec_token?: string
}

export type XiaohongshuDataOptionsMap = {
  单个笔记: NoteInfoParams
}