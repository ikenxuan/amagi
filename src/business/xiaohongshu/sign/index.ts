import { generateX_S } from './generateX_S'
// // @ts-ignore
// import { xsCommon } from './generateX_S_Common.ts.bak'
import { generateX_S_Common } from './generateX_S_Common'
class S {
  x_b3_traceid (): string {
    for (var t = "", e = 0; e < 16; e++)
      t += "abcdef0123456789".charAt(Math.floor(16 * Math.random()))
    return t
  }

  /**
   *
   * @param url 接口地址
   * @param cookie 小红书用户 ck
   * @returns
   */
  x_s (url: string, cookie: string, body?: any) {
    return generateX_S(url, cookie, body)

  }

  x_s_common (data: { 'X-s': string, cookie: string, 'X-t': string }): string {
    return generateX_S_Common(
      data.cookie.includes('a1=') ? data.cookie.split('a1=')[1].split(';')[0] : 'undefined',
      Date.now().toString(),
      data['X-s'],
      '0|0|0|1|0|0|1|0|0|0|1|0|0|0|0'
    )
    // return generateX_S_Common({
    //   x_t: Date.now(),
    //   x_s: data.x_s,
    //   a1: data.cookie.includes('a1=') ? data.cookie.split('a1=')[1].split(';')[0] : 'undefined',
    //   fingerprint: '0|0|0|1|0|0|1|0|0|0|1|0|0|0|0'
    // })
  }
}

export const XiaohongshuSign = new S()