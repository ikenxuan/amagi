type WorkParams = {
  /** 视频分享URL */
  url?: string
  /** 视频ID，数据获取更准确，和url二选一 */
  aweme_id: string
  /** 获取的评论数量 */
  number?: number
}
type LiveWorkParams = {
  /** 视频分享URL，和aweme_id二选一 */
  url?: string
  /** 视频ID，，数据获取更准确，和url二选一 */
  aweme_id?: string
}
type CommentParams = {
  /** 视频ID，数据获取更准确，和url二选一 */
  aweme_id: string
  /** 获取的评论数量 */
  number: number
  /** 游标 */
  cursor?: number
}
type CommentReplyParams = {
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
type QrcodeParams = {
  /** fp指纹 */
  verify_fp: string
}

export interface DouyinDataOptionsMapKeys {
  CommentReplyParams: CommentReplyParams,
  UserParams: UserParams,
  WorkParams: WorkParams,
  CommentParams: CommentParams,
  MusicParams: MusicParams,
  LiveWorkParams: LiveWorkParams,
  LiveRoomParams: LiveRoomParams,
  QrcodeParams: QrcodeParams,
  SearchParams: SearchParams
}

export type DouyinDataOptionsMap = {
  '二级评论数据': CommentReplyParams,
  '用户主页数据': UserParams,
  '单个视频作品数据': WorkParams,
  '评论数据': CommentParams,
  '用户主页视频列表数据': UserParams,
  '热点词数据': SearchParams,
  '搜索数据': SearchParams,
  '官方emoji数据': {},
  '动态表情数据': {},
  '音乐数据': MusicParams,
  '图集作品数据': WorkParams,
  '实况图片图集数据': LiveWorkParams,
  '直播间信息数据': LiveRoomParams,
  '申请二维码数据': QrcodeParams
}
