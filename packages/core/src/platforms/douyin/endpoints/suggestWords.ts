import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinSuggestWordsResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

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
  build: (p, ctx): RequestSpec => ({
    method: 'GET',
    url: createDouyinApiUrls(ctx.userAgent).getSuggestWords(p),
    headers: withDouyinReferer(ctx, { kind: 'searchSuggest', query: p.query })
  }),
  sign: douyinBogus(184),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<DouyinSuggestWordsResponse>()
})
