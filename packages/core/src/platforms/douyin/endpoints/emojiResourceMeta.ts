import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'
import { DOUYIN_ANDROID_UA, DOUYIN_GUEST_DROP_HEADERS } from '../config'

/**
 * 表情资源包元信息 —— 免鉴权，走抖音 App 的 `api.amemv.com`。
 *
 * 回答的是「是哪个包、去哪下」：`android_emoji_resource` 形如
 * `{ id, md5, resource_url, update_time }`，`md5` 同时是版本号，抖音 App 自己
 * 就按它做增量判断。**下载、校验、解包不在这里** —— 那是业务逻辑，
 * 下游 `kkkkkk-10086` 自己 `fetch` 那个 zip（amagi 不做二进制包管理）。
 *
 * 这条与另外三条免鉴权端点的差异是它要 **Android UA**：桌面 UA 会被拒。
 * UA 在 build 里覆盖，同时把桌面基线里那组 `sec-ch-ua*` 一并删掉 ——
 * 留着就是「Chrome 142 on Windows」的头配一个 Android Chrome 的 UA，自相矛盾。
 *
 * v6 给这条单独放宽到 15s 超时（这个接口比 douyin.com 慢）。v7 **没有跟** ——
 * `RequestSpec` 上没有 timeout 槽位，超时是「本次调用」的属性而不是端点的属性；
 * 需要更长的话由调用方传 `requestConfig: { timeout: 15000 }`。平台基线是 10s。
 *
 * 接口形状来自 #188（@OduckO）。
 */
export const emojiResourceMeta = defineEndpoint({
  name: 'douyin.emojiResourceMeta',
  route: '/fetch_emoji_resource_meta',
  doc: { summary: '表情资源包元信息（免鉴权）' },
  params: zod.object({}),
  build: () => ({
    method: 'GET',
    url: douyinApiUrls.getEmojiResourceMeta(),
    headers: { 'user-agent': DOUYIN_ANDROID_UA },
    dropHeaders: [...DOUYIN_GUEST_DROP_HEADERS, 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform']
  }),
  sign: false,
  response: type<DouyinReturnTypeMap['emojiResourceMeta']>()
})
