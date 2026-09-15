/**
 * 原声本体（免鉴权）—— iesdouyin v2 游客接口的响应。
 *
 * `music_info` 里**没有 `play_url`**：mp3 只能从源作品上取，
 * `extra.extract_item_id` 就是创建这条原声的那个作品（#188）。
 *
 * **字段清单未经 corpus 样本验证**，其余靠索引签名开放。
 */
export type DyGuestMusicInfo_V0 = {
  status_code: number
  music_info?: GuestMusicInfo
  [property: string]: any
}

type GuestMusicInfo = {
  /**
   * 原声 id。**不要读 `id`** —— 19 位 id 过 JSON 必丢精度，
   * 真值在 `mid` / `id_str` 上（下游 `kkkkkk-10086` 踩过）
   */
  mid?: string
  id_str?: string
  title?: string
  [property: string]: any
}
