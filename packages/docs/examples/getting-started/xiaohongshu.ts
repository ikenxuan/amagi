/**
 * 「快速上手 → 2. 获取数据」小红书示例的**真源文件**。
 *
 * 约束与 `bilibili.ts` 相同：`pnpm typecheck` 编译它，
 * `<include …#docs-xiaohongshu>` 引它，区段改名即构建失败。
 * `import` 与构造 client 放在区段外：参与编译、不进页面。
 *
 * 小红书笔记相关接口要 `xsec_token`：它随笔记链接一起下发，不能自己拼。
 */
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { xiaohongshu: 'a1=...' } })

//#region docs-xiaohongshu
// 获取笔记数据
const note = await client.xiaohongshu.fetcher.fetchNoteDetail({
  note_id: '64xxxxxxxx',
  xsec_token: 'xsec_xxx'
})

// 获取一级评论
const comments = await client.xiaohongshu.fetcher.fetchNoteComments({
  note_id: '64xxxxxxxx',
  xsec_token: 'xsec_xxx'
})

// 展开一级评论下的回复，按目标数量自动翻页
const replies = await client.xiaohongshu.fetcher.fetchSubComments({
  note_id: '64xxxxxxxx',
  root_comment_id: 'comment-id',
  xsec_token: 'xsec_xxx',
  number: 20
})

// 搜索用户；直播 ID 使用字符串保存
const users = await client.xiaohongshu.fetcher.searchUser({ keyword: '旅行', page: 1 })
const live = await client.xiaohongshu.fetcher.fetchLiveStatus({ room_id: '570461472695232183' })
//#endregion

// 区段之外：只为让 `no-unused-vars` 满意，不进文档
void [note, comments, replies, users, live]
