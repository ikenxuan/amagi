import { AppCookieJar } from 'amagi/platforms/douyin/app/guest/cookies'
import { createAppDevice } from 'amagi/platforms/douyin/app/guest/device'
import type { AppGuestSnapshot } from 'amagi/platforms/douyin/app/guest/state'

interface SigningRequest {
  url: string
  method: string
  headers: Record<string, string>
}

export const createDouyinAppSessionSnapshot = (ttwid = 'visitor'): AppGuestSnapshot => {
  const device = createAppDevice()
  device.device_id = '123456789'
  device.install_id = '987654321'

  const cookies = new AppCookieJar()
  cookies.accept('https://aweme.snssdk.com/', [`ttwid=${ttwid}; Domain=.snssdk.com; Path=/; Secure`])

  return { version: 1, device, cookies: cookies.serialize(), refreshedAt: Date.now() }
}

export const signedAppResponse = (requestData: unknown, extraHeaders: Record<string, string> = {}) => {
  const request = JSON.parse(String(requestData)) as SigningRequest
  return {
    ok: true,
    signObject: {
      url: request.url,
      method: request.method,
      headers: { ...request.headers, ...extraHeaders }
    }
  }
}
