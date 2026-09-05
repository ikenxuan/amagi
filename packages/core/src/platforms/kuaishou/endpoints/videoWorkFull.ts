import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'
import { KUAISHOU_H5_DROP_HEADERS, kuaishouH5Headers } from '../config'
import { kuaishouDidPrepare } from '../did'

/**
 * 获取单个作品信息（H5 完整版 `photo/info`，POST + 签名含请求体）。
 *
 * **这条当前稳定撞风控**，回 `result=2001 antispam need captcha`。它不是主通道，
 * 主通道是 {@link videoWork}（`/fetch_one_work`，走免签的 `simple/info`）。
 *
 * 2026-09-05 的排除过程（每条都真发过请求）：
 *
 * | 试过的 | 结果 |
 * |---|---|
 * | 签名（对照项目逐字一致；签名错回的是 `50`） | 2001 |
 * | 请求头剥到只剩迁移文档附 A 那 6 个 | 2001 |
 * | 随机 did / 浏览器里激活过的真实 did | 2001 |
 * | 完全不发 Cookie 头 | 2001 |
 * | 先 GET H5 分享页 / PC 页，用服务端下发的 cookie 预热 | 2001 |
 * | 把分享页给的 `webShareToken` 填进 `shareToken`（+ `shareResourceType` 等） | 2001 |
 * | 数字形式的 photoId 替代短 ID | 2001 |
 *
 * 对照项目 `kuaishou-parser` 打这条接口拿到的也是 2001 —— 它只是在
 * `getdata.ts:186-192` 把失败**静默**咽掉、回落到 `simple/info`，所以它的
 * web 页面看起来"没有验证码"。两边实现没有差别。
 *
 * 保留这条端点的理由：它是唯一可能返回图集预渲染 `mp4Url`、同类推荐 `photos`、
 * 前几条评论 `comments` 的通道。但那三个字段在两个仓库共 15 份响应样本里出现
 * **0 次**，所以「完整版更好」目前缺证据 —— 谁抓到一份成功响应，请补进 corpus。
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
  doc: { summary: '单个作品详细信息（完整版，当前稳定撞风控）' },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' })
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
  response: type<KuaishouReturnTypeMap['videoWorkFull']>()
})
