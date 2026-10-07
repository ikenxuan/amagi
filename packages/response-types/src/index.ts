/**
 * `@ikenxuan/amagi-response-types` —— 接口响应类型。
 *
 * 整棵 `src/generated/` 由 `packages/typegen` 从**录到的真实响应**派生，包括各层 barrel。
 * `src/protocols/` 保存缺少完整录制样本的手写协议扩展，来源和未知字段在其 README 中说明。
 *
 * 为什么单独成包（而不是留在 `packages/core/src/types/` 底下）：
 *
 * 1. **生成器会清空整棵输出树**（端点删掉、判别式取值改名之后旧文件必须消失），
 *    所以那棵树底下不能有任何手写文件。独立成包之后，「误删手写类型」在布局上就不可能。
 * 2. **手写类型不受影响**：core 的 `types/ReturnDataType/`（约 2.6 万行）原地不动，
 *    两棵树并存、按端点逐个替换，替换节奏由人定。
 * 3. 类型名在平台之间会重复（`emojiList` 三个平台都有），所以生成的平台 barrel 会加
 *    **完整平台名前缀 + `Response` 后缀**：`BilibiliCommentsResponse` / `KuaishouEmojiListResponse`。
 * 本包不发布，但**必须构建**（`pnpm build` → `dist/*.d.ts`，只产声明、零运行时代码）。
 * `prepare` 脚本会在 `pnpm install` 时自动跑它 —— 少了这一步，干净检出上 dist 不存在，
 * core 的 `tsc --noEmit` 会以 TS2307「找不到模块」红掉（不是静默，但同样拦住人）。
 * 两条踩出来的硬约束，缺一条下游就拿到空类型：
 *
 * 1. **`types` 必须指向 `.d.ts` 而不是 `.ts` 源码。** core 的 tsdown（rolldown）打包声明时
 *    按 `.d.ts` 解析依赖包，指向源码它会找 `dist/index.d.ts`、找不到，然后**静默**把所有
 *    解析不到的类型替换成 `undefined`（`type X = undefined`）—— 不报错、下游编译照样绿。
 * 2. **必须挂在 core 的 `devDependencies`。** `dependencies` 会被 tsdown 外部化，
 *    产物里留下一个裸 `import '@ikenxuan/amagi-response-types'`，而这个包不发布，
 *    下游解析不到。挂 devDep 才会被内联进 core 的 `dist/*.d.ts`。
 */

export * from './generated'

// 显式导出同时用 v7 API 契约替换掉过时的 HTML 状态版 `userProfile` 结构。
export type {
  DouyinMixAwemeResponse,
  KuaishouCommentRepliesResponse,
  KuaishouEmotionPackageListResponse,
  KuaishouLoginUserProfileResponse,
  KuaishouSearchUserResponse,
  KuaishouSearchWorkListResponse,
  KuaishouSlideFeedResponse,
  XiaohongshuLiveRoomResponse,
  XiaohongshuLiveSquareResponse,
  XiaohongshuLiveStatusResponse,
  XiaohongshuSearchHotListResponse,
  XiaohongshuSearchUserResponse,
  XiaohongshuSubCommentsResponse,
  XiaohongshuUserNoteListResponse,
  XiaohongshuUserProfileResponse,
  XiaohongshuUserProfileResponseSuccess
} from './protocols'

// 公开的端点 token 与使用方共用同一组精度兼容别名。
export type {
  DouyinCommentsResponse,
  DouyinCommentsResponseSuccess,
  DouyinCommentsResponseError,
  DouyinImageAlbumWorkResponse,
  DouyinImageAlbumWorkResponseSuccess,
  DouyinImageAlbumWorkResponseError,
  DouyinLiveRoomInfoResponse,
  DouyinLiveRoomInfoResponseSuccess,
  DouyinLiveRoomInfoResponseError,
  DouyinMusicInfoResponse,
  DouyinMusicInfoResponseSuccess,
  DouyinMusicInfoResponseError,
  DouyinParseWorkResponse,
  DouyinParseWorkResponseSuccess,
  DouyinParseWorkResponseError,
  DouyinSearchResponse,
  DouyinSearchResponseSuccess,
  DouyinSearchResponseError,
  DouyinSlidesWorkResponse,
  DouyinSlidesWorkResponseSuccess,
  DouyinSlidesWorkResponseError,
  DouyinTextWorkResponse,
  DouyinTextWorkResponseSuccess,
  DouyinTextWorkResponseError,
  DouyinUserFavoriteListResponse,
  DouyinUserFavoriteListResponseSuccess,
  DouyinUserFavoriteListResponseError,
  DouyinUserRecommendListResponse,
  DouyinUserRecommendListResponseSuccess,
  DouyinUserRecommendListResponseError,
  DouyinUserVideoListResponse,
  DouyinUserVideoListResponseSuccess,
  DouyinUserVideoListResponseError,
  DouyinVideoWorkResponse,
  DouyinVideoWorkResponseSuccess,
  DouyinVideoWorkResponseError
} from './protocols'
