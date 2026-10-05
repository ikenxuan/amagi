/**
 * 抖音 TTGCaptcha 滑块中间页的识别与中转。
 *
 * **只做中转，不做绕过。** 第三关是极验式的真人滑块（`subtype: "slide"`），
 * 纯程序化撞不过去 —— amagi 把验证页地址与票据原样交给调用方，由调用方
 * 决定是转人工还是放弃。这也与 {@link RiskChallenge} 的立场一致。
 *
 * 滑块页（2026-10 实测的 `slider_captcha.html`）的结构：
 *
 * ```html
 * <script src="https://lf-cdn-tos.bytescm.com/obj/static/sec_sdk_build/3.5.2/captcha/index.js"></script>
 * <script>
 *   const verify_data = {"code":"10000",...,"subtype":"slide","detail":"<长票据>",...};
 *   window.TTGCaptcha.init(options)
 *   window.TTGCaptcha.render({ verify_data })
 * </script>
 * ```
 *
 * 两个锚点：
 * - `jsSdkUrl`：`src` 为 `captcha/index.js` 的脚本；
 * - `verify_data`：一行放完的 JSON（`detail` 无引号 / 换行，`server_sdk_env`
 *   是转义 JSON 字符串），按「行内最后一个 `}`」整行提出来 `JSON.parse` 安全。
 *
 * `detail` 是这张验证页的唯一会话凭证，做 `session` 交出去；`code`（如
 * `"10000"`）做 `result`。
 */

/** 交给调用方的滑块挑战（结构兼容 contracts 的 RiskChallenge） */
export interface DouyinCaptchaChallenge {
  /** 验证页地址（触发挑战的原请求地址） */
  url: string
  /** 前端验证 SDK 地址（已补协议），自建验证页时要它 */
  jsSdkUrl?: string
  /** 验证会话票据（verify_data.detail） */
  session?: string
  /** 风控业务名 */
  bizName?: string
  /** 平台命中的业务码（verify_data.code，如 `"10000"`） */
  result: string | number
  /** 完整 verify_data 对象，自建验证页时原样交给 `TTGCaptcha.render` */
  verifyData?: Record<string, unknown>
}

/** 补全协议前缀：SDK 地址可能是 `//host/…` 省略协议的写法 */
const withProtocol = (url: string): string => (url.startsWith('//') ? `https:${url}` : url)

/** 提取验证 SDK 地址；认不出返回 undefined */
const extractJsSdkUrl = (html: string): string | undefined => {
  const match = /src="([^"]+captcha\/index\.js)"/.exec(html)
  if (!match) return undefined
  const url = match[1]
  return url.length > 0 ? withProtocol(url) : undefined
}

/** 提取 verify_data 单行 JSON 并解析；认不出或解不开返回 undefined */
const extractVerifyData = (html: string): Record<string, unknown> | undefined => {
  // 锚定「verify_data = 之后那一行的完整 JSON」：`[^\n]*` 贪婪吃整行到最后一个 `}`。
  // 结尾不锚分号 —— 实测页里 `const verify_data = {...}` 后没有 `;`（ASI）。
  // `server_sdk_env` 是转义 JSON 字符串，内含 `}`，必须整行吃下再交给 JSON.parse。
  const match = /verify_data\s*=\s*(\{[^\n]*\})/.exec(html)
  if (!match) return undefined
  try {
    const parsed: unknown = JSON.parse(match[1])
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

/**
 * 从响应体里识别抖音滑块中间页并取出挑战。
 *
 * 只认「`captcha/index.js` SDK + `verify_data`」这一对锚点；不认这两样的
 * 来路不明的响应宁可返回 `undefined`，绝不硬套。`res.url` 是触发挑战的
 * 原请求地址，缺了它这张页没有可回填的归属，同样不认。
 *
 * 装在 `PLATFORM_RUNTIME.douyin.challenge` 上由管线自动调用。
 * @param raw - decode 之后的原始响应体（滑块页是 HTML 字符串）
 * @param res - 触发挑战的原始响应摘要，至少要有请求地址
 * @returns 滑块挑战；没命中或信息不全返回 undefined
 */
export const parseDouyinCaptcha = (raw: unknown, res?: { url: string }): DouyinCaptchaChallenge | undefined => {
  if (typeof raw !== 'string' || raw === '') return undefined
  if (!res?.url) return undefined

  const jsSdkUrl = extractJsSdkUrl(raw)
  const verifyData = extractVerifyData(raw)
  if (!jsSdkUrl && !verifyData) return undefined

  const detail = typeof verifyData?.detail === 'string' ? verifyData.detail : undefined
  const code = typeof verifyData?.code === 'string' ? verifyData.code : undefined
  const numericCode = code === undefined ? NaN : Number(code)

  return {
    url: res.url,
    ...(jsSdkUrl ? { jsSdkUrl } : {}),
    ...(detail ? { session: detail } : {}),
    bizName: 'TTGCaptcha',
    ...(Number.isNaN(numericCode) ? { result: 10000 } : { result: numericCode }),
    ...(verifyData ? { verifyData } : {})
  }
}
