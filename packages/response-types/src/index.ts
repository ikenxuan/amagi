/**
 * `@ikenxuan/amagi-response-types` —— 接口响应类型。
 *
 * 整棵 `src/generated/` 由 `packages/typegen` 从**录到的真实响应**派生，包括各层 barrel。
 * 这个文件是这个包里唯一手写的东西，它只做一件事：把生成的根 barrel 透出去。
 *
 * 为什么单独成包（而不是留在 `packages/core/src/types/` 底下）：
 *
 * 1. **生成器会清空整棵输出树**（端点删掉、判别式取值改名之后旧文件必须消失），
 *    所以那棵树底下不能有任何手写文件。独立成包之后，「误删手写类型」在布局上就不可能。
 * 2. **手写类型不受影响**：core 的 `types/ReturnDataType/`（26,535 行）原地不动，
 *    两棵树并存、按端点逐个替换，替换节奏由人定。
 * 3. 类型名在平台之间会重复（`emojiList` 三个平台都有），所以生成的平台 barrel 会加
 *    **完整平台名前缀**：`BilibiliComments_V0` / `KuaishouEmojiList_V0`。
 *
 * 本包不发布，但**必须构建**（`pnpm build` → `dist/*.d.ts`，只产声明、零运行时代码）。
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
