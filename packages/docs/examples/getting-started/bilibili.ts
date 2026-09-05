/**
 * 「快速上手 → 2. 获取数据」B站示例的**真源文件**。
 *
 * 这个文件不是第二份手抄，而是文档站唯一的一份：
 * `content/docs/v7/usage/getting-started.mdx` 用
 * `<include …#docs-bilibili>` 把 `//#region docs-bilibili` 区段原样引进页面。
 *
 * 两层保护，缺一不可：
 * - 它在 `packages/docs` 的 `tsconfig.json`（`include: **\/*.ts`）范围内，
 *   所以 `pnpm typecheck` 会真编译它 —— 改坏这里，typecheck 直接红；
 * - 区段名被 MDX 引用着，删掉或改名 `#docs-bilibili` 会让 `pnpm build:docs`
 *   在 remarkInclude 阶段抛 `Region "docs-bilibili" not found`。
 *
 * `// ---cut---` 是 twoslash 的分隔标记（对 tsc 只是注释）：它上面的
 * import 与客户端创建参与编译但不出现在页面上 —— 那两步在页面的
 * 「1. 创建客户端实例」已经讲过了。
 */
//#region docs-bilibili
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { bilibili: 'SESSDATA=xxx; bili_jct=yyy' } })
// ---cut---
// 获取视频信息
const video = await client.bilibili.fetcher.fetchVideoInfo({
  bvid: 'BV1xx411c7mD'
})

if (video.success) {
  console.log(video.data)
}

// 获取评论
const comments = await client.bilibili.fetcher.fetchComments({
  oid: '170001',
  type: 1,
  number: 'twenty'
})
//#endregion

// 区段之外：只为让 `no-unused-vars` 满意，不进文档
void comments
