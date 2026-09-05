import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'
import { DOUYIN_GUEST_DROP_HEADERS } from '../config'

/**
 * 原声本体 —— 免鉴权。
 *
 * 与 {@link musicInfo}（`music/detail`，要 a_bogus + secsdk）是**并列的两条路**，
 * 不是主备关系：`music/detail` 一次请求就带 mp3 与权威 `user_count`，这条免 cookie、
 * 免签名但 `music_info` 里**没有 `play_url`** —— mp3 只能从源作品上取，
 * `extra.extract_item_id` 就是创建这条原声的那个作品。哪条优先由调用方按场景排。
 *
 * 接口形状来自 #188（@OduckO）。
 */
export const guestMusicInfo = defineEndpoint({
  name: 'douyin.guestMusicInfo',
  route: '/fetch_guest_music_info',
  doc: { summary: '原声本体（免鉴权）' },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' })
  }),
  build: (p) => ({
    method: 'GET',
    url: douyinApiUrls.getGuestMusicInfo(p),
    dropHeaders: DOUYIN_GUEST_DROP_HEADERS
  }),
  sign: false,
  response: type<DouyinReturnTypeMap['guestMusicInfo']>()
})
