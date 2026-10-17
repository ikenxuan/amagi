import type { JudgeHeaders, RiskChallenge } from '../../contracts/error'
import { parseDouyinSliderPage } from './anticrawler/captcha'
import { douyinVerifyParams } from './judge'

/**
 * 抖音验证中心（滑块 / 文字点选等）响应的验证页地址提取。
 *
 * **只做中转，不做绕过。** amagi 把验证页地址原样交给调用方，不引入任何识别、
 * 轨迹模拟或自动过验证的代码。
 *
 * ## 两条通道，响应头优先
 *
 * | 通道 | 取数位置 | 什么时候是唯一出路 |
 * | --- | --- | --- |
 * | **响应头**（主） | `x-vc-bdturing-parameters` / `bdturing-verify` | 验证中心 SDK 只读头，弹验证时 body 可能是空串或一份看着正常的 JSON |
 * | **响应体**（备） | 滑块中间页 HTML 里的 `verify_data` | 服务器直接回一整页 HTML、一个验证头都没有时 |
 *
 * 响应头是**首选**，理由是它更直接也更权威：那是验证中心 SDK 自己读的那份原话，
 * 而且**根本不碰响应体**，不会随页面改版失配。响应体通道是**可选的兜底**：只在头上
 * 什么都没有、或头上的参数拼不出地址时才走，那种场景下它是唯一出路。
 *
 * 响应体通道的取数压到最小 —— 两条正则各取一个值，**不做 HTML 结构解析**、不引入
 * 任何 HTML 解析器依赖（见 `anticrawler/captcha.ts`）。它哪天随页面改版失配了，
 * 退化结果是「拿不到地址」而不是「拿到一个错地址」，调用方仍能从 `detect.ts`
 * 知道撞上的是滑块中间页。
 *
 * 两条通道的验证参数**键集合相同**（`code` / `subtype` / `detail` / `fp` / `aid` …），
 * 所以地址只由 {@link challengeFrom} 一处拼装，两边不会各说各话。判定与这里共用
 * `judge.ts` 的 {@link douyinVerifyParams} —— 哪个头、哪种 subtype 算数，也只有一份规则。
 *
 * 响应体通道取自本次移植的参考实现所带的抓包（fixture `slider_captcha.html`），**中间页本身的
 * 线上形状我们未复测**。但 2026-10-11 复测过这条通道的**产出**：把 fixture 过一遍本模块，
 * 拿到的 {@link RiskChallenge.url} 在真浏览器里渲染出真实滑块（`captcha/get` 回 200），
 * 所以此前「`aid` 为 0 托管页取不出题」的推断是错的 —— 见 `anticrawler/captcha.ts`。
 *
 * ## 头上只有验证参数，地址是 SDK 自己拼的
 *
 * 2026-09-26 实测，验证响应是 HTTP 200、body 0 字节、带 `x-vc-bdturing-parameters`
 * （base64 JSON），键为 `code, from, type, version, region, subtype, ui_type, detail,
 * verify_event, fp, server_sdk_env, log_id, is_assist_mobile, is_complex_sms,
 * identity_action, identity_scene, login_status, aid` —— **没有任何 URL**。
 *
 * 地址出自页面加载的渲染层（`rc-verifycenter/verifycenter/@latest/index.js`）：它把
 * 验证参数连同 `fp` / `aid` / `host` 等平铺进 query，挂一个 iframe 到
 * {@link VERIFY_PAGE_ENTRY}。那个页面自己用 `parseURL(location.search)` 读参数、
 * 交给 `bdCaptcha.CaptchaVerify` 渲染 —— 小程序场景它就是作为顶层页打开的，
 * 不依赖父窗口。
 *
 * ## 放行挂在 `fp` 上
 *
 * SDK 过完验证只做一件事：**原样重发原请求**，不加任何新头。所以放行状态只能记在
 * 服务端。渲染层见到验证参数里的 `fp` 会把它写回 `s_v_web_id` cookie，让重发的请求
 * 带上同一个指纹 —— 据此推断放行按 `fp` 关联。对 amagi 而言，浏览器里 `s_v_web_id`
 * 与请求上的 `verifyFp` / `fp` 恒等（见 `deviceFp.ts`），调用方过完验证后用
 * **同一份 cookie** 重发，不需要回填任何东西。
 *
 * 旁证：滑块中间页自己的 `captchaOptions.successCb` 就只是 `location.reload()`
 * —— 平台前端过完验证也没有任何票据要回填，重发就是重发。
 *
 * **但「重发真的会被放行」至今没有端到端实测**：要撞出真挑战得有登录态 cookie，而人工过
 * 滑块又必须在没有 `navigator.webdriver` 的干净浏览器里做，两者在自动化环境里凑不齐。
 * 现状与卡在哪一步记在 `docs/v7/dev/internals/transport.mdx`。
 *
 * @module platforms/douyin/captcha
 */

/**
 * 人机验证页入口。
 *
 * 渲染层的 iframe 地址就是它：`"https://rmc.bytedance.com" + "/verifycenter/captcha/v2"`
 * 再接 query（域名只在 boe 测试环境或海外配置下被替换）。
 */
const VERIFY_PAGE_ENTRY = 'https://rmc.bytedance.com/verifycenter/captcha/v2'

/**
 * 验证接口域名。渲染层 `outputParams()` 的默认值 —— 验证页拿它打 `/captcha/get` 与
 * `/captcha/verify`。
 */
const VERIFY_API_HOST = 'https://verify.zijieapi.com'

/** 验证参数里会用到的几项。其余键原样留在 `verify_data` 里交给验证页 */
interface DouyinVerifyParams {
  fp?: unknown
  aid?: unknown
  subtype?: unknown
  code?: unknown
}

/**
 * 把字符串或数字的参数值规整成非空字符串
 * @param value - 验证参数里的原值
 * @returns 规整后的值；缺失、空串或类型不对时 undefined
 */
const textOf = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  return undefined
}

/**
 * 把一份验证参数拼成 {@link RiskChallenge}。两条通道共用这一处。
 *
 * **缺 `fp` 或 `aid` 就什么都不给**：验证页拿不到 `aid` 取不了题；缺 `fp` 的验证即便
 * 过了，放行也落不到这次请求的指纹上 —— 宁可不给，也不交出一个过不去的地址。
 * 验证参数解析不了时同理。
 * @param text - 验证参数原文（验证页对它做的就是 `JSON.parse`，所以原文直传、不重新序列化）
 * @param extra - 响应体通道另有的材料（SDK 地址 / 会话票据 / 整个 verify_data）
 * @returns 风控挑战；参数解析不了或 `fp` / `aid` 不全时 undefined
 */
const challengeFrom = (text: string, extra: Pick<RiskChallenge, 'jsSdkUrl' | 'session' | 'verifyData'> = {}): RiskChallenge | undefined => {
  let params: DouyinVerifyParams
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    params = parsed as DouyinVerifyParams
  } catch {
    return undefined
  }

  const fp = textOf(params.fp)
  const aid = textOf(params.aid)
  if (fp === undefined || aid === undefined) return undefined

  const subtype = textOf(params.subtype)
  // 平台的原值：响应头通道实测是数字 10000，中间页里是字符串 `"10000"`，两边都不改
  const code = typeof params.code === 'number' ? params.code : textOf(params.code)

  return {
    // `verify_data` 放解码后的原文，不解析再序列化：验证页对它做的就是 `JSON.parse`
    url: `${VERIFY_PAGE_ENTRY}?${new URLSearchParams({ aid, fp, host: VERIFY_API_HOST, verify_data: text }).toString()}`,
    ...(extra.jsSdkUrl === undefined ? {} : { jsSdkUrl: extra.jsSdkUrl }),
    ...(extra.session === undefined ? {} : { session: extra.session }),
    ...(subtype === undefined ? {} : { type: subtype }),
    ...(code === undefined ? {} : { result: code }),
    ...(extra.verifyData === undefined ? {} : { verifyData: extra.verifyData })
  }
}

/**
 * 从抖音响应里识别验证码挑战并拼出验证页地址。
 *
 * 装在 `client/runtime.ts` 的 `PLATFORM_RUNTIME.douyin.challenge` 上，
 * `runtime/execute.ts` 在 judge 判出 `kind: 'risk'` 时调用，结果进 `error.challenge`
 * —— **不受 `debug` 开关影响**。
 *
 * 两条通道，响应头优先（取舍见模块注释）：
 *
 * 1. **响应头**：只认 2xx，与 SDK、与 judge 的响应头通道一致。
 * 2. **响应体**：滑块中间页 HTML。**不按 2xx 设闸** —— 这一支的挑战就是响应体本身，
 *    不是 SDK 的指令，服务器拿什么状态码回这张页都算数。
 *
 * 头上拼不出地址时**继续往下试响应体**，而不是直接放弃：两条通道互补，有一条能给出
 * 可打开的地址就不该空手而归。
 *
 * **滑块只中转不绕过**：这里只把地址与票据交出去，不含任何识别或轨迹模拟代码；
 * 它也永远不进自动重放（见 `anticrawler/solver.ts`）。
 * @param raw - decode 之后的响应体。响应头通道用不到它，响应体通道认的就是它
 * @param http - 本次响应的 HTTP 状态与响应头
 * @returns 风控挑战；两条通道都不认时 undefined
 */
export const parseDouyinCaptcha = (raw: unknown, http?: { status: number; headers?: JudgeHeaders }): RiskChallenge | undefined => {
  // 通道一（优先）：响应头
  if (http !== undefined && http.status >= 200 && http.status < 300) {
    const text = douyinVerifyParams(http.headers)
    const fromHeader = text === undefined ? undefined : challengeFrom(text)
    if (fromHeader !== undefined) return fromHeader
  }

  // 通道二：响应体（滑块中间页 HTML）
  const page = parseDouyinSliderPage(raw)
  if (page === undefined) return undefined

  // `detail` 是这张验证页的会话票据。与响应头通道的取舍不同 —— 那边不交 session
  // （放行挂在 fp 上，调用方用同一份 cookie 重发即可），这边的自建验证页要拿它
  // 去 `TTGCaptcha.render`，所以交。
  const detail = page.verifyData.detail
  const session = typeof detail === 'string' && detail !== '' ? detail : undefined

  return challengeFrom(page.verifyText, {
    ...(page.jsSdkUrl === undefined ? {} : { jsSdkUrl: page.jsSdkUrl }),
    ...(session === undefined ? {} : { session }),
    verifyData: page.verifyData
  })
}
