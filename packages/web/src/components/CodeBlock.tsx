/**
 * 显示一段**已经在 server 侧渲好**的代码。这一侧不引 shiki。
 *
 * 为什么高亮不在浏览器里做：shiki 打进浏览器包过不了体积门禁（仅底座 164 KB + TS 语法 181 KB，
 * 而余量只有 133 KB），懒加载也救不了 —— 动态 chunk 照样落在 `dist/assets/` 里被加总。
 * 完整判据与实测数字在 `server/highlight.ts` 的文件头。
 *
 * 所以这个组件只做三件事：把 HTML 塞进 DOM、给双主题那两条 CSS 规则一个家、把截断说出来。
 *
 * **`dangerouslySetInnerHTML` 在这里是安全的，但理由在另一侧**：shiki 把代码里的 `&` 与 `<`
 * 转义成 `&#x26;` / `&#x3C;` 之后才拼进文本节点，所以响应正文里的 `<script>` 到不了 DOM。
 * 这条保证**依赖 server 侧不手拼 HTML**（那边写了同一句话）。别把别处来的字符串喂给这个组件。
 */

import { ScrollShadow } from '@heroui/react'

import type { HighlightedCode } from '../lib/api'

/**
 * 双主题那两条规则。**它与 `server/highlight.ts` 的 `defaultColor: false` 是一对，缺一边就坏。**
 *
 * server 侧刻意不发行内 `color`（发了会压死样式表、深色下代码整块看不见），只发
 * `--shiki-light` / `--shiki-dark` 两个变量 —— 于是「用哪个」必须由这里的 CSS 说。
 * 不给这两条的后果不是「颜色不对」，是**每个 token 都继承正文色**，等于没有高亮。
 *
 * 为什么写在组件里而不是 `src/index.css`：这两条规则的正确性只跟 server 那边的 shiki 选项挂钩，
 * 跟主题体系无关。放在这里，`highlight.ts` ⇄ 这个文件是一对能一起读完的东西；
 * 放进全局样式表就变成「两个相距很远的文件必须同时改」。
 * `href` + `precedence` 是 React 19 的样式提升（同一个 `href` 只会插一次，多少个代码块都一样）。
 *
 * 选择器跟着 HeroUI 走：它的 `useTheme` 同时往 `<html>` 上写 class 与 `data-theme`
 * （`applyThemeToDOM`），而 `@heroui/styles` 的 `dark` 变体两个都认 —— 这里也两个都认，
 * 免得哪天只剩一半时高亮跟着界面反色。
 */
const SHIKI_CSS = `
.shiki code { display: block; }
.shiki span { color: var(--shiki-light); }
.dark .shiki span, [data-theme='dark'] .shiki span { color: var(--shiki-dark); }
`

export interface CodeBlockProps {
  code: HighlightedCode
  /**
   * 滚动区的高度上限（Tailwind class）。
   *
   * 有默认值但**必须能覆盖**：响应 JSON 和一份 400 行的类型产物该占的高度不一样，
   * 而这个决定属于用它的那个面板。
   */
  maxHeight?: string
}

export const CodeBlock = ({ code, maxHeight = 'max-h-96' }: CodeBlockProps) => (
  <div className="flex min-w-0 flex-col gap-1">
    <style href="amagi-shiki" precedence="low">
      {SHIKI_CSS}
    </style>
    <ScrollShadow className={maxHeight}>
      {/* 字号字体由 Tailwind 给，**不进 `SHIKI_CSS`** —— 那份只管配色，是与 server 选项配对的那部分。
          `overflow-x-auto` 落在 `<pre>` 上：长行要横向滚，而不是把整个卡片撑宽。
          shiki 自己给 `<pre>` 加了 `tabindex="0"`，所以这个滚动区键盘也能到 */}
      <div className="font-mono text-xs leading-5 [&_pre]:overflow-x-auto" dangerouslySetInnerHTML={{ __html: code.html }} />
    </ScrollShadow>
    {/* 截断必须说出来。PRD 阶段 5 专门记了「那两处硬截断悄悄吃掉数据」—— 这里不再多造一处无声的 */}
    {code.totalChars > code.chars && (
      <p className="text-muted text-xs tabular-nums">
        只显示了前 {code.chars} 个字符，后面还有 {code.totalChars - code.chars} 个 —— server 侧的渲染上限（一份 1.3 MB
        的响应渲出来会让页面卡死）。
      </p>
    )}
  </div>
)
