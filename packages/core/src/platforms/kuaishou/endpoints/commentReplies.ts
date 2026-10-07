import zod from 'zod'

import type { KuaishouCommentRepliesResponse } from '../../../types/generated'
import { kuaishouApiUrls } from '../api'
import { kuaishouPcPrepare } from '../did'
import { defineKuaishouEndpoint, hasNextCursor, type } from './define'

/** `visionSubCommentList` 载荷节点（取自响应类型，翻页与合并都只碰这一层） */
type SubCommentListNode = NonNullable<NonNullable<KuaishouCommentRepliesResponse['data']>['visionSubCommentList']>

/** 一条子评论 */
type SubCommentItem = NonNullable<SubCommentListNode['subCommentsV2']>[number]

/** 取载荷节点；响应退化（`data` 缺失或节点为 null）时给 undefined */
const nodeOf = (page: KuaishouCommentRepliesResponse): SubCommentListNode | undefined => page.data?.visionSubCommentList ?? undefined

/**
 * 取这一页的条目：**V2 优先**。
 *
 * 两套字段并存但实测数据只在 V2（5 条根评论逐条跑，`subComments` 全是空数组）。
 * V1 留作兜底而非删掉：它还在前端选择集里，服务端哪天换回去填也不至于取空。
 * @param page - 一页完整响应
 * @returns 该页条目，两边都空时是空数组
 */
const itemsOf = (page: KuaishouCommentRepliesResponse): SubCommentItem[] => {
  const node = nodeOf(page)
  const v2 = node?.subCommentsV2 ?? []
  return v2.length > 0 ? v2 : (node?.subComments ?? [])
}

/**
 * 取下一页游标：**V2 优先**，与 {@link itemsOf} 同一套取舍。
 *
 * 到底时 `pcursorV2` 是 `'no_more'`，而 `pcursor` 仍是个非 `no_more` 的字符串
 * —— 只看 V1 会一直翻下去、每次拿回空数组。
 * @param page - 一页完整响应
 * @returns 下一页游标；取不到时空串
 */
const cursorOf = (page: KuaishouCommentRepliesResponse): string => {
  const node = nodeOf(page)
  return node?.pcursorV2 ?? node?.pcursor ?? ''
}

/**
 * 获取一条根评论下的全部回复（PC GraphQL `visionSubCommentList`，声明式翻页）。
 *
 * ## 为什么走 PC 而不是 H5
 *
 * H5 的 `photo/comment/list`（`kuaishou.comments`）把子评论放在 `subCommentsMap`
 * 里，但**每条根评论固定只给 3 条**，而且 H5 这套没有单独的子评论接口（五种路径
 * 实测全 404）。要取全量只有 PC GraphQL 这一条路。
 *
 * ## 它对设备上下文的要求比 H5 严
 *
 * PC GraphQL **不要账号、不要登录态**，但对设备上下文更挑：Cookie 里除了 `did`
 * 还得带 PC 站那四个常量（见 `did.ts` 的 `kuaishouPcPrepare`），并且整个进程
 * **保持同一个 did**。2026-09-27 在浏览器里逐条对照过请求层的反应（同一作品、
 * 同一套请求体，只换 cookie）：
 *
 * ```text
 * 自造 did + 四常量，did 固定 : captcha -> 放行 -> 放行 -> 放行
 * 自造 did + 缺常量，did 固定 : captcha -> captcha -> captcha -> captcha
 * 每发换一个新 did + 四常量   : captcha -> captcha -> captcha -> captcha
 * ```
 *
 * 所以「新 did 的第一发必吃一次 `Need captcha`」是常态而非故障，交给下面的
 * `retryOn` 吸收（`prepare` 在重试之间不重跑，did 不会被换掉）。
 *
 * **这条结论只到请求层。** 那轮实验用的是手拼的查询名，服务端按 `operationName`
 * 区分行为、始终没回数据（真实 photoId + 浏览器登录态 + 已预热 did 也一样空），
 * 所以「放行之后能不能真取回子评论」**没有验证过**。因此仍推荐把浏览器里那份真实的
 * `did` / `didv` 通过 `cookies.kuaishou` 传进来 —— `buildKuaishouDidCookie` 见到
 * 用户已有同名 cookie 就让位、不再补自造的值。本端点不去猜、不去伪造激活流程。
 *
 * 完全不带 Cookie 时这条回 `errors: Need captcha` + `data.captcha`（判成
 * `CAPTCHA_REQUIRED`，地址进 `error.challenge`）。
 *
 * 2026-09-26 的形状验证是在浏览器里、用浏览器自己那份已激活 did 做的，游客态与登录态
 * 各跑一轮、结果一致（登录与否不影响这条）：5 条带回复的根评论全部 200，条目在
 * `subCommentsV2`，首屏 `pcursor` 传空串可行，`pcursorV2` 到底是 `'no_more'`。样本里
 * 每条根评论只有 1-2 条回复、一页就到底，**跨页那一支没有真实样本**，只按游标约定实现。
 *
 * ## 没有端点级 judge
 *
 * 与 `danmakuList` 不同：那条把状态位藏在 `data.visionDanmaku.result` 里、需要委托
 * 判定把它抬出来；这条**顶层和节点里都没有 `result`**（实测响应只有 `data` 一个键）。
 * 失败形状全部由平台默认判定覆盖 —— 风控走 `errors[] + data.captcha`，退化响应走
 * 「`data` 全 null」那道。多写一层 judge 只会声称一个没验过的字段。
 */
export const commentReplies = defineKuaishouEndpoint({
  name: 'kuaishou.commentReplies',
  route: '/fetch_comment_replies',
  doc: {
    summary: '评论回复列表',
    description:
      '取一条根评论下的回复。`rootCommentId` 取评论列表里 `hasSubComments` 为真的那条评论 ID。' +
      '走 PC GraphQL，自带 PC 上下文 cookie 并对首发风控自动重试；有浏览器里的真实 `did` 时经 `cookies.kuaishou` 传入更稳。'
  },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }).describe('作品 ID'),
    rootCommentId: zod.string().min(1, { error: 'rootCommentId 不能为空' }).describe('根评论 ID'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认一页')
  }),
  // 不声明 sign：PC GraphQL 免签（与 `danmakuList` / `emojiList` 同一套命名空间）
  prepare: kuaishouPcPrepare,
  // 首发那次 `Need captcha` 是新 did 的常态（见上表），原样重放第二次就放行，所以
  // **不加 retryFresh** —— 换参数等于换 did，把预热成果丢掉。真撞上硬墙时代价是
  // 3 次重试 + 1s/2s/4s 退避，与抖音 `danmakuList` 的 ANTIBOT_PAGE 同一套节奏
  retryOn: ['CAPTCHA_REQUIRED'],
  build: (p) => {
    const req = kuaishouApiUrls.subComments(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      // Referer 显式给出：基线那个 `/new-reco` 是首页推荐页，与作品播放页无关
      headers: { 'Content-Type': 'application/json', Referer: `https://www.kuaishou.com/short-video/${p.photoId}` }
    }
  },
  // 中途某页失败时保留已取数据，截断经 meta.incomplete 显式告知
  partial: 'tolerate',
  paginate: {
    // 快手按 IP 做分钟级冷却（result=2），连续秒级翻页容易撞上；间隔取 ksp 参考实现的 1200ms
    pageIntervalMs: 1200,
    // 请求体里没有条数参数（前端只传 photoId / rootCommentId / pcursor），这个值只用来
    // 给 `number` 缺省值、以及算「还差几条」；每页多少条由服务端决定。取与 `comments` 一致
    maxPageSize: 50,
    items: itemsOf,
    hasMore: (page) => hasNextCursor(cursorOf(page)),
    nextParams: (params, page) => ({ ...params, pcursor: cursorOf(page) }),
    // 跨页累积的条目回填到最后一页节点的原位，使返回类型在多页调用下仍描述真实形状。
    // 只写 V2：条目取的就是 V2 优先，把累积结果塞回 V1 会让两边自相矛盾
    merge: ({ lastPage, items }) => ({
      ...lastPage,
      data: {
        ...lastPage.data,
        visionSubCommentList: {
          ...nodeOf(lastPage),
          subCommentsV2: items
        }
      }
    })
  },
  response: type<KuaishouCommentRepliesResponse>()
})
