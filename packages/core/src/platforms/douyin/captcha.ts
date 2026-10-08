import type { JudgeHeaders, RiskChallenge } from '../../contracts/error'
import { douyinVerifyParams } from './judge'

/**
 * 抖音验证中心（滑块 / 文字点选等）响应的验证页地址提取。
 *
 * **只做中转，不做绕过。** amagi 把验证页地址原样交给调用方，不引入任何识别、
 * 轨迹模拟或自动过验证的代码。
 *
 * 与小红书那一份（`platforms/xiaohongshu/captcha.ts`）一样，**信号只在响应头上**：
 * 验证中心 SDK 根本不读响应体。判定与这里共用 `judge.ts` 的 {@link douyinVerifyParams}
 * —— 哪个头、哪种 subtype 算数，两边只有一份规则。
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
 * 从抖音响应头里识别验证码挑战并拼出验证页地址。
 *
 * 装在 `client/runtime.ts` 的 `PLATFORM_RUNTIME.douyin.challenge` 上，
 * `runtime/execute.ts` 在 judge 判出 `kind: 'risk'` 时调用，结果进 `error.challenge`
 * —— **不受 `debug` 开关影响**。
 *
 * 只认 2xx，与 SDK、与 judge 的响应头通道一致。**缺 `fp` 或 `aid` 就什么都不给**：
 * 验证页拿不到 `aid` 取不了题；缺 `fp` 的验证即便过了，放行也落不到这次请求的指纹上
 * —— 宁可不给，也不交出一个过不去的地址。验证参数解析不了时同理。
 * @param _raw - decode 之后的响应体。抖音的信号全在响应头上，这里用不到
 * @param http - 本次响应的 HTTP 状态与响应头
 * @returns 风控挑战；不是验证响应或参数不全时 undefined
 */
export const parseDouyinCaptcha = (_raw: unknown, http?: { status: number; headers?: JudgeHeaders }): RiskChallenge | undefined => {
  if (http === undefined || http.status < 200 || http.status >= 300) return undefined
  const text = douyinVerifyParams(http.headers)
  if (text === undefined) return undefined

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
  // 平台的原值：实测是数字 10000，不转字符串
  const code = typeof params.code === 'number' ? params.code : textOf(params.code)

  return {
    // `verify_data` 放解码后的原文，不解析再序列化：验证页对它做的就是 `JSON.parse`
    url: `${VERIFY_PAGE_ENTRY}?${new URLSearchParams({ aid, fp, host: VERIFY_API_HOST, verify_data: text }).toString()}`,
    ...(subtype === undefined ? {} : { type: subtype }),
    ...(code === undefined ? {} : { result: code })
  }
}
