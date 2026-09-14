/**
 * 小红书搜索排序 / 笔记类型枚举
 *
 * 独立成叶子模块：`types/XiaohongshuAPIParams.ts` 与 `platform/xiaohongshu/API.ts`
 * 都要引用这两个枚举，若定义在其中任何一处会形成二者互相 import 的环；
 * 若经 types barrel `export *` 又会泄漏到顶层公开面。故单独成叶、不进任何 barrel。
 */
export enum SearchSortType {
  /**
   * 默认排序
   */
  GENERAL = 'general',

  /**
   * 最受欢迎（按热度降序）
   */
  MOST_POPULAR = 'popularity_descending',

  /**
   * 最新发布（按时间降序）
   */
  LATEST = 'time_descending'
}

export enum SearchNoteType {
  /**
   * 默认（全部类型）
   */
  ALL = 0,

  /**
   * 仅视频
   */
  VIDEO = 1,

  /**
   * 仅图片
   */
  IMAGE = 2
}
