import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'
import { kuaishouH5Headers } from '../config'
import { kuaishouDidPrepare } from '../did'

/**
 * 获取单个作品信息（H5 `photo/info`，POST + 签名含请求体）。
 *
 * 从 PC GraphQL 的 `visionVideoDetail` **整条换掉**（不保留并行端点）。
 * 换的原因是那条未登录拿不到数据：匿名请求返回 `{ data: { visionVideoDetail: null } }`
 * 空壳，于是 amagi 只能拿 cookie 当凭证。H5 这条是微信分享页接口，免账号鉴权，
 * 一个自己造的 did 加一个正确签名就够。
 *
 * 三件事缺一不可，这也是「换个域名试试」走不通的原因：
 * 1. `sign: 'hxfalcon'` —— 端点此前一个都不声明 sign，请求从来没签过名
 * 2. `signPath` 透给签名器 —— spec 上早有这个槽位，但过去没人读
 * 3. body 参与签名 —— `photo/info` 严格校验，body 不进 sign input 就一律 `result=50`
 *
 * 响应**不归一化**：amagi 是接口库，抹平平台差异是下游的事；而且归一化会丢掉
 * H5 独有的 `mp4Url` / `atlas`，那正是这次迁移的净收益。
 */
export const videoWork = defineEndpoint({
  name: 'kuaishou.videoWork',
  route: '/fetch_one_work',
  doc: { summary: '单个作品详细信息' },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' })
  }),
  sign: 'hxfalcon',
  prepare: kuaishouDidPrepare,
  build: (p) => {
    const req = kuaishouApiUrls.videoWork(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      signPath: req.signPath,
      headers: kuaishouH5Headers(req.referer)
    }
  },
  response: type<KuaishouReturnTypeMap['videoWork']>()
})
