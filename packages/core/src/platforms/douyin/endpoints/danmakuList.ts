import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { DouyinDanmakuListResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

/**
 * duration 的硬上限（毫秒，7 天）。
 *
 * 这是同步切段的保险丝，避免异常大值撑爆数组或卡住事件循环，
 * 不限制 27 小时级直播回放。发送并发另由执行器的限额池控制。
 * v6 校验入口也使用此常量。
 */
export const DANMAKU_MAX_DURATION_MS = 604_800_000

/**
 * 弹幕列表（分段并发 + 合并排序 + `partial: 'tolerate'`）。
 *
 * 总时长 ≤ 32000ms 单段直取；超过则按 32000ms 切成多段，经执行器的限额并发池
 * 发出（`SEGMENT_CONCURRENCY`，完成一个补一个）。
 * **单段失败容忍**（失败段留空，其余段照常合并），最后按 `offset_time`
 * 升序合并，元信息（`extra` / `log_pb` / `status_code`）取第一段成功段。
 *
 * `build` 返回分段数组，`partial: 'tolerate'` 声明单段失败不炸整体
 * （全部分片都失败时仍返回失败信封），`aggregate` 负责合并与排序。
 *
 * msToken 取 184 而非 116：2026-10-05 抓包里浏览器的 `danmaku/get_v2` 发的是 184 位，
 * 与其余 `/aweme/v1/web/*` 一致。
 */
export const danmakuList = defineDouyinEndpoint({
  name: 'douyin.danmakuList',
  route: '/fetch_work_danmaku',
  doc: {
    summary: '作品弹幕列表',
    description: '取作品在给定时间区间内的弹幕；不给区间即全片，返回按时间排序。'
  },
  params: zod
    .object({
      aweme_id: zod.string().min(1, { error: '作品ID不能为空' }).describe('作品 ID'),
      start_time: zod.coerce.number().int().min(0).optional().describe('区间起点（毫秒），默认 0'),
      end_time: zod.coerce.number().int().min(0).optional().describe('区间终点（毫秒），默认取总时长'),
      duration: zod.coerce
        .number()
        .int()
        .min(0)
        .max(DANMAKU_MAX_DURATION_MS, { error: '作品总时长不能超过 7 天' })
        .describe('作品总时长（毫秒），也是默认终点')
    })
    .refine((data) => data.end_time === undefined || data.end_time <= data.duration, {
      error: '获取弹幕区间的结束时间不能超过视频总时长',
      path: ['end_time']
    })
    .refine((data) => data.start_time === undefined || data.end_time === undefined || data.start_time < data.end_time, {
      error: '获取弹幕区间的开始时间必须小于结束时间',
      path: ['start_time']
    }),
  build: (p, ctx): RequestSpec[] => {
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
      url: createDouyinApiUrls(ctx.userAgent).getDanmakuList({
        aweme_id: p.aweme_id,
        start_time: segment.start,
        end_time: segment.end,
        duration: p.duration
      }),
      tag: `segment-${index + 1}`
    }))
  },
  sign: douyinBogus(184),
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  partial: 'tolerate',
  aggregate: ({ parts, head }, params) => {
    // parts 已收窄成 `Array<DouyinDanmakuListResponse | undefined>`（段与最终返回同形），
    // danmaku_list 的元素类型自带 offset_time —— 拼接、排序、`...head` 全程无断言。
    const merged = parts.flatMap((seg) => seg?.danmaku_list ?? []).sort((a, b) => a.offset_time - b.offset_time)

    // head 是第一段成功段、恒有值（契约见 AggregatedValue）：元信息（extra / log_pb /
    // status_code…）整体展开，再覆盖 danmaku_list 与区间字段
    return {
      ...head,
      danmaku_list: merged,
      start_time: params.start_time ?? 0,
      end_time: params.end_time ?? params.duration,
      total: merged.length
    }
  },
  response: type<DouyinDanmakuListResponse>()
})
