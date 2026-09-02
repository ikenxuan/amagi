import corePkg from '../../core/package.json'

/**
 * 核心包的真实版本号 —— 构建期从 `packages/core/package.json` 读，站上不手写第二份。
 *
 * 为什么要有这个文件：文档站原本在四处硬编码「v7（预览版）/ v6（正式版）」
 * （`docs-shell.tsx` 的版本下拉两处 + `version-banner.tsx` 的「7.0.0 尚未正式发布」），
 * 而版本号由 release-please 在发版时才写进 `package.json`。两边各写一份的结果就是
 * 阶段 9 的 BUG-5：站上通篇 v7，`amagi.version` 读出 `6.6.0`。
 * 把口径改成派生，「文档写 v7、version 读 6」的窗口期在结构上就不存在了。
 */
export const CORE_VERSION: string = corePkg.version

/**
 * v7 是否仍处于预览态：主版本还没到 7，或带预发布后缀（`7.0.0-beta.1`）。
 *
 * release-please 把 `7.0.0` 写进 `package.json` 的那一刻，站上的「预览版」字样、
 * v7 页顶部的预览横幅会一起消失 —— 不需要有人回头改文案。
 */
export const V7_IS_PREVIEW: boolean = ((): boolean => {
  const [major = '0'] = CORE_VERSION.split('.')
  return Number(major) < 7 || CORE_VERSION.includes('-')
})()
