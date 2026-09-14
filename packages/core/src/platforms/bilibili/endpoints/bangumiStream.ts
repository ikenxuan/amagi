import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliBangumiStreamResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 番剧视频流信息（qtparam 前置签名）。
 *
 * 与旧版一致：`getBangumiStream` GET + qtparam 签名，
 * `ep_id` 去掉 `ep` 前缀。
 */
export const bangumiStream = defineEndpoint({
  name: 'bilibili.bangumiStream',
  route: '/fetch_bangumi_video_playurl',
  doc: {
    summary: '番剧下载流信息',
    description:
      '走 `qtparam` 签名：没带 cookie 时降级成 `&platform=html5`；有登录态则先打一次 `/nav` 看 `vipStatus`，VIP 追加 `fnval=4048&fourk=1`、非 VIP 追加 `qn=64&fnval=16`，wbi 签名基于**未追加** `fnval` 的原始 URL。要高清档位就得带登录 cookie。`ep_id` 的 `ep` 前缀在发请求前剥掉，`cid` 是剧集分集的视频流 ID。'
  },
  params: zod.object({
    cid: zod.coerce.number().int().min(1, { error: 'CID必须大于等于1' }).describe('剧集分集的 cid'),
    ep_id: zod.string().min(1, { error: '番剧EP ID不能为空' }).describe('剧集 EP ID，如 `ep330798`（`ep` 前缀会被剥掉）')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getBangumiStream({ cid: p.cid, ep_id: p.ep_id.replace('ep', '') }) }),
  sign: 'qtparam',
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliBangumiStreamResponse>()
})
