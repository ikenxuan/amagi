import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliQrcodeStatusResponse } from '../../../types/generated'
import { bilibiliApiUrls } from '../api'

/**
 * 查询二维码状态（单请求）。
 *
 * 与旧版一致：`getQrcodeStatus` GET，无签名。
 * **返回形状**：只返回平台响应体（`code` / `data` / `message`），不透出响应 headers。
 */
export const qrcodeStatus = defineEndpoint({
  name: 'bilibili.qrcodeStatus',
  route: '/check_qrcode',
  doc: {
    summary: '二维码扫码状态',
    description:
      '轮询扫码进度。阶段在**响应体的 `data.code`** 里：86101 待扫、86090 已扫、86038 已过期、86083 拒绝、0 成功。' +
      '登录成功时新 cookie 走响应头 `Set-Cookie`，而这条端点**只透出响应体**（`code` / `data` / `message`），不透出 headers。无签名。'
  },
  params: zod.object({
    qrcode_key: zod.string().min(1, { error: '二维码key不能为空' }).describe('登录二维码的 `qrcode_key`，由 `loginQrcode` 返回')
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getQrcodeStatus(p) }),
  retryOn: ['RISK_CONTROL'], // -412 风控拦截：退避重试

  response: type<BilibiliQrcodeStatusResponse>()
})

/** 二维码状态响应（不透出 headers）。不复用 `BilibiliReturnTypeMap['qrcodeStatus']`
 *（`BiliCheckQrcode` 含 `headers` 字段）。 */
export interface QrcodeStatusData {
  code?: number
  data?: {
    url?: string
    refresh_token?: string
    timestamp?: number
    code?: number
    message?: string
    [key: string]: unknown
  }
  message?: string
  [key: string]: unknown
}
