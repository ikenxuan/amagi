/**
 * 手写协议契约，来源于提供的 2026-09-23 `mixAweme` 端点。
 * 归档中没有 mix/aweme 的原始响应，这里只描述该实现用到的状态和分页字段；
 * 单个 aweme 的结构保持未知，而不是借用其他端点的 schema。
 * 端点的归一化逻辑总会提供 `aweme_list` 和 `cursor`。
 */
export interface MixAweme {
  status_code?: number
  aweme_list: unknown[]
  cursor: number
  has_more?: number
  [property: string]: unknown
}

/** 音频地址：`url_list` 是同一文件的多个 CDN 地址 */
export interface MusicPlayUrl {
  uri?: string
  url_list?: string[]
  [property: string]: unknown
}

/** `music/aweme` 条目里的原声。只收窄取 mp3 用得到的字段 */
export interface MusicAwemeListMusic {
  /** 与请求的 `music_id` 相同 */
  mid?: string
  title?: string
  author?: string
  /** 秒 */
  duration?: number
  play_url?: MusicPlayUrl
  [property: string]: unknown
}

/** `music/aweme` 的一条作品。作品本体字段未逐个核对，保持未知 */
export interface MusicAwemeListItem {
  aweme_id?: string
  music?: MusicAwemeListMusic
  [property: string]: unknown
}

/**
 * 手写协议契约，来源是 2026-10-07 Node 带登录 cookie 对签名版
 * `/aweme/v1/web/music/aweme/` 的实测。返回体是真实作品与昵称，没有录 corpus。
 *
 * 实际条数可能少于请求的 `count`（实测要 10 回 9、要 5 回 2），是否还有下一页看 `has_more`。
 */
export interface MusicAwemeList {
  status_code?: number
  aweme_list?: MusicAwemeListItem[]
  cursor?: number
  has_more?: number
  [property: string]: unknown
}
