/**
 * 抖音接口
 */
export const enum DouyinDataType {
  /**
   * 二级评论数据
   */
  二级评论数据 = 'CommentReplyData',
  /**
   * 用户主页数据
   */
  用户主页数据 = 'UserInfoData',
  /**
   * 单个视频作品数据
   */
  单个视频作品数据 = 'VideoData',
  /**
   * 评论数据
   */
  评论数据 = 'CommentData',
  /**
   * 用户主页视频列表数据
   */
  用户主页视频列表数据 = 'UserVideosListData',
  /**
   * 热点词数据
   */
  热点词数据 = 'SuggestWordsData',
  /**
   * 搜索数据
   */
  搜索数据 = 'SearchData',
  /**
   * 官方emoji数据
   */
  官方emoji数据 = 'EmojiData',
  /**
   * 动态表情数据
   */
  动态表情数据 = 'ExpressionPlusData',
  /**
   * 音乐数据
   */
  音乐数据 = 'MusicData',
  /**
   * 图集作品数据
   */
  图集作品数据 = 'NoteData',
  /**
   * 实况图片图集数据
   */
  实况图片图集数据 = 'LiveImageData',
}

export const enum BilibiliDataType {
  单个视频作品数据 = 'VideoData',
  评论数据 = 'CommentData',
  用户主页数据 = 'UserInfoData',
  用户主页动态列表数据 = 'UserDynamicListData',
  搜索数据 = 'SearchData',
  emoji数据 = 'EmojiData',
  番剧数据 = 'BangumiVidwoData',
  动态详情数据 = 'DynamicData',
  动态卡片数据 = 'DynamicCardData'
}