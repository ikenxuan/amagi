/**
 * 四个平台的签名算法与**签名验证工具**。
 *
 * 这个入口是给「确认签名实现还是对的」这件事用的，不是给日常取数用的
 * ——日常取数走 `@ikenxuan/amagi`，签名由 runtime 自动挂上。
 *
 * ## 为什么需要它存在
 *
 * 平台对签名普遍是**抽样校验**的：签名用错了常量（比如盐值过期），请求大部分时候照样
 * 成功，只是被判高风险的概率上升。于是「请求成功」证明不了任何事，而自证型的测试
 * （自生成快照、和被测量对象比自身）结构上**不可能**发现常量过期——amagi 的数据接口
 * 就带着一个 2024 年的旧盐值活了两年。
 *
 * 唯一的出路是拿外部锚点：一份真实浏览器产出的签名。这个入口提供的就是拆解它的能力，
 * 见 {@link decodeABogus} / {@link decodeXBogus} / {@link decodeKuaishouHe}。
 *
 * ## 各平台的验证强度不同，这是诚实而不是缺口
 *
 * - **抖音**：a_bogus 与 X-Bogus 可整段拆开（结构指纹 + 时钟 + 摘要链候选校验）；
 *   secsdk 是确定性 MD5，重算即比对；`verify_fp` 骨架可拆、时钟可读回。
 * - **B站**：`w_rid` 与 av/bv 互转都是纯函数，钉住输入重算即可逐字符比对。
 * - **快手**：`$HE_` 段可拆（count / 时钟 / 随机数原样读回）；HUDR 段整段是密文，
 *   底下没有明文可找。
 * - **小红书**：算法在 `@ikenxuan/xhshow-ts`（依赖 `node:crypto` / `node:zlib`），
 *   进不了浏览器，这里只有形状检查（`inspectXhsHeader`）。
 *
 * ## 浏览器里能直接跑
 *
 * 除小红书算法本体外的整条依赖链不引用任何 Node 内置模块，只用 `TextEncoder` /
 * `URL` / `Math.random` 这类环境无关原语——文档站那个可交互验证器用的就是这份代码，
 * 与实现共用同一份，不会漂移。全程不碰网络、不消耗身份、不需要 cookie。
 *
 * ## 用法
 *
 * ```ts
 * import { decodeUrl, decodeXBogus, diagnoseSalt } from '@ikenxuan/amagi/signing'
 *
 * // 从一条已签名的 URL 里把 a_bogus 读回明文
 * const [decoded] = decodeUrl(signedUrl, { userAgent })
 * console.log(decoded.fields)  // aid / page_id / 时钟 / 屏幕几何 …
 *
 * // 或者：拆一份 X-Bogus、反推 a_bogus 用的是哪个盐值
 * console.log(decodeXBogus(xBogusValue, { query, userAgent }).checks)
 * console.log(diagnoseSalt(aBogus, query).salt)  // 'dhzx'
 * ```
 */

export {
  ABogus,
  AID,
  ALPHABETS,
  buildBrowserInfo,
  browserInfoFromScreen,
  canary,
  chainBytes,
  decode,
  decodeBase64,
  DEFAULT_BROWSER_INFO,
  DIGEST_CHAINS,
  digestOf,
  digestWith,
  encodeBase64,
  FORTNIGHT_EPOCH_MS,
  FIELD_ORDER,
  HEADER_MAGIC,
  isDecodeProblem,
  jsBytes,
  PAGE_ID,
  PAYLOAD_KEY,
  rc4,
  SALT,
  SDK_VERSION,
  structureError,
  TRIPWIRE_LOCKED,
  CALL_BUCKET,
  ENV_FLAGS,
  DETECT_FLAGS,
  unmaskPair,
  userAgentDigest,
  type ABogusOptions,
  type ABogusSignOptions,
  type DecodedABogus,
  type DigestChain
} from '../platforms/douyin/sign/a_bogus'

export {
  CHECK,
  decodeABogus,
  decodeUrl,
  diagnoseSalt,
  identify,
  KIND,
  REASON,
  recoverSignedQuery,
  signedQueryOf,
  type ABogusCandidates,
  type Check,
  type Decoded,
  type Field,
  type SaltDiagnosis,
  type SignedQueryRecovery
} from '../platforms/douyin/sign/decode'

export { sm3Hash, sm3Hexdigest, sm3ToArray, SM3_IV } from '../platforms/douyin/sign/sm3'

export {
  DOUYIN_MS_TOKEN_LENGTH,
  DOUYIN_MS_TOKEN_SIZES,
  DOUYIN_TTWID,
  DOUYIN_TTWID_PAYLOAD,
  decodeVerifyFp,
  genFalseMsToken,
  genSVWebId,
  genVerifyFp,
  MS_TOKEN_ALPHABET,
  msTokenPayload,
  toBase36,
  TTWID_REGISTER_URL,
  VERIFY_FP_ALPHABET,
  VERIFY_FP_LENGTH,
  type DecodedVerifyFp,
  type MsTokenSpec,
  type TtwidSpec,
  type VerifyFpOptions,
  type VerifyFpProblem
} from '../platforms/douyin/sign/tokens'

/** X-Bogus（抖音老签名）：可签、可拆、可校验候选输入 */
export {
  CANVAS_CONSTANT,
  decodeXBogus,
  signXBogus,
  xBogusStructureError,
  default as XBogus,
  type XBogusCandidates,
  type XBogusOptions,
  type XBogusProblem,
  type XBogusResult
} from '../platforms/douyin/sign/x_bogus'

/** `x-secsdk-web-signature`（抖音主站）：确定性 MD5，重算即可比对 */
export {
  canonicalQuery as secsdkCanonicalQuery,
  extractUifidFromCookie,
  isSecsdkProtected,
  SECSDK_SIG_KEY,
  signSecsdkWebQuery,
  signSecsdkWebUrl,
  WEBSIGN_CONST,
  type SecsdkSignOptions,
  type SecsdkSignResult
} from '../platforms/douyin/sign/secsdkWebSign'

/** B站：w_rid 重算（钉死 wts）与 av ↔ bv 互转 */
export { av2bv, bv2av } from '../platforms/bilibili/sign/bv2av'
export { computeWbiSignature, extractKey as extractWbiKey, type WbiSignature } from '../platforms/bilibili/sign/wbi'

/** 快手：`$HE_` 段可拆解（count / 时钟 / 随机数原样读回），HUDR 段不拆（整段是密文） */
export {
  decodeKuaishouHe,
  deriveKuaishouHeHashFieldHex,
  deriveKuaishouHeHex,
  deriveKuaishouPureSignature,
  type DecodedKuaishouHe,
  type KuaishouHeProblem,
  type KuaishouPureSignContext
} from '../platforms/kuaishou/sign/he'

/** 小红书：只有形状检查 —— 算法在 `@ikenxuan/xhshow-ts`，那条链进不了浏览器 */
export { inspectXhsHeader, type XhsHeaderInspection } from '../platforms/xiaohongshu/sign/shape'
