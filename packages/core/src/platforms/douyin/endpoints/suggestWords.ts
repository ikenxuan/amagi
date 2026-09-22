import zod from 'zod'

import type { DouyinSuggestWordsResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'
import { defineDouyinEndpoint, type } from './define'

/**
 * 搜索联想词（单请求 + Referer 注入）。
 *
 * 与旧版一致：`getSuggestWords` GET + a_bogus 签名，
 * Referer 指向 `https://www.douyin.com/search/{query}`。
 */
export const suggestWords = defineDouyinEndpoint({
  name: 'douyin.suggestWords',
  route: '/fetch_suggest_words',
  doc: {
    summary: '搜索联想词与热点词列表',
    description: '按输入前缀返回候选词与热点词；不返回搜索结果，搜索用 `search`。'
  },
  params: zod.object({
    query: zod.string().min(1, { error: '搜索词不能为空' }).describe('搜索关键词（输入前缀）')
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getSuggestWords(p),
    headers: withDouyinReferer(ctx, { kind: 'searchSuggest', query: p.query })
  }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinSuggestWordsResponse>()
})
