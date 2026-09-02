import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bilibiliApiUrls } from '../api'

/**
 * 查询二维码状态（单请求）。
 *
 * 与 v6 的 `qrcodeStatus` 一致：`getQrcodeStatus` GET，无签名。
 * **返回形状变化**：v6 把响应 `headers` 一起透出（`data: { data, headers }`），
 * v7 只返回平台响应体（`code` / `data` / `message`），不再透出 headers。
 * 阶段 5 会话接管时基于这个形状做轮询。
 */
export const qrcodeStatus = defineEndpoint({
  name: 'bilibili.qrcodeStatus',
  route: '/check_qrcode',
  params: zod.object({
    qrcode_key: zod.string().min(1, { error: '二维码key不能为空' })
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getQrcodeStatus(p) }),
  retryOn: ['RISK_CONTROL'], // -412 退避重试（修 A4，v6 在 GlobalGetData 里递归重试）

  response: type<QrcodeStatusData>()
})

/** 二维码状态响应（v7 形状：不再透出 headers） */
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
