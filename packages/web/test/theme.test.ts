/**
 * 主题判定的三个纯函数，外加三组**跨文件一致性**的断言。
 *
 * 为什么只测纯函数：vitest 跑在 node 环境（根 `vitest.config.ts:23` 没配 jsdom），
 * 没有 `document` / `localStorage` / `matchMedia`。所以判定从 React 里抽到 `src/lib/theme.ts`
 * 再测那一层 —— 与 `guard.test.ts` 把三道闸从 HTTP 回调里抽出来是同一条做法。
 *
 * 后半份那几条更值钱，因为它们钉住的是**会静默坏掉**的三处耦合：
 *
 * 1. `localStorage` 的键名是 `@heroui/react` 定的。它改名字的话我们的内联脚本会读到
 *    一个永远为空的键 —— 界面看起来完全正常，只是深色偏好的人每次刷新都闪一下白。
 * 2. `index.html` 里那段 pre-paint 脚本是 `resolveTheme` / `THEME_COLORS` 照抄的一份
 *    （它不能 import bundle，否则就得等 bundle，也就回到闪白）。抄本与正本走散了同样不报错。
 * 3. 「跟随系统」那一档能不能**跟着变**，全靠 `useTheme` 里那个 matchMedia 订阅。
 *    订阅没了它就退化成「按打开页面那一刻的系统偏好定死」—— 也是一声不响。
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveTheme, THEME_COLORS, THEME_STORAGE_KEY, themeColorOf, themeIntentOf } from '../src/lib/theme'

/** 那段内联脚本所在的文件 */
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

/** `useTheme` 的实现。**走 `packages/web/node_modules` 的软链**，量的是这个包真正装到的那份 */
const useThemeSource = readFileSync(new URL('../node_modules/@heroui/react/dist/hooks/use-theme.js', import.meta.url), 'utf8')

/**
 * 「系统偏好是深色吗」这句问话本身。
 *
 * **`theme.ts` 里刻意没有这个常量** —— 那一层只收一个布尔，去问的是它的两个调用方：
 * `index.html` 的内联脚本问一次（首帧），`useTheme` 订阅着一直问（之后）。
 * 所以它只能在这里被两边一起钉住。
 */
const PREFERS_DARK = '(prefers-color-scheme: dark)'

describe('resolveTheme：意图 + 系统偏好 → 落到 <html> 上的名字', () => {
  it('`system` 那档跟着 matchMedia 走，两个方向都要对', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('没存过偏好时等同于 `system` —— 首次访问的人应该看到系统那档', () => {
    // `localStorage.getItem` 没值时回 null；`''` 只有人手工改 localStorage 才写得出来
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(undefined, true)).toBe('dark')
    expect(resolveTheme('', true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })

  it('明确选了浅或深就**压过**系统偏好 —— 那正是这两档存在的理由', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('别的主题名原样透传，不收窄成 light', () => {
    // `useTheme` 明确支持任意主题名。这里若兜底成 `light`，内联脚本就会写 `light`、
    // `useTheme` 随后再加一个 —— 而 `applyThemeToDOM` 只移除它自己上一次加的那个，
    // 首次执行时那个 ref 是 undefined，于是两个主题类叠在 `<html>` 上
    expect(resolveTheme('brutalism-light', true)).toBe('brutalism-light')
  })
})

describe('themeIntentOf：切换器该点亮哪一档', () => {
  it('三档各自认得', () => {
    expect(themeIntentOf('light')).toBe('light')
    expect(themeIntentOf('dark')).toBe('dark')
    expect(themeIntentOf('system')).toBe('system')
  })

  it('不是这三档就回 undefined —— 宁可三个都不选中，也不指着「跟随」说谎', () => {
    expect(themeIntentOf('brutalism-light')).toBeUndefined()
    expect(themeIntentOf('')).toBeUndefined()
    expect(themeIntentOf(null)).toBeUndefined()
    expect(themeIntentOf(undefined)).toBeUndefined()
  })
})

describe('themeColorOf：<meta name="theme-color">', () => {
  it('只有 dark 给深色值', () => {
    expect(themeColorOf('dark')).toBe(THEME_COLORS.dark)
    expect(themeColorOf('light')).toBe(THEME_COLORS.light)
  })

  it('拿不准的一律给浅色 —— 猜错时浅色是不会在界面上顶出一条黑边的那边', () => {
    // SSR 下 `resolvedTheme` 是 undefined，自定义主题名也落到这里
    expect(themeColorOf(undefined)).toBe(THEME_COLORS.light)
    expect(themeColorOf('brutalism-light')).toBe(THEME_COLORS.light)
  })

  it('两个值不一样，而且都是六位十六进制', () => {
    // 必须是十六进制：浏览器读 `theme-color` 时不解析 CSS 变量，
    // 而内联脚本跑的时候样式表还没到
    expect(THEME_COLORS.dark).not.toBe(THEME_COLORS.light)
    for (const value of [THEME_COLORS.dark, THEME_COLORS.light]) expect(value).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('跨文件一致性', () => {
  it('键名与 `@heroui/react` 里写死的那个一致', () => {
    // 它改名字的话这条会红。不红的话我们的内联脚本会去读一个永远为空的键
    expect(useThemeSource).toContain(`THEME_STORAGE_KEY = "${THEME_STORAGE_KEY}"`)
  })

  it('`applyThemeToDOM` 仍然只移除「它自己上一次加的那个 class」', () => {
    // 这条假设是 `index.html` 不写死 `class="light"` 的**全部理由**。
    // HeroUI 哪天改成「先清掉所有已知主题类」，那条约束就可以放松了
    expect(useThemeSource).toContain('if (previous === resolved) return;')
    expect(useThemeSource).toContain('classList.remove(previous)')
  })

  it('`index.html` 里那份抄本与这里的常量没走散', () => {
    expect(indexHtml).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`)
    expect(indexHtml).toContain(THEME_COLORS.light)
    expect(indexHtml).toContain(THEME_COLORS.dark)
  })

  it('`index.html` 首帧就把 class 与 data-theme 一起写上，且 `<html>` 上没有写死的主题类', () => {
    // 只写 class 不写 data-theme 的话，HeroUI 那条 `[data-theme="dark"]` 判据落空
    expect(indexHtml).toContain('document.documentElement.classList.add(resolved)')
    expect(indexHtml).toContain("document.documentElement.setAttribute('data-theme', resolved)")
    // 写死的那个 class 不会被 `applyThemeToDOM` 移除 —— 切深色会变成 `class="light dark"`
    expect(indexHtml).not.toMatch(/<html[^>]*class=/)
  })
})

describe('「跟随系统」这一档跟着 matchMedia 的**变化**走', () => {
  // 这一档与另两档的差别全在「变化」两个字上：`light` / `dark` 是一次性的选择，
  // 而 `system` 要求系统偏好在页面开着的时候翻了、界面也跟着翻。
  //
  // 判定那一半上面已经钉了（`resolveTheme('system', true/false)` 两个方向都对），
  // 但那是个纯函数 —— 它答对不代表**有人会再去问它一遍**。让这一档活起来的是
  // `useTheme` 里的 matchMedia 订阅，而那是 `@heroui/react` 的代码，我们只是靠着它。
  // 所以这里量装到本地的那份源码，与上面那条 storage key 同一条路子。
  //
  // **钉不住的那半，以及要什么才钉得住：** 「翻转 matchMedia → React 重渲染 →
  // `<html>` 上的类真的换掉」得跑一遍 React，也就要 `document` / `matchMedia`，
  // 也就要 jsdom 或 happy-dom 外加 testing-library —— 三个 devDependency，
  // 而 PRD 5.1 只批了 `ahooks` 与 `shiki`，加测试环境是要单独拍的一件事。
  // 在那之前这一半只能手工验：系统设置里切深浅、页面别刷新，看 `<html>` 的 class 跟不跟。

  it('`useTheme` 真的订阅了 `change`，不是只在挂载时读一次', () => {
    // 这行订阅没了，「跟随」就退化成「按打开页面那一刻的系统偏好定死」——
    // 界面看起来完全正常，只是入夜时它不动了
    expect(useThemeSource).toContain('media.addEventListener("change", callback)')
    // 卸载时解绑。少了它是泄漏而不是错误答案，但同样一声不响
    expect(useThemeSource).toContain('media.removeEventListener("change", callback)')
  })

  it('系统偏好是**渲染期**从订阅快照派生的，没有冻进 state', () => {
    // 订过阅但把结果 `useState` 存一份、只在挂载时写进去，一样不会跟 ——
    // 「订阅了」与「订阅的结果进了这一帧的渲染」是两件事，两条都得成立
    expect(useThemeSource).toContain('useSyncExternalStore(subscribeSystemPreference, getSystemPreference')
    expect(useThemeSource).toContain('const resolvedTheme = theme === "system" ? systemTheme : theme;')
  })

  it('`index.html` 的抄本与 `useTheme` 问的是同一句 media query', () => {
    // 走散的后果是首帧与 React 那层对同一个系统偏好给出两个答案：脚本按 A 写一个类，
    // `useTheme` 按 B 再加一个，而 `applyThemeToDOM` 首次执行不移除任何东西 ——
    // 于是 `<html class="light dark">`，也就是 PRD 5.3 记的那个 bug
    expect(useThemeSource).toContain(`PREFERS_DARK_MEDIA = "${PREFERS_DARK}"`)
    expect(indexHtml).toContain(`matchMedia('${PREFERS_DARK}')`)
  })
})
