import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinMusicAwemeListResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

/**
 * 使用某条原声的作品列表 —— 签名版（`music/aweme`，要 a_bogus + secsdk + cookie）。
 *
 * 与 {@link guestMusicAwemeList} 同一份列表，但每条作品的 `music` 是完整对象，
 * 带 `play_url.url_list`。{@link musicInfo}（`music/detail`）对个别原声不回
 * `play_url`、也没有字段说明原因，这条是取 mp3 的兜底：列表里的作品用的就是这条原声，
 * 任取一条的 `music.play_url` 即可。
 *
 * **不声明 `paginate`**，理由同 {@link guestMusicAwemeList}：一次一页，`cursor` 由调用方带。
 */
export const musicAwemeList = defineDouyinEndpoint({
  name: 'douyin.musicAwemeList',
  route: '/fetch_music_aweme_list',
  doc: {
    summary: '某条原声下的作品列表',
    description: '某条原声下的作品列表，只取一页；每条作品的 `music` 带 mp3 播放地址，`musicInfo` 没有时从这里取。'
  },
  params: zod.object({
    music_id: zod.string().min(1, { error: '音乐ID不能为空' }).describe('原声 ID'),
    number: zod.coerce.number().int().min(1).optional().describe('本页条数，默认 10'),
    cursor: zod.coerce.number().int().min(0).optional().describe('翻页游标，默认 0')
  }),
  build: (p, ctx): RequestSpec => ({ method: 'GET', url: createDouyinApiUrls(ctx.userAgent).getMusicAwemeList(p) }),
  sign: douyinBogus(116),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<DouyinMusicAwemeListResponse>()
})
