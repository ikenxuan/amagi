/**
 *
 * @param a1 cookies 的 a1 参数
 * @param x_t xt 参数
 * @param x_s xs 参数
 * @param fingerprint 浏览器指纹
 * @returns
 */
export const generateX_S_Common = (a1: string, x_t: string, x_s: string, fingerprint?: string) => {
  const r = [
    "a2r1ZQo",
    "charCod",
    "fcJZj",
    "bytesTo",
    "_hh",
    "amMEV",
    "test",
    "qrstuvw",
    "|7|1|8|",
    "LpfE8xz",
    "2484436oCuHeM",
    "substr",
    "wQIlT",
    "ptuhI",
    "iHgZg",
    "eoHfh",
    "|0|5|4|",
    "rable",
    "String",
    "eMgNI",
    "alert",
    " argume",
    "HcQtD",
    "6|9|2|5",
    "yHssg",
    "lQrIV",
    "wrNWJ",
    "LDZzf",
    "zUdri",
    "lOvpG",
    "PKfMB",
    "uvAcE",
    "FpaZM",
    "A4NjFqY",
    "xTjMm",
    "bjRCG",
    "prototy",
    "zVuPl",
    "hECvuRX",
    "WnPGl",
    "xSAOj",
    "rotl",
    "svcRz",
    "3|1|0|5",
    "binary",
    "MzIIu",
    "weYxc",
    "adztu",
    "constru",
    "hyoem",
    "WZJNP",
    "yRDQP",
    "rcibI",
    "noYSu",
    "vtlxb",
    "otnJK",
    "kNwEp",
    "swDsC",
    "wglkV",
    "isArray",
    "undefin",
    "KdZPH",
    "readFlo",
    "dQbKw",
    "indexOf",
    "4|0|1|7",
    "_digest",
    "length",
    "VoKJS",
    "XPKrF",
    "jklmnop",
    "DNiKZ",
    "426432ompcln",
    "nacEY",
    "wMPvT",
    "ARyzf",
    "XYjop",
    "ycqKc",
    "wordsTo",
    "push",
    "oILkc",
    "MKhPs",
    "KBzpN",
    "charAt",
    "ekWdI",
    "XPqkg",
    "ble",
    "__esMod",
    "SritR",
    "sQYkV",
    "REfgq",
    "vVhJX",
    "18BZGxCc",
    "oBytes",
    "cdefghi",
    "JQMmQ",
    "LbTtx",
    "3|1|2|7",
    "CjuVd",
    "vpDix",
    "EJkCm",
    "JtNQV",
    "rKkrc",
    "koOgW",
    "NqSaj",
    "rCode",
    "|2|4",
    "u5wPHsO",
    "lUAFM97",
    "join",
    "bin",
    "QnDGB",
    "WJQkw",
    "kAfVR",
    "KJEUB",
    "ZgtEH",
    "xvYNk",
    "JSPgp",
    "YUclm",
    "lOQoH",
    "UeOpE",
    "toStrin",
    "floor",
    "bcExD",
    "1138338tisTPs",
    "oJhNC",
    "0XTdDgM",
    "defineP",
    "iamspam",
    "XgEHW",
    "VMlXa",
    "NuESW",
    "exports",
    "KblCWi+",
    "KWIPM",
    "configu",
    "LKjbB",
    "[object",
    "zujnu",
    "UxShG",
    "enumera",
    "zvigo",
    "isBuffe",
    "OIUKI",
    "vrtAe",
    "yRnhISG",
    "nNswt",
    "CETMA",
    "yeewt",
    "FjySX",
    "Wrzlo",
    "_blocks",
    "TnNqZ",
    "hJWBc",
    "GXwNT",
    "rFfom",
    "wlMIe",
    "q42KWYj",
    "XvbAQ",
    "VJcfp",
    "ctor",
    "utf8",
    "get",
    "Bkmpz",
    "ZMLCD",
    "OAxXI",
    "HIJKLMN",
    "RxubR",
    "DwSEn",
    "RgFVi",
    "cGydf",
    "iMrwJ",
    "WSLjK",
    "UgrKe",
    "replace",
    "511077NzzaGU",
    "hcUaR",
    "IhPtE",
    "xGGTF",
    "gmCro",
    "MTpPz",
    "MhAtY",
    "KJfAb",
    "VWXYZab",
    "dBEUD",
    "YKVcV",
    "pow",
    "PFcHx",
    "CRGHn",
    "GYFzd",
    "usNzj",
    "_ii",
    "RdKXK",
    "pYmNK",
    "uGyia",
    "cmTtP",
    "wOcza/L",
    "IXiGa",
    "xyz0123",
    "BaAov",
    "lYBrT",
    "DRmvP",
    "XmPnm",
    "aWCCy",
    "uGGKn",
    "encodin",
    "xYaZZ",
    "atLE",
    "gaXnw",
    "hpvhj",
    "size",
    "QaVmD",
    "getTime",
    "xwjZM",
    "Illegal",
    "1915088LOuxXC",
    "lRsmX",
    "fromCha",
    "XqrEV",
    "tsFKp",
    "oDsdr",
    "kNFav",
    "nvwrG",
    "xdSEr",
    "WVHkM",
    "pKrzH",
    "ize",
    "zXJTf",
    "xOUsZ",
    "ule",
    "5278889biZuxO",
    "CnHpM",
    "QvpcT",
    "hasOwnP",
    "zgSxz",
    "PGjnV",
    "eAt",
    "cOFWl",
    "bxwCP",
    "Bvk6/7=",
    "EVbLj",
    "ZdEqk",
    "qeWwX",
    "3|4|0",
    "hCNPL",
    "asBytes",
    "GSFdP",
    "456789+",
    "LoRvO",
    "615820BhUAOn",
    "ymCct",
    "endian",
    "POkwq",
    "SRrZy",
    "x3VT16I",
    "UPJZx",
    "userAge",
    "YrxgM",
    "KtsHt",
    "oRVoy",
    "VsIqu",
    "IpOsG",
    "edJIP",
    "BRJOV",
    " Object",
    "call",
    "uOSvV",
    "bZkXX",
    "yoGhc",
    "Bytes",
    "OajSo",
    "hcAOZ",
    "TCndc",
    "5cZzete",
    "ESuxn",
    "PrtZi",
    "xVBWW",
    "default",
    "sHwlc",
    "GOcHL",
    "ZmserbB",
    "IQGuL",
    "qHhny",
    "stringT",
    "navigat",
    "mKGlM",
    "FyIgG",
    "random",
    "QLlYm",
    "|2|5|3|",
    "roperty",
    "Hex",
    "nt ",
    "bMCpP",
    "functio",
    "asStrin",
    "EuFYO",
    "cVte9UJ",
    "xDUPY",
    "UXDJt",
    "KjSDH",
    "FUNYr",
    "yXJkX",
    "pngG8yJ",
    "zRDHC",
    "cIDrv",
    "split",
    "FnlQW",
    "riAqL",
    "GmOGO",
    "vzZEC",
    "slice",
    "nLgjc",
    "stringi",
    "WyPxe",
    "BrDUy",
    "qpboh",
    "CZXSy",
    "nMHVI",
    "BiXDC",
    "UJXcT",
    "Words",
    "DLkoH",
    "_isBuff",
    "ABCDEFG",
    "OsFze",
    "oHQtNP+",
    "szLAG",
    "dLJAT",
    "fnzLJ",
    "yxUKW",
    "NBKNO",
    "ntybJ",
    " Array]",
    "WqCRu",
    "oOWUm",
    "Ehneo",
    "wxDaz",
    "OPQRSTU",
    "fpiZZ",
    "_ff",
    "dKIRL",
    "cBQxr",
    "EEXKq",
    "string",
    "_gg",
    "eOqDH",
    "WGwra",
    "0DSfdik"
  ]

  const encrypt_lookup = [
    "Z",
    "m",
    "s",
    "e",
    "r",
    "b",
    "B",
    "o",
    "H",
    "Q",
    "t",
    "N",
    "P",
    "+",
    "w",
    "O",
    "c",
    "z",
    "a",
    "/",
    "L",
    "p",
    "n",
    "g",
    "G",
    "8",
    "y",
    "J",
    "q",
    "4",
    "2",
    "K",
    "W",
    "Y",
    "j",
    "0",
    "D",
    "S",
    "f",
    "d",
    "i",
    "k",
    "x",
    "3",
    "V",
    "T",
    "1",
    "6",
    "I",
    "l",
    "U",
    "A",
    "F",
    "M",
    "9",
    "7",
    "h",
    "E",
    "C",
    "v",
    "u",
    "R",
    "X",
    "5"
  ]

  const a0_0x2e01 = function (e: number, t: any) {
    return r[e -= 125]
  }

  function a0_0xb6ac53 (e: number, t: any) {
    return a0_0x2e01(e - -723, t)
  }
  function T (e: any, t: number) {
    return a0_0xb6ac53(t - 194, e)
  }
  function encrypt_encodeUtf8 (e: string): number[] {
    var t = 119
      , r = 183
      , n = 446
      , o = 451
      , i = 248
      , a = 246
      , s = 237
      , u = 162
      , c = 321
      , l = 22
      , f = 142
      , p = 135
      , d = 193
      , v = 285
      , h = 146
      , g = 309
      , m = 325
      , y = 410
      , w = 403
      , _ = 152
      , b = 168
      , E:any = {
        IQGuL: function (e: (arg0: any) => any, t: any) {
          return e(t)
        },
        kNFav: function (e: number, t: number) {
          return e < t
        },
        wlMIe: function (e: any, t: any) {
          return e === t
        },
        RxubR: function (e: any, t: any) {
          return e + t
        },
        edJIP: function (e: any, t: any) {
          return e + t
        },
        QaVmD: function (e: any, t: any) {
          return e + t
        },
        KtsHt: function (e: (arg0: any, arg1: any) => any, t: any, r: any) {
          return e(t, r)
        },
        Wrzlo: function (e: number, t: number) {
          return e >> t
        }
      }
      , k = E[T(-78, -123)](encodeURIComponent, e)
    function T (e: number, t: number): any {
      return a0_0xb6ac53(t - 194, e)
    }
    for (var S: any[] = [], x = 0; E[T(-t, -r)](x, k[T(-n, -337)]); x++) {
      var A = k[T(-o, -321)](x)
      if (E[T(-283, -i)](A, "%")) {
        var R = E[T(-a, -s)](k[T(-u, -c)](E[T(l, -f)](x, 1)), k[T(-264, -321)](E[T(-p, -d)](x, 2)))
          , C = E[T(-v, -h)](parseInt, R, 16)
        S[T(-315, -325)](C),
        x += 2
      } else
        S[T(-g, -m)](A[T(-y, -w) + T(-_, -b)](0))
    }
    return S
  }


  function encrypt_tripletToBase64 (e: number) {
    var t = 134
      , r = 14
      , n = 26
      , o = 92
      , i = 97
      , a = 91
      , s = 80
      , u = 3
      , c = 125
      , l = 32
      , f = 26
      , p = 92
      , d = 91
      , v = 131
      , h = 80
      , g = 100
      , m = 178
      , y = 38
      , w = 466
      , _: any = {}
    function b (e: number, t: number) {
      return a0_0xb6ac53(t - w, e)
    }
    _[b(126, t)] = function (e: any, t: any) {
      return e + t
    }
    ,
    _[b(r, n)] = function (e: any, t: any) {
      return e + t
    }
    ,
    _[b(98, o)] = function (e: number, t: number) {
      return e & t
    }
    ,
    _[b(i, a)] = function (e: number, t: number) {
      return e >> t
    }
    ,
    _[b(44, -s)] = function (e: number, t: number) {
      return e & t
    }
    ,
    _[b(-u, c)] = function (e: number, t: number) {
      return e & t
    }
    ,
    _[b(293, 128)] = function (e: number, t: number) {
      return e >> t
    }

    var E = _
    return E[b(84, t)](E[b(l, f)](encrypt_lookup[E[b(75, p)](E[b(128, d)](e, 18), 63)] + encrypt_lookup[E[b(-v, -h)](E[b(g, d)](e, 12), 63)], encrypt_lookup[E[b(m, 125)](E[b(-y, 128)](e, 6), 63)]), encrypt_lookup[63 & e])
  }

  function encrypt_encodeChunk (e: { [x: string]: any }, t: any, r: any) {
    var n, o = 684, i = 827, a = 594, s = 639, u = 650, c = 577, l = 809, f = 850, p = 743, d = 548, v = 713, h = 541, g = 224, m: any = {
      zujnu: function (e: number, t: number) {
        return e < t
      },
      CZXSy: function (e: any, t: any) {
        return e + t
      },
      xOUsZ: function (e: number, t: number) {
        return e << t
      },
      WSLjK: function (e: number, t: number) {
        return e & t
      },
      ptuhI: function (e: number, t: number) {
        return e & t
      },
      ESuxn: function (e: (arg0: any) => any, t: any) {
        return e(t)
      }
    }
    function y (e: number, t: number): any {
      return a0_0xb6ac53(e - -g, t)
    }
    for (var w: any[] = [], _ = t; m[y(-o, -i)](_, r); _ += 3)
      n = m[y(-505, -462)]((16711680 & m[y(-a, -s)](e[_], 16)) + m[y(-u, -c)](e[_ + 1] << 8, 65280), m[y(-l, -f)](e[m[y(-505, -594)](_, 2)], 255)),
      w[y(-p, -915)](m[y(-d, -641)](encrypt_tripletToBase64, n))
    return w[y(-v, -h)]("")
  }


  function encrypt_b64Encode (e: any[]) {
    var t = 700
      , r = 832
      , n = 945
      , o = 1122
      , i = 806
      , a = 883
      , s = 1032
      , u = 885
      , c = 870
      , l = 904
      , f = 833
      , p = 895
      , d = 1028
      , v = 949
      , h = 848
      , g = 696
      , m = 1120
      , y = 983
      , w = 1104
      , _ = 877
      , b = 853
      , E = 1069
      , k = 1120
      , T = 911
      , S = 900
      , x = 1041
      , A = 1232
      , R = 899
      , C = 960
      , I = 1187
      , O = 1079
      , P = 1025
      , N = 1056
      , L = 854
      , M = 796
      , B = 850
      , D = 1107
      , F = 946
      , j = 917
      , U = 925
      , q = 1414
      , H: any = {
        XgEHW: W(1059, 913) + W(t, r) + "6",
        XPKrF: function (e: number, t: number) {
          return e % t
        },
        vtlxb: function (e: any, t: any) {
          return e === t
        },
        SritR: function (e: number, t: number) {
          return e - t
        },
        zRDHC: function (e: any, t: any) {
          return e + t
        },
        FpaZM: function (e: number, t: number) {
          return e << t
        },
        QLlYm: function (e: number, t: number) {
          return e << t
        },
        zVuPl: function (e: number, t: number) {
          return e - t
        },
        ekWdI: function (e: any, t: any) {
          return e + t
        },
        VMlXa: function (e: any, t: any) {
          return e + t
        },
        WGwra: function (e: number, t: number) {
          return e >> t
        },
        vrtAe: function (e: number, t: number) {
          return e >> t
        },
        LoRvO: function (e: number, t: number) {
          return e & t
        },
        BRJOV: function (e: number, t: number) {
          return e << t
        },
        EVbLj: function (e: number, t: number) {
          return e < t
        },
        CnHpM: function (e: (arg0: any, arg1: any, arg2: any) => any, t: any, r: any, n: any) {
          return e(t, r, n)
        },
        xTjMm: function (e: number, t: number) {
          return e > t
        }
      }
      , V = H[W(1071, n)][W(1150, o)]("|")
      , G = 0
    function W (e: number, t: number): any {
      return a0_0xb6ac53(t - q, e)
    }
    for (; ;) {
      var $: any, z = 1
      switch (V[G++]) {
        case "0":
          var z = 16383
          continue
        case "1":
          var X = e[W(i, a)]
          continue
        case "2":
          var K = H[W(s, u)](X, 3)
          continue
        case "3":
          var J
          continue
        case "4":
          H[W(875, c)](K, 1) ? (J = e[H[W(753, l)](X, 1)],
          $[W(f, p)](H[W(d, 1120)](encrypt_lookup[J >> 2] + encrypt_lookup[63 & H[W(v, h)](J, 4)], "=="))) : H[W(g, c)](K, 2) && (J = H[W(1212, m)](H[W(y, w)](e[H[W(_, 853)](X, 2)], 8), e[H[W(894, b)](X, 1)]),
          $[W(779, p)](H[W(E, k)](H[W(T, S)](H[W(x, 946)](encrypt_lookup[H[W(A, 1163)](J, 10)], encrypt_lookup[63 & H[W(R, C)](J, 4)]), encrypt_lookup[H[W(I, 1064)](H[W(1031, O)](J, 2), 63)]), "=")))
          continue
        case "5":
          for (var Y = 0, Q = H[W(830, b)](X, K); H[W(P, N)](Y, Q); Y += z)
            $[W(L, p)](H[W(976, 1047)](encrypt_encodeChunk, e, Y, H[W(M, B)](Y + z, Q) ? Q : H[W(D, F)](Y, z)))
          continue
        case "6":
          return $[W(j, U)]("")
        case "7":
          $ = []
          continue
      }
      break
    }
  }

  var encrypt_mcr = function (e: string = '') {
    var t = 7
      , r = 36
      , n = 185
      , o = 160
      , i = 91
      , a = 165
      , s = 112
      , u = 46
      , c = 86
      , l = 48
      , f = 265
      , p = 760
      , d = 596
      , v = 740
      , h = 613
      , g = 507
      , m = 471
      , y = 414
      , w = 588
      , _ = 544
      , b = 654
      , E = 589
      , k = 500
      , T = 658
      , S = 485
      , x = 479
      , A = 486
      , R = 418
      , C = 586
      , I = 665
      , O = 437
      , P = 531
      , N = 531
      , L = 439
      , M: any = {}
    M[H(-33, 19)] = function (e: any, t: any) {
      return e === t
    }
    ,
    M[H(t, r)] = H(19, n),
    M[H(-146, -70)] = function (e: number, t: number) {
      return e < t
    }
    ,
    M[H(o, 11)] = function (e: number, t: number) {
      return e ^ t
    }
    ,
    M[H(-176, -i)] = function (e: number, t: number) {
      return e ^ t
    }
    ,
    M[H(123, 9)] = function (e: number, t: number) {
      return e & t
    }
    ,
    M[H(a, s)] = function (e: number, t: number) {
      return e >>> t
    }
    ,
    M[H(-189, -u)] = function (e: number, t: number) {
      return e ^ t
    }

    for (var B, D, F = M, j = 3988292384, U = 256, q: any[] = []; U--; q[U] = F[H(c, s)](B, 0))
      for (D = 8,
      B = U; D--;)
        B = 1 & B ? F[H(-l, -u)](F[H(f, 112)](B, 1), j) : F[H(87, s)](B, 1)
    function H (e: number, t: number) {
      return a0_0xb6ac53(t - L, e)
    }
    return function (e: any) {
      function t (e: number, t: number): any {
        return H(e, t - 577)
      }
      if (F[t(p, d)]('string', 'string')) {
        for (var r = 0, n = -1; F[t(446, g)](r, e[t(m, 485)]); ++r)
          n = q[F[t(y, w)](255 & n, e[t(_, 419) + t(696, b)](r))] ^ n >>> 8
        return F[t(E, 486)](n, -1) ^ j
      }
      for (r = 0,
      n = -1; F[t(k, g)](r, e[t(T, S)]); ++r)
        n = F[t(x, A)](q[F[t(R, C)](n, 255) ^ e[r]], F[t(I, 689)](n, 8))
      return F[t(O, P)](F[t(502, N)](n, -1), j)
    }
  }()

  // const zhiwen = 'I38rHdgsjopgIvesdVwgIC+oIELmBZ5e3VwXLgFTIxS3bqwErFeexd0ekncAzMFYnqthIhJeSBMDKutRI3KsYorWHPtGrbV0P9WfIi/eWc6eYqtyQApPI37ekmR6QL+5Ii6sdneeSfqYHqwl2qt5B0DBIx+PGDi/sVtkIxdsxuwr4qtiIhuaIE3e3LV0I3VTIC7e0utl2ADmsLveDSKsSPw5IEvsiVtJOqw8BuwfPpdeTFWOIx4TIiu6ZPwrPut5IvlaLbgs3qtxIxes1VwHIkumIkIyejgsY/WTge7eSqte/D7sDcpipedeYrDtIC6eDVw2IENsSqtlnlSuNjVtIx5e1qt3bmAeVn8LIESaIEY+wn4iI3Yq8lEgIkLxoqwkICqV2d3ejIgs1uwRIvge00de00uPIi7e1bmDyuwuIiKeTf0sxm/e1Vt4LsJeWVwRIvYpaAdedVwALngsfPwgIxQrIvkkoVwGzVw+ag4QPW/edngeTVwoIEosjBAsxLrvIE0s0L3s6fGdIhNs3uwvIEmWtuwpOqwCI3JeTVtFIk3siqwVIEosfVtFNVwJsuwXIvHAIxh/8oHW2ZgexVt7IhhKIiNeDqw4rY+z/U6sYa+TIiPe4VtbmqwlIv6exVtDtF/eTm7sVDTeIhOskdgs3qtcpPwoIC0ejqwRIi/eT/ieIvNedfNefPt7Ix0s1uwu2fWBIEcnICgsVM6s6eesSI3eDVtQIvzzIxcEaqwpI3+CIk3s6FD3GUOsjutaIEM2mPtXylAsdM6efqwBeVwJIC+xIiqNpuwG8utbIvoe0zNskut2rVw2Ik4Urut4Iv8Qzs4ZIEve0agedD3edutQwI=='

  const c = x_t
  const l = x_s
  const h = {
    s0: 5,
    s1: '',
    x0: '1',
    x1: '3.8.7',
    x2: 'Windows',
    x3: 'xhs-pc-web',
    x4: '4.46.0',
    x5: a1, //ck a1值
    x6: x_t, // x-t值
    x7: x_s, // x-s的值
    x8: fingerprint, // 浏览器指纹
    x9: encrypt_mcr(c + l + fingerprint),
    x10: '286'
  }

  const xsc = encrypt_b64Encode(encrypt_encodeUtf8(JSON.stringify(h)))
  console.log('X-s-common: ' + xsc)
  return xsc
}
