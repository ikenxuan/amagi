import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'

/**
 * 番剧基本信息（单请求）。
 *
 * 与 v6 的 `bangumiInfo` 一致：`getBangumiInfo` GET，无签名。
 * 修 #53：v6 的 `season_id` 为空字符串时 refine 判 falsy 而报错；
 * v7 的 schema 用 `.min(1)` 显式排除空串，`ep_id` / `season_id` 至少其一。
 */
export const bangumiInfo = defineEndpoint({
  name: 'bilibili.bangumiInfo',
  route: '/fetch_bangumi_video_info',
  params: zod
    .object({
      ep_id: zod.string().min(1, { error: '番剧EP ID不能为空' }).optional(),
      season_id: zod.string().min(1, { error: '番剧季度ID不能为空' }).optional() // #53：空串被 min(1) 排除
    })
    .refine((data) => data.ep_id ?? data.season_id, {
      error: 'ep_id 和 season_id 至少需要提供一个',
      path: ['ep_id']
    }),
  build: (p) => {
    // v6：ep_id 优先；id 去掉 ep/ss 前缀（如 ep330798 -> 330798）
    const id = p.ep_id ?? p.season_id!
    const idType = id.startsWith('ep') ? 'ep_id' : 'season_id'
    const newId = idType === 'ep_id' ? id.replace('ep', '') : id.replace('ss', '')
    return { method: 'GET', url: bilibiliApiUrls.getBangumiInfo({ [idType]: newId }) }
  },
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['bangumiInfo']>()
})
