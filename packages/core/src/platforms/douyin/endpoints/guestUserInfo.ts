import zod from 'zod'

import type { DouyinGuestUserInfoResponse } from '../../../types/generated'
import { douyinApiUrls } from '../api'
import { DOUYIN_GUEST_DROP_HEADERS } from '../config'
import { defineDouyinEndpoint, type } from './define'

/**
 * 抖音号（`unique_id`）转用户信息 —— 免鉴权。
 *
 * **目前唯一免签名的「抖音号 → sec_uid」途径。** `search` 需要过 Argus、会被按概率
 * 拦下，而且是模糊匹配；这条是精确查询，一次请求就给 `sec_uid`。
 * 抖音号不存在时接口返回 `status_code: 5`，落在失败信封里。
 *
 * 免鉴权怎么声明的：`sign: false`（不加签）+ `dropHeaders`（不发 cookie / referer /
 * sec-fetch-site，见 {@link DOUYIN_GUEST_DROP_HEADERS}）。带上 cookie 只会多一层
 * 「设备参数 × 会话」的交叉校验，这条接口本来不需要身份。

 */
export const guestUserInfo = defineDouyinEndpoint({
  name: 'douyin.guestUserInfo',
  route: '/fetch_guest_user_info',
  doc: {
    summary: '抖音号转用户信息（免鉴权）',
    description: '用抖音号精确换 `sec_uid`；抖音号不存在时返回失败。'
  },
  params: zod.object({
    unique_id: zod.string().min(1, { error: '抖音号不能为空' }).describe('抖音号')
  }),
  build: (p) => ({
    method: 'GET',
    url: douyinApiUrls.getGuestUserInfo(p),
    dropHeaders: DOUYIN_GUEST_DROP_HEADERS
  }),
  sign: false,
  response: type<DouyinGuestUserInfoResponse>()
})
