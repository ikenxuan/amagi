/**
 * 界面状态与 URL 的双向绑定。
 *
 * 为什么值得单独写一层：这个工具的日常动作里**刷新很频繁**（改了 `seeds.json`、
 * 换了 cookie、想看新的样本数），而每次刷新都把「选中哪个端点、左栏收着还是开着、
 * 哪些平台折叠了」清空，等于每次都要重新点一遍。
 *
 * 三件事只有进了 URL 才成立：刷新后还在、能分享给别人、浏览器的前进后退能用。
 * 用 `replaceState` 而不是 `pushState` —— 折叠一个分组不该在历史里留一条记录，
 * 否则「后退」变成「逐个撤销我的折叠操作」。
 */

import { useEventListener } from 'ahooks'
import { useCallback, useState } from 'react'

/** 从 `location.search` 读一个键 */
const readParam = (key: string): string | null => new URLSearchParams(window.location.search).get(key)

/**
 * 一个字符串状态，存在 URL 的查询参数里。
 *
 * 值是 `undefined` 时把那个参数**从 URL 里删掉**，而不是留一个空串 ——
 * `?endpoint=` 这种空参数会让链接看起来像坏的。
 */
export const useUrlParam = (key: string): [string | undefined, (next: string | undefined) => void] => {
  const [value, setValue] = useState<string | undefined>(() => readParam(key) ?? undefined)

  const update = useCallback(
    (next: string | undefined) => {
      setValue(next)
      const params = new URLSearchParams(window.location.search)
      if (next === undefined || next === '') params.delete(key)
      else params.set(key, next)
      const query = params.toString()
      window.history.replaceState(null, '', query === '' ? window.location.pathname : `?${query}`)
    },
    [key]
  )

  // 浏览器前进后退时跟上。`replaceState` 不产生历史条目，但用户可能从别的页面回来。
  //
  // 用 ahooks 的 `useEventListener` 而不是手写 effect：它把 handler 收进 latest ref，
  // 于是不会因为 handler 每次渲染都是新函数而反复解绑重绑。
  // **这个文件里其余三个 hook 仍然手写** —— ahooks 的 `useUrlState` 不在主包里，
  // 它是独立包 `@ahooksjs/use-url-state`，peerDeps 不含 React 19 还要 `react-router`（本仓库没装）。
  useEventListener('popstate', () => setValue(readParam(key) ?? undefined), { target: window })

  return [value, update]
}

/** 逗号分隔的字符串集合，存在 URL 里（`?collapsed=douyin,kuaishou`） */
export const useUrlSet = (key: string): [readonly string[], (item: string) => void] => {
  const [raw, setRaw] = useUrlParam(key)
  const items = raw === undefined ? [] : raw.split(',').filter((entry) => entry !== '')

  const toggle = useCallback(
    (item: string) => {
      const current = (readParam(key) ?? '').split(',').filter((entry) => entry !== '')
      const next = current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]
      setRaw(next.length === 0 ? undefined : next.join(','))
    },
    [key, setRaw]
  )

  return [items, toggle]
}

/** 一个布尔开关，存在 URL 里。`off` 才写进 URL —— 默认开着的状态不该污染链接 */
export const useUrlFlag = (key: string): [boolean, () => void] => {
  const [raw, setRaw] = useUrlParam(key)
  const on = raw !== 'off'
  const toggle = useCallback(() => setRaw(on ? 'off' : undefined), [on, setRaw])
  return [on, toggle]
}
