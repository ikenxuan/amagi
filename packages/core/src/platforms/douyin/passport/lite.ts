import type { Http } from './client'
/**
 * desktop lite Passport 传输层（imdesktop 域 + jumpbyte a_bogus 签名）。
 * 供扫码 MFA 与登录安全验证共用。
 */
import { im } from './const'
import { aBogusDesktop } from './sign/bogus'
import { encodeDesktopParams, randomHex, randomMsToken } from './sign/qs'

/** 未注册设备时 lite 接口的进程内随机 DID 兜底 */
const fallbackDid = randomHex(16)

/** desktop lite 基础查询（字段顺序对齐 jumpbyte canonical） */
const liteQuery = (deviceId: string): Record<string, string> => ({
  passport_jssdk_version: '5.1.2',
  passport_jssdk_type: 'lite',
  is_from_ttaccountsdk: '1',
  aid: im.aid,
  language: 'zh',
  account_app_language: 'zh',
  is_new_login: '1',
  is_from_iesaccountsaas: '1',
  biz_trace_id: randomHex(8),
  new_authn_sdk_version: '1.0.0.421-web',
  device_id: deviceId,
  iid: '0',
  version_code: im.version,
  device_platform: 'PC'
})

/** desktop lite MFA / 安全验证接口响应 envelope */
export interface MfaRes {
  message?: string
  data: {
    mobile?: string | number
    ticket?: string
    error_code?: number
    description?: string
    [key: string]: unknown
  }
}

/** desktop lite Passport 表单 POST */
export async function form(http: Http, path: string, body: Record<string, string>): Promise<MfaRes> {
  const query = { ...liteQuery(http.hasDevice() ? http.deviceId : fallbackDid), msToken: randomMsToken() }
  const bodyWire = encodeDesktopParams(body)
  const queryWire = encodeDesktopParams(query)
  const bogus = aBogusDesktop({ userAgent: http.ua, query: queryWire, body: bodyWire })
  const url = `${im.origin}${path}?${queryWire}&a_bogus=${encodeURIComponent(bogus)}`
  const res = await http.json<MfaRes>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: im.origin
    },
    data: bodyWire
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${path} failed: HTTP ${res.status} ${res.raw.slice(0, 200)}`)
  }
  return res.body
}
