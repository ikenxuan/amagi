import type { RiskChallenge } from '../../contracts/error'
import { DOUYIN_VERIFY_PAGE_TEMPLATE } from './verifyPage.template.generated'

/**
 * 抖音手动滑块验证页的**渲染**（把 {@link RiskChallenge} 变成一张真人能打开拖动的 HTML）。
 *
 * **只中转不绕过。** 这张页只做一件事：把**官方 TTGCaptcha 滑块**渲染出来，交给**真人用
 * 鼠标拖**。它不含、也永远不会含任何验证码识别 / 缺口检测 / 轨迹模拟 / OCR / headless
 * 自动过验证的代码 —— 真人拖动是唯一的通过方式。这与 `anticrawler/solver.ts` 对滑块恒
 * 返回 `undefined`、`captcha.ts` 只提取不求解是同一条红线的延伸。
 *
 * ## 为什么要这个函数
 *
 * judge 判出 `kind: 'risk'` 后，`parseDouyinCaptcha` 把验证页地址与票据拼进
 * `error.challenge`（{@link RiskChallenge}：`url` / `jsSdkUrl` / `verifyData` / …）。但那是
 * 一份**数据** —— 真人没法「打开一个 JSON 对象」。此前调用方（HTTP 服务、机器人插件）只能
 * 自己拼一张页，各拼各的、还容易把 `verify_data` 拼错。这个纯函数把「数据 → 可拖的页」收敛
 * 成一处实现，库调用方 / express 路由 / web 控制台共用，与 amagi「一处实现、多入口共用」一致。
 *
 * ## 两种模式，按料齐全度自动选默认
 *
 * | 模式 | 用什么料 | 怎么渲染 |
 * | --- | --- | --- |
 * | **自建**（默认，料齐时） | `jsSdkUrl` + `verifyData` | 动态加载官方 SDK → `TTGCaptcha.init({ commonOptions, captchaOptions })` → `render({ verify_data })`，滑块进 `#root` |
 * | **托管**（兜底 / 料不齐时） | `url` | 直接在新标签打开（或 iframe 内嵌）`rmc.bytedance.com/verifycenter/captcha/v2?…` 托管验证页 |
 *
 * 响应头通道的 challenge **只有 `url`**（没有 `jsSdkUrl` / `verifyData`，见 `captcha.ts` 的
 * `challengeFrom`），所以那种 challenge 只能走托管模式；响应体中间页通道三样俱全，默认自建。
 * 页面加载时据此自动选默认模式，用户仍可手动切换。
 *
 * ## 中间页常量不在 `verify_data` 里
 *
 * `init` 的 `commonOptions`（`aid: 339757` / `iid` / `did`）与 `captchaOptions`
 * （`ele: 'root'` / `hideCloseBtn` / `showMode: 'mask'`）是**中间页的宿主常量**，不随会话变、
 * 也不在平台下发的 `verify_data` 里（见 `anticrawler/captcha.ts` 与 `transport.mdx`）。所以它们
 * **写死在本模块**（{@link DOUYIN_VERIFY_PAGE_COMMON_OPTIONS} / {@link DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS}），
 * 可经 {@link DouyinVerifyPageOptions} 覆盖。注意 `commonOptions.aid`（339757，宿主）与
 * `verifyData.aid`（平台下发、实测 0）是**两个不同的 aid**，别混。
 *
 * ## `successCb` 为什么改掉
 *
 * 官方中间页的 `successCb` 是 `location.reload()`（刷新后带新 cookie 重走）。本页不刷新 ——
 * 它要把「验证通过」这个事件**暴露给人与调用方**：切到 ✅ 状态、尽力读并展示 `document.cookie`、
 * 展示成功回调参数，并提示下一步「用**同一份 cookie 重发原请求**」。
 *
 * **闭环未实测，如实标注。** 「真人过完 → 同 cookie 重发 → 服务端放行」这一步仓库至今没有端到端
 * 实测（卡在拿不到登录态真挑战 + 自动化浏览器 `webdriver=true` 过不了滑块，见 `transport.mdx`）。
 * 本页只负责把滑块交给真人过；重发那一步由调用方做，放行按 `fp` 关联是**推断**不是实测结论。
 *
 * **自建模式的滑块跑在跨域 iframe 里。** 实渲确认：loader 的 `render` 对只带 `verify_data`
 * （无 `challenge_code`）的中间页走 `autoRender`，把真滑块画进一个指向 `rmc.bytedance.com` 的
 * **跨域 iframe** —— 真人在 iframe 内拖完，`captchaOptions.successCb` 只在 iframe 内触发，父页收不到。
 * 所以本页在自建模式下额外监听验证中心跨域桥的 `postMessage({type:'success'|'verify'})`，与注入的
 * `successCb` 两条路径取先到者（`onSuccess` 幂等），父页据此也能切 ✅。
 *
 * ## 安全
 *
 * challenge 的字段经 {@link toInlineJson} 注入页面的 `window.__DOUYIN_CHALLENGE__` 全局，`<` / `>` /
 * `&` 转义成 `\uXXXX`，不会被 `</script>` 截断、也不构成 HTML 注入。SDK 由页面脚本**动态注入**
 * （`createElement('script')`，`src = jsSdkUrl`），不写进 HTML 的 `src` 属性，避免属性注入。
 * 页面假设**无 CSP**（内联脚本 + 动态加载外部 SDK）—— 调用方若在自己的服务上设了 CSP，需要为它放宽。
 *
 * ## 页面骨架 / 样式 / 脚本在 `verifyPage.html`
 *
 * HTML 骨架、内联 CSS 与页面脚本不再写死在本模块的模板字面量里，而是独立的
 * `verifyPage.html`（人直接按 HTML / CSS / JS 编辑，带高亮、好 review，也能用浏览器直接打开
 * 调样式）。里面留三个占位符 `__DOUYIN_TITLE__`（×2）/ `__DOUYIN_CHALLENGE_JSON__` /
 * `__DOUYIN_PAGE_JSON__`，由 {@link renderDouyinVerifyPage} 一次性替换。
 *
 * 运行时读的是它的烘焙产物 `verifyPage.template.generated.ts`（一个 `export const` 字符串）：
 * `pnpm build`（tsdown）把 `src` 打成单文件、`.html` 不进 `dist`、`files` 也只发 `dist/*`，所以
 * 运行时 `readFileSync('.html')` 在已安装的包里必然 ENOENT。烘焙由 `scripts/gen-verify-page.mts`
 * 做（`pnpm gen:verify-page` 写出、`:check` 逐字节比对当门禁），与 `response-schemas.generated.ts`
 * 是同一套「非 TS 源 → 产物 TS + --check」约定。**改页面请改 `.html` 再跑 `gen:verify-page`，别手改产物。**
 *
 * @module platforms/douyin/verifyPage
 */

/**
 * 中间页 `init` 的宿主 `commonOptions`：`aid` 是**中间页宿主常量 339757**（不是
 * `verifyData.aid`，那个实测是 0），`iid` / `did` 实测都是 `'0'`。出处是滑块中间页
 * （fixture `slider_captcha.html`）里的 `TTGCaptcha.init(options)`，不随会话变，所以写死于此。
 */
export const DOUYIN_VERIFY_PAGE_COMMON_OPTIONS: Record<string, unknown> = { aid: 339757, iid: '0', did: '0' }

/**
 * 中间页 `init` 的 `captchaOptions` 常量：滑块挂到 `#root`、隐藏关闭按钮、遮罩态展示。
 * 同样取自中间页、不随会话变。`successCb` **不在这里** —— 它由页面脚本按本模块的语义注入
 * （见模块注释「successCb 为什么改掉」）。
 */
export const DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS: Record<string, unknown> = { ele: 'root', hideCloseBtn: true, showMode: 'mask' }

/** {@link renderDouyinVerifyPage} 的可选项 */
export interface DouyinVerifyPageOptions {
  /** 页面标题（进 `<title>` 与 `<h1>`，默认「抖音滑块验证」）。会做 HTML 转义 */
  title?: string
  /** 覆盖中间页宿主 `commonOptions`（默认 {@link DOUYIN_VERIFY_PAGE_COMMON_OPTIONS}） */
  commonOptions?: Record<string, unknown>
  /** 覆盖 / 补充 `captchaOptions`（在 {@link DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS} 之上浅合并） */
  captchaOptions?: Record<string, unknown>
}

/** HTML 文本 / 属性转义表 */
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/**
 * 转义进 HTML 文本 / 属性的值（title 等调用方可控字段走它）。
 * @param value - 原始字符串
 * @returns 转义后的字符串
 */
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)

/**
 * 把任意值序列化成可**安全内联进 `<script>`** 的 JSON 文本。
 *
 * `JSON.stringify` 的产物里 `<` / `>` / `&` 只可能出现在字符串值内，把它们转成 `\uXXXX`：
 * 浏览器 JSON 解析会原样还原，但 HTML 解析器再也看不到 `</script>` 这种闭合序列，于是
 * 既不会截断脚本、也不构成 HTML 注入。`U+2028` / `U+2029` 一并转义 —— 它们是合法 JSON
 * 却是非法 JS 行终止符，不转义会让内联脚本语法错。
 * @param value - 待内联的值（`undefined` 归一成 `null`）
 * @returns 可直接写进 `<script>` 的 JSON 文本
 */
const toInlineJson = (value: unknown): string =>
  JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

/**
 * 把一个抖音风控挑战渲染成**真人能打开拖动**的自包含 HTML 页。
 *
 * 产物是一整张 HTML（内联 CSS + JS，无外部依赖，除了运行时动态加载的官方 TTGCaptcha SDK），
 * 直接 `res.send()` / 写文件 / 塞进 iframe 都行。页面行为见模块注释：自建 / 托管两模式按料齐全度
 * 自动选默认，真人拖完切 ✅ 并提示用同一份 cookie 重发原请求。
 *
 * **只中转不绕过** —— 页面只渲染官方滑块交给真人拖，不含任何识别 / 轨迹 / 自动过验证代码。
 *
 * @example 在 express 里把失败信封的挑战变成一张页
 * ```ts
 * const r = await client.douyin.fetcher.fetchVideoWork({ id })
 * if (!r.success && r.error.challenge) {
 *   res.type('html').send(renderDouyinVerifyPage(r.error.challenge))
 * }
 * ```
 * @param challenge - 失败信封里的 `error.challenge`（{@link RiskChallenge}）
 * @param options - 标题与中间页常量覆盖（{@link DouyinVerifyPageOptions}）
 * @returns 自包含的 HTML 字符串
 */
export const renderDouyinVerifyPage = (challenge: RiskChallenge, options: DouyinVerifyPageOptions = {}): string => {
  const title = escapeHtml(options.title ?? '抖音滑块验证')
  // 页面脚本只认 verifyData / jsSdkUrl / url 三样；其余字段（session / type / result 等）
  // 对渲染无用，不外泄进页面全局
  const challengeData = {
    ...(challenge.url === undefined ? {} : { url: challenge.url }),
    ...(challenge.jsSdkUrl === undefined ? {} : { jsSdkUrl: challenge.jsSdkUrl }),
    ...(challenge.verifyData === undefined ? {} : { verifyData: challenge.verifyData })
  }
  const pageData = {
    commonOptions: options.commonOptions ?? DOUYIN_VERIFY_PAGE_COMMON_OPTIONS,
    captchaOptions: { ...DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS, ...(options.captchaOptions ?? {}) }
  }

  // 模板来自 verifyPage.html（经 gen-verify-page.mts 烘焙成 verifyPage.template.generated.ts）。
  // 三个占位符一次性替换：标题（×2）、challenge 数据、宿主常量。split/join 不走正则，
  // 避免 `$&` 这类替换串特殊字符在值里被误解释。
  return DOUYIN_VERIFY_PAGE_TEMPLATE.split('__DOUYIN_TITLE__')
    .join(title)
    .split('__DOUYIN_CHALLENGE_JSON__')
    .join(toInlineJson(challengeData))
    .split('__DOUYIN_PAGE_JSON__')
    .join(toInlineJson(pageData))
}
