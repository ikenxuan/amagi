import { Networks } from 'amagi/model'
import { bilibiliApiUrls, wbi_sign } from 'amagi/platform/bilibili'

export const qtparam = async (BASEURL: string, cookie: string) => {
  if (cookie === '') return { QUERY: '&platform=html5', STATUS: '!isLogin' }
  const logininfo = await new Networks({ url: bilibiliApiUrls.登录基本信息(), headers: { Cookie: cookie } }).getData()
  const sign = await wbi_sign(BASEURL, cookie)

  const qn = [6, 16, 32, 64, 74, 80, 112, 116, 120, 125, 126, 127]
  let isvip
  logininfo.data.vipStatus === 1 ? (isvip = true) : (isvip = false)
  if (isvip) {
    return { QUERY: `&fnval=16&fourk=1&${sign}`, STATUS: 'isLogin', isvip }
  } else return { QUERY: `&qn=${qn[3]}&fnval=16`, STATUS: 'isLogin', isvip }
}
