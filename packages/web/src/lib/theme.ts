/**
 * 主题的判定逻辑。**这里只有纯函数**，界面那半边在 `components/ThemeSwitch.tsx`。
 *
 * 为什么值得单独一层：同一段判定有**三个**调用方，而它们跑在完全不同的地方 ——
 *
 * 1. `components/ThemeSwitch.tsx`（React 里，`@heroui/react` 的 `useTheme` 旁边）；
 * 2. `index.html` 里那段 pre-paint 内联脚本 —— 它必须在 bundle 下载**之前**跑完，
 *    所以它不能 import 这个文件，只能照抄一份（那边有注释指回这里，改一处要改两处）；
 * 3. `test/theme.test.ts` —— vitest 跑在 node 环境（根 `vitest.config.ts` 没配 jsdom），
 *    所以能测的只有纯函数。判定抽出来测、React 那层不测，与 `server/guard.ts` 同一条做法。
 */

/**
 * localStorage 里那个键名。
 *
 * **不是我们能选的** —— `@heroui/react` 的 `useTheme` 把它写死成这个字符串
 * （`dist/hooks/use-theme.js` 的 `THEME_STORAGE_KEY`）。内联脚本要读的就是它。
 */
export const THEME_STORAGE_KEY = 'heroui-theme'

/**
 * 切换器上的三档。
 *
 * 存进 localStorage 的是**意图**而不是解析结果 —— 存 `dark`/`light` 的话
 * 「跟随系统」这一档就没法表达，系统偏好变了它也不会跟。这条是 `useTheme` 定的，
 * 这里只是把它的取值收窄到我们真的提供的三个。
 */
export type ThemeIntent = 'dark' | 'light' | 'system'

/**
 * 意图 + 当下的系统偏好 → 真正写到 `<html>` 上的那个名字。
 *
 * **刻意不收窄成 `'light' | 'dark'`**：`useTheme` 支持任意主题名（它的注释里举的例子是
 * `brutalism-light`），对非 `system` 的值原样透传。pre-paint 脚本必须与它**逐字一致**，
 * 否则就复现了 PRD 5.3 说的那个 bug —— 脚本先给 `<html>` 加了 `light`、
 * `useTheme` 随后又加一个别的，而 `applyThemeToDOM` 只移除「**它自己**上一次加的那个 class」，
 * 首次执行时那个 ref 是 `undefined`，于是谁都不移除，两个主题类叠在一起。
 *
 * 空串按「没有偏好」处理：`useTheme` 拿到空串会走 `if (!resolvedTheme) return` 什么都不写，
 * 而这里回退到系统偏好。这是唯一一处刻意不一致，方向是无害的那边（脚本写了、它不写，
 * 不会叠出两个类），而且没有任何代码路径会写出空串 —— 只有人手工改 localStorage 才会。
 */
export const resolveTheme = (intent: string | null | undefined, systemPrefersDark: boolean): string => {
  if (intent === null || intent === undefined || intent === '' || intent === 'system') return systemPrefersDark ? 'dark' : 'light'
  return intent
}

/**
 * localStorage 里那个字符串是不是我们这三档之一。
 *
 * 不是就回 `undefined`，**不兜底成 `system`** —— 切换器上宁可三个都不选中，
 * 也不要在人存了别的主题名（`useTheme` 允许）时指着「跟随系统」说谎。
 */
export const themeIntentOf = (raw: string | null | undefined): ThemeIntent | undefined =>
  raw === 'light' || raw === 'dark' || raw === 'system' ? raw : undefined

/**
 * `<meta name="theme-color">` 的两个取值。
 *
 * 抄的是 `@heroui/styles` 的 `--background`（`dist/themes/default/variables.css:40` 与 `:183`），
 * 那两个值写成 oklch：`oklch(0.9702 0 0)` 与 `oklch(12% 0.005 285.823)`，转成 sRGB 就是这里两条。
 *
 * **必须是十六进制而不是 `var(--background)`**：浏览器读 `theme-color` 时不解析 CSS 变量，
 * 而内联脚本跑的时候样式表根本还没到。代价是这两个值会与 HeroUI 的主题脱钩 ——
 * 换 HeroUI 大版本时要回来核一遍。
 */
export const THEME_COLORS = { dark: '#060607', light: '#f5f5f5' } as const

/**
 * 解析后的主题名 → `theme-color`。
 *
 * 只有 `dark` 给深色值，其余（含 SSR 下的 `undefined`、以及别人塞进来的自定义主题名）
 * 一律给浅色 —— 猜错的话浅色是那个不会把界面顶出一条黑边的方向。
 */
export const themeColorOf = (resolved: string | undefined): string => (resolved === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light)
