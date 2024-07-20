/**
 * 抖音接口类型
 */
export const enum DouyinDataType {
  二级评论数据 = 'CommentReplyData',
  用户主页数据 = 'UserInfoData',
  单个视频作品数据 = 'VideoData',
  评论数据 = 'CommentData',
  用户主页视频列表数据 = 'UserVideosListData',
  热点词数据 = 'SuggestWordsData',
  搜索数据 = 'SearchData',
  官方emoji数据 = 'EmojiData',
  动态表情数据 = 'ExpressionPlusData',
  音乐数据 = 'MusicData',
  图集作品数据 = 'NoteData',
  实况图片图集数据 = 'LiveImageData',
}

/**
 * B站接口类型
 */
export const enum BilibiliDataType {
  单个视频作品数据 = 'VideoData',
  评论数据 = 'CommentData',
  用户主页数据 = 'UserInfoData',
  用户主页动态列表数据 = 'UserDynamicListData',
  搜索数据 = 'SearchData',
  emoji数据 = 'EmojiData',
  番剧基本信息数据 = 'BangumiVideoData',
  番剧下载信息数据 = 'BangumiVideoDownloadLinkData',
  动态详情数据 = 'DynamicInfoData',
  动态卡片数据 = 'DynamicCardData'
}