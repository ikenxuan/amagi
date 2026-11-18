import zod from 'zod'

import type { DouyinAppSuggestWordsResponse } from '../../../types/generated'
import { appRequest } from '../aweme/api'
import { defineAwemeEndpoint, type } from '../aweme/define'

export const appSuggestWords = defineAwemeEndpoint({
  name: 'douyin.appSuggestWords',
  route: '/app_fetch_suggest_words',
  doc: { summary: 'App 关键词联想列表', description: '无需账号登录；App 返回 sug_list，与 Web suggest_words 的 data.words 结构不同。' },
  params: zod.object({
    query: zod.string().min(1, { error: '搜索词不能为空' }).describe('输入关键词')
  }),
  build: (p) =>
    appRequest('/aweme/v1/search/sug/', {
      keyword: p.query,
      source: 'normal_search',
      enter_from: 'search_result',
      need_personal_recommend: 0
    }),
  response: type<DouyinAppSuggestWordsResponse>()
})
