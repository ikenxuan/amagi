/**
 * 生成的响应类型在 core 这一侧的接线口。
 *
 * 类型本体在 `@ikenxuan/amagi-response-types`（仓库内私有包，不发布）。生成树由
 * `packages/typegen` 从真实响应派生，不伪造 corpus。没有录制样本的端点一律声明 `any`，
 * 补上样本后由生成树接替（闭环见 test/contracts/response-source.test.ts）。
 *
 * 这里必须是整体 `export type *` 的中转文件：改用 `export * as Bilibili from './bilibili'`
 * 这类命名空间别名时，tsdown 打包声明会报 `"Bilibili" is not exported` 而构建失败。
 *
 * 跨平台的消歧在**生成侧**做完了：平台 barrel 给每个端点名加完整平台名前缀 + `Response`
 * 后缀（`BilibiliCommentsResponse` / `KuaishouVideoWorkResponse`），所以这里摊平不会撞名。
 * v6 手写类型仍用短前缀（`BiliEmojiList` / `KsOneWork`）；v7 协议扩展沿用完整响应名。
 */

export type * from '@ikenxuan/amagi-response-types'
