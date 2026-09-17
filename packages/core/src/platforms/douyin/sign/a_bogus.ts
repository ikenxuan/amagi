/**
 * a_bogus —— 抖音 Web 加在每个数据接口上的签名。
 *
 * ## 出处
 *
 * 移植自 Douyin_TikTok_Download_API 的 `signing/native/abogus.py`（Apache-2.0，
 * 与本仓库 GPL-3.0 兼容）。那份是**自己逆向**抖音的 `bdms.js` v1.0.1.19-fix.01
 * 得到的（2026-09-09），不是抄来的片段。
 *
 * 本文件**替换**了原先那份 2024-08 从公开片段原样复制的实现。两份的差别不是
 * 代码风格，是常量：
 *
 * | | 旧实现 | 本实现 |
 * |---|---|---|
 * | 摘要盐值 | `cus` | `dhzx` |
 * | 几何串 | 17 段、写死 `1536\|747\|…` | 9 段、可传入 |
 * | 时钟 / 随机源 | 直接读 `Date.now()` / `Math.random()` | 可注入 |
 * | 能否解码自证 | 否 | 是，见 {@link decode} |
 *
 * 盐值那条是**实测结论**而非推测：拿真实浏览器（bdms 1.0.1.19-fix.01，2026-09-09
 * 捕获）产出的签名反推，三条摘要链在 `dhzx` 下全部命中，在 `cus` 下 query 与 body
 * 两条都对不上。旧盐值能让请求偶尔通过，是因为抖音**抽样校验**——签名过期不报错，
 * 只表现为被判定为高风险的概率上升，所以这个 bug 活了两年没被发现。
 *
 * ## 为什么可注入是重点
 *
 * 旧的 `export default (url, user_agent) => string` 收不下 `now_ms`、`browser_info`
 * 和随机源，于是**无法对着固定样本复现**——而没有复现能力，就没有任何测试能证伪
 * 一个常量。这正是盐值能过期两年的结构性原因。所以本文件的入口是
 * {@link ABogus} 类，`rng` / `nowMs` / `browserInfo` 全部可注入，默认值保持生产可用。
 *
 * ## 噪声不是均匀随机的
 *
 * `Math.random` 永远进不了校验和、也改不了任何可解码字段，所以同一毫秒内的两个
 * 签名大部分字节不同、含义相同。但**这不等于噪声可以随便填**：其中有三个字节不是
 * 噪声，是 SDK 对自己的环境回报（它认为自己在哪个浏览器家族里、自己的探针是否还
 * 在），任何拿到签名的人都能读回去。均匀随机写进去，落在浏览器不可能产出的取值上
 * 就是一个把柄——{@link HEADER_NOISE_BANDS} 与 {@link tripwireNoise} 就是为此存在。
 */

import { sm3ToArray } from './sm3'

/** bdms.js 携带的五张字母表中，本文件用得到的两张：`s4` 编码成品签名，`s3` 编码进入第三条摘要的 UA */
export const ALPHABETS = {
  s3: 'ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe',
  s4: 'Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe'
} as const

/** 摘要前拼在 query 与 body 后面的盐值。实测值，不是猜的——见文件头 */
export const SALT = 'dhzx'

/** header 携带的两个明文字节，是这套格式最接近魔数的东西，也是 {@link structureError} 的第一道检查 */
export const HEADER_MAGIC: readonly number[] = [3, 82]

/** `"1.0.1.19-fix.01"` 被 SDK 解析后的版本块，实测解码结果 */
export const SDK_VERSION: readonly number[] = [1, 0, 1, 0]

/** 单字节，且是全部的密钥。密文不是教科书 RC4，见 {@link rc4} */
export const PAYLOAD_KEY = 0xd3

/** `2024-07-24T16:00:00Z`，有一个字段从此刻起数「两周」 */
export const FORTNIGHT_EPOCH_MS = 1721836800000

/** 抖音 Web 自己的标识，不是我们能选的：它同时出现在签名里和 query 里，两边不一致就是最廉价的把柄 */
export const PAGE_ID = 6241
export const AID = 6383

/** 噪声层用三字节藏一个字节，两张掩码互补：`0x91 | 0x42 | 0x2C === 0xFF`，这是整个噪声层可逆的原因 */
const NOISE_MASKS: readonly number[] = [0x91, 0x42, 0x2c]
const DATA_MASKS: readonly number[] = [0x6e, 0xbd, 0xd3]

/**
 * 五十个标量字段在 body 里的排列顺序。
 *
 * 不是密码，只是一个固定置换；写成字面量而不是算出来，是因为字节码里就是这样，
 * 而且照着真实捕获核对的人希望看到和解码器打印的同一个顺序。
 */
export const FIELD_ORDER: readonly string[] = [
  'L34',
  'L44',
  'L56',
  'L61',
  'L73',
  'L29',
  'L70',
  'L45',
  'L35',
  'L49',
  'L38',
  'L66',
  'L51',
  'L68',
  'L28',
  'L48',
  'L64',
  'L47',
  'L30',
  'L71',
  'L26',
  'L55',
  'L31',
  'L69',
  'L59',
  'L40',
  'L62',
  'L63',
  'L27',
  'L72',
  'L41',
  'L74',
  'L57',
  'L52',
  'L42',
  'L39',
  'L33',
  'L67',
  'L53',
  'L43',
  'L65',
  'L46',
  'L36',
  'L24',
  'L60',
  'L32',
  'L79',
  'L80',
  'L84',
  'L85'
]

/** 三条摘要链的哨兵三元组：`[哨兵, 偏移, 兜底]`。写哨兵本身是 SDK 报告自己环境探针触发的暗号，我们永远写诚实值 */
const CANARIES: readonly (readonly number[])[] = [
  [3, 11, 12],
  [4, 8, 9],
  [5, 12, 13]
]

/** 一条摘要链：三个槽位名、两个直接写入的摘要下标、一个金丝雀三元组 */
export interface DigestChain {
  readonly slots: readonly [string, string, string]
  readonly indices: readonly [number, number]
  readonly canary: readonly [number, number, number]
}

/**
 * 三个被摘要的输入各自落在哪些标量上。
 *
 * 生成器和解码器**读同一张表**，所以解码器不可能与它所解的东西漂移。
 *
 * 每个输入三个字节就是全部的绑定，这个不对称正是重点：足够**证明**某个 query /
 * body / UA 就是这份签名封住的那一个，又远不足以把哈希倒推回去。把它们报成
 * 「query 本身」的解码器是在编造；拿候选值去校验的解码器才在说真话。
 */
export const DIGEST_CHAINS: Readonly<Record<'query' | 'body' | 'user_agent', DigestChain>> = {
  query: { slots: ['L48', 'L49', 'L51'], indices: [9, 18], canary: CANARIES[0] as [number, number, number] },
  body: { slots: ['L52', 'L53', 'L55'], indices: [10, 19], canary: CANARIES[1] as [number, number, number] },
  user_agent: { slots: ['L56', 'L57', 'L59'], indices: [11, 21], canary: CANARIES[2] as [number, number, number] }
}

/** 未被插桩的真实页面回报的环境值：六个探针加一个反机器人位集 */
export const ENV_FLAGS = 1
export const DETECT_FLAGS = 14
const NR_FLAGS = 0x21
const NR_TAG: readonly number[] = [0, 0, 0, 0]

/** `window.onwheelx._Ax` 存在且被冻结——SDK 给自己装上再冻住的状态。12 表示被人解锁、11 表示缺失，两者都是抖音能打分的特征 */
export const TRIPWIRE_LOCKED = 3

/** `fn149` 给每页签名计数器分桶。6 表示「本页签名少于 140 次」，浏览器一生中大部分时间都在这里 */
export const CALL_BUCKET = 6

/** 1080p 上的 Chrome。指纹里没有屏幕尺寸时用它——**一个可信的常量好过随机值**，随请求变的几何本身就是特征 */
export const DEFAULT_BROWSER_INFO = '1920|947|1920|1032|1920|1032|1920|1080|Win32'

/** 从屏幕高度猜可视区时要减掉的系统任务栏与浏览器自身 chrome */
const TASKBAR_PX = 48
const CHROME_PX = 85

/**
 * SDK 认为自己身处哪个浏览器家族，按 `fn143` 的口径：每个家族一条 40 宽的带。
 *
 * 这些带**盖不满 0..255**。落在缝隙里的值没有浏览器能产出；落在错误家族带里的值与
 * 旁边发出去的 User-Agent 自相矛盾——两者都是抖音免费可打的分。均匀随机有 6% 的
 * 概率落进缝隙、78% 的概率落错家族。
 */
const HEADER_NOISE_BANDS: Readonly<Record<string, number>> = {
  chrome: 0,
  firefox: 40,
  safari: 81,
  edge: 125,
  huawei: 170,
  other: 210
}

/** `fn145` 的健康位型：三个探针都在且被冻住。均匀随机有 94% 的概率报告出一个被剥离或解锁的页面 */
const TRIPWIRE_SET = 0xb2
const TRIPWIRE_FREE = 0x4d

const toByte = (value: number): number => value & 0xff

/**
 * 按九个字段拼出签名会逐字携带的 `navigator`/`screen` 串。
 *
 * 顺序不可商量：这是载荷里唯一一路以可读文本活到校验和的部分。
 * @param parts - 九个字段，顺序同 SDK 自己的对象字面量
 * @returns 以 `|` 连接的几何串
 */
export const buildBrowserInfo = (parts: {
  innerWidth: number
  innerHeight: number
  outerWidth: number
  outerHeight: number
  availWidth: number
  availHeight: number
  screenWidth: number
  screenHeight: number
  platform: string
}): string =>
  [
    parts.innerWidth,
    parts.innerHeight,
    parts.outerWidth,
    parts.outerHeight,
    parts.availWidth,
    parts.availHeight,
    parts.screenWidth,
    parts.screenHeight,
    parts.platform
  ].join('|')

/**
 * 由一个屏幕尺寸推出一组自洽的九字段几何串。
 *
 * 浏览器报的四个矩形并不独立：窗口不超过工作区，工作区是屏幕减系统栏，可视区是窗口
 * 减浏览器自身。从一个数派生能让它们互相自洽，而随机拼出来的一组不会。
 * @param width - 屏幕宽
 * @param height - 屏幕高
 * @param platform - `navigator.platform`
 * @returns 九字段几何串
 */
export const browserInfoFromScreen = (width: number, height: number, platform: string): string => {
  const availHeight = Math.max(height - TASKBAR_PX, 1)
  return buildBrowserInfo({
    innerWidth: width,
    innerHeight: Math.max(availHeight - CHROME_PX, 1),
    outerWidth: width,
    outerHeight: availHeight,
    availWidth: width,
    availHeight,
    screenWidth: width,
    screenHeight: height,
    platform
  })
}

/**
 * SDK 的 RC4 —— 但它不是 RC4。
 *
 * 两处刻意偏离，都在初始化：S 盒以**降序**恒等排列起手，密钥编排在教科书版本只做加法的
 * 地方做了乘法。密钥流生成部分没动。
 *
 * 这两处的意义比看起来大：合起来意味着拿标准 RC4 去暴力试每一个单字节密钥，对捕获到的
 * 载荷一无所获。逆向方在读懂字节码之前正是卡在这里，而这多半就是它们存在的理由。
 * @param key - 密钥字节
 * @param data - 待处理数据
 * @returns 与输入等长的结果
 */
export const rc4 = (key: readonly number[], data: readonly number[]): number[] => {
  const box = new Array<number>(256)
  for (let i = 0; i < 256; i++) box[255 - i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j * box[i] + j + key[i % key.length]) % 256
    const swap = box[i]
    box[i] = box[j]
    box[j] = swap
  }

  const out = new Array<number>(data.length)
  let i = 0
  j = 0
  for (let index = 0; index < data.length; index++) {
    i = (i + 1) % 256
    j = (j + box[i]) % 256
    const swap = box[i]
    box[i] = box[j]
    box[j] = swap
    out[index] = data[index] ^ box[(box[i] + box[j]) % 256]
  }
  return out
}

/**
 * 按 SDK 的字母表做 base64，补位是字面量 `=`。
 * @param data - 待编码字节
 * @param alphabet - `s3` 或 `s4`
 * @returns base64 文本
 */
export const encodeBase64 = (data: readonly number[], alphabet: keyof typeof ALPHABETS = 's4'): string => {
  const table = ALPHABETS[alphabet]
  const out: string[] = []
  for (let offset = 0; offset < data.length; offset += 3) {
    const chunk = data.slice(offset, offset + 3)
    let block = 0
    for (let i = 0; i < 3; i++) block = (block << 8) | (i < chunk.length ? chunk[i] : 0)
    const digits = [(block >>> 18) & 0x3f, (block >>> 12) & 0x3f, (block >>> 6) & 0x3f, block & 0x3f]
    for (const digit of digits.slice(0, chunk.length + 1)) out.push(table[digit])
  }
  const padCount = (4 - (out.length % 4)) % 4
  for (let i = 0; i < padCount; i++) out.push('=')
  return out.join('')
}

/**
 * {@link encodeBase64} 的逆。遇到非本表字符时抛错。
 * @param text - base64 文本
 * @param alphabet - `s3` 或 `s4`
 * @returns 解出的字节
 */
export const decodeBase64 = (text: string, alphabet: keyof typeof ALPHABETS = 's4'): number[] => {
  const table = ALPHABETS[alphabet]
  const index = new Map<string, number>()
  for (let i = 0; i < table.length; i++) index.set(table[i], i)

  const body = text.replace(/=+$/, '')
  const out: number[] = []
  for (let offset = 0; offset < body.length; offset += 4) {
    const chunk = body.slice(offset, offset + 4)
    let block = 0
    for (const char of chunk) {
      const digit = index.get(char)
      if (digit === undefined) throw new Error(`不是 ${alphabet} 字母表中的字符：${JSON.stringify(char)}`)
      block = (block << 6) | digit
    }
    block <<= 6 * (4 - chunk.length)
    const shifts = [16, 8, 0].slice(0, chunk.length - 1)
    for (const shift of shifts) out.push((block >>> shift) & 0xff)
  }
  return out
}

/**
 * 一个 JS 字符串被 SDK 转成字节的方式——**不是 UTF-8**。
 *
 * `fn139` 走 UTF-16 码元，低于 U+0100 的码元出一个字节，高于的出两个大端字节，
 * 于是代理对变四字节、一个汉字变两字节，而 UTF-8 会给三字节。对着 43 个真实签名测过：
 * 这条规则复现出声明的几何长度 43 次，UTF-8 复现 41 次。
 *
 * 它只在 U+00FF 以上才分叉，所以这个差别一直隐身，直到某个 `navigator.platform`
 * 里带了中文。而几何长度被校验和覆盖，写错会让整帧错位、签名整体失效，
 * 不是某一个字段被弄脏。
 * @param text - 待转换文本
 * @returns 按 JS 码元语义切出的字节
 */
export const jsBytes = (text: string): number[] => {
  const out: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code & 0xff00) out.push((code >>> 8) & 0xff)
    out.push(code & 0xff)
  }
  return out
}

/** 取 `value` 的 `count` 个小端字节 */
const leBytes = (value: number, count: number): number[] => {
  const out: number[] = []
  for (let index = 0; index < count; index++) out.push(Math.floor(value / 2 ** (8 * index)) & 0xff)
  return out
}

/**
 * 摘要里从 `offset` 起第一个不等于 `sentinel` 的字节。
 *
 * 哨兵是保留值：写它本身是 SDK 告诉服务端自己的环境探针触发了。我们永远不写，
 * 所以这里只会报出摘要本身。
 * @param digest - 该链的摘要
 * @param offset - 起始下标
 * @param sentinel - 保留值
 * @param fallback - 全被保留时的兜底
 * @returns 该槽位的字节
 */
export const canary = (digest: readonly number[], offset: number, sentinel: number, fallback: number): number => {
  for (let index = offset; index < digest.length; index++) {
    if (digest[index] !== sentinel) return digest[index]
  }
  return fallback
}

/**
 * `SM3(SM3(text + salt))`，32 个整数。
 *
 * 盐值留成参数是为了**验证**：拿一份真实签名，把候选盐值逐个代进来，看哪一个能
 * 重现签名里封住的那三个字节。旧实现用错盐值两年没被发现，就是因为没有这条路径。
 * @param text - 待摘要文本
 * @param salt - 拼接的盐值
 * @returns 摘要
 */
export const digestWith = (text: string, salt: string): number[] => sm3ToArray(sm3ToArray(text + salt))

/**
 * `SM3(SM3(text + SALT))`，32 个整数。
 * @param text - 待摘要文本
 * @returns 摘要
 */
export const digestOf = (text: string): number[] => digestWith(text, SALT)

/**
 * 第三条链：把 UA 过一遍非标准 RC4、base64，再摘要**一次**。
 *
 * 与另外两条不同，这里是单次 SM3。RC4 的密钥是三字节，由环境探针拼出来，
 * 所以对同一个身份是常量，不是每次调用都变。
 *
 * ## 密钥必须来自**这份签名自己**报的环境值
 *
 * `flags` 默认取模块常量（签名时就是这两个值），但**解码时必须传入签名里解出的
 * `envFlags` / `detectFlags`** —— 它们随页面环境变（实测见过 14 和 4 两种），
 * 拿常量去校验一份 `detect_flags` 为 4 的签名，这条链必然报「对不上」。
 * 上游那份 Python 实现没有这个参数，这是移植时补的。
 * @param userAgent - 原始 User-Agent
 * @param flags - 环境探针值，默认取本模块的常量
 * @returns 摘要
 */
export const userAgentDigest = (userAgent: string, flags: { envFlags?: number; detectFlags?: number } = {}): number[] => {
  const envFlags = flags.envFlags ?? ENV_FLAGS
  const detectFlags = flags.detectFlags ?? DETECT_FLAGS
  const key = [Math.floor(envFlags / 256), envFlags % 256, detectFlags % 256]
  // 码元而非 UTF-8：密文读的是未加掩码的 charCodeAt，之后的 base64 才掩到八位，
  // 所以密钥流每码元前进一次。UTF-8 遇到汉字会前进三次，摘要就不同——实测 43/43 对 40/43
  const sealed = rc4(key, jsBytes(userAgent.trim()).map(toByte))
  return sm3ToArray(encodeBase64(sealed, 's3'))
}

/**
 * 一条链在给定摘要下贡献的三个字节。
 * @param chain - 链定义
 * @param digest - 该链自己的摘要
 * @returns 三个字节
 */
export const chainBytes = (chain: DigestChain, digest: readonly number[]): [number, number, number] => [
  digest[chain.indices[0]],
  digest[chain.indices[1]],
  canary(digest, chain.canary[0], chain.canary[1], chain.canary[2])
]

/** 由 UA 判断 `fn143` 会从哪条带取值。顺序要紧：Edge 和华为的 UA 里都写着 Chrome，Chrome 的写着 Safari，SDK 先测具体的再测笼统的 */
const familyOf = (userAgent: string): string => {
  const ua = userAgent.toLowerCase()
  for (const name of ['edg', 'huawei', 'firefox', 'chrome', 'safari']) {
    if (ua.includes(name)) return name === 'edg' ? 'edge' : name
  }
  return 'other'
}

/** `fn143`：一个扮成噪声的浏览器家族回报 */
const headerNoise = (userAgent: string, rng: () => number): number =>
  (HEADER_NOISE_BANDS[familyOf(userAgent)] + Math.floor(rng() * 40)) & 0xff

/**
 * `fn144`：`nr()[4] & 64` 为空时走的支，实际就是走这支。
 *
 * 110 以下原样通过，以上 SDK 会把它逼成奇数，于是 110..240 里有一半取不到。
 * 一个均匀字节有 31% 的概率落在取不到的集合里。
 */
const probeNoise = (rng: () => number): number => {
  const value = Math.floor(rng() * 240)
  return value > 109 ? value + (value % 2) + 1 : value
}

/** `fn145`：「我的探针都在且被冻住」，外加真噪声 */
const tripwireNoise = (rng: () => number): number => (Math.floor(rng() * 255) & TRIPWIRE_FREE) | TRIPWIRE_SET

/**
 * 把两个字节摊到四个字节上，每字节的另外一半填噪声。
 *
 * 每个输出字节从载荷取一半位、从噪声字节取一半，掩码交替为 `0xAA`/`0x55`。还原只需要
 * 载荷那一半——但噪声那一半同样可还原，而 SDK 在其中两处拿它说了关于自己的事。
 * `low` / `high` 就是调用方提供这些回报的途径；不给时就是 SDK 无事可报时的普通抽取。
 */
const maskPair = (pair: readonly number[], rng: () => number, overrides: { low?: number; high?: number } = {}): number[] => {
  const noise = Math.floor(rng() * 65535)
  const low = toByte(overrides.low === undefined ? noise & 0xff : overrides.low)
  const high = toByte(overrides.high === undefined ? (noise >>> 8) & 0xff : overrides.high)
  return [
    (low & 0xaa) | (pair[0] & 0x55),
    (low & 0x55) | (pair[0] & 0xaa),
    (high & 0xaa) | (pair[1] & 0x55),
    (high & 0x55) | (pair[1] & 0xaa)
  ]
}

/** {@link maskPair} 的逆：把每个字节的载荷半边取回来 */
export const unmaskPair = (carrier: readonly number[]): [number, number] => [
  (carrier[0] & 0x55) | (carrier[1] & 0xaa),
  (carrier[2] & 0x55) | (carrier[3] & 0xaa)
]

/**
 * 三个 body 字节加一个噪声字节变成四个载体字节。
 *
 * 每个载体留一部分自己的字节、其余从噪声取；第四个字节恰好收拢前三个让出去的位，
 * 且落在它们原来的位位置上。字节内部没有任何位移，这既是这一层可逆的原因，
 * 也是它看起来仍像密文的原因。
 */
const expandNoise = (body: readonly number[], rng: () => number): number[] => {
  const out: number[] = []
  for (let offset = 0; offset < body.length; offset += 3) {
    const group = body.slice(offset, offset + 3)
    if (group.length < 3) {
      // SDK 的尾巴分支。对定长 body 不常走到，但几何串与尾串的长度会变，
      // 所以保留原样，免得将来某个字段变化时在这里悄悄分叉
      out.push(group[0])
      if (group.length > 1 && group[1]) out.push(group[1])
      continue
    }
    const noise = Math.floor(rng() * 1000) & 0xff
    for (let index = 0; index < 3; index++) out.push((noise & NOISE_MASKS[index]) | (group[index] & DATA_MASKS[index]))
    out.push((group[0] & NOISE_MASKS[0]) | (group[1] & NOISE_MASKS[1]) | (group[2] & NOISE_MASKS[2]))
  }
  return out
}

/** {@link expandNoise} 的逆 */
const collapseNoise = (frame: readonly number[]): number[] => {
  const out: number[] = []
  for (let offset = 0; offset < frame.length; offset += 4) {
    const group = frame.slice(offset, offset + 4)
    if (group.length < 4) {
      out.push(...group)
      continue
    }
    for (let index = 0; index < 3; index++) out.push((group[index] & DATA_MASKS[index]) | (group[3] & NOISE_MASKS[index]))
  }
  return out
}

/** {@link ABogus} 的构造参数 */
export interface ABogusOptions {
  /** 九字段几何串，默认 {@link DEFAULT_BROWSER_INFO}。传 {@link browserInfoFromScreen} 的产物可以让它与身份一致 */
  browserInfo?: string
  /** 抖音页面 id，默认 {@link PAGE_ID}。登录页用的是另一个值，所以留成参数 */
  pageId?: number
  /** 抖音应用 id，默认 {@link AID} */
  aid?: number
  /** 六个环境探针的位集，默认 {@link ENV_FLAGS} */
  envFlags?: number
  /** 反机器人检测位集，默认 {@link DETECT_FLAGS}。**它同时是 UA 链的 RC4 密钥字节之一**，所以换值会让 UA 链整体改变 */
  detectFlags?: number
  /** 随机源，返回 [0,1)。默认 `Math.random`；传固定序列即可复现 */
  rng?: () => number
}

/** {@link ABogus.getValue} 的可选入参 */
export interface ABogusSignOptions {
  /** 请求体，GET 留空。它参与摘要，所以把非空 body 当空签名等于签错 */
  body?: string
  /** 请求的 Content-Type，只用于一条规则：`multipart/form-data` 时 body 要按空处理 */
  contentType?: string
  /** 毫秒时钟，默认 `Date.now()`。对着固定样本复现时必须传 */
  nowMs?: number
}

/**
 * 为一个浏览器身份计算 `a_bogus`。
 *
 * 除配置外无状态、也很便宜，所以「一个身份一个实例」是自然的生命周期。
 * `rng` 存在的意义是让测试能钉住噪声——它产出什么，签名都是对的。
 */
export class ABogus {
  private readonly userAgent: string
  private readonly browserInfo: string
  private readonly pageId: number
  private readonly aid: number
  private readonly envFlags: number
  private readonly detectFlags: number
  private readonly rng: () => number

  constructor(userAgent: string, options: ABogusOptions = {}) {
    this.userAgent = userAgent
    this.browserInfo = options.browserInfo ?? DEFAULT_BROWSER_INFO
    this.pageId = options.pageId ?? PAGE_ID
    this.aid = options.aid ?? AID
    this.envFlags = options.envFlags ?? ENV_FLAGS
    this.detectFlags = options.detectFlags ?? DETECT_FLAGS
    this.rng = options.rng ?? Math.random
  }

  /** 五十个标量，按离线解码器打印的名字 */
  private fields(query: string, body: string, nowMs: number): Record<string, number> {
    const digests: Record<string, number[]> = {
      query: digestOf(query),
      body: digestOf(body),
      // 环境值必须传进去：UA 链的 RC4 密钥由它们拼成，而签名会把这些值一并写在载荷里，
      // 所以校验方可以（也必须）按签名自己报的那份来重算
      user_agent: userAgentDigest(this.userAgent, { envFlags: this.envFlags, detectFlags: this.detectFlags })
    }

    // `ink` 是 Date.now() - 1，由 SDK 在早一次调用里种在 navigator 的原型上。
    // 它是 SDK 对自己的存活检查：`ink` 不比时钟慢一毫秒的载荷，不是走完整个入口点的代码装配出来的
    const ink = nowMs - 1
    const fortnights = Math.floor((nowMs - FORTNIGHT_EPOCH_MS) / (1000 * 60 * 60 * 24 * 14))
    const infoBytes = jsBytes(this.browserInfo)
    const tailBytes = jsBytes(`${(nowMs + 3) & 0xff},`)

    const fields: Record<string, number> = {
      L24: 41,
      L26: fortnights,
      L27: CALL_BUCKET,
      // 自 SDK 初始化以来的毫秒数加三。刚加载完的页面在这里是个小数；
      // 我们报的是「入口点被及时走到了」，对一个不保持页面常开的进程来说是诚实答案
      L28: 3,
      L35: this.envFlags & 0xff,
      L36: (this.envFlags >>> 8) & 0xff,
      L38: NR_FLAGS & 0xff,
      L39: (NR_FLAGS >>> 8) & 0xff,
      L66: TRIPWIRE_LOCKED,
      L79: infoBytes.length & 0xff,
      L80: (infoBytes.length >>> 8) & 0xff,
      L84: tailBytes.length & 0xff,
      L85: (tailBytes.length >>> 8) & 0xff
    }
    leBytes(nowMs, 6).forEach((byte, index) => (fields[`L${29 + index}`] = byte))
    leBytes(this.detectFlags, 4).forEach((byte, index) => (fields[`L${44 + index}`] = byte))
    NR_TAG.forEach((byte, index) => (fields[`L${40 + index}`] = byte))
    leBytes(ink, 6).forEach((byte, index) => (fields[`L${60 + index}`] = byte))
    leBytes(this.pageId, 4).forEach((byte, index) => (fields[`L${67 + index}`] = byte))
    leBytes(this.aid, 4).forEach((byte, index) => (fields[`L${71 + index}`] = byte))

    // 三个被摘要的输入，通过解码器读的同一张表写入。
    // 这九个槽位曾经在这里逐个拼写，是解码器唯一可能与生成器悄悄分歧的地方
    for (const [name, chain] of Object.entries(DIGEST_CHAINS)) {
      const written = chainBytes(chain, digests[name])
      chain.slots.forEach((slot, index) => (fields[slot] = written[index]))
    }
    return fields
  }

  /**
   * 为一次请求算出 `a_bogus`。
   * @param query - 即将发出的 query 串，不含 `a_bogus` 自身
   * @param options - body / Content-Type / 时钟
   * @returns `a_bogus` 的值
   */
  getValue(query: string, options: ABogusSignOptions = {}): string {
    // `multipart/form-data` 时 body 按空处理：那个时刻页面里的 body 是 FormData 而不是字符串，
    // 把分段当文本签名会与服务端实际摘要的东西不一致，所以规则照搬
    const body = (options.contentType ?? '').toLowerCase().includes('multipart/form-data') ? '' : (options.body ?? '')
    const now = options.nowMs ?? Date.now()
    if (now < FORTNIGHT_EPOCH_MS) {
      // 有一个字段从 2024-07-24 起数两周，放不下负数。拒绝是对的：时钟早于纪元
      // 意味着调用方把秒当毫秒传了，用它签出来的名会「悄悄错」而不是「不存在」
      throw new Error(`时钟早于 a_bogus 纪元：${now}`)
    }
    const fields = this.fields(query, body, now)

    // 下面四个噪声字节里有三个是环境回报而不是噪声，见文件头。
    // 第四个（版本块的低字节）才是真正自由的抽取。
    // 抽取顺序必须与 Python 一致：参数先于函数体求值
    const version = [
      ...maskPair(SDK_VERSION.slice(0, 2), this.rng),
      ...maskPair(SDK_VERSION.slice(2, 4), this.rng, {
        low: probeNoise(this.rng),
        high: tripwireNoise(this.rng)
      })
    ]

    // 校验和覆盖版本块与五十个标量，别的不覆盖——不含几何串、不含尾串。
    // 它让这套格式内部冗余，因而也是 `structureError` 能分辨真假签名的依据
    let checksum = 0
    for (const byte of version) checksum ^= byte
    for (const name of FIELD_ORDER) checksum ^= fields[name]

    const bodyBytes = FIELD_ORDER.map((name) => fields[name])
    bodyBytes.push(...jsBytes(this.browserInfo))
    bodyBytes.push(...jsBytes(`${(now + 3) & 0xff},`))
    bodyBytes.push(checksum)

    const header = maskPair(HEADER_MAGIC, this.rng, { high: headerNoise(this.userAgent, this.rng) })
    const frame = expandNoise(bodyBytes, this.rng)
    const sealed = rc4([PAYLOAD_KEY], [...version, ...frame])
    return encodeBase64([...header, ...sealed], 's4')
  }
}

/** 这些毛病意味着这串东西**根本不是** a_bogus，而不是「内容出乎意料」 */
const DECODE_PROBLEMS = new Set(['alphabet', 'length not a multiple of four', 'payload too short'])

/**
 * `problem` 是否表示「不是 a_bogus」而非「内容不符预期」。
 * @param problem - {@link structureError} 的返回
 * @returns 是否属于格式性失败
 */
export const isDecodeProblem = (problem: string | null | undefined): boolean => DECODE_PROBLEMS.has(problem ?? '')

/** {@link decode} 的结果 */
export interface DecodedABogus {
  headerMagic: [number, number]
  sdkVersion: [number, number, number, number]
  nowMs: number
  inkMs: number
  pageId: number
  aid: number
  envFlags: number
  detectFlags: number
  callBucket: number
  tripwire: number
  browserInfo: string
  tail: string
  fields: Record<string, number>
}

/**
 * `value` 第一处不满足 a_bogus 格式的地方，全都满足时返回 `null`。
 *
 * 这里每一条检查都由算法本身固定，所以两个都正确的实现无论噪声多不同，都会在这些
 * 检查上一致。**故意不检查长度**：长度跟着几何串走，两个都对但屏幕不同的浏览器就是
 * 会不一样。
 *
 * 最后一条检查才是值得拥有的那条。校验和是对载荷里本身就有的一些字段算的，所以能通过
 * 它的签名，必然是由一个在整套布局上与我们一致的实现装配出来的——版本块、五十槽置换、
 * 噪声展开、以及那个密码。不是真算法，凑不出一个。
 * @param value - 待检查的签名
 * @param alphabet - 字母表，默认 `s4`
 * @returns 问题标识或 `null`
 */
export const structureError = (value: string, alphabet: keyof typeof ALPHABETS = 's4'): string | null => {
  const body = value.replace(/=+$/, '')
  const table = ALPHABETS[alphabet]
  if (!body || body.includes('=') || [...body].some((char) => !table.includes(char))) return 'alphabet'
  if (value.length % 4) return 'length not a multiple of four'

  const payload = decodeBase64(value, alphabet)
  // header + 版本块 + 够放下五十个标量的帧：4 + 8 + 68
  if (payload.length < 80) return 'payload too short'

  if (unmaskPair(payload.slice(0, 4)).join(',') !== HEADER_MAGIC.join(',')) return 'header magic'

  const plain = rc4([PAYLOAD_KEY], payload.slice(4))
  const version = plain.slice(0, 8)
  const frame = plain.slice(8)
  if (unmaskPair(version.slice(0, 4)).join(',') !== SDK_VERSION.slice(0, 2).join(',')) return 'sdk version'
  if (unmaskPair(version.slice(4, 8)).join(',') !== SDK_VERSION.slice(2, 4).join(',')) return 'sdk version'

  const unpacked = collapseNoise(frame)
  if (unpacked.length < FIELD_ORDER.length + 1) return 'frame too short'
  const fields: Record<string, number> = {}
  FIELD_ORDER.forEach((name, index) => (fields[name] = unpacked[index]))

  const infoLength = fields.L79 | (fields.L80 << 8)
  const tailLength = fields.L84 | (fields.L85 << 8)
  const end = FIELD_ORDER.length + infoLength + tailLength
  if (end + 1 > unpacked.length) return 'declared lengths overrun the frame'
  // 另一个方向也要查。只查下溢会接受一个「与自身拼接」的签名：密码是密钥流，
  // 前半段照样解得开，后面那些垃圾从来没被看过。
  // 声明的长度必须把载荷交代完，容差是噪声展开给末尾分组补的那两个字节
  if (unpacked.length - (end + 1) > 2) return 'declared lengths leave a tail'

  let checksum = 0
  for (const byte of version) checksum ^= byte
  for (const name of FIELD_ORDER) checksum ^= fields[name]
  if (unpacked[end] !== checksum) return 'checksum'
  return null
}

/**
 * 把一份 `a_bogus` 拆开。用于诊断与测试，不用于签名。
 *
 * 这是证明算法正确的那个函数：拿浏览器产出的签名跑一遍，它会还原出那个浏览器的屏幕
 * 尺寸、抖音自己的 `aid`、以及与旁边那个 `timestamp` 参数吻合的时钟。
 * @param value - 待拆解的签名
 * @param alphabet - 字母表，默认 `s4`
 * @returns 可还原的字段
 */
export const decode = (value: string, alphabet: keyof typeof ALPHABETS = 's4'): DecodedABogus => {
  const problem = structureError(value, alphabet)
  if (problem !== null) throw new Error(`不是一份格式良好的 a_bogus：${problem}`)

  const payload = decodeBase64(value, alphabet)
  const plain = rc4([PAYLOAD_KEY], payload.slice(4))
  const unpacked = collapseNoise(plain.slice(8))
  const fields: Record<string, number> = {}
  FIELD_ORDER.forEach((name, index) => (fields[name] = unpacked[index]))

  const littleEndian = (first: number, count: number): number => {
    let total = 0
    for (let index = 0; index < count; index++) total += fields[`L${first + index}`] * 2 ** (8 * index)
    return total
  }

  const infoLength = fields.L79 | (fields.L80 << 8)
  const tailLength = fields.L84 | (fields.L85 << 8)
  const start = FIELD_ORDER.length
  const asText = (bytes: number[]): string => new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes))
  const headerMagic = unmaskPair(payload.slice(0, 4))
  const version = [...unmaskPair(plain.slice(0, 4)), ...unmaskPair(plain.slice(4, 8))]
  return {
    headerMagic,
    sdkVersion: version as [number, number, number, number],
    nowMs: littleEndian(29, 6),
    inkMs: littleEndian(60, 6),
    pageId: littleEndian(67, 4),
    aid: littleEndian(71, 4),
    envFlags: fields.L35,
    detectFlags: littleEndian(44, 4),
    callBucket: fields.L27,
    tripwire: fields.L66,
    browserInfo: asText(unpacked.slice(start, start + infoLength)),
    tail: asText(unpacked.slice(start + infoLength, start + infoLength + tailLength)),
    fields
  }
}

/**
 * 兼容入口：给一条完整 URL 和一个 UA，返回 `a_bogus` 的值。
 *
 * 与旧实现的签名一致，所以 `sign/index.ts` 与 legacy 那个类不用改调用方式。
 * 需要控制时钟、几何串或随机源时用 {@link ABogus}。
 * @param url - 待签名的完整 URL
 * @param userAgent - 发起请求用的 User-Agent
 * @param options - 透传给 {@link ABogus} 与 {@link ABogus.getValue} 的选项
 * @returns `a_bogus` 的值
 */
export default (url: string, userAgent: string, options: ABogusOptions & ABogusSignOptions = {}): string =>
  new ABogus(userAgent, options).getValue(new URLSearchParams(new URL(url).search).toString(), options)
