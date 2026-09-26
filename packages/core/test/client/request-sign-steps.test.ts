import { createRequestModule } from 'amagi/client/request'
import { AmagiHeaders, type RawResponse, type RequestSpec } from 'amagi/contracts/request'
import { aBogus, hxfalcon, msToken, wbi } from 'amagi/exports/sign-steps'
import { resetSharedWbiCache } from 'amagi/platforms/bilibili/sign/steps'
import { resetKuaishouSignerState } from 'amagi/platforms/kuaishou/sign/steps'
import { beforeEach, describe, expect, it } from 'vitest'

import { makeRequestCtx } from '../helpers/request-ctx'

const URL_DOUYIN = 'https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=123'

/** B站 wbi 签名先打 /nav 取 keys —— 这个响应体带 wbi_img，其余请求回抖音成功体 */
const NAV_BODY = {
  code: 0,
  data: {
    wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'
    },
    vipStatus: 1
  }
}

/**
 * 阶段 4 的公开面验证：从 `@ikenxuan/amagi/sign-steps` import 原子 step，经 `amagi.sign`
 * 传清单，断言反爬参数真的落到发出去的请求上；并锁一条「不放 msToken step 时调用方自己的
 * msToken 被保留」（阶段 1 覆盖行为的出口）。
 */
describe('sign-steps 子入口 + amagi.sign 收清单', () => {
  // 带状态的签名器是进程级共享的，逐例重置保证隔离（对称各平台端到端测试）
  beforeEach(() => {
    resetSharedWbiCache()
    resetKuaishouSignerState()
  })

  it('抖音：传 [msToken(200), aBogus()]，两个参数都落在 URL 上', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')
    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN, {
      amagi: { sign: [msToken(200), aBogus()] }
    })

    expect(r.success).toBe(true)
    const url = new URL(sent[0].url)
    // msToken(200)：== 之前 200 字符
    const ms = url.searchParams.get('msToken')
    expect(ms).toBeTruthy()
    expect(ms!.replace(/=+$/, '')).toHaveLength(200)
    // aBogus()：a_bogus 落在 URL 上
    expect(url.searchParams.get('a_bogus')).toBeTruthy()
  })

  it('抖音：不放 msToken step 时，调用方 URL 里的 msToken 被保留', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')
    const caller = 'CALLER_MS_TOKEN_123'
    const r = await createRequestModule('douyin', ctx).get(`${URL_DOUYIN}&msToken=${caller}`, {
      amagi: { sign: [aBogus()] }
    })

    expect(r.success).toBe(true)
    const url = new URL(sent[0].url)
    // 没放 msToken step，调用方自己的值原样保留（阶段 1 覆盖行为的出口）
    expect(url.searchParams.get('msToken')).toBe(caller)
  })

  it('快手：传 [hxfalcon()]，__NS_hxfalcon 落在发出去的 URL 上', async () => {
    const { ctx, sent } = makeRequestCtx('kuaishou', 'kwfv1=TOKEN123')
    const r = await createRequestModule('kuaishou', ctx).post(
      'https://live.kuaishou.com/live_api/baseuser/userinfo/byid?caver=2&principalId=pid1',
      { amagi: { sign: [hxfalcon()], signPath: '/live_api/baseuser/userinfo/byid' } }
    )

    expect(r.success).toBe(true)
    const url = new URL(sent[0].url)
    expect(url.searchParams.get('__NS_hxfalcon')).toBeTruthy()
  })

  it('B站：传 [wbi()]，wts / w_rid 落在发出去的 URL 上（与默认 sign: "wbi" 同源）', async () => {
    // wbi 先打 /nav 取 keys：按 URL 分流，/nav 回 NAV_BODY，业务请求回成功体
    const respond = (spec: RequestSpec): RawResponse => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      body: spec.url.includes('/x/web-interface/nav') ? NAV_BODY : { code: 0, data: { mid: 123 } },
      durationMs: 1,
      url: spec.url
    })
    const { ctx, sent } = makeRequestCtx('bilibili', 'SESSDATA=x', respond)
    const r = await createRequestModule('bilibili', ctx).get('https://api.bilibili.com/x/space/wbi/acc/info?mid=123', {
      amagi: { sign: [wbi()] }
    })

    expect(r.success).toBe(true)
    // sent 里最后一条是业务请求（/nav 在它之前）—— wts / w_rid 落在它的 URL 上
    const business = sent.find((s) => s.url.includes('/x/space/wbi/acc/info'))!
    const url = new URL(business.url)
    expect(url.searchParams.get('wts')).toBeTruthy()
    expect(url.searchParams.get('w_rid')).toBeTruthy()
  })
})
