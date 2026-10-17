import type { JudgeHeaders, RiskChallenge } from '../../contracts/error'

/**
 * 小红书风控（验证码挑战）响应的识别与验证页地址提取。
 *
 * **只做中转，不做绕过。** amagi 把验证页地址原样交给调用方，不引入任何识别、
 * 轨迹模拟或自动过验证的代码。
 *
 * 与快手那一份（`platforms/kuaishou/captcha.ts`）同构、落点相同，但**取数位置不同**：
 * 快手的地址在响应体里，小红书的**全部信号只在响应头上** —— 所以本模块只读
 * `http.headers`，`raw` 一个字都用不上。这也是 `ChallengeExtractor` 从 `(raw)`
 * 扩宽到 `(raw, http)` 的原因（契约里 `Judge` 早因抖音同样的理由扩过一次）。
 *
 * ## 461 是「验证码挑战」，不是签名失败
 *
 * 2026-10-01 实测：游客 cookie 打 `comment/page` / `homefeed`，XYS_ 与 XYW_ 四种组合
 * 全部 HTTP 461。这**不是**签名错 —— 同日已用真机 `window._webmsxyw` 把 XYW_ 逐字节
 * 复现（见 `sign/steps.ts` 文件头），且 461 的响应体是
 *
 * ```json
 * { "code": 0, "success": true, "data": {}, "msg": "" }
 * ```
 *
 * 即请求在协议层是**被接受**的。平台自己的 redcaptcha SDK 里这两个状态码有名字：
 *
 * ```js
 * ((b) => { b.antiSpider = "461", b.antiSpam = "471" })(f || (f = {}))
 * ```
 *
 * ## 信号只在响应头上，一共两个字段有用
 *
 * 一条真实 461 的完整响应头里，除 CORS / 日期 / `request-id` 这类通用字段外，只有：
 *
 * - `verifyuuid: <uuid>` —— 验证会话票据，验证页靠它取配置
 * - `verifytype: 301` —— 验证类型
 *
 * 响应头里带了 `access-control-expose-headers`，即平台本就打算让浏览器前端读这两个。
 * 这也是为什么只看 body 的提取器在小红书上必然空手而归。
 *
 * ## `verifytype` 的值原样透出，不翻译、不纠正
 *
 * SDK 自己的 `verifyType` 枚举是 101~290（`rotateCaptcha=102`、`smsCaptcha=120`、
 * `restricted=290` 等），**没有 301**；它的动态加载分支只认 `216 <= n <= 220`。
 * 实测把 `verifyType=301` 带进验证页，页面标题是「安全验证」但 body 为空、
 * 不发 `getconfig` 请求 —— SDK 不认这个值。换 `verifyType=102` 则渲染出可拖动的真实
 * 滑块（「请向右拖动滑块完成上方拼图」）。
 *
 * 所以 {@link VERIFY_PAGE_ENTRY} 的形状是对的，301 是平台在这个场景下的自有取值。
 * amagi **照抄平台给的值**，既不翻译也不替换成某个「能渲染的」类型 —— 后者是在编一个
 * 平台没说过的验证流程，调用方据此得到的页面并不对应手里这张票据。
 *
 * @module platforms/xiaohongshu/captcha
 */

/** 反爬状态码。平台 redcaptcha SDK 里的名字是 `antiSpider` */
export const XIAOHONGSHU_ANTI_SPIDER_STATUS = 461

/** 反垃圾状态码。平台 redcaptcha SDK 里的名字是 `antiSpam` */
export const XIAOHONGSHU_ANTI_SPAM_STATUS = 471

/**
 * 人机验证页入口。
 *
 * 2026-10-01 在真站确认：`?verifyUuid=<uuid>&verifyType=102` 渲染出可拖动的真实滑块，
 * 页面挂载点 `.fe-captcha-app` 存在 —— 这个地址与 query 名（**大小写敏感**，是
 * `verifyUuid` / `verifyType` 而非响应头里的全小写写法）就是前端 SDK 读的那一份：
 * 它取票据的实现是 `e?.verifyUuid ?? getSearchValue('verifyUuid') ?? getSearchValue('uuid')`。
 */
const VERIFY_PAGE_ENTRY = 'https://www.xiaohongshu.com/website-login/captcha'

/** 验证配置接口路径，自建验证页时要它 */
const CONFIG_API_PATH = '/api/redcaptcha/v2/getconfig'

/** 配置接口域名（国内）。SDK 里的 `ze()` 返回它 */
const CONFIG_HOST = 'https://edith.xiaohongshu.com'

/** 配置接口域名（海外）。SDK 里的 `N()` 返回它，只在票据带海外前缀时启用 */
const CONFIG_HOST_OVERSEAS = 'https://webapi.rednote.com'

/**
 * 走海外配置域的票据前缀。
 *
 * SDK 的判据是 `verifyUuid` 以 `sg__` / `ae__` / `gcp__` 开头时把 `getconfig` 打到
 * {@link CONFIG_HOST_OVERSEAS}，否则打 {@link CONFIG_HOST}。
 */
const OVERSEAS_UUID_PREFIXES = ['sg__', 'ae__', 'gcp__'] as const

/** 按名取响应头并去空白；缺失或空值统一成空串 */
const headerOf = (headers: JudgeHeaders | undefined, name: string): string => headers?.get(name)?.trim() ?? ''

/**
 * 按票据前缀选配置接口域
 * @param verifyUuid - `verifyuuid` 响应头的值
 * @returns 配置接口完整地址
 */
const configUrlFor = (verifyUuid: string): string =>
  `${OVERSEAS_UUID_PREFIXES.some((prefix) => verifyUuid.startsWith(prefix)) ? CONFIG_HOST_OVERSEAS : CONFIG_HOST}${CONFIG_API_PATH}`

/**
 * 从小红书响应头里识别验证码挑战并拼出验证页地址。
 *
 * 装在 `client/runtime.ts` 的 `PLATFORM_RUNTIME.xiaohongshu.challenge` 上，
 * `runtime/execute.ts` 在 judge 判出 `kind: 'risk'` 时调用，结果进 `error.challenge`
 * —— **不受 `debug` 开关影响**（若只从 `error.raw` 取，HTTP 路由那一面结构上拿不到，
 * 理由见 `contracts/error.ts` 的 `RiskChallenge`）。所以正常路径下调用方直接读失败
 * 信封的 `error.challenge` 就够，不必自己调这个函数。
 *
 * **没有 `verifyuuid` 就什么都不给**：没票据的验证页打开只是一个空壳，
 * 宁可不给，也不交出一个过不去的地址。
 * @param _raw - decode 之后的响应体。小红书的信号全在响应头上，这里用不到
 * @param http - 本次响应的 HTTP 状态与响应头
 * @returns 风控挑战；响应头里没有验证票据时 undefined
 */
export const parseXiaohongshuCaptcha = (_raw: unknown, http?: { status: number; headers?: JudgeHeaders }): RiskChallenge | undefined => {
  const verifyUuid = headerOf(http?.headers, 'verifyuuid')
  if (verifyUuid === '') return undefined

  // 平台的原值，不翻译、不替换（理由见模块头「`verifytype` 的值原样透出」）
  const verifyType = headerOf(http?.headers, 'verifytype')

  return {
    url: `${VERIFY_PAGE_ENTRY}?${new URLSearchParams({
      verifyUuid,
      ...(verifyType === '' ? {} : { verifyType })
    }).toString()}`,
    session: verifyUuid,
    ...(verifyType === '' ? {} : { type: verifyType }),
    configUrl: configUrlFor(verifyUuid),
    // 命中的「业务码」就是 HTTP 状态本身 —— 461 的响应体 `code` 是 0，放它没有信息
    ...(http === undefined ? {} : { result: http.status })
  }
}
