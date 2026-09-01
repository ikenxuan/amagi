/**
 * 平台契约。
 *
 * `contracts/` 是零依赖叶子层：本目录下的模块不 import 仓库内任何其他模块，
 * 所以任何层都可以依赖它而不引入 import 环。
 */

/**
 * amagi 支持的平台清单。
 *
 * `Platform` 联合类型由这个数组推导而来，两者不可能漂移 ——
 * 新增平台只需在这里加一项。数组顺序即对外文档与遍历顺序。
 */
export const PLATFORMS = ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const

/** amagi 支持的平台 */
export type Platform = (typeof PLATFORMS)[number]

/**
 * 判断任意值是否是受支持的平台名
 * @param value - 待判断的值
 * @returns 是平台名则返回 `true`，并把类型收窄为 `Platform`
 */
export const isPlatform = (value: unknown): value is Platform =>
  typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value)
