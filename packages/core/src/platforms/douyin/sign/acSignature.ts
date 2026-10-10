/**
 * `__ac_signature` 纯算实现 —— 抖音首页风控 Cookie 的离线签名
 *
 * 站点把这套算法藏在挑战页内联的 `byted_acrawler` 里，整块是 JSVMP 虚拟化字节码
 * （`glb._$jsvmprt`，约 71KB，一条 60KB 的十六进制串当指令流）。本文件把算法本身
 * 搬出来，于是签名不再需要挑战页、不需要 `node:vm`，浏览器里也能算。
 *
 * 全仓两个消费方都已换成它：{@link ../mint.ts}（访客 cookie 铸造）与
 * {@link ../anticrawler/solver.ts}（管线内自动解 VMP 挑战）。**本仓不再有 vm 回落** ——
 * 算不出就按失败交出去，不会再去执行服务端下发的代码。
 *
 * ## 算法是怎么拿到的
 *
 * 不是对输出做差分拟合，而是给解释器的取指点插桩：`_$jsvmprt` 的两个 dispatch 循环
 * 都形如「取操作码 j → `x = 13*j % 241` → 三级嵌套分支」，在取到 j 之后插一个 hook
 * 就能读到每条字节码执行前的栈顶两个值，下一次 hook 触发时从同一个栈数组读回结果。
 * 操作码的语义不靠读混淆代码，而是用 `(a, b, result)` 反推运算符、多次观测求交集，
 * 自带校验。一次 `sign()` 只有 7779 条字节码、838 条数值二元运算，全程可读。
 *
 * 读出来的结构比预期简单得多：**整个签名只用一个哈希 —— sdbm/65599**，以两种步进
 * 形态出现。
 *
 * ## 五段哈希
 *
 * | 段 | 输入 | 步进 | 段末 |
 * |---|---|---|---|
 * | A | 整秒时间戳 + href 载荷 | xor | `% 65521` → 推出 D1 |
 * | B | `MID` 的十进制串 | xor | 不取模，当 C/D 的种子 |
 * | C | UA | xor | `% 65521` → 高 16 位 |
 * | D | nonce | xor | `% 65521` → 低 16 位 |
 * | E | 签名前 45 字符 | add | 低字节转十六进制当校验位 |
 *
 * 两种步进的差别只在吸收字符的方式：xor 族是 `h = ((h*65599)>>>0) ^ c`，add 族是
 * `h = (h*65599 + c)>>>0`（只有校验段 E 用）。xor 族每段的种子是「上一段结果异或
 * 本段首字符」，**循环结束后还要再乘一次 65599**，所以 n 字符的段正好 n 次乘法。
 *
 * 以 111 字符 UA、21 字符 nonce、10 位秒、默认 href 为例，一次 `sign()` 共 217 次乘法：
 * xor 族 171 次（A 25 = 10 位秒 + `'www.douyin.com/'` 15，B 14 = `MID` 恒为 14 位十进制，
 * C 111，D 21），add 族 45 次（E），再加 1 次 `×65521`（由 D1 推 digest）。插桩计数
 * 与此逐项相符（216 次乘数 65599 + 1 次 65521）。
 *
 * ## 65599 与 65521
 *
 * `65599 = 2^16 + 2^6 - 1`，可以用移位合成，所以它不在字节码的常量池里。段末那个
 * `% 65521` 用的是 Adler-32 的素数。两者相差 78 —— 这解释了一个曾经很迷的现象：
 * 单字符差分过一次乘法再取模 65521，等价于乘 78，符号来自回绕。所以 UA 段和 nonce
 * 段的末字符权重总是 `±78·2^i`，而它们**是同一个函数**作用在两个不同字符串上，
 * 只是结果一个左移 16 位、一个留在低 16 位。
 *
 * ## 时钟
 *
 * 站点读的是 `new Date()`，不是 `Date.now()`（两者错开 5 秒时本体跟随前者）。整秒是
 * `(new Date(ms).getTime() / 1000) >>> 0`，于是全域都有确定结果、不抛错：
 * - 超出 Date 合法范围（±8.64e15）或 NaN / ±Infinity → Invalid Date → `NaN >>> 0 = 0`
 * - 负毫秒向零截断：-1 与 -999 落在 0 秒，-1000 才是 -1 秒（再回绕成 4294967295）
 * - 秒数 ≥ 2^32（2106 年后）按 uint32 回绕
 *
 * 同一秒内同一组输入结果一致、跨秒就变，没有别的随机量。时钟是入参（`atMs`），
 * 测试里可以钉死。
 *
 * ## 版本档案
 *
 * 签名里有三个值对 UA、nonce、时间、href 全都不敏感，收在 {@link AcSignatureProfile}。
 * 它们**不是** `init({aid, dfp})` 的配置：aid 取 1 / 1128 / 2906 / 6383 / 99999999 /
 * 2^32−1、dfp 取 0 / false 时本体输出全部等于纯算；aid 为 0 或不传时本体抛错；dfp
 * 为真时 shim 里抛 TypeError（{@link ../mint.ts} 固定 `dfp: 0`，走不到）。插桩追到的
 * 来源分两类：
 *
 * 1. 指令流里的字面量。字符串池按头部推出的密钥逐字符异或存放，所以在本体里搜不到
 *    明文。`header` 由 `'_'` + `'02'` + pushVersion `'B4Z6wo'` + 下面的检测串 `'00f'` +
 *    `'01'` 拼成；`hiWord = parseInt('10' + '00000011' + '0000', 2)`；feVersion = 2。
 * 2. 签名时现算的环境检测位。`fieldMask = (2177 << 8) | (feVersion << 4)`，2177 是 12 项
 *    检测（directSign / consistent / location / switch / dom / debugger / node /
 *    phantom / webdriver / incognito / hook / test）的位图，shim 下置位的是 directSign、
 *    dom、test；`header` 里的 `'00f'` 是另外 4 项检测按位或成 15 再转 32 进制补零。
 *
 * 所以已知档案只对「这一版本体 + mint.ts 那套 shim」成立。dom 位检查的是 `this`
 * 像不像真 Window（首项是 `Object.prototype.toString.call(this)`，后面还有几项，单补
 * `Symbol.toStringTag` 翻不动它），真浏览器里大概率不同 —— 没验证过；Gate 2 实测的是
 * 服务端接受 shim 这组值。改 shim 的 webdriver / plugins / screen / 各全局构造器等 21 种
 * 变体都不影响输出。
 *
 * 本体本身是稳定的：测试 fixture 与 09-26 的抓包逐字节相同，本体 sha256 前 16 位
 * `76bee010ec645500`；指令流在本体偏移 9871、长 60358，sha256 前 16 位
 * `7998bb76f4b0eb8e`。但 fixture 自 `cd0c7836`（10-05）起冻在 git 里，oracle 测试跑的
 * 是冻结副本 —— 线上换版后测试照绿，纯算会静默算错。
 *
 * ## 换版怎么办：没有 vm 回落，只有「失败」
 *
 * 两个消费方都**不再解析挑战页**，所以运行时根本拿不到本体、也就无从比对指纹 ——
 * {@link resolveAcSignatureProfile} 留给**手上确实有本体的调用方**（离线核对、换版排查），
 * 不在铸造/解算链路上。换版的实际表现是服务端不认签名：{@link ../mint.ts} 收不到
 * `ttwid` / `UIFID_TEMP`，{@link ../anticrawler/solver.ts} 重放后仍被挡，两者都按失败
 * 交出去（mint 另有 ttwid 轻量回落）。那个判据**分不清「换版」与「其他拒绝」**，
 * 见 mint.ts 的说明。
 */

/** 哈希乘子。`2^16 + 2^6 - 1`，sdbm 的经典乘子 */
const MULTIPLIER = 65599

/** 段末取模用的素数（Adler-32 那个）。与 {@link MULTIPLIER} 相差 78 */
const MODULUS = 65521

/**
 * 输出字符集。与 `encryptSecDid` 那套同源 —— 标准 base64 的末两位 `+/` 换成 `-.`，
 * 直接从字节码的字符串常量池里读出来的。
 */
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.'

/** 默认签名地址。与 {@link ../mint.ts} 的 shim 对齐 */
const DEFAULT_HREF = 'https://www.douyin.com/'

/** 一版本体对应的三个输入无关值，来源见文件头「版本档案」 */
export interface AcSignatureProfile {
  /**
   * 签名的前 14 字符。不参与输入相关的计算，但**参与校验位**（校验段 E 哈希的是
   * 前 45 字符，含这 14 个）
   */
  readonly header: string
  /** 与 D1 拼成 46 位 `MID` 的高位字 */
  readonly hiWord: number
  /** D1 在打包前要异或掉的掩码：环境检测位图 `<< 8`，feVersion `<< 4` */
  readonly fieldMask: number
}

/** 本体指纹：长度 + {@link fingerprintAcrawler} 的 32 位哈希 */
export interface AcrawlerFingerprint {
  readonly length: number
  readonly hash: number
}

/** 当前已知的一版：本体 sha256 前 16 位 `76bee010ec645500`，mint.ts shim 环境 */
export const KNOWN_AC_SIGNATURE_PROFILE: AcSignatureProfile = Object.freeze({
  header: '_02B4Z6wo00f01',
  hiWord: 8240,
  fieldMask: 0x88120
})

/** {@link KNOWN_AC_SIGNATURE_PROFILE} 对应的本体指纹 */
export const KNOWN_ACRAWLER_FINGERPRINT: AcrawlerFingerprint = Object.freeze({
  length: 71725,
  hash: 0xe9ca4070
})

/**
 * add 族 sdbm：`h = (h*65599 + c)>>>0`。校验段 E 与本体指纹共用。
 *
 * 65599 是奇数，模 2^32 可逆，所以任意单个字符改动必然改变结果。
 * @param str - 被哈希的字符串
 * @returns 32 位无符号哈希
 */
const hashAdd = (str: string): number => {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (((h * MULTIPLIER) >>> 0) + str.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * 算 acrawler 本体的指纹。
 * @param acrawlerSource - 挑战页里最大的内联 `<script>` 块（与 {@link ../mint.ts} 同一判据），原样不 trim
 * @returns 长度与 32 位哈希
 */
export const fingerprintAcrawler = (acrawlerSource: string): AcrawlerFingerprint => ({
  length: acrawlerSource.length,
  hash: hashAdd(acrawlerSource)
})

/**
 * 认出本体版本，给出对应的 {@link AcSignatureProfile}。
 *
 * 走指纹而不是从指令流静态解常量：`fieldMask` 的高位和 `header` 里的 `'00f'` 是签名时
 * 现算的环境检测结果，指令流里没有，要拿到只能把那些检测重跑一遍；能静态读的只有池
 * 字面量，而定位它们要按本版的 opcode 编号匹配指令模式 —— 换版后失配还好，误配会
 * 静默给出错值。指纹只有「认得 / 不认得」两种结果，不会猜错。
 *
 * **不在铸造/解算链路上**：那两条路都不解析挑战页，运行时拿不到本体。这个函数是给
 * 「手上确实有本体」的场合用的（离线核对、换版排查），`undefined` 的意思是「这份本体
 * 不是已知那版，{@link KNOWN_AC_SIGNATURE_PROFILE} 对它不成立」—— 不蕴含任何回落建议。
 * @param acrawlerSource - 挑战页里最大的内联 `<script>` 块，原样不 trim
 * @returns 认得返回已知档案，否则 `undefined`
 */
export const resolveAcSignatureProfile = (acrawlerSource: string): AcSignatureProfile | undefined => {
  if (acrawlerSource.length !== KNOWN_ACRAWLER_FINGERPRINT.length) return undefined
  return hashAdd(acrawlerSource) === KNOWN_ACRAWLER_FINGERPRINT.hash ? KNOWN_AC_SIGNATURE_PROFILE : undefined
}

/**
 * xor 族 sdbm：种子异或首字符，逐字符 `h = ((h*65599)>>>0) ^ c`，循环后再乘一次。
 *
 * 空串会让 `charCodeAt(0)` 给出 `NaN`，调用方必须保证非空 —— 入口已挡。
 * @param str - 被哈希的字符串，非空
 * @param seed - 上一段的结果，首段传 0
 * @returns 32 位无符号哈希
 */
const hashXor = (str: string, seed: number): number => {
  let h = (seed ^ str.charCodeAt(0)) >>> 0
  for (let i = 1; i < str.length; i++) {
    h = (((h * MULTIPLIER) >>> 0) ^ str.charCodeAt(i)) >>> 0
  }
  return (h * MULTIPLIER) >>> 0
}

/**
 * 把一个 32 位字的高 30 位切成 5 个 6 位组输出，最高 2 位被丢弃。
 *
 * 移位一律用**带符号**右移 —— 字节码里就是 `>>`，负数的符号位会扩散进 6 位组，
 * 换成 `>>>` 会在 D1 的高位为 1 时算错。
 * @param word - 待编码的 32 位字
 * @returns 5 个字符
 */
const emit30 = (word: number): string =>
  CHARSET[(word >> 24) & 63] + CHARSET[(word >> 18) & 63] + CHARSET[(word >> 12) & 63] + CHARSET[(word >> 6) & 63] + CHARSET[word & 63]

/** {@link computeAcSignature} 的可选项 */
export interface AcSignatureOptions {
  /**
   * 签名地址。函数自己剥掉协议头（`href.substring(protocol.length + 2)`），
   * 剩下的部分**连尾斜杠一起**进哈希 —— `'https://www.douyin.com/'` 的载荷是
   * `'www.douyin.com/'`，少一个斜杠签名就不同。
   */
  href?: string
  /** 本体版本档案，默认 {@link KNOWN_AC_SIGNATURE_PROFILE}。用 {@link resolveAcSignatureProfile} 取 */
  profile?: AcSignatureProfile
}

/**
 * 算出 `__ac_signature`。
 *
 * 与挑战页里 `byted_acrawler.sign('', nonce)` 逐字节一致，对照的是同一份挑战页在 `vm`
 * 里的真值。仓库外的一次性比对共 4206 组全部逐位相同：主集 8 种 UA × 9 档 nonce 长度
 * × 54 个时刻 = 3888，href 变体 6 × 3 × 3 = 54，时钟定义域 11 个时刻 × 8 × 3 = 264
 * （含 0、±8.64e15 与界外各 1、-1 / -999 / -1000、NaN、±Infinity）。
 *
 * nonce 长度不是硬约束：1 到 48 字符都比对过，签名结构不变。但**不能是空串** ——
 * 空 nonce 会让站点那份实现改去哈希一个内部兜底串（乘数 65599 的乘法从 216 次变成
 * 221 次），那条路不是真实调用形态，这里直接拒绝而不是去复刻。
 * @param nonce - 服务端在首次 GET 时下发的 `__ac_nonce`，非空
 * @param userAgent - 参与签名的 UA，必须与后续请求一致
 * @param atMs - 毫秒时间戳，只有整秒部分进签名，任意数值都有定义（见文件头「时钟」）。默认 `Date.now()`
 * @param options - 见 {@link AcSignatureOptions}
 * @returns 47 字符的签名
 * @throws 当 `nonce` 或 `userAgent` 为空
 */
export const computeAcSignature = (
  nonce: string,
  userAgent: string,
  atMs: number = Date.now(),
  options: AcSignatureOptions = {}
): string => {
  if (nonce.length === 0) throw new Error('__ac_signature: nonce 不能为空')
  if (userAgent.length === 0) throw new Error('__ac_signature: userAgent 不能为空')

  const href = options.href ?? DEFAULT_HREF
  const schemeEnd = href.indexOf('://')
  const payload = schemeEnd >= 0 ? href.substring(schemeEnd + 3) : href
  const { header, hiWord, fieldMask } = options.profile ?? KNOWN_AC_SIGNATURE_PROFILE

  // 段 A：整秒时间戳拼上 href 载荷，哈希后取模，再乘回去与时间戳异或。
  // `new Date()` 做 TimeClip（界外 → NaN、向零截断），`>>> 0` 做 uint32。无符号是实测
  // 钉死的：`sec = 4294967296` 时被哈希的是 `'0' + 载荷`（段 A 16 次乘法而非 25 次），
  // `sec = 2147483648` 时吸收的是 `'147483648'` 而不是带符号的 `'2147483648'`。
  const seconds = (new Date(atMs).getTime() / 1000) >>> 0
  const clockField = hashXor(String(seconds) + payload, 0) % MODULUS
  const digest = ((clockField * MODULUS) ^ seconds) >>> 0

  // 段 B：高位字与 digest 拼成一个 46 位整数，转十进制串再哈希，结果当 C/D 的种子
  const mid = hiWord * 4294967296 + digest
  const seed = hashXor(String(mid), 0)

  // 段 C / 段 D：同一个函数作用在 UA 和 nonce 上，拼成一个 32 位字
  const uaField = hashXor(userAgent, seed) % MODULUS
  const nonceField = hashXor(nonce, seed) % MODULUS
  const packed = ((uaField << 16) + nonceField) | 0

  const signed = digest | 0
  const masked = (signed ^ fieldMask) | 0
  const inverted = ~signed

  // 打包：6 个 30 位字各出 5 字符 + 1 个零散字符，拼出 31 字符的正文
  const body =
    emit30(signed >> 2) +
    emit30(((digest & 15) << 28) | (hiWord >>> 4)) +
    emit30((hiWord << 26) | (inverted >>> 6)) +
    CHARSET[inverted & 63] +
    emit30(packed >> 2) +
    emit30(((packed & 15) << 28) | (masked >>> 4)) +
    emit30(clockField)

  // 段 E：add 族 sdbm 过前 45 字符，低字节转两位十六进制
  const head = header + body
  return head + (hashAdd(head) & 0xff).toString(16).padStart(2, '0')
}
