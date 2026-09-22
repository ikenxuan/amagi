import zod from 'zod'

import { AmagiHeaders, type HeadersInput } from '../../../contracts/request'
import type { BilibiliUserDynamicListResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'
import { defineBilibiliEndpoint, type } from './define'

/**
 * 用户空间动态（wbi 签名 + Origin/Referer 注入）。
 *
 * 与旧版一致：`getUserDynamicList` GET + wbi 签名，
 * headers 带 `Origin: https://space.bilibili.com` 与
 * `Referer: https://space.bilibili.com/{host_mid}/dynamic`
 * （调用方显式传了 Referer 则不覆盖）。
 */
export const userDynamicList = defineBilibiliEndpoint({
  name: 'bilibili.userDynamicList',
  route: '/fetch_user_dynamic',
  doc: {
    summary: '用户空间动态列表',
    description: '取用户空间的第一页动态列表；本接口不支持翻页。'
  },
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' }).describe('UP 主 UID')
  }),
  build: (p, ctx) => {
    const callerHeaders = new AmagiHeaders(ctx.requestConfig?.headers as HeadersInput)
    const headers: Record<string, string> = {
      Origin: 'https://space.bilibili.com'
    }
    if (!callerHeaders.has('referer')) {
      headers.Referer = `https://space.bilibili.com/${p.host_mid}/dynamic`
    }
    return { method: 'GET', url: bilibiliApiUrls.getUserDynamicList(p), headers }
  },
  sign: 'wbi',
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliUserDynamicListResponse>()
})
