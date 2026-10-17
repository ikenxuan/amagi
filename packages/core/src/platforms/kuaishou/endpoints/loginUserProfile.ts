import zod from 'zod'

import { kuaishouApiUrls } from '../api'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, type } from './define'

/**
 * 当前账号资料，不接用户 ID。响应同时含 eid 和快手号 userDefineId，二者不能互换。
 * GET 无请求体；需登录，已完成设备注册的游客实测返回 result: 109。
 */
export const loginUserProfile = defineKuaishouEndpoint({
  name: 'kuaishou.loginUserProfile',
  route: '/fetch_login_user_profile',
  doc: {
    summary: '当前登录账号资料',
    description: '取当前 cookie 所属账号的资料，不接参数。需要登录态 cookie。'
  },
  params: zod.object({}),
  sign: [hxfalcon()],
  build: () => {
    const req = kuaishouApiUrls.loginUserProfile()
    return { method: req.method, url: req.url }
  },
  response: type<any>()
})
