import type { UserNoteListParams } from 'amagi/platforms/xiaohongshu/api'
import { userNoteList } from 'amagi/platforms/xiaohongshu/api'
import { expectTypeOf, it } from 'vitest'

// 合并 beta.9 后 xsec_token 改为可选：游客必传（缺它平台回 461），有效登录 CK 可省。
// 原先这里钉的是「必须提供 xsec_token」，随上游的契约放宽一起改。
it('用户笔记构造参数与端点一致，xsec_token 可选', () => {
  expectTypeOf<UserNoteListParams>().toExtend<{ user_id: string; xsec_token?: string }>()
  expectTypeOf<{ user_id: string }>().toExtend<UserNoteListParams>()
  expectTypeOf<{ xsec_token: string }>().not.toExtend<UserNoteListParams>()
  expectTypeOf(userNoteList).parameter(0).toEqualTypeOf<UserNoteListParams>()
})
