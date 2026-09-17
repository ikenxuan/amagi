/**
 * 使用某条原声的作品列表（免鉴权）—— iesdouyin v2 游客接口的响应。
 *
 * 每条的 `music` 字段被抖音裁成空对象，所以这条接口**只能用来拿 `aweme_id`**（#188）。
 *
 * **字段清单未经 corpus 样本验证**，其余靠索引签名开放。
 */
export type DyGuestMusicAwemeList_V0 = {
  status_code: number
  aweme_list?: GuestMusicAweme[]
  cursor?: number
  has_more?: number | boolean
  [property: string]: any
}

type GuestMusicAweme = {
  aweme_id: string
  [property: string]: any
}
