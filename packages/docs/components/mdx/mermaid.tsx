import { renderMermaidSVG } from 'beautiful-mermaid'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'

/**
 * ` ```mermaid ` 块的渲染组件（`source.config.ts` 的 `remarkMdxMermaid` 把代码块
 * 换成这个标签，属性只有一个 `chart`）。
 *
 * 走的是上游 `(framework)/markdown/mermaid.mdx` 列的第二条路线
 * —— `beautiful-mermaid`（`renderMermaidSVG` 同步产出 SVG 字符串），
 * 而不是官方 `mermaid` + `next-themes`。两条路线的取舍：
 *
 * | | `mermaid` 官方渲染器 | `beautiful-mermaid`（本文件） |
 * | --- | --- | --- |
 * | 渲染时机 | 浏览器（`useEffect` 里 import + render） | **构建期**，SVG 直接进预渲染 HTML |
 * | 暗色模式 | `useTheme()` 读主题 → 重新 render 一次 | **不需要 JS**：颜色是 `var(--color-fd-*)`，跟着 `.dark` 的层叠走 |
 * | 客户端体积 | 84 MB unpacked / 22 个依赖 | 0（服务端组件，浏览器不下载渲染器） |
 * | 首屏 | 图先空着，hydrate 之后才出现 | 与正文同时出现，无跳动 |
 *
 * 「暗色模式下可读」这条判据因此是**结构性成立**而不是靠一次目视：颜色全部是
 * CSS 变量引用，主题切换只是变量换值，SVG 一个字节都不用重算。
 */
export interface MermaidProps {
  /** mermaid 源码（` ```mermaid ` 块的正文） */
  chart: string
  /**
   * 无障碍名（`role="img"` 的 `aria-label`）。` ```mermaid ` 块传不了它 ——
   * 图的文字说明由正文承担，这里只兜一个类型名。
   */
  title?: string
}

/** 前景色按百分比混进背景色 —— 亮色下往白里调、暗色下往黑里调，同一个式子两个模式都成立 */
const fgMix = (pct: number) => `color-mix(in srgb, var(--color-fd-foreground) ${pct}%, var(--color-fd-background))`

/**
 * 颜色接线。设计目标是**同一份 SVG 在两个模式下都过对比度线**，做法有两条：
 *
 * 1. **不碰 `--color-fd-border`。** 它在暗色下是 `hsla(0,0%,40%,20%)`
 *    —— 两成不透明度，拿它描节点框在深色底上几乎看不见，正是「暗色下不可读」
 *    最常见的来源。改用 `fgMix()` 派生：亮色下 fg 近黑、暗色下近白，
 *    混出来的对比度天然跟着模式翻转。
 * 2. **`muted` 留空**，让边标签走渲染器自带的 `color-mix(fg 60%, bg)` 派生
 *    —— 比 `--color-fd-muted-foreground` 在亮色下更清楚（5.11 vs 4.34）。
 *
 * 实测对比度（相对页面背景，light / dark）：
 *
 * | 元素 | light | dark | 线 |
 * | --- | --- | --- | --- |
 * | 节点文字 `--_text` | 18.13 | 15.66 | 文字 4.5 |
 * | 边标签 `--_text-sec`（派生 60%） | 5.11 | 6.17 | 文字 4.5 |
 * | 连线 `--_line`（派生 50%） | 3.65 | 4.63 | 非文字 3.0 |
 * | 箭头 `--_arrow` | 16.42 | 17.94 | 非文字 3.0 |
 * | 节点框 `--_node-stroke`（下面的 45%） | 3.12 | 3.98 | 非文字 3.0 |
 *
 * 节点底色（`--_node-fill`，派生 3%）不在表里 —— 它是填充而非前景，
 * 职责只是与页面底色拉开一点层次，对比度线不适用。
 */
const COLORS = {
  bg: 'var(--color-fd-background)',
  fg: 'var(--color-fd-foreground)',
  accent: 'var(--color-fd-primary)',
  border: fgMix(45),
  transparent: true
} as const

/**
 * 抹掉渲染器塞进 `<style>` 的 Google Fonts `@import`。
 *
 * `renderMermaidSVG` 无条件按 `font` 选项拼一条
 * `@import url('https://fonts.googleapis.com/css2?family=Inter…')`，而 Inter
 * 已经由 `app/layout.tsx` 的 `next/font/google` 自托管并挂在 `<html>` 上 ——
 * 留着它等于每页多一次跨域请求去取一份已经有的字体。
 */
const stripFontImport = (svg: string): string => svg.replace(/\s*@import url\('https:\/\/fonts\.googleapis\.com[^\n]*\n/, '\n')

/**
 * 让固定 width/height 的 SVG 跟着容器缩放（原样输出会在窄屏溢出）。
 *
 * 必须**并入**根 `<svg>` 已有的那个 `style` —— 颜色变量（`--bg` / `--fg` / …）
 * 就挂在那里。另起一个 `style` 属性会被 HTML 解析器按「重复属性」丢掉后出现的那个，
 * 于是变量全部消失、`var(--_text)` 一路 fallback 到无效值，
 * 图在暗色模式下直接变成黑底黑字 —— 这条正是本组件要保证的东西，所以按 style 是否
 * 已存在分两路写，而不是无条件插一个新的。
 */
const makeResponsive = (svg: string): string => {
  const head = /<svg\s[^>]*?style="/.exec(svg)
  if (head) return svg.replace(head[0], `${head[0]}max-width:100%;height:auto;`)
  return svg.replace('<svg ', '<svg style="max-width:100%;height:auto" ')
}

export function Mermaid ({ chart, title = '架构图' }: MermaidProps) {
  let svg: string
  try {
    svg = makeResponsive(stripFontImport(renderMermaidSVG(chart, COLORS)))
  } catch {
    // 渲染失败不能让整站构建红 —— 退回源码代码块，页面照样能读
    return (
      <CodeBlock title="mermaid">
        <Pre>{chart}</Pre>
      </CodeBlock>
    )
  }

  return (
    <figure
      role="img"
      aria-label={title}
      className="my-6 overflow-x-auto"
      // eslint-disable-next-line react/no-danger -- 渲染器产出的是自家生成的 SVG，输入是仓内 MDX，不含用户输入
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
