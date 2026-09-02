import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import { bv2av } from '../sign/bv2av'

/**
 * BV 号转 AV 号（纯本地计算，不发请求）。
 *
 * 修 #34：v6 的 `bvToAv` 不校验输入格式，长度不足的字符串返回垃圾值而不报错
 * （KNOWN-DEFECT 有测试锁死）。v7 的 schema 用 BV 号正则
 * （`BV` + 10 位 base58 字符）在入参阶段拦住非法 BV 号。
 *
 * 修 A7：v6 返回 `{ aid: 'av170001' }`（带 `av` 前缀的字符串），v7 返回
 * `{ aid: number }` 不带前缀。
 */
export const bvToAv = defineEndpoint({
  name: 'bilibili.bvToAv',
  route: '/bv_to_av',
  params: zod.object({
    bvid: zod.string().regex(/^BV[1-9A-HJ-NP-Za-km-z]{10}$/, { error: 'BV号格式不正确' }) // #34：正则拦非法输入
  }),
  // 显式标注返回类型：否则 TData 由 compute 推导为 `{ aid: number }`，丢掉索引签名
  compute: (p): BvToAvData => ({ aid: bv2av(p.bvid) }),
  response: type<BvToAvData>()
})

/** BV 转 AV 的返回形状（v7 形状：`aid` 是 number，A7）。不复用 `BilibiliReturnTypeMap['bvToAv']`：
 * v6 映射条目是 API 信封形状（`{ code, data: { aid: string }, message }`），与实际返回不符。 */
export interface BvToAvData {
  aid: number

  /** 平台加字段不算 breaking（06-migration：类型是实测快照） */
  [key: string]: unknown
}
