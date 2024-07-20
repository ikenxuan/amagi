import { Config, Networks } from 'amagi/model'
import { BiLiBiLiAPI, wbi_sign } from 'amagi/business/bilibili'

export default async function qtparam (BASEURL: string) {
  if (Config.bilibili == '') return { QUERY: '&platform=html5', STATUS: '!isLogin' }
  const logininfo = await new Networks({ url: BiLiBiLiAPI.LOGIN_INFO(), headers: { Cookie: Config.bilibili } }).getData()
  const sign = await wbi_sign(BASEURL)

  const qn = [6, 16, 32, 64, 74, 80, 112, 116, 120, 125, 126, 127]
  let isvip
  logininfo.data.vipStatus === 1 ? (isvip = true) : (isvip = false)
  if (isvip) {
    return { QUERY: `&fnval=16&fourk=1&${sign}`, STATUS: 'isLogin', isvip }
  } else return { QUERY: `&qn=${qn[3]}&fnval=16`, STATUS: 'isLogin', isvip }
}
