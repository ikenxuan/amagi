import { describe, expect, it, vi } from 'vitest'

import { AmagiHeaders } from '../../core/src/contracts/request'
import { parseWork as appParseWork } from '../../core/src/platforms/douyin/app/endpoints/parseWork'
import { AppCookieJar } from '../../core/src/platforms/douyin/app/guest/cookies'
import { createAppDevice } from '../../core/src/platforms/douyin/app/guest/device'
import { HttpClient } from '../../core/src/transport/client'
import { captureRaw } from '../server/record'

describe('App 控制台录样本', () => {
  it('签名失败对象不能成为抖音业务响应样本', async () => {
    // 显式导入已注册的测试会话，保证本用例到达业务签名，不依赖本地默认游客缓存。
    const device = { ...createAppDevice(), device_id: '123456789', install_id: '987654321' }
    const cookies = new AppCookieJar()
    cookies.accept('https://aweme.snssdk.com/', ['ttwid=test-guest; Domain=.snssdk.com; Path=/; Secure'])
    const send = vi.spyOn(HttpClient.prototype, 'send').mockImplementation(async (spec) => ({
      status: 200,
      headers: new AmagiHeaders(),
      body: { ok: false, error: 'identity_not_ready' },
      durationMs: 1,
      url: spec.url
    }))
    const captured = await captureRaw({
      def: appParseWork,
      platform: 'douyin',
      cookie: '',
      params: { aweme_id: '1' },
      clientId: 'test',
      douyinApp: {
        signerBaseUrl: 'http://127.0.0.1:8793',
        session: { version: 1, device, cookies: cookies.serialize(), refreshedAt: Date.now() }
      }
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].url).toBe('http://127.0.0.1:8793/v1/app/sign')
    expect(captured.raw).toBeUndefined()
    expect(captured.http.status).toBe(0)
    expect(captured.message).toContain('签名')
  })
})
