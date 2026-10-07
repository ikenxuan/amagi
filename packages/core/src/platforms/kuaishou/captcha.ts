/**
 * 快手风控（滑块验证）响应的识别与地址提取。
 *
 * **只做中转，不做绕过。** amagi 把滑块地址原样交给调用方，不引入任何识别、
 * 轨迹模拟或自动过验证的代码。
 *
 * `JudgeVerdict` 只有 `{ ok, kind, code, retryable }` 四个槽位，装不下一个 URL，
 * 所以单独一个模块：judge 负责**分类**（`risk` / `CAPTCHA_REQUIRED`），地址由这里取。
 *
 * {@link parseKuaishouCaptcha} 装在 `client/runtime.ts` 的 `PLATFORM_RUNTIME.kuaishou.challenge`
 * 上，`runtime/execute.ts` 在 judge 判出 `kind: 'risk'` 时调用它，结果进
 * `error.challenge` —— **不受 `debug` 开关影响**。若只从 `error.raw` 取地址，
 * `raw` 只有 `createClient({ debug: true })` 才有、HTTP 路由那一面
 * （`createKuaishouRoutes` 不接 `debug`）**结构上拿不到**。
 *
 * 三种响应形状，归一化成同一个结果 —— 交出去的 `url` **一律是人能直接打开的验证页**：
 *
 * ```jsonc
 * // PC GraphQL 形状一：服务端直接给 errors + data.captcha，顶层没有 result、没有 code
 * // （2026-09-26 用 credentials: 'omit' 实测；这不是前端 afterware 改写出来的）
 * {
 *   "errors": [{ "message": "Need captcha", "path": ["visionSubCommentList"] }],
 *   "data": { "visionSubCommentList": null,
 *             "captcha": { "url": "https://captcha.zt.kuaishou.com/iframe/index.html?captchaSession=…&type=1&configUrl=…&bizName=ANTICRAWL_COMMON",
 *                          "jsSdkUrl": "//static.yximgs.com/…" } }
 * }
 *
 * // PC GraphQL 形状二：业务码 400002 嵌在 data 里，地址同层
 * { "data": { "result": 400002, "url": "https://captcha.zt.kuaishou.com/iframe/index.html?captchaSession=…", "jsSdkUrl": "//static.yximgs.com/…" } }
 *
 * // H5 REST：result 2001，地址在 captchaConfig —— 注意它是**字符串形式的 JSON**，要二次解析
 * { "result": 2001, "error_msg": "[2001] antispam need captcha", "captchaConfig": "{\"type\":1,\"url\":\"…\",\"captchaSession\":\"…\"}" }
 * ```
 *
 * PC 给的是验证页本身（`iframe/index.html`），H5 给的**却是配置接口**
 * （`…/rest/zt/captcha/sliding/config`，浏览器打开只有 JSON）—— 所以 H5 那条要拼出
 * {@link VERIFY_PAGE_ENTRY}，详见那里。
 *
 * 实测：`/rest/wd/photo/info` 稳定命中 `2001`，逐个变量排除后确认不是实现问题
 * （签名 / 请求头 / did / cookie / 分享页预热 / 真 share 参数 / 数字 photoId
 * 七条全 2001）。而快手自己的 H5 分享页 SSR 用的是 `ugH5App/photo/simple/info`
 * —— 所以 `videoWork` 端点走那一条，完整版降级成显式的 `videoWorkFull`。
 * 详见 `endpoints/videoWorkFull.ts`。
 */

/** PC GraphQL 的风控业务码 */
export const KUAISHOU_PC_CAPTCHA_RESULT = 400002

/** H5 REST 的风控业务码 */
export const KUAISHOU_H5_CAPTCHA_RESULT = 2001

/** 滑块页所在域 —— 用它校验抽出来的地址确实是验证页，而不是别的什么 URL */
const CAPTCHA_HOST = 'captcha.zt.kuaishou.com'

/**
 * 人机验证页入口 —— PC 与 H5 共用这一个。
 *
 * H5 的 `captchaConfig.url` 给的**不是**验证页，而是
 * `https://captcha.zt.kuaishou.com/rest/zt/captcha/sliding/config?…` 这个**配置接口**
 * —— 浏览器打开只会看到一串 JSON，人过不了验证。所以要自己拼一个验证页地址出来，
 * 把配置接口当 `configUrl` 传进去。
 *
 * 用 `iframe/index.html` 而**不是** `mobile/h5/redirect/index.html`：后者是快手 H5 前端
 * 自己用的跳转壳，但它读的是 `captchaConfig` 原字段名 `url`（外加 `redirectUrl` 等，
 * 前端把整个 `captchaConfig` 平铺进 query），不认 `configUrl`。按 `configUrl` 拼给它，
 * SDK 拿到空值后把配置请求 POST 到页面自身，返回 405，滑块图出不来。
 * `iframe/index.html` 是 PC 那面服务端直接返回的地址，query 结构
 * （`captchaSession` / `type` / `configUrl` / `bizName`）与这里拼的完全一致。
 *
 * 2026-09-27 实测：拿 H5 端点（`videoWorkFull` 撞 2001）签发的会话配这个入口，
 * 配置接口返回 `result=1`，背景图与拼图块都正常加载，滑块可拖 —— H5 的会话在 PC
 * 的验证页上是通用的。
 */
const VERIFY_PAGE_ENTRY = `https://${CAPTCHA_HOST}/iframe/index.html`

/** 交给调用方的风控挑战 */
export interface KuaishouCaptchaChallenge {
  /** 滑块页地址（已补协议，可直接给人打开） */
  url: string
  /** 前端验证 SDK 地址（已补协议），自建验证页时要它 */
  jsSdkUrl?: string
  /** 验证会话票据 */
  session?: string
  /** 风控业务名，如 `ANTICRAWL_DEFAULT` / `ANTICRAWL_COMMON` */
  bizName?: string
  /** 验证类型，`1` 是滑动拼图。回填时作 `identity-verification-type` 头 */
  type?: string | number
  /** 验证配置接口地址（`…/rest/zt/captcha/sliding/config`），自建验证页时要它 */
  configUrl?: string
  /** 命中的业务码：`400002`（PC）或 `2001`（H5） */
  result: number
}

/**
 * 补全协议前缀。
 *
 * 快手返回的 `jsSdkUrl` 是 `//static.yximgs.com/…` 这种省略协议的写法，
 * 直接丢给浏览器会被当成相对路径。
 * @param url - 可能缺协议的地址
 * @returns 补全 https 的地址
 */
const withProtocol = (url: string): string => (url.startsWith('//') ? `https:${url}` : url)

/** 地址是不是落在滑块域上 */
const onCaptchaHost = (url: string): boolean => {
  try {
    return new URL(url).hostname === CAPTCHA_HOST
  } catch {
    return false
  }
}

/**
 * 这个地址是**验证页**还是**配置接口**？
 *
 * 页面以 `.html` 结尾（`iframe/index.html`、`mobile/h5/redirect/index.html`），
 * 配置接口是 `/rest/zt/captcha/sliding/config`。判页面而不是判 `/rest/` 前缀：
 * 前者哪天多一条验证页路径也还认得出来。
 * @param url - 已补协议的地址
 * @returns 是验证页返回 true
 */
const isVerifyPage = (url: string): boolean => {
  try {
    return new URL(url).pathname.endsWith('.html')
  } catch {
    return false
  }
}

/** 从地址 query 里取一个参数，取不到（或地址不合法）返回空串 */
const queryOf = (url: string, key: string): string => {
  try {
    return new URL(url).searchParams.get(key) ?? ''
  } catch {
    return ''
  }
}

/** 取字符串字段，非字符串一律当没有 */
const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/** 验证类型：H5 的 `captchaConfig.type` 是数字、URL query 里是字符串，原样透出不强转 */
const verifyType = (value: unknown): string | number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = str(value)
  return text === '' ? undefined : text
}

/**
 * 解析 H5 的 `captchaConfig`。
 *
 * 它是**字符串形式的 JSON**（不是对象），忘了二次解析就会拿到一串转义引号。
 * 也容忍平台哪天直接给对象。
 * @param raw - `captchaConfig` 原值
 * @returns 解析结果，解不开返回 undefined
 */
const parseH5Config = (raw: unknown): Record<string, unknown> | undefined => {
  if (raw !== null && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw !== 'string' || raw === '') return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

/** 归一化的入参：一个候选地址，外加平台在地址之外另给的那几个字段 */
interface CaptchaHints {
  /** 平台给的地址（可能是验证页，也可能是配置接口） */
  url: string
  /** 平台另给的会话票据 / 业务名 / 验证类型（H5 的 `captchaConfig` 里有，PC 只在 query 里） */
  session?: unknown
  bizName?: unknown
  type?: unknown
}

/**
 * 把平台给的地址归一成「人能打开的验证页」，并凑齐票据字段。
 *
 * 两种入口（H5 的 `captchaConfig` / PC 的 `data.captcha`）共用这一条：
 *
 * 1. 地址必须落在 {@link CAPTCHA_HOST} 上，否则整条不认 —— 宁可不给，也不把一个
 *    来路不明的 URL 当验证页交出去。
 * 2. 已经是验证页（`.html`）就直接用，`configUrl` 从它的 query 里抽；
 *    是配置接口就用它当 `configUrl`，拼出 {@link VERIFY_PAGE_ENTRY}。
 * 3. 票据字段**平台显式给的优先**，缺的再从地址 query 里补。
 * @param hints - 候选地址与平台另给的字段
 * @returns 归一后的地址与票据；地址不在滑块域上时 undefined
 */
const normalizeChallenge = (hints: CaptchaHints): Omit<KuaishouCaptchaChallenge, 'result' | 'jsSdkUrl'> | undefined => {
  const given = withProtocol(hints.url)
  if (given === '' || !onCaptchaHost(given)) return undefined

  const page = isVerifyPage(given)
  const configUrl = page ? queryOf(given, 'configUrl') : given
  const session = str(hints.session) || queryOf(given, 'captchaSession')
  const bizName = str(hints.bizName) || queryOf(given, 'bizName')
  const type = verifyType(hints.type) ?? verifyType(queryOf(given, 'type'))

  const url = page
    ? given
    : `${VERIFY_PAGE_ENTRY}?${new URLSearchParams({
        captchaSession: session,
        type: type === undefined ? '' : String(type),
        configUrl,
        bizName
      }).toString()}`

  return {
    url,
    ...(session ? { session } : {}),
    ...(bizName ? { bizName } : {}),
    ...(type === undefined ? {} : { type }),
    ...(configUrl ? { configUrl } : {})
  }
}

/**
 * 从快手响应里识别风控并取出滑块地址。
 *
 * PC 与 H5 两种格式都认，归一成同一个结果 —— 地址一律是**人能直接打开的验证页**，
 * H5 那条会把配置接口地址拼进 {@link VERIFY_PAGE_ENTRY}。
 *
 * 装在 `PLATFORM_RUNTIME.kuaishou.challenge` 上由管线自动调用，所以正常路径下
 * 调用方直接读失败信封的 `error.challenge` 就够，不必自己调这个函数。
 * @param raw - decode 之后的原始响应体
 * @returns 风控挑战；没命中风控返回 undefined
 */
export const parseKuaishouCaptcha = (raw: unknown): KuaishouCaptchaChallenge | undefined => {
  if (raw === null || typeof raw !== 'object') return undefined
  const root = raw as Record<string, unknown>

  // H5：顶层 result 2001 + 字符串 JSON 的 captchaConfig
  const h5 = parseH5Config(root.captchaConfig)
  if (h5) {
    const fields = normalizeChallenge({ url: str(h5.url), session: h5.captchaSession, bizName: h5.bizName, type: h5.type })
    if (fields) {
      const jsSdkUrl = withProtocol(str(h5.jsSdkUrl))
      return {
        ...fields,
        ...(jsSdkUrl ? { jsSdkUrl } : {}),
        result: typeof root.result === 'number' ? root.result : KUAISHOU_H5_CAPTCHA_RESULT
      }
    }
  }

  // PC GraphQL：地址在 data.captcha（撞 `Need captcha` 时）或 data.url（带业务码时）
  const data = (root.data ?? {}) as Record<string, unknown>
  const wrapped = (data.captcha ?? {}) as Record<string, unknown>
  const fields = normalizeChallenge({ url: str(wrapped.url) || str(data.url) })
  if (!fields) return undefined

  const jsSdkUrl = withProtocol(str(wrapped.jsSdkUrl) || str(data.jsSdkUrl))
  return {
    ...fields,
    ...(jsSdkUrl ? { jsSdkUrl } : {}),
    result: typeof data.result === 'number' ? data.result : KUAISHOU_PC_CAPTCHA_RESULT
  }
}
