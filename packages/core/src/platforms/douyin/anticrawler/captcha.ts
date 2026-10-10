/**
 * 抖音 TTGCaptcha 滑块**中间页**（响应体通道）的提取。
 *
 * **只提取，不求解。** 这一关是极验式的真人滑块（实测 `subtype: "slide"`），
 * amagi 不引入任何验证码识别或轨迹模拟代码 —— 滑块必须由真人拖。本模块只把
 * 「自建验证页需要的材料」从 HTML 里取出来，交给 `../captcha.ts` 拼成
 * `RiskChallenge` 进失败信封，由调用方决定转人工还是放弃。
 *
 * **这是一条可选的次要通道。** 首选永远是响应头通道（`../captcha.ts` 读
 * `x-vc-bdturing-parameters`），它根本不碰响应体。本通道只在「响应头完全没有信号、
 * 而响应体确实是滑块中间页」时兜底。
 *
 * **取数方式刻意压到最小**：两条正则各取一个值（一行 `verify_data`、一个 `src`
 * 属性），**不做 HTML 结构解析** —— 不遍历 DOM、不按标签层级找东西、不引入
 * cheerio / jsdom / parse5 之类任何解析器依赖。少一条脆弱通道好过多一个会随页面
 * 改版失效的解析器：真失配了就退回「`detect.ts` 识别出撞到了滑块中间页」那一层，
 * 调用方照样知道自己撞到了什么。
 *
 * ## 页面结构（fixture `slider_captcha.html`，6347B）
 *
 * ```html
 * <title>验证码中间页</title>
 * <script src="https://lf-cdn-tos.bytescm.com/obj/static/sec_sdk_build/3.5.2/captcha/index.js"></script>
 * <script>
 *   const verify_data = {"code":"10000",…,"subtype":"slide","detail":"<票据>","fp":"verify_…","aid":0}
 *   window.TTGCaptcha.init(options)
 *   window.TTGCaptcha.render({ verify_data })
 * </script>
 * ```
 *
 * 两个锚点：
 * - **`jsSdkUrl`**：`src` 以 `captcha/index.js` 结尾的脚本（可能省略协议）；
 * - **`verify_data`**：**一行放完**的 JSON。`detail` 不含引号与换行，
 *   `server_sdk_env` 是转义 JSON 字符串、内部带 `}` —— 所以按「行内贪婪吃到最后一个
 *   `}`」整行提出来再 `JSON.parse` 才安全。结尾不锚分号：实测页里
 *   `const verify_data = {…}` 后面没有 `;`（靠 ASI）。
 *
 * ## 与响应头通道的关系
 *
 * `verify_data` 的键集合与响应头 `x-vc-bdturing-parameters` 解码后的验证参数
 * **是同一套**（`code` / `subtype` / `detail` / `fp` / `aid` / `server_sdk_env` …），
 * 所以两条通道能共用 `../captcha.ts` 里那一个地址拼装函数。优先级见那里。
 *
 * 实测记号：本仓 fixture 里 `fp` 是 52 字符的 `verify_` 串、`aid` 是 **0**、
 * `detail` 408 字符。`aid` 为 0 这件事有后果 —— 托管验证页靠 `aid` 取题，0 大概
 * 取不出来，所以这条通道必须同时把 `jsSdkUrl` 与整个 `verifyData` 交出去，让调用方
 * 能照页面原样 `TTGCaptcha.render({ verify_data })` 自建一张。
 * （fixture 取自本次移植的参考实现所带的抓包，我们未自行复测过线上形状。）
 *
 * @module platforms/douyin/anticrawler/captcha
 */

/** 从滑块中间页取到的材料 */
export interface DouyinSliderPage {
  /** 前端验证 SDK 地址（已补协议）；页面没给时 `undefined` */
  jsSdkUrl?: string
  /** `verify_data` 的**原文**，交给验证页做 `JSON.parse` 的就是它，不重新序列化 */
  verifyText: string
  /** `verify_data` 解析后的对象 */
  verifyData: Record<string, unknown>
}

/** 补全协议前缀：SDK 地址可能是 `//host/…` 省略协议的写法 */
const withProtocol = (url: string): string => (url.startsWith('//') ? `https:${url}` : url)

/**
 * 从响应体里取出滑块中间页的材料。
 *
 * 认不出 `verify_data` 就整条不认（返回 `undefined`）：没有验证参数的页面给不出
 * 任何可验证的东西，`jsSdkUrl` 单独一个毫无用处。
 * @param raw - decode 之后的响应体（滑块中间页是 HTML 字符串）
 * @returns 页面材料；不是滑块中间页或 `verify_data` 解不开时 `undefined`
 */
export const parseDouyinSliderPage = (raw: unknown): DouyinSliderPage | undefined => {
  if (typeof raw !== 'string' || raw === '') return undefined

  const verifyMatch = /verify_data\s*=\s*(\{[^\n]*\})/.exec(raw)
  if (!verifyMatch) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(verifyMatch[1])
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined

  const sdkMatch = /src="([^"]+captcha\/index\.js)"/.exec(raw)
  const jsSdkUrl = sdkMatch ? withProtocol(sdkMatch[1]) : undefined

  return {
    ...(jsSdkUrl === undefined ? {} : { jsSdkUrl }),
    verifyText: verifyMatch[1],
    verifyData: parsed as Record<string, unknown>
  }
}
