import zod from 'zod'

import type { XiaohongshuSearchHotListResponse } from '../../../types/generated'
import { searchHotList as buildSearchHotList } from '../api'
import { defineXiaohongshuEndpoint, type } from './define'

/**
 * 搜索热榜（GET，无参数），移植自 v6：
 * `edith.xiaohongshu.com/api/sns/mobile/v1/search/hot_list_h5`。
 * 返回当前热榜条目，参数用空 schema。
 */
export const searchHotList = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.searchHotList',
  route: '/fetch_search_hot_list',
  doc: {
    summary: '搜索热榜',
    description: '取小红书当前搜索热榜，无参数。'
  },
  params: zod.object({}),
  build: () => {
    const { Url, apiPath } = buildSearchHotList()
    return { method: 'GET', url: Url, signPath: apiPath }
  },
  sign: 'xhs-get',
  response: type<XiaohongshuSearchHotListResponse>()
})
