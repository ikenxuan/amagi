import { SearchSortType, SearchNoteType } from 'amagi/platform/xiaohongshu/API'

export interface XiaohongshuMethodOptionsMap {
  HomeFeedParams: {
    methodType: '首页推荐数据'
    /** 游标分数，用于分页 */
    cursor_score?: string
    /** 每次请求的数量 */
    num?: number
    /** 刷新类型 */
    refresh_type?: number
    /** 笔记索引 */
    note_index?: number
    /** 分类 */
    category?: string
    /** 搜索关键词 */
    search_key?: string
  }
  NoteParams: {
    methodType: '单个笔记数据'
    /** 笔记ID */
    note_id: string
    /** 反爬的 X-Sec-Token 可从web地址中获取 */
    xsec_token: string
  }
  CommentParams: {
    methodType: '评论数据'
    /** 笔记ID */
    note_id: string
    /** 游标 */
    cursor?: string
    /** 反爬的 X-Sec-Token 可从web地址中获取 */
    xsec_token: string
  }
  UserParams: {
    methodType: '用户数据'
    /** 用户ID */
    user_id: string
  }
  UserNoteParams: {
    methodType: '用户笔记数据'
    /** 用户ID */
    user_id: string
    /** 上一页最后一条笔记的ID */
    cursor?: string
    /**
     * 每次请求的数量
     * @default 30
     */
    num?: number
  }
  EmojiListParams: {
    methodType: '表情列表'
  }
  SearchNoteParams: {
    methodType: '搜索笔记'
    /** 搜索关键词 */
    keyword: string
    /** 页码 */
    page?: number
    /** 每页数量 */
    page_size?: number
    /** 排序类型 */
    sort?: SearchSortType
    /** 笔记类型 */
    note_type?: SearchNoteType
  }
}

export type XiaohongshuMethodOptionsWithoutMethodType = {
  [K in keyof XiaohongshuMethodOptionsMap]: Omit<XiaohongshuMethodOptionsMap[K], 'methodType'>
}