import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'
import { withDouyinReferer } from '../referer'

/**
 * 搜索联想词（单请求 + Referer 注入）。
 *
 * 与 v6 的 `suggestWords` 一致：`getSuggestWords` GET + a_bogus 签名，
 * Referer 指向 `https://www.douyin.com/search/{query}`。
 */
export const suggestWords = defineEndpoint({
  name: 'douyin.suggestWords',
  route: '/fetch_suggest_words',
  doc: { summary: '搜索联想词与热点词列表' },
  params: zod.object({
    query: zod.string().min(1, { error: '搜索词不能为空' })
  }),
  build: (p, ctx) => ({
    method: 'GET',
    url: douyinApiUrls.getSuggestWords(p),
    headers: withDouyinReferer(ctx, { kind: 'searchSuggest', query: p.query })
  }),
  sign: 'a-bogus',
  response: type<DouyinReturnTypeMap['suggestWords']>()
})
