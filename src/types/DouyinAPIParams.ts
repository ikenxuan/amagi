type WorkParams = {
  /** 视频ID */
  aweme_id: string
  /** 获取的评论数量 */
  number?: number | string
}
type CommentParams = {
  /** 视频ID */
  aweme_id: string
  /** 评论ID */
  comment_id: string
}
type UserParams = {
  /** 用户ID */
  sec_uid: string
}
type SearchParams = {
  /** 搜索词 */
  query: string
}
type MusicParams = {
  /** 音乐ID */
  music_id: string
}
type LiveRoomParams = {
  /** 直播间ID */
  room_id: string
  /** 直播间真实房间号（可通过live.douyin.com/{web_rid}直接访问直播间），在用户主页信息的room_data中获取 */
  web_rid?: string
}

/** 抖音API接口参数类型 */
export type DouyinAPIParams = {
  WorkParams: WorkParams
  CommentParams: CommentParams
  UserParams: UserParams
  SearchParams: SearchParams
  MusicParams: MusicParams
  LiveRoomParams: LiveRoomParams
}