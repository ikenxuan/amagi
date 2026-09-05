import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 解析作品（原 `/fetch_one_work` 路径保留）。
 *
 * v6 里 5 个作品 methodType 共用 `/fetch_one_work` 一条路由（#47/#48/#54），
 * v7 拆成 5 条独立路由：`parseWork` 保留原路径，其余 4 个各占新路径。
 * 行为与 v6 一致：`getWorkDetail` GET + a_bogus 签名，返回原始响应。
 */
export const parseWork = defineEndpoint({
  name: 'douyin.parseWork',
  route: '/fetch_one_work',
  doc: { summary: '聚合解析作品数据（自动识别类型）' },
  params: zod.object({
    aweme_id: zod.string().min(1, { error: '作品ID不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: douyinApiUrls.getWorkDetail(p) }),
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦（#188）
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  response: type<DouyinReturnTypeMap['parseWork']>()
})
