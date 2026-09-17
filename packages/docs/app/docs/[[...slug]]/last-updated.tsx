/**
 * 页脚的「最后更新」一行。
 *
 * 数据来自框架的 `lastModified()` 插件（`source.config.ts`）：它读**本地 git 历史**，
 * 所以仓库不能是 shallow clone —— Vercel 上要设 `VERCEL_DEEP_CLONE=true`，
 * 否则每页都会显示克隆那一刻的时间。
 *
 * 刻意不用框架的 `PageLastUpdate`（`fumadocs-ui/layouts/notebook/page`）：
 * 它内部是 `useState('')` + `useEffect(() => setDate(value.toLocaleDateString()))`，
 * 于是首帧渲染的是**空字符串** —— 对预渲染的静态页来说就是一段内容闪现。
 * 这里按固定格式直接渲染，服务端与客户端结果一致，没有中间态。
 *
 * 用 UTC 而不是本地时区：`toLocaleDateString` 在服务端（UTC）与客户端（用户时区）
 * 可能落在不同的日子，那是实打实的 hydration mismatch；日期精确到天，差一天不值得。
 * @param props - 组件属性
 * @param props.date - 该页最后一次提交的时间
 * @returns 一行小字；`date` 缺失时返回 `null`
 */
export function LastUpdated({ date }: { date?: Date | string }) {
  if (!date) return null

  // 内容源序列化过来可能是 Date，也可能是 ISO 字符串（`async: true` 下按 RSC 载荷传输）
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return null

  return <p className="mt-8 text-sm text-fd-muted-foreground">最后更新于 {value.toISOString().slice(0, 10)}</p>
}
