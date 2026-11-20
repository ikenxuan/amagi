import { describe, expect, it, vi } from 'vitest'

import { AmagiHeaders } from '../../core/src/contracts/request'
import { parseWork as appParseWork } from '../../core/src/platforms/douyin/app/endpoints/parseWork'
import { HttpClient } from '../../core/src/transport/client'
import { captureRaw } from '../server/record'

describe('App 控制台录样本', () => {
  it('签名失败对象不能成为抖音业务响应样本', async () => {
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
      douyinApp: { signerBaseUrl: 'http://127.0.0.1:8793' }
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(captured.raw).toBeUndefined()
    expect(captured.http.status).toBe(0)
    expect(captured.message).toContain('签名')
  })
})
