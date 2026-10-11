/**
 * 错误契约。
 *
 * 全仓唯一的错误载体：调用方写一段跨平台通用的错误处理代码，只需要认
 * `AmagiError` 一种形状。
 *
 * `contracts/` 是零依赖叶子层，本文件不 import 仓库内任何其他模块。
 */

/**
 * 跨平台统一的错误大类，也是调用方唯一需要 `switch` 的判别键。
 *
 * 粗粒度归因用 `kind`，细粒度归因用 {@link AmagiErrorCode}。
 */
export type ErrorKind =
  /** 入参不合法，本地就能判定，没有发出请求 */
  | 'validation'
  /** 需要登录 / cookie 失效 / 身份不足 */
  | 'auth'
  /** 限频，退避后可重试 */
  | 'rate_limit'
  /** 风控、验证码、需要人工介入 */
  | 'risk'
  /** 资源不存在、已删除、已下架 */
  | 'not_found'
  /** 有身份但无权限：地区限制、付费内容、隐私设置 */
  | 'forbidden'
  /** 平台侧不可用：5xx、维护、过载 */
  | 'unavailable'
  /** 传输层失败：连接重置、DNS、代理 */
  | 'network'
  /** 超时 */
  | 'timeout'
  /** 响应拿到了但解析不了：非 JSON、protobuf 损坏、反爬 HTML */
  | 'parse'
  /** amagi 自身的 bug */
  | 'internal'
  /** 平台返回了没见过的错误码 */
  | 'unknown'

/**
 * 稳定的字符串错误码，可用于 `switch` 与埋点。
 *
 * 用字符串字面量联合而不是 `enum`：`enum` 的 `Object.values()` 会带出反向映射键，
 * 且拿平台返回的数字码去比时容易出现 `'-101'` 与 `-101` 对不上的静默错配。
 */
export type AmagiErrorCode =
  // validation
  | 'PARAM_INVALID'
  | 'PARAM_MISSING'
  // auth
  | 'COOKIE_MISSING'
  | 'COOKIE_EXPIRED'
  | 'LOGIN_REQUIRED'
  // rate_limit / risk
  | 'RATE_LIMITED'
  | 'RISK_CONTROL'
  | 'CAPTCHA_REQUIRED'
  | 'SIGNATURE_REFUSED'
  // resource
  | 'NOT_FOUND'
  | 'DELETED'
  | 'PRIVATE'
  | 'GEO_RESTRICTED'
  | 'PAID_CONTENT'
  // platform / transport
  | 'PLATFORM_ERROR'
  | 'PLATFORM_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  // decode
  | 'EMPTY_RESPONSE'
  | 'DECODE_FAILED'
  | 'ANTIBOT_PAGE'
  // internal
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR'

/** `kind === 'validation'` 时的字段级错误 */
export interface ValidationIssue {
  /** 点号路径，如 `'verify.stdParams.token'` */
  path: string
  /** 面向人的说明 */
  message: string
  /** 收到的值，用于排查 */
  received?: unknown
}

/** 失败信封里唯一的错误载体，永不为 `undefined` */
export interface AmagiError {
  /** 判别键，跨平台统一的错误大类 */
  kind: ErrorKind
  /** 稳定的字符串错误码，可用于 switch 与埋点 */
  code: AmagiErrorCode
  /** 面向人的说明，取平台原文优先 */
  message: string
  /** 是否值得重试。调用方据此决定退避还是放弃 */
  retryable: boolean
  /** 平台原始错误码与文案，一个字都不丢 */
  platform?: { code: string | number; message?: string }
  /** 真实发生的 HTTP 状态（有请求才有） */
  http?: { status: number; statusText?: string }
  /** `kind === 'validation'` 时的字段级错误 */
  issues?: ValidationIssue[]
  /**
   * 原始响应体。默认**连键都没有**，`createClient({ debug: true })` 且这次
   * 确实**拿到了响应**时才填（网络中断 / 超时那类失败没有响应体可放）。
   */
  raw?: unknown
  /**
   * 风控挑战（验证页地址 + 票据）。`kind === 'risk'` 且平台认得出这份响应时才有。
   *
   * **不受 `debug` 开关影响** —— 它是「怎么过去」这条必要信息，见
   * {@link RiskChallenge}。
   */
  challenge?: RiskChallenge
  /** 底层 Error 对象，仅用于日志 */
  cause?: unknown
}

/** 端点钩子发现的明确业务错误；执行管线将其保留为 AmagiError 信封。 */
export class EndpointError extends Error {
  readonly kind: ErrorKind
  readonly code: AmagiErrorCode

  constructor(options: Pick<AmagiError, 'kind' | 'code' | 'message'>) {
    super(options.message)
    this.name = 'EndpointError'
    this.kind = options.kind
    this.code = options.code
  }
}

/**
 * `kind` → `retryable` 的默认推导表。
 *
 * `satisfies Record<ErrorKind, boolean>` 保证漏掉任何一个 kind 都是编译错误 ——
 * 这张表与 {@link ErrorKind} 不可能漂移。端点可以用 `JudgeVerdict.retryable` 覆盖。
 */
const RETRYABLE_BY_KIND = {
  /** 入参错了，重试不会变对 */
  validation: false,
  /** 换凭证才有用 */
  auth: false,
  /** 退避后重试有意义 */
  rate_limit: true,
  /** 可重试，但需要更长退避，且连续命中应停手 */
  risk: true,
  not_found: false,
  forbidden: false,
  /** 平台侧临时不可用 */
  unavailable: true,
  network: true,
  timeout: true,
  parse: false,
  internal: false,
  /** 没见过的错误码，保守起见不重试 */
  unknown: false
} as const satisfies Record<ErrorKind, boolean>

/** 全部 12 个 `ErrorKind`，用于遍历与穷尽性测试。顺序即 {@link ErrorKind} 的声明顺序 */
export const ERROR_KINDS = Object.keys(RETRYABLE_BY_KIND) as readonly ErrorKind[]

/**
 * 按 `kind` 推导默认的 `retryable`
 * @param kind - 错误大类
 * @returns 该类错误默认是否值得重试
 */
export const isRetryableKind = (kind: ErrorKind): boolean => RETRYABLE_BY_KIND[kind]

/**
 * 每个错误码的兜底文案。
 *
 * `AmagiError.message` 取平台原文优先，平台没给文案时用这里的兜底
 * —— 保证 `message` 永远是一句人能读的话，而不是空串或 `undefined`。
 */
export const DEFAULT_ERROR_MESSAGES = {
  PARAM_INVALID: '参数不合法',
  PARAM_MISSING: '缺少必填参数',
  COOKIE_MISSING: '未提供 cookie',
  COOKIE_EXPIRED: '登录状态已失效',
  LOGIN_REQUIRED: '该接口需要登录',
  RATE_LIMITED: '请求过于频繁，请稍后再试',
  RISK_CONTROL: '触发平台风控',
  CAPTCHA_REQUIRED: '需要完成验证码',
  SIGNATURE_REFUSED: '平台拒绝了本次请求的签名（amagi 侧的签名问题，换 cookie 无用）',
  NOT_FOUND: '资源不存在',
  DELETED: '资源已删除或已下架',
  PRIVATE: '资源为私密状态',
  GEO_RESTRICTED: '资源受地区限制',
  PAID_CONTENT: '资源为付费内容',
  PLATFORM_ERROR: '平台返回了错误',
  PLATFORM_UNAVAILABLE: '平台服务暂时不可用',
  NETWORK_ERROR: '网络请求失败',
  TIMEOUT: '请求超时',
  EMPTY_RESPONSE: '平台返回了空响应体（常见成因：设备类参数与 cookie 会话不匹配、目标数据不公开、cookie 已失效）',
  DECODE_FAILED: '响应解析失败',
  ANTIBOT_PAGE: '平台返回了反爬页面',
  INTERNAL_ERROR: 'amagi 内部错误',
  UNKNOWN_ERROR: '未知错误'
} as const satisfies Record<AmagiErrorCode, string>

/**
 * 取某个错误码的兜底文案
 * @param code - 错误码
 * @returns 兜底文案
 */
export const errorMessageFor = (code: AmagiErrorCode): string => DEFAULT_ERROR_MESSAGES[code]

/** 平台判定的结论 */
export interface JudgeVerdict {
  /** 是否视为成功 */
  ok: boolean
  /** 失败时的错误大类 */
  kind?: ErrorKind
  /** 失败时的细粒度错误码 */
  code?: AmagiErrorCode
  /** 覆盖 {@link isRetryableKind} 的默认推导 */
  retryable?: boolean
}

/**
 * judge 能读到的响应头。
 *
 * 只声明「按名取值、大小写不敏感」这一个能力，**不 import `AmagiHeaders`** ——
 * `contracts/` 是零依赖叶子层。`AmagiHeaders` 的 `get` 天然满足这个形状，
 * 调用点直接把它传进来即可。
 */
export interface JudgeHeaders {
  /**
   * 按名取 header 值，大小写不敏感
   * @param name - header 名，任意大小写
   * @returns header 值，不存在时 `undefined`
   */
  get(name: string): string | undefined
}

/**
 * 平台响应判定函数。
 *
 * 每个平台一份纯函数，把原始响应映射为「成功」或一个错误分类。
 * **这是全仓唯一判定成败的地方** —— 平台差异只体现在这一份实现里。
 *
 * `headers` 可选，因为绝大多数判据只看 body，手搓 judge 的调用点（测试里很多）
 * 不必为此造一份 header 容器。它存在是因为**有的平台把风控信号放在响应头上而
 * 不是响应体里**：抖音验证中心就是这样 —— 弹验证时 HTTP 是 200、body 看着正常，
 * 唯一的信号是 `bdturing-verify` / `x-vc-bdturing-parameters` 这两个响应头
 * （判据见 `platforms/douyin/judge.ts` 的 {@link isDouyinCaptchaHeader}）。
 * 只看 body 的 judge 会把这种响应判成成功。
 *
 * `responseType` 同样可选，是**调用方声明的期望响应形态**（`RequestSpec.responseType`，
 * 由 execute 透传）。它只有一个用途：`'text'` 时让 {@link verdictFromNonJsonBody} 对
 * 字符串 body 闭嘴 —— 调用方明说要文本，一段文本不该被当成反爬页。**平台自己的判据
 * 不受它影响**，仍然先判（抖音的挑战页 / Argus、小红书的验证头在 text 下照旧失败）。
 * 不传等于 `'json'` 时的既有行为，所以手搓 judge 的调用点不必改。
 */
export type Judge = (
  raw: unknown,
  http: { status: number; headers?: JudgeHeaders; responseType?: 'json' | 'text' | 'arraybuffer' }
) => JudgeVerdict

/**
 * 风控挑战：撞验证页时交给调用方的「怎么过去」。
 *
 * 为什么不塞进 {@link JudgeVerdict}：judge 只管**分类**，四个槽位装不下一个
 * URL。但 `kind: 'risk'` 光有分类是条死路 —— `CAPTCHA_REQUIRED` 只告诉调用方
 * 「你被拦了」，不给出路。以前地址只能从 `error.raw` 里自己捞，而 `raw` 只在
 * `createClient({ debug: true })` 时才有、HTTP 路由那一面**结构上拿不到**
 * （`createXxxRoutes` 不接 `debug`）——最需要滑块地址的入口恰好是唯一产不出它的
 * 入口。所以这一份**不受 `debug` 管**，只要 judge 判成 `risk` 就填。
 *
 * 只放地址与票据，不放原始响应体：它是「必要信息」而不是「排障明细」，
 * 也没有大对象与凭证字段的顾虑。
 *
 * **只做中转，不做绕过** —— amagi 不引入任何识别、轨迹模拟或自动过验证的代码。
 */
export interface RiskChallenge {
  /** 验证页地址（已补协议，可直接给人打开） */
  url: string
  /** 前端验证 SDK 地址（已补协议），自建验证页时要它 */
  jsSdkUrl?: string
  /** 验证会话票据 */
  session?: string
  /** 风控业务名 */
  bizName?: string
  /**
   * 验证类型。快手的 `1` 是滑动拼图，过验证后回填时作 `identity-verification-type` 头；
   * 小红书的取值来自 `verifytype` 响应头（实测给过 `301`）；抖音放验证参数里的
   * `subtype`（实测给过 `slide` / `text`）。
   * 平台自己的取值，amagi 不翻译 —— 包括平台给出自家 SDK 枚举里都没有的值。
   */
  type?: string | number
  /**
   * 验证配置接口地址，自建验证页时要它。
   *
   * 快手给它是因为它 H5 那一面返回的地址**就是这个配置接口**
   * （`…/rest/zt/captcha/sliding/config`，浏览器打开只有 JSON），所以 `url` 是
   * 平台的 redirect 页拼出来的、配置接口另放这里，两者都不丢。
   * 小红书给的是 `…/api/redcaptcha/v2/getconfig`（验证页自己也打它取配置）。
   */
  configUrl?: string
  /**
   * 平台命中的业务码。
   *
   * 小红书放的是 HTTP 状态（`461` / `471`）—— 它撞验证码时响应体的 `code` 是 0，
   * 真正的判据就是状态码本身。抖音放验证参数里的 `code`（实测 `10000`），
   * HTTP 状态是 200、没有信息。
   */
  result?: string | number
  /**
   * 完整的验证配置对象（平台侧的 `verify_data` 等），**自建验证页时原样交给前端
   * SDK 的 render 调用**，不必自己拼。
   *
   * 存在的理由是「有的平台只给 `url` / `session` 凑不出一张能用的验证页」：抖音滑块
   * 中间页要自建一张，形态就是照页面原样 `TTGCaptcha.init(options)` 之后
   * `TTGCaptcha.render({ verify_data })` —— 整个对象必须交出去，拆不开。
   *
   * 此前这里写的理由是「中间页实测 `verify_data.aid` 是 0，托管验证页靠 aid 取题，
   * 拿 0 大概取不出来」。那个推断**被实测否掉了**：2026-10-11 把 fixture 过一遍抖音的
   * 提取器，拿到的托管验证页地址在真浏览器里渲染出了真实滑块（`captcha/get` 回 200，
   * 拼图背景图与缺口图都出来了）—— `aid=0` 不妨碍取题（n=1，**无负向对照**：没试过
   * 改坏 `detail` 或换 `aid` 看会不会被拒，所以不能据此说 aid 完全不参与）。
   * 准确说法见 `platforms/douyin/anticrawler/captcha.ts` 与 `platforms/douyin/captcha.ts`。
   */
  verifyData?: Record<string, unknown>
}

/**
 * 从原始响应里取风控挑战的平台钩子。
 *
 * 每平台最多一份，装在 `client/runtime.ts` 的 `PLATFORM_RUNTIME` 上，与
 * `signers` / `judge` 同一处。只在 judge 判出 `kind: 'risk'` 时被调用；
 * 认不出来就返回 `undefined`（宁可不给，也不把来路不明的 URL 当验证页交出去）。
 *
 * `http` 与 {@link Judge} 的第二参数同构、同样可选，理由也一样：**有的平台把验证
 * 信息放在响应头上而不是响应体里**。小红书就是这样 —— 撞验证码时 HTTP 是它自有的
 * 461（`antiSpider`）、响应体却是 `{"code":0,"success":true}`，票据与类型只在
 * `verifyuuid` / `verifytype` 两个响应头里（判据见
 * `platforms/xiaohongshu/captcha.ts`）。抖音同理，验证参数只在验证头里
 * （`platforms/douyin/captcha.ts`）。只读 body 的提取器在这种平台上必然空手而归。
 * 快手那份只看 body，不接第二参数也照样装得上。
 */
export type ChallengeExtractor = (raw: unknown, http?: { status: number; headers?: JudgeHeaders }) => RiskChallenge | undefined

/**
 * 反爬挑战的**自动解算**钩子（可选，只有「纯算法可解」的挑战才装）。
 *
 * 与 {@link ChallengeExtractor}（只中转、交给真人）互补，分界线是**有没有人机判定**：
 *
 * - 有些挑战是纯粹的工作量证明 —— 抖音 WAF 的 `_wafchallengeid` 要求算出一个
 *   sha256 碰撞数，没有图形、没有轨迹，真人撞上也是 JS 自己算完 reload。这类在
 *   管线内解掉、免打扰，装这个钩子。
 * - 真人滑块（抖音 TTGCaptcha）**永远不在这里解** —— 实现必须对那种形态返回
 *   `undefined`，让它走 `error.challenge` 转出去。自动重试滑块毫无意义，还会放大风控。
 *
 * 返回**合并好的完整 cookie 串**（以 `identity.cookie` 为底叠加解出的段），管线据此
 * 更新 `ctx.cookie` 并**立即重放**同一请求；解不了、或这一形态不该自动解，返回
 * `undefined`（管线照原样把失败信封交出去，不吞错）。重放有明确上限，见
 * `runtime/execute.ts` 的 `SOLVE_ROUNDS`。
 *
 * `http` 与 {@link Judge} / {@link ChallengeExtractor} 的第二参同构；`identity` 是
 * 本次请求的执行期身份。参数一律用最小结构性类型 —— 本文件是零依赖叶子层。
 */
export type ChallengeSolver = (
  raw: unknown,
  http: { status: number; headers?: JudgeHeaders },
  identity: { cookie: string; userAgent: string }
) => string | undefined

/**
 * 判定的公共前置之一：响应体根本不是一份 JSON 响应。
 *
 * 四个平台的 judge 原先都有一句「非对象一律判成功，交给 normalize」——
 * 本意只是放过 `null`，实际放过了**一切非对象 body**，而 WAF / 反爬页恰好
 * 就是这个形状（纯文本或 HTML）。抖音的
 * `"Blocked by ArgusSecurityPlugin Uifid Not Found"` 因此带着 HTTP 403
 * 被判成成功，`data` 是那句话，调用方读 `data.aweme_detail` 才炸，
 * 报错点离原因隔着好几层。
 *
 * 归为 `risk` / `ANTIBOT_PAGE` 而不是 `parse` / `DECODE_FAILED`：这类响应
 * 几乎总是风控拦截而非协议变更，处置方式是换凭证或过验证，不是改代码。
 * 原文由 `execute` 放进 `error.raw`（`debug: true` 时）。
 *
 * **空字符串不在此列**，它各平台含义不同（抖音 / B站是 cookie 失效），
 * 留给平台自己判。
 *
 * **调用方声明 `responseType: 'text'` 时这一条不发表意见。** 判据的全部依据是「端点
 * 打的是 JSON 接口，一张 HTML 回来必然是出了事」—— 那个前提对 `client.<平台>.request`
 * 打 HTML 页面的用法不成立，而此前没有任何开关能让它闭嘴，于是 `request` 结构上拿不回
 * HTML。平台自己的挑战页判据排在本函数**之前**（抖音：`anticrawlerVerdict` 认滑块 /
 * VMP / WAF，`douyinSignatureRefusal` 认 Argus），所以豁免只落在「平台一条都没认出来」
 * 的字符串上。
 *
 * 代价如实记账：小红书 / 快手 / B站**没有** HTML 挑战页锚点判据，text 模式下它们的
 * WAF 页会被当成成功交出去。这是调用方显式声明 text 时接受的取舍，已写进
 * `usage/advanced/custom-request.mdx` 的「已知边界」。
 * @param raw - decode 之后的响应体
 * @param responseType - 调用方声明的期望响应形态（`RequestSpec.responseType`），不传等于 `'json'`
 * @returns 判定结论；`undefined` 表示这一条没有意见
 */
export const verdictFromNonJsonBody = (raw: unknown, responseType?: 'json' | 'text' | 'arraybuffer'): JudgeVerdict | undefined => {
  if (responseType === 'text') return undefined
  if (typeof raw === 'string' && raw.trim() !== '') {
    return { ok: false, kind: 'risk', code: 'ANTIBOT_PAGE', retryable: true }
  }
  return undefined
}

/**
 * 判定的公共前置之二：HTTP 状态码本身就说明失败了。
 *
 * 平台 judge 可用此函数处理未识别的业务响应；execute 也用它拦住
 * 「judge 判成功但 HTTP 非 2xx」的情况。已分类的业务失败优先，不会被覆盖。
 * @param status - 真实 HTTP 状态
 * @returns 判定结论；2xx 返回 `undefined`（没有意见）
 */
export const verdictFromHttpStatus = (status: number): JudgeVerdict | undefined => {
  if (status >= 200 && status < 300) return undefined

  // 401：接口明确要求登录态
  if (status === 401) return { ok: false, kind: 'auth', code: 'LOGIN_REQUIRED', retryable: false }
  // 403：四个平台都用它做 WAF 拦截。「这份内容你看不到」走的是 HTTP 200 +
  // 业务码那条路，不会到这里 —— 所以这里判 risk 而不是 forbidden
  if (status === 403) return { ok: false, kind: 'risk', code: 'RISK_CONTROL', retryable: true }
  if (status === 404) return { ok: false, kind: 'not_found', code: 'NOT_FOUND', retryable: false }
  if (status === 408) return { ok: false, kind: 'timeout', code: 'TIMEOUT', retryable: true }
  if (status === 429) return { ok: false, kind: 'rate_limit', code: 'RATE_LIMITED', retryable: true }
  if (status >= 500) return { ok: false, kind: 'unavailable', code: 'PLATFORM_UNAVAILABLE', retryable: true }

  return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR', retryable: false }
}
