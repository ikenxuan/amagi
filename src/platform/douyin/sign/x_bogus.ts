import crypto from 'node:crypto'
import URL from 'node:url'

/**
 * X-Bogus签名算法的返回结果类型
 */
type XBogusResult = {
  fullUrl: string
  xbogus: string
  userAgent: string
}

/**
 * X-Bogus 生成工具（TikTok/Douyin 签名算法）- TypeScript 版本
 * 原始 Python 代码来源：Douyin_TikTok_Download_API (Evil0ctal/Johnserf-Seed)
 */
export default class XBogus {
  private readonly charMap: (number | null)[]
  private readonly base64Charset: string
  private readonly uaKey: Buffer
  private readonly defaultUa: string
  public params?: string
  public xb?: string

  constructor () {
    // 初始化字符映射表
    this.charMap = new Array(128).fill(null)
    for (let i = 48; i <= 57; i++) {
      this.charMap[i] = i - 48
    }
    for (let i = 65; i <= 70; i++) {
      this.charMap[i] = i - 55
    }
    for (let i = 97; i <= 102; i++) {
      this.charMap[i] = i - 87
    }

    this.base64Charset = "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe="
    this.uaKey = Buffer.from([0x00, 0x01, 0x0c])
    this.defaultUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0"
  }

  private md5StrToArray (md5Str: string): number[] {
    const result: number[] = []

    if (md5Str.length > 32) {
      for (const char of md5Str) {
        result.push(char.charCodeAt(0))
      }
      return result
    }

    let idx = 0
    while (idx < md5Str.length) {
      const leftCharCode = md5Str.charCodeAt(idx)
      const rightCharCode = md5Str.charCodeAt(idx + 1)

      const left = this.charMap[leftCharCode]
      const right = this.charMap[rightCharCode]
      if (left === null || right === null) {
        throw new Error(`Invalid MD5 character: ${md5Str[idx]}${md5Str[idx + 1]}`)
      }

      result.push((left << 4) | right)
      idx += 2
    }

    return result
  }

  private md5 (input: string | number[]): string {
    const dataArray: number[] = typeof input === 'string'
      ? this.md5StrToArray(input)
      : input

    const dataBuffer = Buffer.from(dataArray)
    return crypto.createHash('md5')
      .update(dataBuffer)
      .digest('hex')
  }

  private md5Encrypt (urlPath: string): number[] {
    const firstMd5 = this.md5(urlPath)
    const firstArray = this.md5StrToArray(firstMd5)
    const secondMd5 = this.md5(firstArray)
    return this.md5StrToArray(secondMd5)
  }

  private encodingConversion (...params: (number | string)[]): string {
    const byteList: number[] = []

    for (const param of params) {
      if (typeof param === 'number') {
        byteList.push(Math.floor(param))
      } else if (typeof param === 'string') {
        for (const char of param) {
          byteList.push(char.charCodeAt(0))
        }
      }
    }

    return Buffer.from(byteList).toString('latin1')
  }

  private encodingConversion2 (a: number, b: number, c: string): string {
    return String.fromCharCode(a) + String.fromCharCode(b) + c
  }

  private rc4Encrypt (key: string | Buffer, data: string): string {
    const keyBuffer = typeof key === 'string'
      ? Buffer.from(key, 'latin1')
      : key
    const dataBuffer = Buffer.from(data, 'latin1')

    const S: number[] = Array.from({ length: 256 }, (_, i) => i)
    let j = 0

    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + keyBuffer[i % keyBuffer.length]) % 256;
      [S[i], S[j]] = [S[j], S[i]]
    }

    const encryptedBuffer = Buffer.alloc(dataBuffer.length)
    let i = 0
    j = 0

    for (let k = 0; k < dataBuffer.length; k++) {
      i = (i + 1) % 256
      j = (j + S[i]) % 256;
      [S[i], S[j]] = [S[j], S[i]]

      const t = (S[i] + S[j]) % 256
      encryptedBuffer[k] = dataBuffer[k] ^ S[t]
    }

    return encryptedBuffer.toString('latin1')
  }

  private calculation (a1: number, a2: number, a3: number): string {
    const x1 = (a1 & 0xff) << 16
    const x2 = (a2 & 0xff) << 8
    const x3 = x1 | x2 | (a3 & 0xff)

    const c1 = this.base64Charset[(x3 & 0xffc000) >> 18]
    const c2 = this.base64Charset[(x3 & 0x3f000) >> 12]
    const c3 = this.base64Charset[(x3 & 0xfc0) >> 6]
    const c4 = this.base64Charset[x3 & 0x3f]

    return c1 + c2 + c3 + c4
  }

  /**
   * 生成X-Bogus签名
   * @param url 完整的URL地址
   * @param ua 可选的User-Agent，不提供则使用默认值
   * @returns 包含完整URL、X-Bogus值和使用的User-Agent的元组
   */
  public getXBogus (url: string, ua?: string): XBogusResult {
    const parsedUrl = new URL.URL(url)
    const urlPath = parsedUrl.pathname + parsedUrl.search
    const currentUa = ua || this.defaultUa

    // 生成array1
    const rc4EncryptedUa = this.rc4Encrypt(this.uaKey, currentUa)
    const base64Ua = Buffer.from(rc4EncryptedUa, 'latin1').toString('base64')
    const md5Ua = this.md5(base64Ua)
    const array1 = this.md5StrToArray(md5Ua)

    // 生成array2
    const emptyStrMd5 = 'd41d8cd98f00b204e9800998ecf8427e'
    const array2 = this.md5StrToArray(this.md5(this.md5StrToArray(emptyStrMd5)))

    // 生成URL加密数组
    const urlEncryptedArray = this.md5Encrypt(urlPath)

    // 时间戳与固定值处理
    const timestamp = Math.floor(Date.now() / 1000)
    const ct = 536919696

    // 构建newArray并计算异或结果
    const newArray: number[] = [
      64, 1,
      1, 12,
      urlEncryptedArray[14], urlEncryptedArray[15],
      array2[14], array2[15],
      array1[14], array1[15],
      (timestamp >> 24) & 0xff, (timestamp >> 16) & 0xff, (timestamp >> 8) & 0xff, timestamp & 0xff,
      (ct >> 24) & 0xff, (ct >> 16) & 0xff, (ct >> 8) & 0xff, ct & 0xff
    ]

    let xorResult = newArray[0]
    for (let i = 1; i < newArray.length; i++) {
      xorResult ^= newArray[i]
    }
    newArray.push(xorResult)

    // 拆分与合并数组
    const array3: number[] = []
    const array4: number[] = []
    let idx = 0
    while (idx < newArray.length) {
      array3.push(newArray[idx])
      if (idx + 1 < newArray.length) {
        array4.push(newArray[idx + 1])
      }
      idx += 2
    }
    const mergedArray = [...array3, ...array4]

    // 生成乱码字符串
    const firstConversion = this.encodingConversion(...mergedArray)
    const rc4Garbled = this.rc4Encrypt('ÿ', firstConversion)
    const garbledCode = this.encodingConversion2(2, 255, rc4Garbled)

    // 生成最终X-Bogus
    let xb = ""
    idx = 0
    while (idx < garbledCode.length) {
      if (idx + 2 >= garbledCode.length) break

      const a1 = garbledCode.charCodeAt(idx)
      const a2 = garbledCode.charCodeAt(idx + 1)
      const a3 = garbledCode.charCodeAt(idx + 2)
      xb += this.calculation(a1, a2, a3)
      idx += 3
    }

    // 构建最终URL
    const fullUrl = url.includes("?")
      ? `${url}&X-Bogus=${xb}`
      : `${url}?X-Bogus=${xb}`

    // 修改返回格式为对象
    return {
      fullUrl,
      xbogus: xb,
      userAgent: currentUa
    }
  }
}