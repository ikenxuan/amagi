/**
 * 风控验证页：把失败信封里的 `error.challenge` 渲染成一张自包含 HTML，交给真人过验证。
 *
 * | 模式 | 平台 | 做法 |
 * | --- | --- | --- |
 * | 托管 | 抖音 / 快手 / 小红书 | iframe 内嵌 `challenge.url`，被拒绝内嵌时新标签打开 |
 * | 自建 | 仅抖音（challenge 带 `jsSdkUrl` + `verifyData`） | 加载官方 TTGCaptcha SDK 在页内渲染滑块 |
 *
 * 只中转不绕过：页面不含任何识别 / 轨迹 / 自动过验证逻辑。验证页靠 URL 里的票据认人，
 * 不读 cookie；过完由调用方用同一份 cookie 重发原请求，amagi 不自动重发。
 * 页面源码是 `packages/core/verify-page/`（React），改完跑 `pnpm gen:verify-page`。
 *
 * @module verify
 */
import type { RiskChallenge } from '../contracts/error'
import type { VerifyPageData, VerifyPlatform } from './data'
import { VERIFY_PAGE_TEMPLATE } from './page.generated'

export type { VerifyPlatform } from './data'

const PLATFORM_LABELS: Record<VerifyPlatform, string> = { douyin: '抖音', kuaishou: '快手', xiaohongshu: '小红书' }

/**
 * 抖音滑块中间页（verify.zijieapi.com/captcha/verify）里 TTGCaptcha.init 的宿主常量，实测。
 * `aid` 是验证中心宿主 aid，和 `verifyData.aid`（0）不是一个东西，别拿来互相覆盖。
 */
const DOUYIN_COMMON_OPTIONS = { aid: 339757, iid: '0', did: '0' }
/** `ele` 必须对应页面里的 `#root` */
const DOUYIN_CAPTCHA_OPTIONS = { ele: 'root', hideCloseBtn: true, showMode: 'mask' }

/** {@link renderVerifyPage} 的选项 */
export interface VerifyPageOptions {
  /** challenge 来自哪个平台：决定默认标题、成功信号识别，以及能否用自建模式（仅抖音） */
  platform: VerifyPlatform
  /** 页面标题，默认「<平台>验证」；会做 HTML 转义 */
  title?: string
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)

/** 内联进 `<script>` 的 JSON：转义 `<` `>` `&` 防 `</script>` 截断，转义 U+2028/2029 防老引擎断行 */
const toInlineJson = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

/** 只放行 http(s) 地址：`url` 会进 iframe src / a href，`jsSdkUrl` 会进 script src */
const httpUrl = (u: string | undefined): string | undefined => (u && /^https?:\/\//i.test(u) ? u : undefined)

/**
 * 把风控 challenge 渲染成自包含的验证页 HTML，调用方自己起 HTTP 服务返回给真人即可。
 *
 * 抖音 challenge 带 `jsSdkUrl` + `verifyData` 时默认页内渲染官方滑块，可切到托管模式；
 * 其余情况（快手、小红书、抖音只有 `url`）只有托管模式。非 http(s) 的地址一律丢弃。
 *
 * @param challenge 失败信封里的 `error.challenge`
 * @param options 平台与标题
 * @returns 完整 HTML 文本
 */
export const renderVerifyPage = (challenge: RiskChallenge, options: VerifyPageOptions): string => {
  const { platform } = options
  const url = httpUrl(challenge.url)
  const jsSdkUrl = httpUrl(challenge.jsSdkUrl)
  const sdk =
    platform === 'douyin' && jsSdkUrl && challenge.verifyData
      ? { jsSdkUrl, verifyData: challenge.verifyData, commonOptions: DOUYIN_COMMON_OPTIONS, captchaOptions: DOUYIN_CAPTCHA_OPTIONS }
      : null
  const title = options.title ?? `${PLATFORM_LABELS[platform]}验证`
  const data: VerifyPageData = { platform, title, url, sdk }
  const values: Record<string, string> = { __AMAGI_TITLE__: escapeHtml(title), __AMAGI_VERIFY_JSON__: toInlineJson(data) }
  // 单趟替换：替换进去的值不会再被当成占位符解释
  return VERIFY_PAGE_TEMPLATE.replace(/__AMAGI_TITLE__|__AMAGI_VERIFY_JSON__/g, (m) => values[m] ?? m)
}
