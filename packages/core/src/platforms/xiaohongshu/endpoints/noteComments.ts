import zod from 'zod'

import type { RequestSpec } from '../../../contracts/request'
import type { XiaohongshuNoteCommentsResponse } from '../../../types/generated'
import { noteComments as buildNoteComments } from '../api'
import { traceId, xs } from '../sign/steps'
import { defineXiaohongshuEndpoint, internalParam, type } from './define'

/**
 * 笔记评论（GET + 声明式翻页）。
 *
 * `cursor` 由 `paginate` 声明管理，不暴露为自由参数：调用方只关心要多少条，
 * 游标由管线自动携带。
 *
 * xhs 响应里的 `data.cursor` 是 string（平台协议如此），
 * `data.has_more` 是 boolean，与抖音的 `has_more === 1` 不同 ——
 * 差异收敛在 `paginate` 声明里，管线不感知。
 *
 * ## 游客会话只能取到第一页
 *
 * 真机实测（2026-10-12）：游客身份下首页（`cursor=''`）稳定 HTTP 200 并返回
 * **10 条**；**第二页**（非空 cursor）必被平台以 **HTTP 461** 拒绝，响应体还是
 * 一个伪装成成功的空壳 `{"code":0,"success":true,"msg":"成功","data":{}}`。
 * 这是平台侧对「游客 + 签名内出现翻页 cursor」的硬门，纯算无解 ——
 * 单页判为 `risk` / `CAPTCHA_REQUIRED`（461 是平台的 antiSpider 码，见 `judge.ts`）。
 *
 * 后果：游客调这个端点**最多拿到 10 条**，而且返回的是一个**成功信封** ——
 * 翻页在第二页停下、把首页那 10 条原样返回（见 `runtime/paginate.ts` 的部分结果规则）；
 * 本端点声明了 `partial: 'tolerate'`，所以第二页的错误挂在 `meta.incomplete` 上。
 * 想让 `number` 生效必须有**有效登录 CK**；游客传超过单页容量没有副作用，只是拿到的比要的少。
 *
 * ## `comment/page` 的限流比 `/v1/feed` 紧得多
 *
 * 真机实测（2026-10-12）：**同一会话、同一时刻**，`noteDetail`（`/v1/feed`）能过而
 * 本端点回 461 —— 两个端点的预算不是一个量级。这是「详情解析成功、评论却失败」这类
 * 现象的主因。
 *
 * 超限后的表现与上面的翻页硬门**完全一样**（461 + 伪装成成功的空壳），平台不给任何
 * 可区分的信号，所以**两者在错误码上分不开**，都只能报 `CAPTCHA_REQUIRED`。
 *
 * 限流是**滑动窗口**，恢复要分钟级：实测 1.5 秒间隔连打 8 次，第 3 次起连续失败；
 * 而窗口空闲时同一份会话能连过 7 次。`isRetryableStatus` 只认 429 与 ≥500，judge 对
 * 461 也给 `retryable: false`，因此**不会自动重试**，失败是即时的、要靠调用方自己退避。
 *
 * **排查时踩过的坑**：一度把「连发的第 4 个请求必挂」误判成「`xsec_source=pc_share`
 * 是毒药」—— 其实是请求顺序造成的假象（两次跑挂的都是第 4 个，只是恰好那次轮到
 * `pc_share`）。顺序敏感的探针**必须做重复组或打乱顺序**，单次结果不能下结论。
 */
export const noteComments = defineXiaohongshuEndpoint({
  name: 'xiaohongshu.noteComments',
  route: '/fetch_note_comments',
  doc: {
    summary: '笔记评论列表',
    description:
      '取笔记评论列表。`number` 指定目标条数，翻页由端点自动完成。**游客身份下平台对本接口限流较紧**：超限回 HTTP 461（伪装成成功的空壳），退避需分钟级、秒级无效；而且**不传 `number` 会触发翻页、多烧一次请求** —— 传具体小值可把请求数降到 1。'
  },
  params: zod.object({
    cursor: internalParam(zod.string().optional().describe('分页游标，由端点接管，不用传')),
    note_id: zod.string().min(1, { error: 'note_id 不能为空' }).describe('笔记 ID；从笔记分享链接里取'),
    xsec_token: zod
      .string()
      .min(1, { error: 'xsec_token 不能为空' })
      .describe('反爬令牌，随笔记分享链接下发；**与发放它的会话绑定** —— 游客下换会话即 461，须同会话现取或带上原游客 CK'),
    number: zod.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('目标条数；不传时按单页上限翻页取满，而不是只取一页 —— 游客下翻页必被拒且多烧一次请求，传具体小值可降到 1 次')
  }),
  build: (p): RequestSpec => {
    const { Url, apiPath, signParams } = buildNoteComments(p)
    // signParams 透传给签名器：GET 的 x-s 必须覆盖 query，否则平台返回 406
    return { method: 'GET', url: Url, signPath: apiPath, extra: { signParams } }
  },
  // 抓包实证：comment/page 用 XYS_ 签名（非 XYW_），且带 x-b3-traceid
  sign: [xs('get', 'xys'), traceId()],
  // 中途某页失败时保留已取数据，截断经 meta.incomplete 显式告知
  partial: 'tolerate',
  paginate: {
    maxPageSize: 50,
    items: (page) => page.data?.comments ?? [],
    hasMore: (page) => page.data?.has_more === true,
    nextParams: (params, page) => ({ ...params, cursor: page.data?.cursor ?? '' }),
    // 跨页累积的条目回填到最后一页 data.comments 的原位，使返回类型在多页调用下仍描述真实形状
    merge: ({ lastPage, items }) => ({ ...lastPage, data: { ...lastPage.data, comments: items } })
  },
  response: type<XiaohongshuNoteCommentsResponse>()
})
