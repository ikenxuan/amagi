/**
 * 「快速上手 → 2. 获取数据」小红书示例的**真源文件**。
 *
 * 约束与 `bilibili.ts` 相同：`pnpm typecheck` 编译它，
 * `<include …#docs-xiaohongshu>` 引它，区段改名即构建失败。
 *
 * 小红书两个接口都要 `xsec_token`：它随笔记链接一起下发，不能自己拼。
 */
//#region docs-xiaohongshu
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { xiaohongshu: 'a1=...' } })
// ---cut---
// 获取笔记数据
const note = await client.xiaohongshu.fetcher.fetchNoteDetail({
  note_id: '64xxxxxxxx',
  xsec_token: 'xsec_xxx'
})

// 获取评论
const comments = await client.xiaohongshu.fetcher.fetchNoteComments({
  note_id: '64xxxxxxxx',
  xsec_token: 'xsec_xxx'
})
//#endregion

// 区段之外：只为让 `no-unused-vars` 满意，不进文档
void [note, comments]
