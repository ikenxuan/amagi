/**
 * 接口类型
 */
export const enum DataType {
  /**
   * 二级评论数据
   */
  CommentReplyData = 'CommentReplyData',
  /**
   * 用户主页数据
   */
  UserInfoData = 'UserInfoData',
  /**
   * 单个视频作品数据
   */
  VideoData = 'VideoData',
  /**
   * 评论数据
   */
  CommentData = 'CommentData',
  /**
   * 用户主页视频列表数据
   */
  UserVideosListData = 'UserVideosListData',
  /**
   * 热点词数据
   */
  SuggestWordsData = 'SuggestWordsData',
  /**
   * 搜索数据
   */
  SearchData = 'SearchData',
  /**
   * 官方emoji数据
   */
  EmojiData = 'EmojiData',
  /**
   * 动态表情数据
   */
  ExpressionPlusData = 'ExpressionPlusData',
  /**
   * 音乐数据
   */
  MusicData = 'MusicData',
  /**
   * 图集作品数据
   */
  NoteData = 'NoteData',
  /**
   * 实况图片图集数据
   */
  LiveImageData = 'LiveImageData',
}
