/**
 * 抖音签名算法与**签名验证工具**。
 *
 * 这个入口是给「确认签名实现还是对的」这件事用的，不是给日常取数用的
 * ——日常取数走 `@ikenxuan/amagi`，签名由 runtime 自动挂上。
 *
 * ## 为什么需要它存在
 *
 * 抖音对签名是**抽样校验**的：签名用错了常量（比如盐值过期），请求大部分时候照样
 * 成功，只是被判高风险的概率上升。于是「请求成功」证明不了任何事，而自证型的测试
 * （自生成快照、和被测量对象比自身）结构上**不可能**发现常量过期——amagi 的数据接口
 * 就带着一个 2024 年的旧盐值活了两年。
 *
 * 唯一的出路是拿外部锚点：一份真实浏览器产出的签名。这个入口提供的就是拆解它的能力，
 * 见 {@link decodeABogus} 与 {@link diagnoseSalt}。
 *
 * ## 全是纯函数
 *
 * 整条依赖链（`sm3` → `a_bogus` → `decode` / `tokens`）不引用任何 Node 内置模块，
 * 只用 `TextEncoder` / `TextDecoder` / `URL` / `Math.random`，所以浏览器里能直接跑
 * ——文档站那个可交互页面用的就是这份代码，与实现共用同一份，不会漂移。
 * 全程不碰网络、不消耗身份、不需要 cookie。
 *
 * ## 用法
 *
 * ```ts
 * import { decodeUrl, diagnoseSalt } from '@ikenxuan/amagi/signing'
 *
 * // 从一条已签名的 URL 里把签名读回明文
 * const [decoded] = decodeUrl(signedUrl, { userAgent })
 * console.log(decoded.fields)  // aid / page_id / 时钟 / 屏幕几何 …
 *
 * // 或者：反推这份签名用的是哪个盐值
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
  genFalseMsToken,
  genSVWebId,
  genVerifyFp,
  MS_TOKEN_ALPHABET,
  msTokenPayload,
  toBase36,
  TTWID_REGISTER_URL,
  VERIFY_FP_ALPHABET,
  VERIFY_FP_LENGTH,
  type MsTokenSpec,
  type TtwidSpec,
  type VerifyFpOptions
} from '../platforms/douyin/sign/tokens'
