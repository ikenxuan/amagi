import zod from 'zod'

import type { KuaishouCommentsResponse } from '../../../types/generated'
import { kuaishouApiUrls } from '../api'
import { kuaishouH5Headers } from '../config'
import { kuaishouDidPrepare } from '../did'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, hasNextCursor, type } from './define'

/** 一条子评论：合并只用到 `comment_id`，其余键原样透传 */
type SubComment = { comment_id?: unknown; [key: string]: unknown }

/** 一个根评论下的子评论分组（`subCommentsMap` 的值） */
type SubCommentGroup = { subComments?: SubComment[]; [key: string]: unknown }

/** `subCommentsMap` 里一条子评论的去重键。ID 是 13 位整数、不会掉精度，转字符串即可比 */
const subCommentKey = (item: SubComment): string => String(item.comment_id)

/**
 * 跨页合并 `subCommentsMap`。
 *
 * 子评论**不在根评论里**，而在与 `rootComments` 平级的这张表上按根评论 ID 分组
 * —— 所以翻页时它跟条目一样是跨页的，只拿最后一页会把前面几页的回复串整批丢掉
 * （翻 5 页只剩最后一页那几组）。
 *
 * 两处取舍：
 *
 * - **只保留仍在结果里的根评论**：条目会按目标条数截断，被截掉的根评论对应的组
 *   留着就成了孤儿键，而 `subCommentsMap` 的约定是「键必须是某条根评论的
 *   `comment_id`」。按 `keep` 过滤，多页结果下这条约定依然为真。
 * - **同一个键在多页里重复出现时按 `comment_id` 去重后拼接**：游标重叠时快手会把
 *   同一条根评论再给一次，直接 concat 会出现重复回复。
 * @param pages - 每一页的完整体，顺序即请求顺序
 * @param keep - 最终留在结果里的根评论 ID（**字符串形式**，`subCommentsMap` 的键是字符串而
 *   `comment_id` 是数字）
 * @returns 合并后的分组表；一组都没有时是空对象（不回落到最后一页的原表 —— 那张表里
 *   可能只剩被截掉的根评论，全是孤儿键）
 */
const mergeSubCommentsMap = (pages: readonly KuaishouCommentsResponse[], keep: ReadonlySet<string>): Record<string, SubCommentGroup> => {
  const merged: Record<string, SubCommentGroup> = {}

  for (const page of pages) {
    const map = (page.subCommentsMap ?? {}) as Record<string, SubCommentGroup>

    for (const [rootId, group] of Object.entries(map)) {
      if (!keep.has(rootId)) continue

      const exists = merged[rootId]
      if (!exists) {
        merged[rootId] = group
        continue
      }

      const seen = new Set((exists.subComments ?? []).map(subCommentKey))
      const fresh = (group.subComments ?? []).filter((item) => !seen.has(subCommentKey(item)))
      merged[rootId] = {
        ...exists,
        ...group,
        // 先本页之前的、再本页新增的：保持平台给的时间序
        subComments: [...(exists.subComments ?? []), ...fresh]
      }
    }
  }

  return merged
}

/**
 * 获取作品评论（H5 `photo/comment/list`，POST + 声明式翻页）。
 *
 * 走这条分享页接口而不是 PC GraphQL 的 `commentListQuery`：H5 这套只要一个自己
 * 造的 did，PC 那条要浏览器真正激活过的 did（见 `api.ts` 的 `KUAISHOU_H5_HOST`），
 * amagi 造不出来。
 *
 * 参数**必须放 body**：放 query 会拿到 `result=1` 但 0 条评论。路由表里的
 * `parameterNames` 是给 OPTIONS 预检用的，照搬到实际请求上就踩这个坑。
 *
 * 响应形状与 GraphQL 那条**不同**，翻页声明因此整个改写：条目在顶层
 * `rootComments`（不是 `data.visionCommentList.rootComments`），游标在顶层
 * `pcursor`，且子评论**不内嵌**在根评论里 —— 它们在 `subCommentsMap` 里按根评论
 * ID 分组。这些差异原样透给下游。
 *
 * 翻页：调用方传 `number` 指定目标条数，`pcursor` 由 `paginate` 声明管理，
 * 不暴露为自由参数。
 */
export const comments = defineKuaishouEndpoint({
  name: 'kuaishou.comments',
  route: '/fetch_work_comments',
  doc: {
    summary: '作品评论列表',
    description: '取作品评论列表，子评论按根评论 ID 分组返回。`number` 指定目标条数，翻页自动完成。'
  },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }).describe('作品 ID'),
    number: zod.coerce.number().int().min(1).max(500).optional().describe('目标条数，默认一页')
  }),
  sign: [hxfalcon()],
  prepare: kuaishouDidPrepare,
  build: (p) => {
    const req = kuaishouApiUrls.comments(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      signPath: req.signPath,
      headers: kuaishouH5Headers(req.referer)
    }
  },
  // 中途某页失败时保留已取数据，截断经 meta.incomplete 显式告知
  partial: 'tolerate',
  paginate: {
    // 快手按 IP 做分钟级冷却（result=2），连续秒级翻页容易撞上；间隔取 ksp 参考实现的 1200ms
    pageIntervalMs: 1200,
    maxPageSize: 50,
    // 子评论在 `subCommentsMap` 里、与条目平级，跨页合并要看每一页
    keepPages: true,
    items: (page) => page.rootComments ?? [],
    hasMore: (page) => hasNextCursor(page.pcursor),
    nextParams: (params, page) => ({ ...params, pcursor: page.pcursor ?? '' }),
    // 跨页累积的条目回填到最后一页 rootComments 的原位，使返回类型在多页调用下仍描述真实形状。
    // `commentCount` 是作品的评论总数、不随翻页变化，取首页那次（即调用方发起的那次）的值
    merge: ({ lastPage, items, pages }) => {
      // `subCommentsMap` 的键是字符串、`comment_id` 是数字（13 位、不掉精度），按字符串对齐
      const keep = new Set(items.map((item) => String(item.comment_id)))
      const all = pages ?? [lastPage]

      return {
        ...lastPage,
        rootComments: items,
        commentCount: all[0]?.commentCount ?? lastPage.commentCount,
        // 生成类型只见过一份样本，把样本里那条根评论的 ID 写成了必有键；真实的键是任意
        // 根评论 ID，按运行时形状断言回去
        subCommentsMap: mergeSubCommentsMap(all, keep) as KuaishouCommentsResponse['subCommentsMap']
      }
    }
  },
  response: type<KuaishouCommentsResponse>()
})
