/**
 * 主题三档切换：浅色 / 深色 / 跟随系统。
 *
 * **没有新增依赖** —— `@heroui/react` 自带的 `useTheme` 已经把该做对的都做了
 * （读过它的实现 `dist/hooks/use-theme.js`）：
 *
 * - `useSyncExternalStore` 订阅 `matchMedia('(prefers-color-scheme: dark)')`，
 *   所以「跟随系统」是真的跟着变，不是只在刷新时读一次；
 * - 持久化到 `localStorage['heroui-theme']`，存的是**意图**（可能是 `system`）；
 * - `useIsomorphicLayoutEffect` 在 paint 前把 class **与** `data-theme` 一起写到 `<html>`，
 *   与 HeroUI 自己的 `.dark` / `[data-theme=dark]` 选择器天然对齐。
 *
 * 所以这里只剩三件它不管的事：切换器本身、`<meta name="theme-color">`、
 * 以及首帧（那件在 `index.html` 的内联脚本里，`useTheme` 再早也晚于 HTML 解析）。
 */

import { ToggleButton, ToggleButtonGroup, useTheme } from '@heroui/react'
import { useEffect } from 'react'

import { type ThemeIntent, themeColorOf, themeIntentOf } from '../lib/theme'

/** 三档的中文标签。数组顺序就是界面顺序：浅 → 深 → 跟随 */
const OPTIONS: readonly { id: ThemeIntent; label: string }[] = [
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
  { id: 'system', label: '跟随' }
]

export const ThemeSwitch = () => {
  const { theme, resolvedTheme, setTheme } = useTheme('system')
  const intent = themeIntentOf(theme)

  // `<meta name="theme-color">` 要跟着背景色走（Web Interface Guidelines 里的一条）——
  // 手机浏览器的地址栏、桌面 PWA 的标题栏读的是它，不跟就会在深色界面上顶一条亮条。
  //
  // **不用 React 19 的 `<meta>` 提升**：`index.html` 里已经有一条（内联脚本要在首帧就把它
  // 改对，所以它必须先存在），React 再渲染一条会变成两条同名 meta，浏览器取哪条不确定。
  // 这里改的就是那一条，一处所有权。
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColorOf(resolvedTheme))
  }, [resolvedTheme])

  return (
    <ToggleButtonGroup
      aria-label="配色主题"
      size="sm"
      selectionMode="single"
      // 三档互斥且必须有一个选中 —— 「都不选」在主题上没有语义
      disallowEmptySelection
      // 存了别的主题名时 `intent` 是 `undefined`，此时三个都不选中，
      // 而不是指着「跟随」说谎（见 `lib/theme.ts` 的 `themeIntentOf`）
      selectedKeys={intent === undefined ? [] : [intent]}
      onSelectionChange={(keys) => {
        const next = [...keys][0]
        if (typeof next === 'string') setTheme(next)
      }}
    >
      {OPTIONS.map((option) => (
        <ToggleButton key={option.id} id={option.id}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
