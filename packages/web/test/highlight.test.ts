/**
 * server 侧高亮。**最要紧的一条是「高亮不改变代码内容」** ——
 * 这一层的产物会被 `dangerouslySetInnerHTML` 塞进 DOM，而人是照着它读类型的：
 * 少一个字符、多一个转义，读到的就是假的代码。所以这里的判据是**脱掉标签、还原实体之后
 * 与原文逐字节相同**，而不是「看起来有颜色」。
 *
 * 第二条是 `defaultColor: false` 真的生效了：一旦行内出现 `color:`，深色模式下代码整块看不见
 * （`server/highlight.ts` 与 `packages/docs/app/(home)/page.tsx:21-44` 都记了这个坑）。
 * 这条断言是那个坑的守门人 —— 它只在**行内没有 `color:`、两个主题变量都在**时才绿。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { highlight, type HighlightLang, highlightCode, MAX_HIGHLIGHT_CHARS, withPayloadHighlight } from '../server/highlight'
import { ROOT } from '../server/storage'

/**
 * HTML 实体还原。**必须一遍扫完**，不能一种一种连着 replace：
 * 源码里本来就写着 `&lt;` 时 shiki 会把那个 `&` 转成 `&#x26;`，于是产物里是 `&#x26;lt;`——
 * 分两遍走的话第一遍变成 `&lt;`、第二遍又变成 `<`，还原出来的东西比原文少一截，
 * 而那正好会让「内容没变」这条断言在最该报警的地方变绿。
 */
const decodeEntities = (raw: string): string =>
  raw.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi,
    (whole, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
      if (hex !== undefined) return String.fromCodePoint(Number.parseInt(hex, 16))
      if (dec !== undefined) return String.fromCodePoint(Number(dec))
      const named: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
      return named[(name ?? '').toLowerCase()] ?? whole
    }
  )

/**
 * 从高亮好的 HTML 里把代码取回来。
 *
 * 标签用 `<[^>]*>` 扒掉是安全的，而这件事本身就是被测行为的一部分：代码里的 `<`
 * 必须已经被转义成实体（否则它会在这里被当成标签开头吃掉），而 `>` 留在文本里也不要紧 ——
 * 没有 `<` 打头的 `>` 匹配不上。
 */
const textOf = (html: string): string => decodeEntities(html.replace(/<[^>]*>/g, ''))

/**
 * 行尾归一。**行尾不是「代码内容」的一部分** —— shiki 把 CRLF 归一成 LF 不算改内容，
 * 所以「脱掉标签、还原实体之后与原文逐字节相同」这条判据要先把两边的行尾归到同一种再比。
 *
 * 为什么非要归一：**仓库根没有 `.gitattributes`**，而 Windows 上 `core.autocrlf=true` 是默认值 ——
 * 新克隆 / 新签出时跟踪文件全按 CRLF 落盘，于是**读盘**的那份带 `\r\n`、shiki 的产物是 `\n`。
 * 红起来的样子会骗人：diff 里每一行「看起来一样却不等」，只有空行显示成 `- ` vs `+`。
 * Linux CI 上是 LF、这个工作树里的产物历史上也是 LF，所以**只有 Windows 新克隆会红**。
 *
 * **只归一行尾，不放宽成「包含」或「忽略空白」** —— 那样这条断言就再也抓不到真的内容改动了；
 * 少一个字符、多一个转义仍然照旧报警。只有读盘的那一例需要它，内联字面量
 * （`NASTY_TS` / `JSON.stringify`）本来就是 LF。哪天根目录加了 `.gitattributes`
 * （`* text eol=lf`），这里的归一就成了多余的。
 */
const normalizeEol = (text: string): string => text.replace(/\r\n/g, '\n')

/** 一份足够刁的 TypeScript：中文 JSDoc、`&` `<` `>` 三个转义敏感字符、单双引号、空行、结尾换行 */
const NASTY_TS = [
  '/** 「cid」是**分P 的 ID**，不是稿件的 —— 拿错会请求到别的东西 & 别的人 */',
  'export type Weird = { a: \'x\' | "y"; b: Array<Record<string, number>> }',
  '',
  'export const cmp = (l: number, r: number): boolean => l < r && r > 0',
  ''
].join('\n')

describe('高亮不改变代码内容', () => {
  it('**脱掉标签、还原实体之后与原文逐字节相同** —— TypeScript', async () => {
    const html = await highlight(NASTY_TS, 'typescript')
    expect(textOf(html)).toBe(NASTY_TS)
  })

  it('JSON 也一样，含转义字符与非 ASCII', async () => {
    const code = JSON.stringify({ 'a<b': '&amp; 与 <script>alert(1)</script>', n: [1, null, true], 中文: '猫' }, null, 2)
    const html = await highlight(code, 'json')
    expect(textOf(html)).toBe(code)
  })

  it('**真产物过一遍** —— 已提交的 `VideoInfo_V0.ts` 带中文 JSDoc，那是这条路上最常见的输入', async () => {
    const source = readFileSync(
      join(ROOT, 'packages', 'response-types', 'src', 'generated', 'bilibili', 'VideoInfo', 'VideoInfo_V0.ts'),
      'utf8'
    )
    const html = await highlight(source, 'typescript')
    // 两边都过 `normalizeEol`：读盘那份在 Windows 新克隆里是 CRLF，见上面的说明
    expect(normalizeEol(textOf(html))).toBe(normalizeEol(source))
  })

  it('**`<` 一定被转义** —— 不然响应正文里的 `<script>` 就真的进了 DOM', async () => {
    const html = await highlight('const evil = "</script><img onerror=alert(1) src=x>"', 'typescript')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).toContain('&#x3C;')
  })
})

describe('双主题：两个变量都在，行内一个 color 都没有', () => {
  it('**`defaultColor: false` 生效**：只有 `--shiki-light` / `--shiki-dark`，没有行内 `color:`', async () => {
    const html = await highlight(NASTY_TS, 'typescript')
    expect(html).toContain('--shiki-light:')
    expect(html).toContain('--shiki-dark:')
    // 行内 `color:` 是这个坑的全部症状：它压死样式表里的 `.dark` 规则，
    // 于是深色模式下 `#24292E` 这些近黑的 token 直接看不见
    expect(html).not.toMatch(/[";]color:/)
  })

  it('两个主题名都进了 class —— CSS 那两条规则认的是 `.shiki`，而主题名是给人排查用的', async () => {
    const html = await highlight('{}', 'json')
    expect(html).toContain('class="shiki shiki-themes github-light github-dark"')
  })
})

describe('边界输入不抛', () => {
  it('**认不出的语言降级成纯文本，不抛** —— 抛出去等于整个接口 500，前端显示成「连不上后端」', async () => {
    const html = await highlight(NASTY_TS, 'rust' as HighlightLang)
    // 内容仍然一个字节不差，只是没有配色
    expect(textOf(html)).toBe(NASTY_TS)
    expect(html).toContain('class="shiki')
  })

  it('空字符串回的是一个空代码块，不是空串 —— 前端拿到空串会渲成一片什么都没有的白', async () => {
    const html = await highlight('', 'json')
    expect(html).toContain('<pre')
    expect(textOf(html)).toBe('')
  })
})

describe('截断有出口', () => {
  it('超过上限时只渲前一段，而**截掉了多少要说得出来**', async () => {
    const long = `${'{"a":1}\n'.repeat(4000)}`
    expect(long.length).toBeGreaterThan(MAX_HIGHLIGHT_CHARS)
    const code = await highlightCode(long, 'json')
    expect(code.chars).toBe(MAX_HIGHLIGHT_CHARS)
    expect(code.totalChars).toBe(long.length)
    expect(textOf(code.html)).toBe(long.slice(0, MAX_HIGHLIGHT_CHARS))
  })

  it('没超上限时两个计数相等 —— 界面靠 `totalChars > chars` 判断要不要提示', async () => {
    const code = await highlightCode(NASTY_TS, 'typescript')
    expect(code.chars).toBe(NASTY_TS.length)
    expect(code.totalChars).toBe(NASTY_TS.length)
  })
})

describe('给录制结果补高亮', () => {
  it('高亮的是 `JSON.stringify(payload, null, 2)`，而 `payload` 本身仍然回', async () => {
    const outcome = await withPayloadHighlight({
      ok: true,
      verdict: { kind: 'accept', reason: '好' },
      payload: { data: { title: '猫 & 狗' } }
    })
    expect(outcome.payload).toEqual({ data: { title: '猫 & 狗' } })
    expect(textOf(outcome.payloadHighlight!.html)).toBe(JSON.stringify({ data: { title: '猫 & 狗' } }, null, 2))
  })

  it('没有 payload 的结果原样返回 —— 一发都没打出去时不该多出一个空代码块', async () => {
    const input = { ok: false as const, verdict: { kind: 'reject', reason: '一发请求都没打出去' } }
    expect(await withPayloadHighlight(input)).toBe(input)
  })
})
