import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bv2av } from '../sign/bv2av'

/**
 * BV 号转 AV 号（纯本地计算，不发请求）。
 *
 * schema 用 BV 号正则（`BV` + 10 位 base58 字符），在入参阶段拦住非法 BV 号。
 *
 * 返回 `{ aid: number }`，不带 `av` 前缀。
 */
export const bvToAv = defineEndpoint({
  name: 'bilibili.bvToAv',
  route: '/bv_to_av',
  doc: {
    summary: 'BV 号转换得到的 AV 号',
    description:
      '纯本地计算，不发请求。返回 `{ aid }`：`aid` 是 **number**，不带 `av` 前缀，也没有平台那层 `code` / `data` 信封。非法 BV 号由 schema 的 base58 正则当场拦下，不会走到换算。'
  },
  params: zod.object({
    bvid: zod
      .string()
      .regex(/^BV[1-9A-HJ-NP-Za-km-z]{10}$/, { error: 'BV号格式不正确' })
      .describe('稿件 BV 号，形如 `BV1xx411c7mD`（`BV` + 10 位 base58 字符）')
  }),
  // 显式标注返回类型：否则 TData 由 compute 推导为 `{ aid: number }`，丢掉索引签名
  compute: (p): BvToAvData => ({ aid: bv2av(p.bvid) }),
  response: type<BvToAvData>()
})

/** BV 转 AV 的返回形状：`aid` 是 number。不复用 `BilibiliReturnTypeMap['bvToAv']`：
 * 映射条目是 API 信封形状（`{ code, data: { aid: string }, message }`），与实际返回不符。 */
export interface BvToAvData {
  aid: number

  /** 平台加字段不算 breaking（类型是实测快照） */
  [key: string]: unknown
}
