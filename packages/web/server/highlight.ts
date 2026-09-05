/**
 * 语法高亮。**shiki 只在这一个文件里出现，而这个文件只在 Node 侧跑。**
 *
 * 为什么不在浏览器侧高亮 —— 打进浏览器包过不了体积门禁。实测（esbuild `--bundle --minify --format=esm`）：
 * `shiki/core` 零语言零主题的**底座**就 164 KB，`typescript` 语法再 181 KB（那是一份 JSON 数据，压不动），
 * 而门禁上限是 665,600 字节、现在的产物 532 KB —— 余量只有 133 KB，**仅底座就超**。
 * **懒加载救不了**：门禁判据是 `cat packages/web/dist/assets/*.js | wc -c`
 * （`.github/workflows/release.yml:311,317`），动态 chunk 照样落在 `dist/assets/` 里被加总。
 *
 * 而 `server/` 由 `tsx` 直跑、**从不打包**，所以在这一侧渲成 HTML 回给前端，
 * 浏览器包增长 **0 字节**。这不是绕过那条门禁 —— 它拦的是「Node 依赖漏进浏览器包」
 * （实测漏一个平台注册表从 465 KB 涨到 852 KB），把 shiki 放在 Node 侧正是顺着它的意图走。
 * 顺带还便宜一层：高亮结果随响应一起缓存，而不是每次重渲染都在浏览器主线程上跑一遍 tokenizer。
 *
 * 前端拿到的是 HTML 字符串，走 `dangerouslySetInnerHTML`（`src/components/CodeBlock.tsx`）。
 * 那条路安全的理由**在这一侧**：shiki 把代码里的 `&` 与 `<` 转义成 `&#x26;` / `&#x3C;` 才拼进
 * 文本节点，所以响应正文里的 `<script>` 到不了 DOM。**别在这个文件里手拼 HTML** —— 那一步一旦
 * 有人自己拼，上面这句保证就没了。
 */

import { createHighlighterCore } from 'shiki/core'
// **别写 `@shikijs/engine-javascript`**：那是 shiki 的传递依赖，`packages/web` 在严格
// node_modules 布局下解析不到（实测 esbuild 报 `Could not resolve`）。语言与主题同理，
// 一律走 shiki 自己的 `"./*"` 出口，`@shikijs/langs/json` 那种写法在这个仓库里是坏的
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import json from 'shiki/langs/json.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'
import githubLight from 'shiki/themes/github-light.mjs'

import type { HighlightedCode, RecordOutcome } from '../shared/contract'

/**
 * 这个模块认的语言。**只装用得上的两门** —— 每多一门就是一份几十到一百多 KB 的语法数据要解析，
 * 而这个界面只显示两种东西：生成出来的 TypeScript 与脱敏后的响应 JSON。
 */
export type HighlightLang = 'typescript' | 'json'

/**
 * 双主题，配 `defaultColor: false`。**这两条必须一起写，否则深色模式下代码块整块看不见。**
 *
 * shiki 的双主题默认把**亮色**烤进每个 token 的行内 `style="color:#24292E"`，只把暗色留成
 * `--shiki-dark` 变量；而切主题是 CSS 的事（`.dark` / `[data-theme="dark"]` 落在 `<html>` 上，
 * 见 `@heroui/react` 的 `applyThemeToDOM`），**行内样式压死样式表里的规则** ——
 * 于是深色下 `#24292E` / `#032F62` 这些近黑的 token 直接消失。关掉之后 shiki 只发
 * `--shiki-light` / `--shiki-dark` 两个变量，谁生效由 CSS 说话。
 *
 * 那两条 CSS 规则在 `src/components/CodeBlock.tsx` 里，**它与这里是一对，改一边要改另一边**：
 * 这边不发 `color` 了，那边不给规则就是每个 token 都继承正文色 —— 不是「颜色不对」，是整块没有高亮。
 *
 * 这个坑 `packages/docs/app/(home)/page.tsx:21-44` 已经踩过一次并记下了。
 */
const THEMES = { light: 'github-light', dark: 'github-dark' } as const

/**
 * highlighter 的类型。**刻意用 `Awaited<ReturnType<…>>` 推，不 import 那个名字** ——
 * `HighlighterCore` 声明在 `@shikijs/types` 里，写成 import 就是又一处传递依赖路径
 * （见文件顶上那条 pnpm 的坑）。这里推出来的是同一个类型，且不多引一个包名。
 */
type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>

/**
 * highlighter **只创建一次**：建一次要解析两份语法数据加两份主题，每个请求重建会让高亮
 * 从「几毫秒」变成「几百毫秒」。
 *
 * 存的是 **Promise 而不是建好的实例**：创建是异步的，而两个请求可以同时进来 ——
 * 存实例的话第二个请求会在第一个还没建好时又建一个，白解析一遍。
 */
let started: Promise<Highlighter> | undefined

const highlighter = (): Promise<Highlighter> => {
  started ??= createHighlighterCore({
    langs: [typescript, json],
    themes: [githubLight, githubDark],
    // **JS 正则引擎，不要 oniguruma wasm。** 那份 wasm 466 KB，买到的只是「TextMate 语法里
    // 的冷门正则也能跑」—— typescript / json 这两门用不上，而少一个 wasm 就少一件
    // `tsx` 与将来任何打包器都要额外照顾的东西。
    // `forgiving` 开着：碰到 JS 引擎翻译不了的那条模式时跳过它，而不是抛。
    // 一个 token 上色不对是小事，整条 `/api/*` 回 500 是大事 —— 前端那边它显示成「连不上后端」
    engine: createJavaScriptRegexEngine({ forgiving: true })
  })
  return started
}

/**
 * 一次渲染最多喂多少字符进 tokenizer。
 *
 * 上限的理由是**渲染成本两头都有**：一份 B站 `comments` 响应 1.3 MB，tokenize 要秒级，
 * 渲出来的 HTML 是原文的五六倍、到了浏览器还得变成十几万个 DOM 节点 —— 那不是「慢」，是页面卡死。
 *
 * 为什么是 20,000：**照抄前端现在那句 `payload.slice(0, 20_000)`**（`OutcomeCard.tsx:167`）。
 * 接上高亮不该顺手改变「一屏能看到多少」这件事，那是另一件事的决定。
 * 截掉了多少必须说出来（`HighlightedCode.chars` / `.totalChars`）—— PRD 阶段 5 专门记了
 * 「那两处硬截断悄悄吃掉数据」，别再多造一处无声的。
 */
export const MAX_HIGHLIGHT_CHARS = 20_000

/**
 * 一段代码 → 一段 HTML。**这是这个模块唯一对外的原语。**
 *
 * 认不出的语言**降级成纯文本，不抛**：`codeToHtml` 对没加载的语法直接 throw，而这条路上
 * 抛出去等于整个接口 500，前端显示的是「连不上控制台的 Node 侧」—— 与真相差得很远。
 * `text` 是 shiki core 内置的特殊语言（不需要语法数据），转义照做，所以降级之后只是没有颜色。
 */
export const highlight = async (code: string, lang: HighlightLang): Promise<string> => {
  const shiki = await highlighter()
  const known = shiki.getLoadedLanguages().includes(lang)
  return shiki.codeToHtml(code, { lang: known ? lang : 'text', themes: THEMES, defaultColor: false })
}

/**
 * 一段代码 → 契约里那个 {@link HighlightedCode}：HTML 加上「渲了多少 / 一共多少」。
 *
 * 两个计数不是装饰，是**截断的出口**：界面靠它们才说得出「后面还有 N 个字符没显示」。
 */
export const highlightCode = async (code: string, lang: HighlightLang): Promise<HighlightedCode> => {
  const shown = code.length > MAX_HIGHLIGHT_CHARS ? code.slice(0, MAX_HIGHLIGHT_CHARS) : code
  return { html: await highlight(shown, lang), chars: shown.length, totalChars: code.length }
}

/**
 * 给一次录制结果补上高亮好的响应 JSON。
 *
 * 放在这一层而不是 `outcome.ts` 里：那一层是**纯的**（不发请求、不读盘、不看时钟，注释里写着），
 * 而高亮是异步的、要初始化一个带语法数据的单例。所以录制那条路上它是**最后一步**，
 * 由路由在回 JSON 之前套一下。
 *
 * `diff` 刻意不走 shiki：它已经是结构化的 `{ sign, text }` 逐行数据，前端按增删上色
 * （`outcome.ts:120-133` 那里写明了「不引第三方 diff 库」）。给它上语法高亮要先把两种上色
 * 叠在同一个 `<span>` 上，那是把一件已经做对的事弄复杂。
 */
export const withPayloadHighlight = async (outcome: RecordOutcome): Promise<RecordOutcome> => {
  if (outcome.payload === undefined) return outcome
  return { ...outcome, payloadHighlight: await highlightCode(JSON.stringify(outcome.payload, null, 2), 'json') }
}
