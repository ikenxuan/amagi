import { SearchNoteType, SearchSortType } from 'amagi/platform/xiaohongshu/API'

/**
 * 小红书 API 方法参数映射
 */
export interface XiaohongshuMethodOptionsMap {
  HomeFeedParams: {
    methodType: 'homeFeed'
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
    methodType: 'noteDetail'
    /** 笔记ID */
    note_id: string
    /** 反爬的 X-Sec-Token 可从web地址中获取 */
    xsec_token: string
  }
  CommentParams: {
    methodType: 'noteComments'
    /** 笔记ID */
    note_id: string
    /** 游标 */
    cursor?: string
    /** 反爬的 X-Sec-Token 可从web地址中获取 */
    xsec_token: string
  }
  UserParams: {
    methodType: 'userProfile'
    /** 用户ID */
    user_id: string
  }
  UserNoteParams: {
    methodType: 'userNoteList'
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
    methodType: 'emojiList'
  }
  SearchNoteParams: {
    methodType: 'searchNotes'
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

/**
 * 小红书方法类型到参数的映射
 */
export type XiaohongshuMethodOptMap = {
  homeFeed: XiaohongshuMethodOptionsMap['HomeFeedParams']
  noteDetail: XiaohongshuMethodOptionsMap['NoteParams']
  noteComments: XiaohongshuMethodOptionsMap['CommentParams']
  userProfile: XiaohongshuMethodOptionsMap['UserParams']
  userNoteList: XiaohongshuMethodOptionsMap['UserNoteParams']
  emojiList: XiaohongshuMethodOptionsMap['EmojiListParams']
  searchNotes: XiaohongshuMethodOptionsMap['SearchNoteParams']
}
