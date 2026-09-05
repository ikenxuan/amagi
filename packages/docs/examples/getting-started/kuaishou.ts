/**
 * 「快速上手 → 2. 获取数据」快手示例的**真源文件**。
 *
 * 约束与 `bilibili.ts` 相同：`pnpm typecheck` 编译它，
 * `<include …#docs-kuaishou>` 引它，区段改名即构建失败。
 *
 * 注意快手没有 `.login`（只有抖音与B站有扫码登录），所以这里只有取数。
 */
//#region docs-kuaishou
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { kuaishou: 'did=...' } })
// ---cut---
// 获取作品信息
const work = await client.kuaishou.fetcher.fetchVideoWork({
  photoId: '3xqxxxxxx'
})

// 获取评论
const comments = await client.kuaishou.fetcher.fetchWorkComments({
  photoId: '3xqxxxxxx'
})
//#endregion

// 区段之外：只为让 `no-unused-vars` 满意，不进文档
void [work, comments]
