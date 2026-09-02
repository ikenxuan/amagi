import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { av2bv } from '../sign/bv2av'

/**
 * AV 号转 BV 号（纯本地计算，不发请求）。
 *
 * 修 #35：v6 的 `avToBv` 用 `BigInt(aid)` 转换，小数 aid 会让 BigInt 抛错
 * （KNOWN-DEFECT 有测试锁死）。v7 的 schema 用
 * `zod.coerce.number().int().positive()` 在入参阶段就拦住非整数。
 *
 * 返回形状与 v6 一致：`{ bvid }`。
 */
export const avToBv = defineEndpoint({
  name: 'bilibili.avToBv',
  route: '/av_to_bv',
  doc: { summary: 'AV 号转换得到的 BV 号' },
  params: zod.object({
    avid: zod.coerce.number().int({ error: 'AVID必须是整数' }).positive({ error: 'AVID必须是正数' }) // #35：小数被拦
  }),
  // 显式标注返回类型：否则 TData 由 compute 推导为 `{ bvid: string }`，丢掉索引签名
  compute: (p): AvToBvData => ({ bvid: av2bv(p.avid) }),
  response: type<AvToBvData>()
})

/** AV 转 BV 的返回形状（`{ bvid }`，与 v6 行为一致）。不复用 `BilibiliReturnTypeMap['avToBv']`：
 * v6 映射条目是 API 信封形状（`{ code, data: { bvid }, message }`），与 v6/v7 的实际返回都不符。 */
export interface AvToBvData {
  bvid: string

  /** 平台加字段不算 breaking（06-migration：类型是实测快照） */
  [key: string]: unknown
}
