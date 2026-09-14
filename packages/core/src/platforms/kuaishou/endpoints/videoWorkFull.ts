import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { kuaishouApiUrls } from '../api'
import { KUAISHOU_H5_DROP_HEADERS, kuaishouH5Headers } from '../config'
import { kuaishouDidPrepare } from '../did'

/**
 * 获取单个作品信息（H5 完整版 `photo/info`，POST + 签名含请求体）。
 *
 * **这条当前稳定撞风控**，回 `result=2001 antispam need captcha`。它不是主通道，
 * 主通道是 {@link videoWork}（`/fetch_one_work`，走免签的 `simple/info`）。
 *
 * 排除过的可能原因（每条都真发过请求）：
 *
 * | 试过的 | 结果 |
 * |---|---|
 * | 签名（逐字核过；签名错回的是 `50`） | 2001 |
 * | 请求头只留真实 H5 请求那 6 个 | 2001 |
 * | 随机 did / 浏览器里激活过的真实 did | 2001 |
 * | 完全不发 Cookie 头 | 2001 |
 * | 先 GET H5 分享页 / PC 页，用服务端下发的 cookie 预热 | 2001 |
 * | 把分享页给的 `webShareToken` 填进 `shareToken`（+ `shareResourceType` 等） | 2001 |
 * | 数字形式的 photoId 替代短 ID | 2001 |
 *
 * 保留这条端点的价值：它是唯一可能返回图集预渲染 `mp4Url`、同类推荐 `photos`、
 * 前几条评论 `comments` 的通道。但那三个字段在现有样本里从未出现过，
 * 所以「完整版更好」目前缺证据。
 *
 * 三件事缺一不可（换个域名试试走不通的原因）：
 * 1. `sign: 'hxfalcon'`
 * 2. `signPath` 透给签名器
 * 3. body 参与签名 —— 不进 sign input 就一律 `result=50`
 *
 * 响应**不归一化**：amagi 是接口库，抹平平台差异是下游的事。
 */
export const videoWorkFull = defineEndpoint({
  name: 'kuaishou.videoWorkFull',
  route: '/fetch_one_work_full',
  doc: {
    summary: '单个作品详细信息（完整版，当前稳定撞风控）',
    description:
      '**当前稳定撞风控**，回 `result=2001`（需要验证码）—— 日常取作品信息请用 `videoWork`。' +
      '保留它的原因是：它是唯一可能返回图集预渲染 `mp4Url`、同类推荐 `photos`、前几条评论 `comments` 的通道，' +
      '但那三个字段在现有样本里从未出现过。'
  },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }).describe('作品 ID')
  }),
  sign: 'hxfalcon',
  prepare: kuaishouDidPrepare,
  build: (p) => {
    const req = kuaishouApiUrls.videoWorkFull(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      signPath: req.signPath,
      headers: kuaishouH5Headers(req.referer),
      dropHeaders: KUAISHOU_H5_DROP_HEADERS
    }
  },
  response: type<any>()
})
