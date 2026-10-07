import type { UserNoteListParams } from 'amagi/platforms/xiaohongshu/api'
import { userNoteList } from 'amagi/platforms/xiaohongshu/api'
import { expectTypeOf, it } from 'vitest'

it('用户笔记构造参数与端点一致，必须提供 xsec_token', () => {
  expectTypeOf<UserNoteListParams>().toExtend<{ user_id: string; xsec_token: string }>()
  expectTypeOf<{ user_id: string }>().not.toExtend<UserNoteListParams>()
  expectTypeOf(userNoteList).parameter(0).toEqualTypeOf<UserNoteListParams>()
})
