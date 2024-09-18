export function xsCommon (t: { a1: any; x_t: number; x_s: string; fingerprint: any }) {
  const k = {
    s0: 5,
    s1: "",
    x0: "1",
    x1: "3.7.8-2",
    x2: "Windows",
    x3: "xhs-pc-web",
    x4: "4.34.0",
    x5: t.a1, // a1 的值
    x6: t.x_t,  // x-t 的值
    x7: t.x_s, // x-s的值
    x8: t.fingerprint, // 浏览器指纹，可以写死
    x9: encrypt_mcr("".concat(String(t.x_t)).concat(t.x_s).concat(t.fingerprint)),
    x10: 1145
  }
  const utf8 = encrypt_encodeUtf8(JSON.stringify(k))
  return encrypt_b64Encode(utf8)
}

const encrypt_mcr = function (t: any = 0): any {
  const e = 409
  const r = 514
  const n = 292
  const o = 642
  const i = 447
  const a = 422
  const u = 582
  const s = 546
  const c = 491
  const l = 364
  const f = 511
  const p = 736
  const h = 543
  const d = 203
  const v = 380
  const g = 428
  const m = 579
  const y = 397
  const w = 396
  const _ = 228
  const b = 396
  const E = 184
  const T = 148
  const k = 30
  const x = 323
  const S = 503
  const A = 212
  const L = 186
  const R = 370
  const I = 321
  const C = 430
  const O = 397
  const N = 559
  const P = 376
  const M = 445
  const B = 230
  const F = 264
  const j = 137
  const D = 475
  const U = 508
  const q = 57
  const G = 119
  const H = 295
  const V = 167
  const W = 135
  const z = 312
  const X = 318
  const K = 194
  const Y = 1179
  const J: { [key: string]: any } = {}

  J[Z(-578, -445)] = function (t: any, e: any) {
    return t === e
  }
  J[Z(-348, -e)] = Z(-681, -r)
  J[Z(-n, -473)] = function (t: any, e: any) {
    return t ^ e
  }
  J[Z(-o, -i)] = function (t: any, e: any) {
    return t ^ e
  }
  J[Z(-a, -u)] = function (t: any, e: any) {
    return t & e
  }
  J[Z(-s, -c)] = function (t: any, e: any) {
    return t >>> e
  }
  J[Z(-l, -f)] = function (t: any, e: any) {
    return t ^ e
  }
  J[Z(-p, -h)] = function (t: any, e: any) {
    return t < e
  }
  J[Z(-d, -v)] = function (t: any, e: any) {
    return t ^ e
  }
  J[Z(-g, -396)] = function (t: any, e: any) {
    return t >>> e
  }
  J[Z(-437, -m)] = function (t: any, e: any) {
    return t ^ e
  }

  const $ = J
  const Q = 3988292384

  function Z (t: number, e: number) {
    return a0_0x2923d6(t, e - -Y)
  }

  let tt: number
  let et: number
  let rt = 256
  const nt: number[] = []

  while (rt--) {
    for (et = 8, tt = rt; et--;) {
      tt = (1 & tt ? $[Z(-y, -w)](tt, 1) ^ Q : $[Z(-_, -b)](tt, 1))
    }
    nt[rt] = tt >>> 0
  }

  return function (t: any) {
    const e = 261

    function r (t: number, r: number) {
      return Z(r, t - e)
    }

    if ($[r(-E, -143)](typeof t, $[r(-T, -k)])) {
      let n = 0
      let o = -1
      for (; n < t[r(-x, -S)]; ++n) {
        o = $[r(-A, -252)](nt[$[r(-L, -R)]($[r(-I, -C)](o, 255), t[r(-O, -N) + r(-P, -M)](n))], $[r(-B, -F)](o, 8))
      }
      return $[r(-250, -j)](o, -1) ^ Q
    }

    let n = 0
    let o = -1
    while ($[r(-282, -D)](n, t[r(-323, -U)])) {
      o = $[r(-119, q)](nt[$[r(-G, -H)]($[r(-I, -V)](o, 255), t[n])], $[r(-W, -z)](o, 8))
      ++n
    }

    return $[r(-X, -K)](o, -1) ^ Q
  }
}()

function encrypt_encodeUtf8 (t: string): number[] {
  const e = 206
  const r = 87
  const n = 85
  const o = 109
  const i = 129
  const a = 254
  const u = 106
  const s = 106
  const c = 115
  const l = 77
  const f = 255
  const p = 151
  const h = 5
  const d = 300
  const v = 138
  const g = 347
  const m = 190
  const y = 165
  const w = 169

  const _ = {
    OJbNp: function (t: (s: string) => string, e: string): string {
      return t(e)
    },
    DaKOp: function (t: (s: string) => string, e: string): string {
      return t(e)
    },
    vdWST: function (t: string, e: string): boolean {
      return t === e
    },
    OTDmr: function (t: number, e: number): number {
      return t + e
    },
    UuTzz: function (t: number, e: number): number {
      return t + e
    },
    nfWyB: function (t: (s: string, radix: number) => number, e: string, r: number): number {
      return t(e, r)
    }
  }

  const EMapping: { [key: string]: (...args: any[]) => any } = {
    'OJbNp': _.OJbNp,
    'DaKOp': _.DaKOp,
    'vdWST': _.vdWST,
    'OTDmr': _.OTDmr,
    'UuTzz': _.UuTzz,
    'nfWyB': _.nfWyB
  }


  const b = EMapping[E(-161, -49)](encodeURIComponent, t)

  function E (t: number, e: number): string {
    return a0_0x2923d6(t, e + 711)
  }

  const T: number[] = []
  for (let k = 0; k < b.length; k++) {
    const x = b.charAt(k)
    if (_.vdWST(x, "%")) {
      const S = b.substring(k + 1, k + 3)
      const A = parseInt(S, 16)
      T.push(A)
      k += 2
    } else {
      T.push(x.charCodeAt(0))
    }
  }
  return T
}

const lookup = [
  "Z", "m", "s", "e", "r", "b", "B", "o", "H", "Q", "t",
  "N", "P", "+", "w", "O", "c", "z", "a", "/", "L", "p",
  "n", "g", "G", "8", "y", "J", "q", "4", "2", "K", "W",
  "Y", "j", "0", "D", "S", "f", "d", "i", "k", "x", "3",
  "V", "T", "1", "6", "I", "l", "U", "A", "F", "M", "9",
  "7", "h", "E", "C", "v", "u", "R", "X", "5",
]

function tripletToBase64 (e: number): string {
  return (
    lookup[63 & (e >> 18)] +
    lookup[63 & (e >> 12)] +
    lookup[(e >> 6) & 63] +
    lookup[e & 63]
  )
}

function encodeChunk (e: number[], t: number, r: number): string {
  let m: string[] = []
  for (let b = t; b < r; b += 3) {
    const n = (16711680 & (e[b] << 16)) +
      ((e[b + 1] << 8) & 65280) +
      (e[b + 2] & 255)
    m.push(tripletToBase64(n))
  }
  return m.join('')
}

function encrypt_b64Encode (e: number[]): string {
  const P = e.length
  const W = P % 3
  let U: string[] = []
  const z = 16383
  let H = 0
  const Z = P - W
  while (H < Z) {
    U.push(encodeChunk(e, H, Z < H + z ? Z : H + z))
    H += z
  }
  if (W === 1) {
    const F = e[P - 1]
    U.push(lookup[F >> 2] + lookup[(F << 4) & 63] + "==")
  } else if (W === 2) {
    const F = (e[P - 2] << 8) + e[P - 1]
    U.push(lookup[F >> 10] + lookup[63 & (F >> 4)] +
      lookup[(F << 2) & 63] + "=")
  }
  return U.join('')
}
const encrypt_lookup: number[] = []

function encrypt_encodeChunk (t: number[], e: number, r: number): string {
  const o = 50,
    i = 229,
    a = 178,
    u = 3,
    s = 89,
    c = 161,
    l = 28,
    f = 97,
    p = 28,
    h = 46,
    d = 142,
    v = 19,
    g = 37,
    m = 0,
    y = {
      WiEUW: function (t: number, e: number): boolean {
        return t < e
      },
      Twima: function (t: number, e: number): number {
        return t + e
      },
      rpOJZ: function (t: number, e: number): number {
        return t & e
      },
      oRfEy: function (t: (arg: number) => number, e: number): number {
        return t(e)
      }
    }

  const _ = []
  for (let b = e; y.WiEUW(b, r); b += 3) {
    if (b + 2 >= t.length) break // 确保 b + 2 不超出数组界限
    let n = y.Twima(y.rpOJZ(t[b] << 16, 16711680), y.rpOJZ(t[b + 1] << 8, 65280)) + y.rpOJZ(t[y.Twima(b, 2)], 255)
    _.push(encrypt_tripletToBase64(n))
  }
  return _.join("")
}

function encrypt_tripletToBase64 (t: number): string {
  const e = 975,
    r = 1117,
    n = 1335,
    o = 1277,
    i = 1263,
    a = 1188,
    u = 1306,
    s = 1444,
    c = 1363,
    l = 1324,
    f = 1050,
    p = 1171,
    h = 1180,
    d = 1263,
    v = 1155,
    g = 1306,
    m = 1355,
    y = 966,
    w = 1149,
    _: { [key: string]: (arg1: number, arg2: number) => number } = {}

  function b (t: number, e: number): string {
    return a0_0x2923d6(t, e - 551).toString()
  }

  _[b(1101, 1086)] = function (t: number, e: number): number {
    return t + e
  }
  _[b(e, r)] = function (t: number, e: number): number {
    return t + e
  }
  _[b(1526, n)] = function (t: number, e: number): number {
    return t >> e
  }
  _[b(o, i)] = function (t: number, e: number): number {
    return t & e
  }
  _[b(a, u)] = function (t: number, e: number): number {
    return t >> e
  }
  _[b(s, c)] = function (t: number, e: number): number {
    return t >> e
  }
  _[b(l, 1149)] = function (t: number, e: number): number {
    return t & e
  }

  const E = _
  return E[b(f, 1086)](E[b(1102, 1117)](encrypt_lookup[63 & E[b(p, 1335)](t, 18)], encrypt_lookup[E[b(h, d)](E[b(v, g)](t, 12), 63)]) + encrypt_lookup[E[b(1382, d)](E[b(m, c)](t, 6), 63)], encrypt_lookup[E[b(y, w)](t, 63)]).toString()
}


function a0_0x2923d6 (t: number, e: number) {
  return a0_0x2092(e - 299, t)
}

function a0_0x2092 (t: number, e: any): any {
  const r = a0_0x4562()

  // 使用局部函数代替重新赋值
  const innerFunction = function (t: number, e: any): any {
    return r[t - 194]
  }

  return innerFunction(t, e)
}

function a0_0x4562 () {
  var t = ["YYoSR", "rhOyV", "sxbAo", "aTuAi", "xajtV", "gQbxB", "UmpWx", "ddswA", "kxwhd", "QMvnM", "KabsY", "HoqDm", "fXpGx", "MxRSL", "Twima", "zAnEW", "rqcQI", "join", "userAge", "ZrfCV", "gmYiF", "aToRy", "sfXtM", "A4NjFqY", "kQdeo", "GyHQU", "TUMma", "floor", "String", "cVte9UJ", "lIGVb", "ule", "vQcMj", "HFfzT", "bjZLJ", "getTime", "khMzy", "AIvJY", "ezvVk", "VWXYZab", "HioSg", "14047796pmFjxA", "YQHEl", "AAHOg", "MVfpC", "rpOJZ", "zDsSM", " Object", "AKqWJ", "TmtvD", "x3VT16I", "|7|6|3|", "6|5|3|7", "mqwTT", "oRfEy", "ZUqtM", "AMpFN", "lZzjg", "uanbD", "encodin", "ADzBt", "GAAFA", "vXYvp", "RDgnu", "UZGLM", "DYGiC", "OTDmr", "oLnZX", "UOvBB", "navigat", "moTVi", "__esMod", "KblCWi+", "nUIaV", "AbWfM", "push", "asStrin", "OPQRSTU", "syPaZ", "kOtZv", "WBzOj", "QtAKi", "dQJvJ", "twMTN", "RpTrd", "readFlo", "_hh", "iliLS", "nfWyB", "YQOUV", "Words", "zKqdy", "3|5|2|0", "slice", "cUEKO", "kdtls", "fnCys", "YqUgj", "TukVg", "wYcVv", "VbiwY", "pfBOc", "ZSFiZ", "UoRga", "eUqJS", "jFuNn", "size", "oZFcs", "YOtxY", "csCcj", "LpmsP", "aNnru", "HuPPA", "fuWik", "0XTdDgM", "YeksC", "stringi", "TWRRC", "QodQz", "oEJOH", "ZTzUA", "grmRY", "rotl", "WeJku", "166608rPheNY", "asBytes", "nsRVs", "TqqUf", "toStrin", "znhDm", "rable", "QvcwX", "kAztI", "kJbJF", "nxLqG", "functio", "[object", "vMgSY", "u5wPHsO", "charCod", "|1|8|2|", "THbLr", "wxFrF", "JOGcc", "kieAy", "kLHfg", "_blocks", "LtJdC", "lpzNX", "Illegal", "zrCYZ", "exports", "QLCpu", "oAuNK", "0DSfdik", "fMcPH", "aQDqP", "cdefghi", "456789+", "luphr", "eAt", "|4|7|9|", "hECvuRX", "GBbjK", "_ff", "EtoLj", "RkUqN", "XiASu", "yRnhISG", "DaKOp", "cEthh", "lDyWO", "mYFfI", "747000bpoxxx", "uPINO", "hasOwnP", "OvSbZ", "utf8", "NSbRM", "678834DtOObi", "WiEUW", "oHQtNP+", "jxQfH", "TrFCp", "PeUOX", "RhBYA", "VVqhr", "Aqnje", "5|2|6", "XvsAD", "LISkf", "UpJqT", "KpdHM", "EhmqT", "QVfWN", "constru", "alert", "ymSZq", "Bvk6/7=", "Hex", "indexOf", "4|0", "OyLZz", "EjhiU", "oUlNk", "iamspam", "lePWA", "replace", "RlUQG", "nt ", "endian", "isBuffe", "tvTuG", "length", "oBytes", "oUtLs", "KIBVg", "EfOwb", "dyihR", "QvByC", "lVsog", "HWloQ", "ukdmU", "charAt", "aiPCy", " argume", "nSvaa", "vpnsk", "0|1|8|3", "xyz0123", "oZrdv", "|1|4", "vCMhQ", "dTDnB", "HIJKLMN", "stringT", "undefin", "2983832yCfWmB", "MVMuH", "rCode", "a2r1ZQo", "pFhMH", "VzRME", "LbIVv", "vdWST", "SCUrw", "LpfE8xz", "_gg", "pUeCm", "IkSKP", "XMnZK", "isipE", "UuTzz", "substr", "wBwKE", "VWADf", "iRRsj", "cwtZh", "bin", "QDDcY", "KPDsF", "ctor", "dZDTV", "enumera", "_isBuff", "RuOzo", "CaLuR", "dqkPn", "oKmZD", "POmcO", "rZygc", "KCdCY", "UVUok", "dHVwa", "get", "DAxHG", "pBFAI", "IXUYL", "jgCKA", "bytesTo", "OJbNp", "fromCha", "|2|6|7|", "string", "binary", "q42KWYj", "YadeM", "WpMRH", "roperty", "PnfZL", "random", "sxJcO", "aILdC", "ABCDEFG", "split", "jklmnop", "wrjdQ", "RChcL", "Korlo", "lUAFM97", "1|5|0|3", "rLPoA", "fsfWX", "LZldE", "dXPDy", "configu", "fHaED", "OjOSM", "defineP", "PKMEb", "NUDjq", "RoYii", "bZadJ", "pow", "ugRAu", "QtAXc", "ize", "ZmserbB", " Array]", "tiWCE", "ApyeS", "YjOdD", "default", "MbCqK", "dWDRM", "eqtAt", "isNoh", "_ii", "mQftZ", "wordsTo", "yOCos", "YazxT", "dYrlI", "rbvpK", "Fxjya", "call", "_digest", "pngG8yJ", "zuxrg", "xycJU", "KGBPZ", "dwkbK", "nmEYA", "AIwtp", "HoRIs", "eiUxV", "isArray", "XjFqq", "YLkkY", "dIINx", "avjRj", "XiUBb", "IFlYW", "wOcza/L", "1108521TgMXYJ", "XRaRa", "UfZiV", "test", "GIlRJ", "YxRuc", "mDArr", "5|4|0|1", "5303600OvAwBy", "tQrlu", "PJMqq", "oRPrz", "pxmgV", "eiErr", "Bytes", "xBGAU", "PkOgS", "qrstuvw", "nBYdB", "uYjCR", "prototy", "rAlBp", "atLE", "DJmdg", "FQqah", "Dxojc", "oTyhe", "eMwyL", "AeCLB", "IEDmq", "ble", "dAKMZ", "faved", "xxfUq", "DiTqT", "GBVeZ", "KozBG", "VCkef"]
  const innerFunction = function () {
    return t
  }
  return innerFunction()
}