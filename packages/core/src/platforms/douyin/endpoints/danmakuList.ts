import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { DouyinReturnTypeMap } from '../../../types/ReturnDataType/Douyin'
import { douyinApiUrls } from '../api'

/**
 * 弹幕列表（分段并发 + 合并排序 + `partial: 'tolerate'`）。
 *
 * v6 的 `danmakuList` 行为：总时长 ≤ 32000ms 单段直取；超过则按 32000ms
 * 切成多段，`Promise.all` 并发请求，**单段失败容忍**（失败段返回 null，
 * 其余段照常合并），最后按 `offset_time` 升序合并，元信息
 * （`extra` / `log_pb` / `status_code`）取第一段。
 *
 * v7 对应：`build` 返回分段数组（并发发出），`partial: 'tolerate'` 声明
 * 单段失败不炸整体（execute 的 tolerate：**全部分片都失败时仍返回失败信封**），
 * `normalize` 负责合并与排序。
 */
export const danmakuList = defineEndpoint({
  name: 'douyin.danmakuList',
  route: '/fetch_work_danmaku',
  doc: { summary: '作品弹幕列表' },
  params: zod
    .object({
      aweme_id: zod.string().min(1, { error: '作品ID不能为空' }),
      start_time: zod.coerce.number().int().min(0).optional(),
      end_time: zod.coerce.number().int().min(0).optional(),
      duration: zod.coerce.number().int().min(0)
    })
    .refine((data) => data.end_time === undefined || data.end_time <= data.duration, {
      error: '获取弹幕区间的结束时间不能超过视频总时长',
      path: ['end_time']
    })
    .refine((data) => data.start_time === undefined || data.end_time === undefined || data.start_time < data.end_time, {
      error: '获取弹幕区间的开始时间必须小于结束时间',
      path: ['start_time']
    }),
  build: (p) => {
    const MAX_SEGMENT_DURATION = 32000
    const startTime = p.start_time ?? 0
    const endTime = p.end_time ?? p.duration

    // 单段与多段统一走分段：总时长 ≤ 32000ms 时只有一段
    const segments: Array<{ start: number; end: number }> = []
    let currentStart = startTime
    while (currentStart < endTime) {
      const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, endTime)
      segments.push({ start: currentStart, end: currentEnd })
      currentStart = currentEnd
    }
    if (segments.length === 0) segments.push({ start: startTime, end: endTime })

    return segments.map((segment, index) => ({
      method: 'GET',
      url: douyinApiUrls.getDanmakuList({
        aweme_id: p.aweme_id,
        start_time: segment.start,
        end_time: segment.end,
        duration: p.duration
      }),
      tag: `segment-${index + 1}`
    }))
  },
  sign: 'a-bogus',
  // Argus 拦截（纯文本 body → ANTIBOT_PAGE）换一整套参数重试：它按单次请求的
  // token 组判定、不锁账号，所以重放同一个 msToken + a_bogus 必然同样被拦（#188）
  retryOn: ['ANTIBOT_PAGE'],
  retryFresh: true,
  partial: 'tolerate',
  normalize: (decoded, params) => {
    const parts = decoded as Array<Partial<DanmakuSegment> | undefined>
    const startTime = params.start_time ?? 0
    const endTime = params.end_time ?? params.duration

    const merged: Array<{ offset_time?: number; [key: string]: unknown }> = []
    let finalExtra: unknown = null
    let finalLogPb: unknown = null
    let finalStatusCode = 0

    parts.forEach((segmentData, index) => {
      if (segmentData && Array.isArray(segmentData.danmaku_list)) {
        merged.push(...(segmentData.danmaku_list as Array<{ offset_time?: number; [key: string]: unknown }>))
        if (index === 0) {
          finalExtra = segmentData.extra
          finalLogPb = segmentData.log_pb
          finalStatusCode = segmentData.status_code ?? 0
        }
      }
    })

    merged.sort((a, b) => (a.offset_time ?? 0) - (b.offset_time ?? 0))

    return {
      danmaku_list: merged,
      start_time: startTime,
      end_time: endTime,
      total: merged.length,
      status_code: finalStatusCode,
      extra: finalExtra,
      log_pb: finalLogPb
    } as DouyinReturnTypeMap['danmakuList']
  },
  response: type<DouyinReturnTypeMap['danmakuList']>()
})

/** 一段弹幕响应的形状（normalize 里合并用） */
interface DanmakuSegment {
  danmaku_list?: unknown[]
  status_code?: number
  extra?: unknown
  log_pb?: unknown
}
