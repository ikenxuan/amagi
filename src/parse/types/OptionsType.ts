/**
 * 接口公共查询参数
 */
export interface OptionsType {
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
}
