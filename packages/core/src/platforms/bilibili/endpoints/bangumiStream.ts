import zod from 'zod'

import type { BilibiliBangumiStreamResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 番剧视频流信息（qtparam 前置签名）。
 *
 * 与旧版一致：`getBangumiStream` GET + qtparam 签名，
 * `ep_id` 去掉 `ep` 前缀。
 */
export const bangumiStream = defineBilibiliEndpoint({
  name: 'bilibili.bangumiStream',
  route: '/fetch_bangumi_video_playurl',
  doc: {
    summary: '番剧下载流信息',
    description: '取番剧剧集的播放与下载流地址；高清档位需要带登录凭证。'
  },
  params: zod.object({
    cid: zod.coerce.number().int().min(1, { error: 'CID必须大于等于1' }).describe('剧集分集的 cid'),
    ep_id: zod.string().min(1, { error: '番剧EP ID不能为空' }).describe('剧集 EP ID，如 `ep330798`')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getBangumiStream({ cid: p.cid, ep_id: p.ep_id.replace('ep', '') }) }),
  sign: 'qtparam',
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliBangumiStreamResponse>()
})
