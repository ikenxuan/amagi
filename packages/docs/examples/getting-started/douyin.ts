/**
 * 「快速上手 → 2. 获取数据」抖音示例的**真源文件**。
 *
 * 约束与 `bilibili.ts` 相同：`pnpm typecheck` 编译它，
 * `<include …#docs-douyin>` 引它，区段改名即构建失败。
 */
//#region docs-douyin
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { douyin: 'ttwid=...' } })
// ---cut---
// 获取作品数据
const work = await client.douyin.fetcher.fetchVideoWork({
  aweme_id: '1234567890123456789'
})

// 聚合解析（自动识别类型）
const parsed = await client.douyin.fetcher.parseWork({
  aweme_id: '1234567890123456789'
})

// 获取评论
const comments = await client.douyin.fetcher.fetchWorkComments({
  aweme_id: '1234567890123456789',
  number: 20
})
//#endregion

// 区段之外：只为让 `no-unused-vars` 满意，不进文档
void [work, parsed, comments]
