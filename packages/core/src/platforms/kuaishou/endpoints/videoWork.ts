import zod from 'zod'

import type { KuaishouVideoWorkResponse } from '../../../types/generated'
import { kuaishouApiUrls } from '../api'
import { KUAISHOU_H5_DROP_HEADERS, kuaishouH5Headers } from '../config'
import { defineKuaishouEndpoint, type } from './define'

/**
 * 获取单个作品信息（H5 免签 `ugH5App/photo/simple/info`）。
 *
 * 这条走免签精简版 `ugH5App/photo/simple/info`。选它作主通道的依据是
 * **快手自己的分享页用的就是这条**：抓 `c.kuaishou.com/fw/photo/<photoId>` 的 SSR
 * 内容，`window.INIT_STATE` 里只有两个键（键名是逐字符 +1 的混淆路径），解出来是
 * `/rest/zt/share/w/web` 与 `/rest/wd/ugH5App/photo/simple/info` —— 完整版不在其中。
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
export const videoWork = defineKuaishouEndpoint({
  name: 'kuaishou.videoWork',
  route: '/fetch_one_work',
  doc: {
    summary: '单个作品详细信息',
    description: '取快手作品详情。要图集预渲染地址等完整版字段时用 `videoWorkFull`。'
  },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }).describe('作品 ID')
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
  response: type<KuaishouVideoWorkResponse>()
})
