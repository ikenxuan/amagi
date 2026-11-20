import zod from 'zod'

import { parseJsonBigintSafe } from '../../../../transport/safeJson'
import { appRequest } from '../api'
import { defineAwemeEndpoint, type } from '../define'
import { awemeJudge } from '../judge'

export interface DouyinAppCommandTransData {
  status_code: number | string
  status_msg?: string
  extra_info?: { object_id?: string | number | null } | null
  schema_detail?: { aweme_id?: string | number | null } | null
  schema?: string | null
}

export const commandTrans = defineAwemeEndpoint({
  name: 'douyin.appCommandTrans',
  route: '/app_fetch_command_trans',
  doc: { summary: 'App 分享口令解析', description: '传入完整匹配的口令（保留分隔符）；超出安全整数范围的 ID 保留为字符串。' },
  params: zod.object({
    command: zod.string().min(1).describe('分享口令解析器提取的分享码'),
    clipboard_timestamp: zod.coerce.number().optional().describe('剪贴板时间戳，毫秒；默认当前时间'),
    support_type: zod.string().optional().describe('分享类型；默认 16'),
    patterns: zod
      .union([zod.string(), zod.array(zod.string())])
      .optional()
      .describe('解析模式；数组按 JSON 编码'),
    start_from: zod.string().optional().describe('起始位置；默认空字符串')
  }),
  build: (p) => ({
    ...appRequest('/aweme/v2/platform/share/command/trans/', {
      command: p.command,
      clipboard_timestamp: p.clipboard_timestamp ?? Date.now(),
      support_type: p.support_type ?? '16',
      patterns: typeof p.patterns === 'string' ? p.patterns : JSON.stringify(p.patterns ?? ['email', 'datetime']),
      start_from: p.start_from ?? ''
    }),
    responseType: 'text'
  }),
  // 不能让底层 Axios 先解析 JSON，否则 object_id 等长整数可能已丢精度。
  decode: (raw) => {
    if (typeof raw !== 'string' || !raw.trimStart().startsWith('{')) return raw
    try {
      return parseJsonBigintSafe(raw)
    } catch {
      return raw
    }
  },
  judge: (raw, http) => awemeJudge(raw, { ...http, responseType: 'json' }),
  response: type<DouyinAppCommandTransData>()
})
