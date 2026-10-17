import zod from 'zod'

import type { Judge } from '../../../contracts/error'
import type { RequestSpec } from '../../../contracts/request'
import type { DouyinShortUrlResponse } from '../../../types/generated'
import { createDouyinApiUrls } from '../api'
import { douyinJudge } from '../judge'
import { douyinBogus } from '../sign/steps'
import { DOUYIN_RISK_RETRY, defineDouyinEndpoint, type } from './define'

/**
 * `web_shorten` 的响应判定。
 *
 * 成功与失败**都是 HTTP 200 + `code: 0`**，差别只在 `message` / `reason`：
 *
 * ```jsonc
 * // 成功
 * { "code": 0, "message": "success", "now": 1792253001, "data": "https://v.douyin.com/V6jASdpUrtY/" }
 * // 签名没带 / 不对
 * { "code": 0, "message": "error", "reason": "Bad request: check failed", "now": 1792252373 }
 * // belong 缺失或不是 aweme
 * { "code": 0, "message": "error", "reason": "not allowed to shorten", "now": 1792252323,
 *   "data": "https://www.iesdouyin.com/share/video/…" }
 * ```
 *
 * 平台默认的 {@link douyinJudge} 只看 `status_code`，而这个接口用 `code` 且两种失败都回 0，
 * 默认判定会把失败当成功 —— 调用方会拿到一个装着原链接、甚至没有 `data` 的「成功」信封。
 * 所以这里补一层：
 *
 * - `code` 非 0 → `PLATFORM_ERROR`；
 * - `reason` 点名签名校验失败 → `SIGNATURE_REFUSED`（是签名器的问题，换 cookie 无用）；
 * - 其余带 `reason` 的拒绝 → `forbidden` / `PLATFORM_ERROR`（请求本身合法，平台不放行）。
 *
 * `message` 的原文是 `error`，`reason` 才是原因；runtime 的 error 文案只认
 * `message` / `status_msg` / `msg`，所以失败信封里看不到 reason 原文 —— 要排查看
 * `debug: true` 下的 `error.raw`。
 * @param raw - 解码后的响应体
 * @param http - HTTP 状态与响应头
 * @returns 平台判定结论
 */
const shortUrlJudge: Judge = (raw, http) => {
  const verdict = douyinJudge(raw, http)
  if (!verdict.ok) return verdict
  if (typeof raw !== 'object' || raw === null) return verdict
  const body = raw as { code?: unknown; reason?: unknown }
  if (body.code !== undefined && (typeof body.code === 'number' || typeof body.code === 'string') && Number(body.code) !== 0) {
    return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR', retryable: false }
  }
  if (typeof body.reason !== 'string' || body.reason.length === 0) return verdict
  if (/check failed/i.test(body.reason)) {
    return { ok: false, kind: 'risk', code: 'SIGNATURE_REFUSED', retryable: false }
  }
  return { ok: false, kind: 'forbidden', code: 'PLATFORM_ERROR', retryable: false }
}

/**
 * 分享链接转短链接（`/aweme/v1/web/web_shorten/`）。
 *
 * ## 这是唯一一条「免登录但仍要签名」的工具端点
 *
 * 2026-10-18 实测（零 cookie、随机 msToken、本项目 a_bogus）：
 *
 * ```text
 * 只带 target + belong + a_bogus                → 200 success，返回 v.douyin.com 短链
 * 同一组参数不带 a_bogus                        → 200，reason: "Bad request: check failed"
 * target + belong=aweme                         → 200 success
 * target 不带 belong / belong=other             → 200，reason: "not allowed to shorten"
 * ```
 *
 * 也就是说 **cookie 完全不需要**（空串、伪造的 `ttwid/UIFID`、刚铸的游客 cookie 三种都成功），
 * 但 **`a_bogus` 必须带**，且 `belong=aweme` 是能缩短的前提 —— 客户端算不出短链、也没有
 * 别的接口能补，这条没有「免签」的退路。
 *
 * ## 为什么保留完整的 web 版式
 *
 * 浏览器抓包里这条的 query 很长（`target,belong,persist` + 25 个环境参数 + tail）。
 * 实测最小化到 `target+belong+a_bogus` 也能成功，但这里仍走 `webQuery` 的完整版式：
 * 这是 `/aweme/v1/web/*` 的统一形状，抖音按查询串重算签名，形状一致不增加成本。
 * `persist=1` 照抓包固定发送（实测省略也能成功，保留是为了与浏览器一致）。
 *
 * ## 短链是稳定映射
 *
 * 同一个 `target` 多次调用返回同一个短码（跨进程、跨 cookie 实测一致），
 * 不是一次性令牌；`https://www.douyin.com/video/<id>` 与它的分享链接会得到**不同**的短码，
 * 取决于传入的字符串本身。
 */
export const shortUrl = defineDouyinEndpoint({
  name: 'douyin.shortUrl',
  route: '/fetch_short_url',
  doc: {
    summary: '分享链接转短链接',
    description: '把抖音作品分享链接转换成 `v.douyin.com` 短链；`belong=aweme` 是能缩短的前提。'
  },
  params: zod.object({
    target: zod.string().min(1, { error: '目标链接不能为空' }).describe('需要缩短的分享链接'),
    belong: zod.string().min(1).default('aweme').optional().describe('短链归属类型，抖音作品固定为 aweme，默认 aweme')
  }),
  build: (p, ctx): RequestSpec => ({
    method: 'GET',
    url: createDouyinApiUrls(ctx.userAgent).getWebShorten({ target: p.target, belong: p.belong ?? 'aweme' })
  }),
  sign: douyinBogus(184),
  judge: shortUrlJudge,
  retryOn: DOUYIN_RISK_RETRY,
  retryFresh: true,
  response: type<DouyinShortUrlResponse>()
})
