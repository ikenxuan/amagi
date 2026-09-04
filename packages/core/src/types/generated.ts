/**
 * 生成的响应类型在 core 这一侧的接线口。
 *
 * 类型本体在 `@ikenxuan/amagi-response-types`（仓库内私有包，不发布），整棵树由
 * `packages/typegen` 从录到的真实响应派生。core 把它当依赖装、透给下游。
 *
 * **为什么要这么一个中转文件**，而不是在 `src/index.ts` 里直接
 * `export type * as X from '@ikenxuan/amagi-response-types'`：实测那样写 tsdown 会把整个
 * 类型-only 的外部 re-export **丢掉** —— 产出的 `dist/*.d.ts` 与没写这行时逐字节相同，
 * 或者只留下一个空命名空间别名（别名进了 export 列表、声明体一个字节都没有）。
 * 下游拿到的是空壳，而且编译不报错，所以这个坑是静默的。
 *
 * 跨平台的消歧在**生成侧**做完了：平台 barrel 会加完整平台名前缀
 * （`BilibiliComments_V0` / `KuaishouEmojiList_V0`），所以这里摊平不会撞名。
 * 命名空间那条路走不通 —— `export * as Bilibili from './bilibili'` 会让 core 的 tsdown
 * 打包声明时直接报 `"Bilibili" is not exported`，构建失败。
 */

export type * from '@ikenxuan/amagi-response-types'
