import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliBangumiInfoResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 番剧基本信息（单请求）。
 *
 * 与旧版一致：`getBangumiInfo` GET，无签名。
 * `ep_id` 与 `season_id` 至少传其一，两者都要求非空串（`ep_id` 优先）。
 */
export const bangumiInfo = defineEndpoint({
  name: 'bilibili.bangumiInfo',
  route: '/fetch_bangumi_video_info',
  doc: {
    summary: '番剧基本信息',
    description:
      '`ep_id` 与 `season_id` 至少传一个，都传时 `ep_id` 优先。两者都带 `ep` / `ss` 前缀，`build` 按前缀判定该发哪个字段并剥掉前缀 —— **传不带前缀的裸数字会被当成 `season_id`**。无签名。'
  },
  params: zod
    .object({
      ep_id: zod
        .string()
        .min(1, { error: '番剧EP ID不能为空' })
        .optional()
        .describe('剧集 EP ID，如 `ep330798`（`ep` 前缀参与判定，会被剥掉）'),
      season_id: zod
        .string()
        .min(1, { error: '番剧季度ID不能为空' })
        .optional()
        .describe('番剧季度 SS ID，如 `ss33802`；`ep_id` 缺省时才用') // 空串被 min(1) 排除
    })
    .refine((data) => data.ep_id ?? data.season_id, {
      error: 'ep_id 和 season_id 至少需要提供一个',
      path: ['ep_id']
    }),
  build: (p) => {
    // ep_id 优先；id 去掉 ep/ss 前缀（如 ep330798 -> 330798）
    const id = p.ep_id ?? p.season_id!
    const idType = id.startsWith('ep') ? 'ep_id' : 'season_id'
    const newId = idType === 'ep_id' ? id.replace('ep', '') : id.replace('ss', '')
    return { method: 'GET', url: bilibiliApiUrls.getBangumiInfo({ [idType]: newId }) }
  },
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliBangumiInfoResponse>()
})
