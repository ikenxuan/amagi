import { parse, URLSearchParams } from 'url'
import { sm3 } from 'sm-crypto-v2'

export class ABogus {
  filter = /%([0-9A-F]{2})/g;
  arguments: number[] = [0, 1, 14];
  ua_key: string = "\u0000\u0001\u000e";
  end_string: string = "cus";
  version: number[] = [1, 0, 1, 5];
  browser: string = "1536|742|1536|864|0|0|0|0|1536|864|1536|864|1536|742|24|24|MacIntel";
  reg: number[] = [
    1937774191,
    1226093241,
    388252375,
    3666478592,
    2842636476,
    372324522,
    3817729613,
    2969243214,
  ];
  str: any = {
    "s0": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    "s1": "Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
    "s2": "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
    "s3": "ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe",
    "s4": "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe",
  };

  chunk: number[] = [];
  size: number = 0;
  ua_code: number[] = [
    76, 98, 15, 131, 97, 245, 224, 133, 122, 199, 241, 166, 79, 34, 90, 191,
    128, 126, 122, 98, 66, 11, 14, 40, 49, 110, 110, 173, 67, 96, 138, 252
  ];
  browser_len: number
  browser_code: number[]

  constructor (platform: string | null = null) {
    this.browser = platform ? this.generate_browser_info(platform) : this.browser
    this.browser_len = this.browser.length
    this.browser_code = this.char_code_at(this.browser)
  }


  list_1 (random_num: number | null = null, a = 170, b = 85, c = 45): number[] {
    return this.random_list(random_num, a, b, 1, 2, 5, c & a)
  }


  list_2 (random_num: number | null = null, a = 170, b = 85): number[] {
    return this.random_list(random_num, a, b, 1, 0, 0, 0)
  }


  list_3 (random_num: number | null = null, a = 170, b = 85): number[] {
    return this.random_list(random_num, a, b, 1, 0, 5, 0)
  }


  random_list (
    a: number | null = null,
    b = 170,
    c = 85,
    d = 0,
    e = 0,
    f = 0,
    g = 0
  ): number[] {
    const r = a || (Math.random() * 10000)
    const v = [
      r,
      r & 255,
      r >> 8
    ]
    let s = v[1] & b | d
    v.push(s)
    s = v[1] & c | e
    v.push(s)
    s = v[2] & b | f
    v.push(s)
    s = v[2] & c | g
    v.push(s)
    return v.slice(-4)
  }


  from_char_code (...args: number[]): string {
    return String.fromCharCode(...args)
  }


  generate_string_1 (
    random_num_1: number | null = null,
    random_num_2: number | null = null,
    random_num_3: number | null = null
  ): string {
    return this.from_char_code(...this.list_1(random_num_1)) +
      this.from_char_code(...this.list_2(random_num_2)) +
      this.from_char_code(...this.list_3(random_num_3))
  }

  generate_string_2 (
    url_params: string,
    method = "GET",
    start_time = 0,
    end_time = 0
  ): string {
    const a = this.generate_string_2_list(url_params, method, start_time, end_time)
    const e = this.end_check_num(a)
    a.push(...this.browser_code, e)
    return this.rc4_encrypt(this.from_char_code(...a), "y")
  }

  generate_string_2_list (
    url_params: string,
    method = "GET",
    start_time = 0,
    end_time = 0
  ): number[] {
    start_time = start_time || Math.floor(Date.now())
    end_time = end_time || (start_time + Math.floor(Math.random() * (8 - 4 + 1)) + 4)
    const params_array = this.generate_params_code(url_params)
    const method_array = this.generate_method_code(method)
    return this.list_4(
      (end_time >> 24) & 255,
      params_array[21],
      this.ua_code[23],
      (end_time >> 16) & 255,
      params_array[22],
      this.ua_code[24],
      (end_time >> 8) & 255,
      (end_time >> 0) & 255,
      (start_time >> 24) & 255,
      (start_time >> 16) & 255,
      (start_time >> 8) & 255,
      (start_time >> 0) & 255,
      method_array[21],
      method_array[22],
      Math.floor(end_time / 256 / 256 / 256 / 256) >> 0,
      Math.floor(start_time / 256 / 256 / 256 / 256) >> 0,
      this.browser_len,
    )
  }


  reg_to_array (a: number[]): number[] {
    const o = new Array(32).fill(0)
    for (let i = 0; i < 8; i++) {
      let c = a[i]
      o[4 * i + 3] = (255 & c)
      c >>= 8
      o[4 * i + 2] = (255 & c)
      c >>= 8
      o[4 * i + 1] = (255 & c)
      c >>= 8
      o[4 * i] = (255 & c)
    }
    return o
  }


  compress (a: number[]): void {
    const f = this.generate_f(a)
    const i = [...this.reg]
    for (let o = 0; o < 64; o++) {
      let c = this.de(i[0], 12) + i[4] + this.de(this.pe(o), o)
      c = (c & 0xFFFFFFFF)
      c = this.de(c, 7)
      const s = (c ^ this.de(i[0], 12)) & 0xFFFFFFFF

      let u = this.he(o, i[0], i[1], i[2])
      u = (u + i[3] + s + f[o + 68]) & 0xFFFFFFFF

      let b = this.ve(o, i[4], i[5], i[6])
      b = (b + i[7] + c + f[o]) & 0xFFFFFFFF

      i[3] = i[2]
      i[2] = this.de(i[1], 9)
      i[1] = i[0]
      i[0] = u

      i[7] = i[6]
      i[6] = this.de(i[5], 19)
      i[5] = i[4]
      i[4] = (b ^ this.de(b, 9) ^ this.de(b, 17)) & 0xFFFFFFFF
    }

    for (let l = 0; l < 8; l++) {
      this.reg[l] = (this.reg[l] ^ i[l]) & 0xFFFFFFFF
    }
  }


  generate_f (e: number[]): number[] {
    const r = new Array(132).fill(0)

    for (let t = 0; t < 16; t++) {
      r[t] = (255 & e[4 * t]) | (e[4 * t + 1] << 8) | (e[4 * t + 2] << 16) | (e[4 * t + 3] << 24)
    }

    for (let n = 16; n < 68; n++) {
      const u = r[n - 3] ^ r[n - 13] ^ this.de(r[n - 16], 15)
      const c = this.de(u, 17) ^ this.de(u, 9) ^ u
      r[n] = c ^ r[n - 6]
    }

    for (let i = 0; i < 64; i++) {
      r[68 + i] = r[i] ^ r[i + 4]
    }

    return r
  }

  generate_params_code (url_params: string): number[] {
    // console.log('generate_params_code', this.sm3ToArray(this.sm3ToArray(url_params + this.end_string)))
    return this.sm3ToArray(this.sm3ToArray(url_params + this.end_string))
  }

  generate_method_code (method: string): number[] {
    return this.sm3ToArray(this.sm3ToArray(method + this.end_string))
  }


  sm3ToArray (data: string | number[]): number[] {
    let byteArray: Uint8Array

    if (typeof data === 'string') {
      byteArray = new TextEncoder().encode(data)
    } else {
      byteArray = new Uint8Array(data)
    }

    // console.log(byteArray)

    const hashHex = sm3(byteArray)
    // console.log('sm3:', hashHex)

    const result: number[] = []
    for (let i = 0; i < hashHex.length; i += 2) {
      result.push(parseInt(hashHex.substr(i, 2), 16))
    }

    return result
  }


  generate_params (url_params: string): string {
    return url_params.split("").map(c => c.charCodeAt(0) % 255).map(this.tobase).join("")
  }


  generate_method (method: string): string {
    return method.split("").map(c => c.charCodeAt(0) % 255).map(this.tobase).join("")
  }


  char_code_at (str: string): number[] {
    return str.split("").map(c => c.charCodeAt(0))
  }


  de (a: number, b: number): number {
    return (a << b) | (a >>> (32 - b))
  }

  pe (a: number): number {
    const t = this.arguments[a & 3]
    return (t << 5) | t
  }

  ve (a: number, b: number, c: number, d: number): number {
    return (a & b) | (~a & c)
  }

  he (a: number, b: number, c: number, d: number): number {
    return b ^ c ^ d
  }

  end_check_num (a: number[]): number {
    const r = (this.chunk.length << 3) & 255
    const n = ((this.size >> 29) & 255) | ((this.size & 255) << 8)
    return (a[0] ^ a[1] ^ a[2] ^ a[3] ^ a[4] ^ a[5] ^ a[6] ^ a[7] ^ r ^ n) & 255
  }

  tobase (a: number): string {
    return ABogus.prototype.from_char_code.call(this, 0, 0, 0, a)
  }

  rc4_encrypt (a: string, b: string): string {
    let c = this.rc4_key_schedule(b)
    let e = ""
    for (let f = 0; f < a.length; f++) {
      const g = a.charCodeAt(f)
      e += String.fromCharCode(g ^ c[f & 255])
    }
    return e
  }

  rc4_key_schedule (b: string): number[] {
    const c = new Array(256)
    const d = new Array(256)

    for (let i = 0; i < 256; i++) {
      c[i] = b.charCodeAt(i % b.length)
      d[i] = i
    }

    let j = 0
    for (let i = 0; i < 256; i++) {
      j = (j + d[i] + c[i]) % 256;
      [d[i], d[j]] = [d[j], d[i]]
    }

    return d
  }

  list_4 (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number): number[] {
    return [
      a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]
  }

  generate_browser_info (platform: string): string {
    const ua = platform || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0"
    const browser_info = ua.split("").map(c => (c.charCodeAt(0) % 255)).map(this.tobase).join("")
    return browser_info
  }

  getABogus (url: string, method: string, start_time: number, end_time: number): string {
    const url_params = parse(url, true).search || ""
    return this.generate_string_2(url_params, method, start_time, end_time)
  }

  get_reg (): string {
    return this.rc4_encrypt(this.from_char_code(...this.reg_to_array(this.reg)), "x")
  }

  get_value (
    url_params: string = '',
    method = "GET",
    start_time = 0,
    end_time = 0,
    random_num_1?: number | null,
    random_num_2?: number | null,
    random_num_3?: number | null,): string {

    const string_1 = this.generate_string_1(
      random_num_1,
      random_num_2,
      random_num_3,
    )
    // console.log(string_1)
    const string_2 = this.generateString((new URLSearchParams((new URL(url_params)).search)).toString(), method, start_time, end_time)
    const string = string_1 + string_2
    // console.log(string)
    return this.generate_result(string, 's4')
  }
  generateString (url_params: any, method: string, start_time: number, end_time: number): string {
    let string_2
    // console.log(new URLSearchParams(url_params).toString())
    if (typeof url_params === 'object' && !Array.isArray(url_params) && url_params !== null) {
      // 如果url_params是一个对象（字典），则使用URLSearchParams来编码它
      string_2 = this.generate_string_2((new URLSearchParams((new URL(url_params)).search)).toString(), method, start_time, end_time)
    } else {
      // 否则，假设url_params已经是编码后的字符串或可以直接使用的值
      string_2 = this.generate_string_2(url_params.toString(), method, start_time, end_time)
    }

    return string_2
  }

  generate_result (s: string, e: string = "s4"): string {
    const r: string[] = []

    for (let i = 0; i < s.length; i += 3) {
      let n: number
      if (i + 2 < s.length) {
        n = (s.charCodeAt(i) << 16) | (s.charCodeAt(i + 1) << 8) | s.charCodeAt(i + 2)
      } else if (i + 1 < s.length) {
        n = (s.charCodeAt(i) << 16) | (s.charCodeAt(i + 1) << 8)
      } else {
        n = s.charCodeAt(i) << 16
      }

      for (
        let j = 18, k = [0xFC0000, 0x03F000, 0x0FC0, 0x3F];
        j >= 0;
        j -= 6
      ) {
        if ((j === 6 && i + 1 >= s.length) || (j === 0 && i + 2 >= s.length)) {
          break
        }
        r.push(this.str[e][(n & k[(18 - j) / 6]) >> j])
      }
    }

    r.push("=".repeat((4 - (r.length % 4)) % 4))
    return r.join("")
  }
}

export default (url: string, ua: string) => {
  return encodeURIComponent(new ABogus(ua).get_value(url))
}
