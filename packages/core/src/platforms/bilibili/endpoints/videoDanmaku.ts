import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { BilibiliReturnTypeMap } from '../../../types/ReturnDataType/Bilibili'
import { bilibiliApiUrls } from '../api'
import { parseDmSegMobileReply } from '../decode/danmaku'

/**
 * 实时弹幕（protobuf，`responseType: 'arraybuffer'`，judge 恒成功）。
 *
 * 与 v6 的 `videoDanmaku` 一致：`getVideoDanmaku` GET 拿二进制，
 * `decode` 用 `parseDmSegMobileReply` 解析 protobuf，最终形状
 * `{ elems }`（v6 的 `data: { elems }`）。
 *
 * judge 恒成功：二进制响应没有 `code` 字段，交给 decode 解析；
 * 解析失败由 execute 归因为 `parse` / `DECODE_FAILED`。
 */
export const videoDanmaku = defineEndpoint({
  name: 'bilibili.videoDanmaku',
  route: '/fetch_danmaku',
  params: zod.object({
    cid: zod.coerce.number().int().min(1, { error: 'CID必须大于等于1' }),
    segment_index: zod.coerce.number().int().min(1).default(1).optional()
  }),
  build: (p) => ({ method: 'GET', url: bilibiliApiUrls.getVideoDanmaku(p), responseType: 'arraybuffer' }),
  decode: (raw) => {
    const message = parseDmSegMobileReply(raw as ArrayBuffer | Uint8Array)
    // parseDmSegMobileReply 返回整个 DmSegMobileReply 消息（{ elems: [...] }），
    // 端点形状是 { elems }（v6 的 data: { elems }）
    return { elems: (message as { elems?: unknown }).elems ?? [] }
  },
  judge: () => ({ ok: true }), // protobuf 无 code，恒成功；解析失败走 decode
  response: type<BilibiliReturnTypeMap['videoDanmaku']>()
})
