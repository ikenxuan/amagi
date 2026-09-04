import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'
import { kuaishouH5Headers } from '../config'

/**
 * 获取单个作品信息（H5 **免签**精简版 `ugH5App/photo/simple/info`）。
 *
 * 与 `videoWork` 走的 `photo/info` 是「精简 / 完整」的关系。这条的三个特征都是
 * 刻意的：**不签名**、body 只有 `photoId`、**一个 Cookie 头都不发**（所以也没有
 * `prepare`，did 在这里没有位置）。
 *
 * 它存在的意义是**安全网**。签名是逆向产物，快手改一次前端 sig4，`photo/info`
 * 就会开始回 `result=50`；这条不参与签名，那种失效影响不到它。所以「完整版挂了
 * 还能降级」不是锦上添花，是这次迁移唯一的兜底。
 *
 * 代价是字段少：没有 `mp4Url`（图集的视频版）、没有同类推荐 `photos`、没有前几条
 * 评论 `comments`。返回类型与 `videoWork` 共用 `KsOneWork` —— 那份类型里这三个键
 * 本来就是可选的，正是为了同时描述完整版与精简版两种响应。
 *
 * **降级不是自动的**：管线里没有「judge 判失败后换一条 spec 重发」的钩子，
 * 而 `partial: 'tolerate'` 那条路会让每次调用都白发一个请求（快手的评论接口有
 * IP 级冷却，多一倍请求是实打实的代价）。所以这里做成一个独立可调的端点，
 * 由调用方决定何时降级。
 *
 * 接口形状来自 @OduckO 的 kuaishou-parser（GPL-3.0-only）：https://github.com/OduckO
 */
export const videoWorkSimple = defineEndpoint({
  name: 'kuaishou.videoWorkSimple',
  route: '/fetch_one_work_simple',
  doc: { summary: '单个作品信息（免签精简版）' },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' })
  }),
  build: (p) => {
    const req = kuaishouApiUrls.videoWorkSimple(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      headers: kuaishouH5Headers(req.referer)
    }
  },
  response: type<KuaishouReturnTypeMap['videoWorkSimple']>()
})
