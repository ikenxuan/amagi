/**
 * 抖音公共查询参数
 */
export type DouyinOptionsType = {
  /**
   * 视频分享URL
   */
  url?: string,
  /**
   * 作品ID，囊括视频、静态图集、实况图集、实况视频
   */
  aweme_id?: string,
  /**
   * 评论ID
   */
  comment_id?: string,
  /**
   * 用户ID
   */
  sec_uid?: string,
  /**
   * 查询关键词
   */
  query?: string,
  /**
   * 音乐ID
   */
  music_id?: string
  /**
   * 评论数量，默认50，单位条
   * @default 50
   */
  number?: number | string
  /**
   * 直播间ID（虚拟的）
   */
  room_id?: number | string
  /**
   * 直播间真实房间号（可通过live.douyin.com/{web_rid}直接访问直播间），在用户主页信息的room_data中获取
   */
  web_rid?: string
  /**
   * fp指纹
   */
  verify_fp?: string
  /**
   * 评论区游标值
   */
  cursor?: number
}

/**
 * B站公共查询参数
 */
export type BilibiliOptionsType = {
  /**
   * 以后再搞这个id，有点麻烦
   */
  id?: string
  /**
   * 视频分享URL
   */
  url?: string,
  /**
   * 稿件AV号
   */
  avid?: number,
  /**
   * BV号
   */
  bvid?: string,
  /**
   * 用户ID
   */
  host_mid?: string,
  /**
   * 动态ID
   */
  dynamic_id?: string,
  /**
   * 番剧视频CID
   */
  cid?: number,
  /**
   * 番剧视频EPID
   */
  ep_id?: string
  /**
   * 番剧SSID
   */
  season_id?: string
  /**
   * 直播间ID
   */
  room_id?: string
  /**
   * 评论数量，默认20，单位条
   * @default 20
   */
  number?: number
  /**
   * 用户 Cookie
   */
  cookie?: string
  /**
   * 二维码key
   */
  qrcode_key?: string
  /**
   * 评论区类型代码
   */
  type?: number
  /**
   * 稿件ID，也就是AV号去除前缀后的内容
   */
  oid?: number
  /**
   * 评论区页码，默认1
   * @default 1
   */
  pn?: number
}

/**
 * 快手公共查询参数
 */
export type KuaishouOptionsType = {
  /**
   * 作品ID
   */
  photoId?: string,
}
