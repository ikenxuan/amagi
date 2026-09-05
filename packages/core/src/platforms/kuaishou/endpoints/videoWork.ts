import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'
import { KUAISHOU_H5_DROP_HEADERS, kuaishouH5Headers } from '../config'

/**
 * 获取单个作品信息（H5 免签 `ugH5App/photo/simple/info`）。
 *
 * 这条端点在 2026-09-05 从完整版 `photo/info` 换成了免签精简版。换的依据不是
 * 「完整版被拦了只好退一步」，而是**快手自己的分享页用的就是这条**：抓
 * `c.kuaishou.com/fw/photo/<photoId>` 的 SSR 内容，`window.INIT_STATE` 里只有
 * 两个键（键名是逐字符 +1 的混淆路径），解出来是 `/rest/zt/share/w/web` 与
 * `/rest/wd/ugH5App/photo/simple/info` —— 完整版根本不在其中。所以原先「完整版
 * 是 H5 主通道、精简版是兜底」的主次是反的。
 *
 * 完整版的实现保留成 {@link videoWorkFull}（route `/fetch_one_work_full`），
 * 它稳定回 `2001` 风控，排除过程记在那个文件与 `api.ts` 的 JSDoc 里。
 *
 * 这条不签名、body 只有 `photoId`、**不发 Cookie 头**（所以没有 `prepare`，
 * did 在这里没有位置）。`dropHeaders` 把平台基线里那些与移动端 UA 自相矛盾的头
 * 删掉，理由见 {@link KUAISHOU_H5_DROP_HEADERS}。
 *
 * 接口形状来自 @OduckO 的 kuaishou-parser（GPL-3.0-only）：https://github.com/OduckO
 */
export const videoWork = defineEndpoint({
  name: 'kuaishou.videoWork',
  route: '/fetch_one_work',
  doc: { summary: '单个作品详细信息' },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' })
  }),
  build: (p) => {
    const req = kuaishouApiUrls.videoWork(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      headers: kuaishouH5Headers(req.referer),
      dropHeaders: KUAISHOU_H5_DROP_HEADERS
    }
  },
  response: type<KuaishouReturnTypeMap['videoWork']>()
})
