export * from './DYNAMIC_TYPE_AV'
export * from './DYNAMIC_TYPE_DRAW'
export * from './DYNAMIC_TYPE_FORWARD'
export * from './DYNAMIC_TYPE_LIVE_RCMD'
export * from './DYNAMIC_TYPE_WORD'

/**
 * 转发动态种子动态主体类型枚举
 */
export enum MajorType {
  /** 动态失效 */
  NONE = 'MAJOR_TYPE_NONE',
  /** 图文动态 */
  OPUS = 'MAJOR_TYPE_OPUS',
  /** 视频 */
  ARCHIVE = 'MAJOR_TYPE_ARCHIVE',
  /** 剧集更新 */
  PGC = 'MAJOR_TYPE_PGC',
  /** 课程 */
  COURSES = 'MAJOR_TYPE_COURSES',
  /** 带图动态 */
  DRAW = 'MAJOR_TYPE_DRAW',
  /** 文章 */
  ARTICLE = 'MAJOR_TYPE_ARTICLE',
  /** 音频更新 */
  MUSIC = 'MAJOR_TYPE_MUSIC',
  /** 一般类型 */
  COMMON = 'MAJOR_TYPE_COMMON',
  /** 直播间分享 */
  LIVE = 'MAJOR_TYPE_LIVE',
  /** 媒体列表 */
  MEDIALIST = 'MAJOR_TYPE_MEDIALIST',
  /** 小程序 */
  APPLET = 'MAJOR_TYPE_APPLET',
  /** 订阅 */
  SUBSCRIPTION = 'MAJOR_TYPE_SUBSCRIPTION',
  /** 直播状态 */
  LIVE_RCMD = 'MAJOR_TYPE_LIVE_RCMD',
  /** 合集更新 */
  UGC_SEASON = 'MAJOR_TYPE_UGC_SEASON',
  /** 新订阅 */
  SUBSCRIPTION_NEW = 'MAJOR_TYPE_SUBSCRIPTION_NEW',
  /** 充电相关 */
  UPOWER_COMMON = 'MAJOR_TYPE_UPOWER_COMMON'
}

/**
 * 相关内容卡片类型枚举
 * 用于标识动态中附加的相关内容卡片的类型
 */
export enum AdditionalType {
  /** 无相关内容 */
  NONE = 'ADDITIONAL_TYPE_NONE',
  /** 剧集相关 */
  PGC = 'ADDITIONAL_TYPE_PGC',
  /** 商品信息 */
  GOODS = 'ADDITIONAL_TYPE_GOODS',
  /** 投票 */
  VOTE = 'ADDITIONAL_TYPE_VOTE',
  /** 一般类型 */
  COMMON = 'ADDITIONAL_TYPE_COMMON',
  /** 比赛信息 */
  MATCH = 'ADDITIONAL_TYPE_MATCH',
  /** UP主推荐 */
  UP_RCMD = 'ADDITIONAL_TYPE_UP_RCMD',
  /** 视频跳转 */
  UGC = 'ADDITIONAL_TYPE_UGC',
  /** 直播预约 */
  RESERVE = 'ADDITIONAL_TYPE_RESERVE',
  /** 充电专属抽奖 */
  UPOWER_LOTTERY = 'ADDITIONAL_TYPE_UPOWER_LOTTERY'
}