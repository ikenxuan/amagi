/**
 * 抖音访客 token 的纯算部分（TypeScript 移植）
 *
 * 移植自 Douyin_TikTok_Download_API `src/dtk/signing/native/tokens.py`，只取不触网的那几条：
 * 假 `msToken`、`verify_fp` / `s_v_web_id`，以及 ttwid 注册要用的常量。
 * `gen_real_ms_token` / `gen_ttwid` / `gen_odin_tt` 各要发一次 HTTP，不在这里。
 *
 * ## 随机与时钟为什么都是参数
 *
 * 原实现把 `Math.random()` / `Date.now()` 烧在函数体里，输出没法在测试里钉死。
 * 这里统一改成可注入：随机源是 `() => number`（契约同 `Math.random`，返回 `[0, 1)`），
 * 时钟是显式毫秒时间戳，默认值才是 `Math.random` / `Date.now`。
 *
 * **注意：注入的是「每次一个 `[0, 1)` 均匀数」的契约，不是 seed。** Python 的
 * `Random.choice` 走 `_randbelow`（getrandbits + 拒绝采样），和 `random()` 不是同一串数，
 * 所以同一个 seed 喂两边对不上；能对上的是「同一串均匀数喂进去，输出逐字节相同」。
 *
 * @module platforms/douyin/sign/tokens
 */

/** 注入式随机源：每次调用返回一个 `[0, 1)` 均匀数，契约同 `Math.random` */
export type Rng = () => number

/**
 * 假 msToken 的字符表，逐字符照抄 V4 的 `gen_random_str`。
 *
 * A-Z + a-z + 0-9 + `+-` 正好 64 个，拼出来就是标准 base64 的形状 ——
 * 假的 msToken 唯一要像真的地方就是形状。抄错表就毁在这上面：
 * 一个永远不含 `j`、中间还夹着 `=` 的 token，形状不对。
 */
export const MS_TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-'

/** 抖音假 msToken 的长度（`==` 后缀之前那一段） */
export const DOUYIN_MS_TOKEN_LENGTH = 126

/** 真 msToken 回包的长度，不在其中说明接口变了形，值不该信 */
export const DOUYIN_MS_TOKEN_SIZES: readonly number[] = [120, 128]

/* 原实现还有 TikTok 用的 146（`TIKTOK_MS_TOKEN_LENGTH`）与 `TIKTOK_ODIN_TT_URL`，
   amagi 没有 TikTok 平台，略去不移植 */

/** {@link genFalseMsToken} 的注入点 */
export interface FalseMsTokenOptions {
  /** 随机源，默认 `Math.random` */
  rng?: Rng
  /** 尾部填充，默认 `==`（真 msToken 靠它凑出 base64 的收尾） */
  suffix?: string
}

/**
 * 本地生成的假 msToken。
 *
 * 平台对一部分端点认它、另一部分不认。原实现把它当作真接口失败时的兜底，
 * 调用方应当知道拿到的是哪一个（原实现只返回 token，降级和健康长得一模一样）。
 *
 * @param length - `==` 之前的长度，默认 {@link DOUYIN_MS_TOKEN_LENGTH}
 * @param options - `rng` / `suffix` 注入点
 * @returns `length` 个字符表内字符 + `suffix`
 */
export const genFalseMsToken = (length = DOUYIN_MS_TOKEN_LENGTH, options: FalseMsTokenOptions = {}): string => {
  const { rng = Math.random, suffix = '==' } = options
  let token = ''
  for (let index = 0; index < length; index++) {
    token += MS_TOKEN_ALPHABET[Math.trunc(rng() * MS_TOKEN_ALPHABET.length)]
  }
  return token + suffix
}

/** `verify_fp` / `s_v_web_id` 随机半段用的字符表（62 个：数字 + 大小写字母） */
export const VERIFY_FP_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** 36 位尾巴里下划线所在的下标，构成 UUID 的 8-4-4-4-12 分段 */
export const VERIFY_FP_SEPARATORS: readonly number[] = [8, 13, 18, 23]

/** 版本位下标，值恒为 `4` */
export const VERIFY_FP_VERSION_INDEX = 14

/** 变体位下标，值被压成 `10xx`（UUID v4 的变体规定） */
export const VERIFY_FP_VARIANT_INDEX = 19

/** 尾巴总长度 */
export const VERIFY_FP_LENGTH = 36

/**
 * 36 进制转换（照抄 Python 的 `_to_base36`，不用 `Number#toString(36)`）。
 *
 * 两者对非负整数结果一致，但 Python 那版对 `<= 0` 返回 `"0"` 而不是 `"-..."` ——
 * 自实现是把这条边界一起搬过来，省得以后有人换个入参就踩到差异。
 *
 * @param value - 非负整数
 * @returns 36 进制小写字符串
 */
export const toBase36 = (value: number): string => {
  if (value <= 0) return '0'
  let rest = Math.trunc(value)
  let digits = ''
  while (rest > 0) {
    const remainder = rest % 36
    digits = (remainder < 10 ? String(remainder) : String.fromCharCode(97 + remainder - 10)) + digits
    rest = Math.trunc(rest / 36)
  }
  return digits
}

/** {@link genVerifyFp} / {@link genSVWebId} 的注入点 */
export interface VerifyFpOptions {
  /** 毫秒时间戳，默认 `Date.now()` */
  nowMs?: number
  /** 随机源，默认 `Math.random` */
  rng?: Rng
}

/**
 * 生成一个 `verify_fp`。
 *
 * 形状：`verify_<毫秒时间戳的 36 进制>_<36 位 UUID v4 骨架>` —— 尾巴的下划线在
 * 8/13/18/23，下标 14 恒为 `4`，下标 19 是变体位。
 *
 * 随机数只在**非固定位**上消耗：四个下划线和版本位那 5 个下标跳过不抽签，
 * 所以一条尾巴正好抽 31 次，抽签顺序按下标升序 —— 与 Python 逐次对齐，
 * 注入同一串均匀数才能得到同一串字符。
 *
 * @param options - `nowMs` / `rng` 注入点
 * @returns 可直接当作 `verifyFp` / `s_v_web_id` cookie 的值
 */
export const genVerifyFp = (options: VerifyFpOptions = {}): string => {
  const { nowMs = Date.now(), rng = Math.random } = options
  const alphabetSize = VERIFY_FP_ALPHABET.length

  const tail: string[] = new Array<string>(VERIFY_FP_LENGTH).fill('')
  for (const index of VERIFY_FP_SEPARATORS) tail[index] = '_'
  tail[VERIFY_FP_VERSION_INDEX] = '4'

  for (let index = 0; index < VERIFY_FP_LENGTH; index++) {
    if (tail[index]) continue
    const position = Math.trunc(rng() * alphabetSize)
    /* 变体位取 2 bit 再置高位：`(3 & position) | 8` 落在 8..11，即 UUID 的 `10xx` */
    tail[index] = VERIFY_FP_ALPHABET[index === VERIFY_FP_VARIANT_INDEX ? (3 & position) | 8 : position]
  }

  return `verify_${toBase36(nowMs)}_${tail.join('')}`
}

/**
 * `s_v_web_id` 与 `verify_fp` 同形状、同算法，只是 cookie 名不同。
 *
 * @param options - `nowMs` / `rng` 注入点
 * @returns 与 {@link genVerifyFp} 同构的值
 */
export const genSVWebId = (options: VerifyFpOptions = {}): string => genVerifyFp(options)

/**
 * 换真 msToken 的上报接口要的全部输入。
 *
 * `strData` 是平台 SDK 产出的不透明串 —— 不是凭证，但随 SDK 版本变，
 * 所以它属于调用方的配置，不写死在这里。
 */
export interface MsTokenSpec {
  url: string
  magic: number
  version: number
  dataType: number
  strData: string
  userAgent: string
}

/**
 * 拼上报接口的 JSON 请求体。
 *
 * 字段顺序照 Python 的 dict：magic → version → dataType → strData → tspFromClient。
 * 与 Python 唯一的差别是空白：`json.dumps` 默认带 `", "` / `": "` 分隔符，
 * `JSON.stringify` 是紧凑的；服务端按 JSON 解析，不看空白。
 *
 * @param spec - 上报接口的静态参数
 * @param timestampMs - 客户端时间戳（`tspFromClient`），默认 `Date.now()`
 * @returns 请求体字符串
 */
export const msTokenPayload = (spec: MsTokenSpec, timestampMs = Date.now()): string =>
  JSON.stringify({
    magic: spec.magic,
    version: spec.version,
    dataType: spec.dataType,
    strData: spec.strData,
    tspFromClient: timestampMs
  })

/** 注册 ttwid 的一次性 POST 要用的东西 */
export interface TtwidSpec {
  url: string
  data: string
}

/** ttwid 注册接口（两个平台同域，只有 body 不同） */
export const TTWID_REGISTER_URL = 'https://ttwid.bytedance.com/ttwid/union/register/'

/** 抖音访客 ttwid 的注册体，不含任何凭证 */
export const DOUYIN_TTWID_PAYLOAD = {
  region: 'cn',
  aid: 1768,
  needFid: false,
  service: 'www.ixigua.com',
  migrate_info: { ticket: '', source: 'node' },
  cbUrlProtocol: 'https',
  union: true
} as const

/** 抖音访客 ttwid 注册：`POST {url}`，body 用 `data` */
export const DOUYIN_TTWID: TtwidSpec = { url: TTWID_REGISTER_URL, data: JSON.stringify(DOUYIN_TTWID_PAYLOAD) }
