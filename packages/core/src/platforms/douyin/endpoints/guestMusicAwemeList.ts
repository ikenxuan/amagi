import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'
import { DOUYIN_GUEST_DROP_HEADERS } from '../config'

/**
 * 使用某条原声的作品列表 —— 免鉴权。
 *
 * 每条的 `music` 字段被抖音裁成空对象，所以这条接口**只能用来拿 `aweme_id`**，
 * 拿到之后再走 `videoWork` / `parseWork` 取详情。
 *
 * 刻意**不声明 `paginate`**：v6 这条也是一次一页（`cursor` 由调用方带），
 * 而声明式翻页会把 `number` 当成「总共要几条」并自动多打请求 ——
 * 那与 v6 语义不同，且这条接口的 `has_more` 形状还没有样本可依。
 *
 * 接口形状来自 #188（@OduckO）。
 */
export const guestMusicAwemeList = defineEndpoint({
  name: 'douyin.guestMusicAwemeList',
  route: '/fetch_guest_music_aweme_list',
  doc: { summary: '某条原声下的作品列表（免鉴权）' },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' }),
    number: zod.coerce.number().int().min(1).optional(),
    cursor: zod.coerce.number().int().min(0).optional()
  }),
  build: (p) => ({
    method: 'GET',
    url: douyinApiUrls.getGuestMusicAwemeList(p),
    dropHeaders: DOUYIN_GUEST_DROP_HEADERS
  }),
  sign: false,
  response: type<DouyinReturnTypeMap['guestMusicAwemeList']>()
})
