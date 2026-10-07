import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinGuestMusicInfoResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { DOUYIN_GUEST_DROP_HEADERS } from '../config'
import { defineDouyinEndpoint, type } from './define'

/**
 * 原声本体 —— 免鉴权。
 *
 * 与 {@link musicInfo}（`music/detail`，要 a_bogus + secsdk）是**并列的两条路**，
 * 不是主备关系：这条免 cookie、免签名，但 `music_info` 里**没有 `play_url`**，
 * 响应里也没有指向源作品的字段（`extra` 只有 `logid` / `now`）。
 *
 * 要 mp3 先走 `music/detail`；它对个别原声也不回 `play_url`（2026-10-07 抽 10 条有 1 条），
 * 再退到 {@link musicAwemeList}，那里每条作品的 `music.play_url` 都在。
 */
export const guestMusicInfo = defineDouyinEndpoint({
  name: 'douyin.guestMusicInfo',
  route: '/fetch_guest_music_info',
  doc: {
    summary: '原声本体（免鉴权）',
    description: '按原声 ID 返回原声详情；这条没有 mp3 播放地址，需要时用 `musicInfo`。'
  },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' }).describe('原声 ID')
  }),
  build: (p): RequestSpec => ({
    method: 'GET',
    url: douyinApiUrls.getGuestMusicInfo(p),
    dropHeaders: DOUYIN_GUEST_DROP_HEADERS
  }),
  sign: false,
  response: type<DouyinGuestMusicInfoResponse>()
})
