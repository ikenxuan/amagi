import { fetchData } from 'amagi/model'
import { bilibiliApiUrls, wbi_sign } from 'amagi/platform/bilibili'

/**
 * 生成B站视频流请求参数
 * @param BASEURL - 基础请求URL
 * @param cookie - 用户Cookie
 * @returns 包含查询参数、登录状态和VIP状态的对象
 */
export const qtparam = async (BASEURL: string, cookie: string) => {
  if (cookie === '') return { QUERY: '&platform=html5', STATUS: '!isLogin' }

  const logininfo = await fetchData({ url: bilibiliApiUrls.getLoginStatus(), headers: { Cookie: cookie } }) as any
  const sign = await wbi_sign(BASEURL, cookie)

  const qn = [6, 16, 32, 64, 74, 80, 112, 116, 120, 125, 126, 127]
  let isvip
  logininfo.data.vipStatus === 1 ? (isvip = true) : (isvip = false)

  if (isvip) {
    // fnval = 16(DASH) | 64(HDR) | 128(4K) | 256(杜比音频) | 512(杜比视界) | 1024(8K) | 2048(AV1) = 4048
    const fnval = 4048
    return {
      QUERY: `&fnval=${fnval}&fourk=1&${sign}`,
      STATUS: 'isLogin',
      isvip
    }
  } else {
    // 最高720P
    return {
      QUERY: `&qn=${qn[3]}&fnval=16&${sign}`,
      STATUS: 'isLogin',
      isvip
    }
  }
}
