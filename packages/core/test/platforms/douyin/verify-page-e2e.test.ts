import { renderDouyinVerifyPage } from 'amagi/platforms/douyin/verifyPage'
import { createDouyinRoutes } from 'amagi/platforms/douyin/routes'
import type { RiskChallenge } from 'amagi/contracts/error'
import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import { constantAdapter } from '../../helpers/adapter'
import { closeAllServers, listenOnRandomPort } from '../../helpers/listen'

/**
 * 抖音手动滑块的**端到端闭环**：从「平台弹验证」一直走到「真人能打开的页」。
 *
 * 这条链把三块缝起来验，证明 `renderDouyinVerifyPage` 不是一个孤立函数，而是真的接在
 * 风控管线末端：
 *
 *   验证头（x-vc-bdturing-parameters）
 *     → judge 判 risk / CAPTCHA_REQUIRED
 *     → parseDouyinCaptcha 拼出 error.challenge（url + verifyData）
 *     → renderDouyinVerifyPage 把 challenge 变成真人能拖的 HTML
 *
 * amagi 的红线仍是**只中转不绕过**：页面只渲染官方滑块交给真人拖，这里验的是「地址与料
 * 有没有一字不差地走到页上」，不是「能不能过验证」。
 *
 * 用 HTTP 路由入口（`createDouyinRoutes`）而不是直接调函数：这个入口**不接 debug**，
 * `error.raw` 结构上缺席，验证页地址只能从 `error.challenge` 出 —— 正是这个字段存在的理由。
 */

const listen = async (app: express.Application): Promise<string> => (await listenOnRandomPort(app)).base
afterEach(closeAllServers)

const buildApp = (router: express.Router) => {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/api/douyin', router)
  return app
}

/** 验证参数：键集合照实测的滑块那份，值全合成（真实 fp / detail 不进仓库） */
const verifyParams = () => ({
  code: 10000,
  subtype: 'slide',
  detail: 'SYNTHETIC_DETAIL_TICKET',
  fp: 'verify_synthetic_fp',
  server_sdk_env: '{"idc":"synthetic"}',
  aid: 6383
})
const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64')

type Envelope = {
  success?: boolean
  error?: { code?: string; challenge?: RiskChallenge; raw?: unknown }
}

describe('验证头 → error.challenge → 验证页（HTTP 入口）', () => {
  it('撞滑块时 HTTP 入口交出 challenge，且能渲染成真人能拖的页', async () => {
    // 实测形状：HTTP 200、body 空串、验证参数在 x-vc-bdturing-parameters 头里
    const h = constantAdapter('', 200, { 'x-vc-bdturing-parameters': b64(JSON.stringify(verifyParams())) })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter })))

    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')
    const body = (await res.json()) as Envelope

    // ① 管线把它判成要人过验证
    expect(res.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('CAPTCHA_REQUIRED')

    // ② 地址从 error.challenge 出（raw 在这个入口缺席）
    const challenge = body.error?.challenge
    expect(challenge?.url).toContain('rmc.bytedance.com/verifycenter/captcha/v2')
    expect(body.error?.raw).toBeUndefined()

    // ③ challenge 喂进渲染函数 → 一张自包含、带红线声明的真人可用页
    const html = renderDouyinVerifyPage(challenge!)
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('只中转不绕过')
    // 响应头通道的 challenge 只有 url（verify_data 是 URL 编码塞在 url 里的，没有独立
    // verifyData 对象），所以页面默认走托管模式，验证参数经由 url 一字不差带到页上
    const dataBlock = html.slice(html.indexOf('window.__DOUYIN_CHALLENGE__='), html.indexOf('window.__DOUYIN_PAGE__='))
    expect(dataBlock).toContain('verifycenter/captcha/v2')
    expect(dataBlock).toContain('verify_synthetic_fp')
    // 头通道没有自建料，页面数据块里不该出现 verifyData / jsSdkUrl
    expect(dataBlock).not.toContain('jsSdkUrl')
    expect(dataBlock).not.toContain('verifyData')
  })

  it('正常响应不触发验证页（阴性对照）', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: { aweme_id: '7123' } })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter })))

    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')
    const body = (await res.json()) as Envelope

    expect(body.success).toBe(true)
    expect(body.error).toBeUndefined()
  })
})
