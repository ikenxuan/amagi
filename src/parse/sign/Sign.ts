import { MsToken, AB } from '@zuks/parse/sign'

class Sign {
  Mstoken (length: number) {
    return MsToken(length)
  }

  AB (url: string) {
    return AB(new URLSearchParams(new URL(url).search).toString(),
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0')
  }

  VerifyFpManager () {
    const e = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
    const t = e.length
    const n = new Date().getTime().toString(36)
    const r: (string | number)[] = []

      ; (r[8] = r[13] = r[18] = r[23] = '_'), (r[14] = '4')
    for (var o, i = 0; i < 36; i++) r[i] || ((o = 0 | (Math.random() * t)), (r[i] = e[i == 19 ? (3 & o) | 8 : o]))
    return 'verify_' + n + '_' + r.join('')
  }
}

export default new Sign()
