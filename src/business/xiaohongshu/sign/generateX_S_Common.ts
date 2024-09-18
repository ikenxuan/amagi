export function xsCommon (t: { a1: any; x_t: string; x_s: string; fingerprint: any }) {
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
    x9: encrypt_mcr("".concat(t.x_t).concat(t.x_s)),
    x10: 20
  }
  const utf8String = String.fromCharCode(...encrypt_encodeUtf8(JSON.stringify(k)))
  return encrypt_b64Encode(utf8String)
}

function encrypt_mcr (t: any): any {
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
}

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

function encrypt_b64Encode (t: string): string {
  const e = 318,
    r = 252,
    n = 296,
    o = 191,
    i = 300,
    a = 40,
    u = 36,
    s = 226,
    c = 272,
    l = 263,
    f = 380,
    p = 35,
    h = 74,
    d = 9,
    v = 295,
    g = 307,
    m = 298,
    y = 124,
    w = 49,
    _ = 5,
    b = 139,
    E = 157,
    T = 236,
    k = 145,
    x = 265,
    S = 30,
    A = 103,
    L = 88,
    R = 296,
    I = 28,
    C = 190,
    O = 32,
    N = 216,
    P = 36,
    M = 51,
    B = 20,
    F = 218,
    j = 224,
    D = 263,
    U = 447,
    q = 81,
    G = 161,
    H = 237,
    V = 36,
    W = 212,
    z = 295,
    X = 130,
    K = 46,
    Y = 78,
    J = 479,
    $ = 306,
    Q = 441,
    Z = 358,
    tt = 124,
    et = 279,
    rt = 134,
    nt = 821,
    ot: { [key: string]: (arg1: any, arg2?: any) => any } = {}

  function it (t: number, e: number): string {
    return a0_0x2923d6(e, t - -nt)
  }

  ot[it(-e, -344)] = function (t: number, e: number): number {
    return t % e
  }
  ot[it(-88, -r)] = function (t: number, e: number): number {
    return t - e
  }
  ot[it(-n, -160)] = function (t: number, e: number): boolean {
    return t < e
  }
  ot[it(-o, -i)] = function (t: number, e: number): boolean {
    return t > e
  }
  ot[it(-a, -174)] = function (t: number, e: number): number {
    return t + e
  }
  ot[it(-u, -s)] = function (t: number, e: number): boolean {
    return t === e
  }
  ot[it(-218, -c)] = function (t: number, e: number): number {
    return t + e
  }
  ot[it(-l, -f)] = function (t: number, e: number): number {
    return t >> e
  }
  ot[it(p, -h)] = function (t: number, e: number): number {
    return t & e
  }
  ot[it(-161, d)] = function (t: number, e: number): number {
    return t << e
  }
  ot[it(-v, -g)] = function (t: number, e: number): number {
    return t << e
  }
  ot[it(-306, -m)] = function (t: number, e: number): number {
    return t + e
  }
  ot[it(-y, 38)] = function (t: number, e: number): number {
    return t >> e
  }
  ot[it(w, -_)] = function (t: number, e: number): number {
    return t & e
  }

  let pt: string[] = []
  let ht: number = 0
  let ct: number = 0
  let ft: number = 0
  let lt: number | undefined

  for (let ut = `${it(-b, 13) + it(-E, -T) + "4"}|`; ;) {
    switch (ut.charCodeAt(0)) {
      case 48: // "0"
        ct = ot[it(-e, -x)](ht, 3)
        break
      case 49: // "1"
        lt = undefined
        break
      case 50: // "2"
        ft = 16383
        break
      case 51: // "3"
        pt = []
        break
      case 52: // "4"
        return pt.join("")
      case 53: // "5"
        ht = t.charCodeAt(0)
        break
      case 54: // "6"
        for (let dt = 0, vt = ot[it(-L, 65)](ht, ct); ot[it(-R, -236)](dt, vt); dt += ft)
          pt.push(encrypt_encodeChunk(t, dt, ot[it(-o, -O)](dt + ft, vt) ? vt : ot[it(-a, -N)](dt, ft)))
        break
      case 55: // "7"
        if (ot[it(-P, -155)](ct, 1)) {
          lt = t.charCodeAt(ht - 1)
          pt.push(ot[it(-40, -B)](ot[it(-F, -j)](encrypt_lookup[ot[it(-D, -U)](lt, 2)], encrypt_lookup[ot[it(p, -q)](ot[it(-G, -H)](lt, 4), 63)]), "=="))
        } else if (ot[it(-V, -W)](ct, 2)) {
          lt = ot[it(-z, -X)](t.charCodeAt(ht - 2), 8) + t.charCodeAt(ot[it(-L, -K)](ht, 1))
          pt.push(ot[it(-306, -J)](ot[it(-$, -281)](ot[it(-306, -Q)](encrypt_lookup[ot[it(-D, -Z)](lt, 10)], encrypt_lookup[63 & ot[it(-tt, -et)](lt, 4)]), encrypt_lookup[ot[it(w, -rt)](ot[it(-295, -274)](lt, 2), 63)]), "="))
        }
        break
    }
    ut = ut.substring(1)
  }
}


const encrypt_lookup: number[] = []

function encrypt_encodeChunk (t: string, e: number, r: number): string {
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
    let n = y.Twima(y.rpOJZ(t.charCodeAt(b) << 16, 16711680), y.rpOJZ(t.charCodeAt(b + 1) << 8, 65280)) + y.rpOJZ(t.charCodeAt(y.Twima(b, 2)), 255)
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