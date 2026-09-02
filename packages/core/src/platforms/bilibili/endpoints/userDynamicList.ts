import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { AmagiHeaders, type HeadersInput } from '../../../contracts/request'
import { bilibiliApiUrls } from '../api'

/**
 * 用户空间动态（wbi 签名 + Origin/Referer 注入）。
 *
 * 与 v6 的 `userDynamicList` 一致：`getUserDynamicList` GET + wbi 签名，
 * headers 带 `Origin: https://space.bilibili.com` 与
 * `Referer: https://space.bilibili.com/{host_mid}/dynamic`
 * （调用方显式传了 Referer 则不覆盖）。
 */
export const userDynamicList = defineEndpoint({
  name: 'bilibili.userDynamicList',
  route: '/fetch_user_dynamic',
  params: zod.object({
    host_mid: zod.coerce.number().int().min(1, { error: 'UP主UID必须大于等于1' })
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
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<BilibiliReturnTypeMap['userDynamicList']>()
})
