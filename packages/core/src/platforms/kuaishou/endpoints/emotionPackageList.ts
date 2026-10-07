import zod from 'zod'

import type { KuaishouEmotionPackageListResponse } from '../../../types/generated'
import { kuaishouApiUrls } from '../api'
import { defineKuaishouEndpoint, type } from './define'

/**
 * 获取表情包列表（PC REST `/rest/k/emotion/package/list`）。
 *
 * 与 `emojiList` 仅返回图标地址不同，这里返回包元数据及包内表情。
 * 无凭据 POST 空对象实测成功，不声明签名或设备凭据准备步骤。
 *
 * 实测 1 包、275 条表情，不将数量固定在契约里。
 * 未保存原始响应或新增 corpus；来源见 response-types/src/protocols/README.md。
 */
export const emotionPackageList = defineKuaishouEndpoint({
  name: 'kuaishou.emotionPackageList',
  route: '/fetch_emotion_package_list',
  doc: {
    summary: '表情包列表',
    description: '取快手表情包列表（含包元数据与包内每条表情），无参数。只要表情图标地址时用 `emojiList`。'
  },
  params: zod.object({}),
  build: () => {
    const req = kuaishouApiUrls.emotionPackageList()
    return {
      method: req.method,
      url: req.url,
      body: req.body
    }
  },
  response: type<KuaishouEmotionPackageListResponse>()
})
