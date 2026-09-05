/**
 * 快手风控（滑块验证）响应的识别与地址提取。
 *
 * **只做中转，不做绕过。** amagi 把滑块地址原样交给调用方，不引入任何识别、
 * 轨迹模拟或自动过验证的代码 —— 这条线与对照项目的立场一致。
 *
 * 为什么单独一个模块而不是塞进 `judge.ts`：`JudgeVerdict` 只有
 * `{ ok, kind, code, retryable }` 四个槽位，装不下一个 URL。judge 负责**分类**
 * （`risk` / `CAPTCHA_REQUIRED`），地址由这里取。
 *
 * {@link parseKuaishouCaptcha} 装在 `client/runtime.ts` 的 `PLATFORM_RUNTIME.kuaishou.challenge`
 * 上，`runtime/execute.ts` 在 judge 判出 `kind: 'risk'` 时调用它，结果进
 * `error.challenge` —— **不受 `debug` 开关影响**。这一步是 2026-09-05 补的：
 * 在那之前地址只能从 `error.raw` 里自己捞，而 `raw` 只有 `createClient({ debug: true })`
 * 才有、HTTP 路由那一面（`createKuaishouRoutes` 不接 `debug`）**结构上拿不到** ——
 * 最需要滑块地址的入口恰好是唯一产不出它的入口。
 *
 * 两种响应格式，归一化成同一个结果：
 *
 * ```jsonc
 * // PC GraphQL：result 400002，地址在 data.url 或被前端 afterware 改写成 data.captcha
 * { "data": { "result": 400002, "url": "https://captcha.zt.kuaishou.com/iframe/index.html?captchaSession=…", "jsSdkUrl": "//static.yximgs.com/…" } }
 *
 * // H5 REST：result 2001，地址在 captchaConfig —— 注意它是**字符串形式的 JSON**，要二次解析
 * { "result": 2001, "error_msg": "[2001] antispam need captcha", "captchaConfig": "{\"type\":1,\"url\":\"…\",\"captchaSession\":\"…\"}" }
 * ```
 *
 * 这两种形状与业务码都来自 @OduckO 的 kuaishou-parser（GPL-3.0-only）
 * `src/platform/kuaishou/captcha.ts`：https://github.com/OduckO
 *
 * 实测记录（2026-09-05 复核）：`/rest/wd/photo/info` 稳定命中 `2001`，逐个变量
 * 排除后确认不是实现问题（签名 / 请求头 / did / cookie / 分享页预热 / 真 share
 * 参数 / 数字 photoId 七条全 2001，对照项目打同一条接口也是 2001）。而快手自己的
 * H5 分享页 SSR 用的是 `ugH5App/photo/simple/info` —— 所以 `videoWork` 端点已改走
 * 那一条，完整版降级成显式的 `videoWorkFull`。详见 `endpoints/videoWorkFull.ts`。
 */

/** PC GraphQL 的风控业务码 */
export const KUAISHOU_PC_CAPTCHA_RESULT = 400002

/** H5 REST 的风控业务码 */
export const KUAISHOU_H5_CAPTCHA_RESULT = 2001

/** 滑块页所在域 —— 用它校验抽出来的地址确实是验证页，而不是别的什么 URL */
const CAPTCHA_HOST = 'captcha.zt.kuaishou.com'

/** 交给调用方的风控挑战 */
export interface KuaishouCaptchaChallenge {
  /** 滑块页地址（已补协议） */
  url: string
  /** 前端验证 SDK 地址（已补协议），自建验证页时要它 */
  jsSdkUrl?: string
  /** 验证会话票据 */
  session?: string
  /** 风控业务名，如 `ANTICRAWL_DEFAULT` */
  bizName?: string
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

/** 从滑块地址的 query 里抽出会话票据与业务名 */
const fieldsFromUrl = (url: string): Pick<KuaishouCaptchaChallenge, 'session' | 'bizName'> => {
  try {
    const q = new URL(url).searchParams
    const session = q.get('captchaSession')
    const bizName = q.get('bizName')
    return { ...(session ? { session } : {}), ...(bizName ? { bizName } : {}) }
  } catch {
    return {}
  }
}

/** 取字符串字段，非字符串一律当没有 */
const str = (value: unknown): string => (typeof value === 'string' ? value : '')

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

/**
 * 从快手响应里识别风控并取出滑块地址。
 *
 * PC 与 H5 两种格式都认，归一成同一个结果。取到的地址必须落在
 * {@link CAPTCHA_HOST} 上 —— 否则宁可返回 undefined，不把一个来路不明的 URL
 * 当成验证页交出去。
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
    const url = withProtocol(str(h5.url))
    if (url.includes(CAPTCHA_HOST)) {
      const session = str(h5.captchaSession)
      const bizName = str(h5.bizName)
      return {
        url,
        ...(str(h5.jsSdkUrl) ? { jsSdkUrl: withProtocol(str(h5.jsSdkUrl)) } : {}),
        ...fieldsFromUrl(url),
        ...(session ? { session } : {}),
        ...(bizName ? { bizName } : {}),
        result: typeof root.result === 'number' ? root.result : KUAISHOU_H5_CAPTCHA_RESULT
      }
    }
  }

  // PC GraphQL：地址在 data.url，或被前端 afterware 改写进 data.captcha
  const data = (root.data ?? {}) as Record<string, unknown>
  const wrapped = (data.captcha ?? {}) as Record<string, unknown>
  const url = withProtocol(str(wrapped.url) || str(data.url))
  if (!url.includes(CAPTCHA_HOST)) return undefined

  const jsSdkUrl = withProtocol(str(wrapped.jsSdkUrl) || str(data.jsSdkUrl))
  return {
    url,
    ...(jsSdkUrl ? { jsSdkUrl } : {}),
    ...fieldsFromUrl(url),
    result: typeof data.result === 'number' ? data.result : KUAISHOU_PC_CAPTCHA_RESULT
  }
}
