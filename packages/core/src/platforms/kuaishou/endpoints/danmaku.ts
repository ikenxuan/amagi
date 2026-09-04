import zod from 'zod'

import { defineEndpoint, type } from '../../../contracts/endpoint'
import type { Judge } from '../../../contracts/error'
import type { RequestSpec } from '../../../contracts/request'
import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import { kuaishouApiUrls } from '../api'
import { kuaishouJudge } from '../judge'

/**
 * 单次请求允许的最大窗口宽度（毫秒）。
 *
 * **硬规则 1**：`positionToExclude - positionFromInclude` 达到 60000 时接口回
 * `result: 1` 但 `danmakus: []` —— 不报错，只是静默给空数组。边界精确到 1ms
 * （59999 有数据、60000 没有，在 25s 与 148s 两个作品上都验过），所以上限只能是 59999。
 */
const DANMAKU_MAX_WINDOW_MS = 59_999

/**
 * 扫描步长（毫秒）。
 *
 * **硬规则 2**：服务端按 **30 秒分桶**返回，命中桶就给整桶、不按 from/to 精确裁剪
 * （覆盖范围是桶 `[floor(from / 30000), floor((to - 1000) / 30000)]`，末尾那 1000ms
 * 是服务端自己留的余量）。所以「取全量」不是把窗口开大 —— 那会踩硬规则 1 拿到空数组
 * —— 而是步长 60000、宽度 {@link DANMAKU_MAX_WINDOW_MS} 连续扫：`[k*60000, k*60000+59999]`
 * 精确覆盖桶 `2k` 与 `2k+1`，不重不漏，请求数只有「逐桶扫」的一半。
 */
const DANMAKU_SCAN_STEP_MS = 60_000

/**
 * 扫描范围上限（毫秒，1 小时）。
 *
 * 多窗口是 `Promise.all` 并发发出的，范围直接决定并发请求数
 * （`ceil(范围 / 60000)`）。不设上限时一个手输的 `duration` 就能让一次调用打出上千个
 * 请求，所以在参数层挡住：1 小时 → 最多 60 个窗口，与 `userProfile` 的 12 个同量级。
 */
const DANMAKU_MAX_RANGE_MS = 3_600_000

/** 一个窗口响应的形状（`normalize` 合并用） */
interface DanmakuWindow {
  data?: {
    visionDanmaku?: {
      result?: number
      pcursor?: string | null
      danmakus?: DanmakuRow[] | null
      [key: string]: unknown
    } | null
    [key: string]: unknown
  }
  [key: string]: unknown
}

/** 一条弹幕（合并去重与排序只用到这三个字段） */
interface DanmakuRow {
  id?: number | string | null
  body?: string
  position?: number
  [key: string]: unknown
}

/**
 * 算出本次要扫描的整体范围。
 *
 * `build` 与 `normalize` 都要用（后者要把范围写回响应的 `positionFromInclude` /
 * `positionToExclude`），所以抽成一处 —— 两边各算一遍必然漂移。
 *
 * 终点三级取值：显式 `to` → `duration + 1000`（补上服务端那 1000ms 桶余量，
 * 否则最后一桶取不到）→ 一个最大窗口。
 * @param p - 校验后的参数
 * @returns 扫描范围；终点保证 `> from`（否则 `build` 会产出空数组，execute 直接抛）
 */
const resolveScanRange = (p: { from?: number; to?: number; duration?: number }): { from: number; to: number } => {
  const from = p.from ?? 0
  const wanted = p.to ?? (p.duration === undefined ? from + DANMAKU_MAX_WINDOW_MS : p.duration + 1000)
  return { from, to: Math.max(wanted, from + 1) }
}

/**
 * 获取作品弹幕（PC GraphQL `visionDanmaku`，按时间窗口分段并发 + 合并去重）。
 *
 * **完全免鉴权** —— 不需要签名、cookie 或 token，随便打都能通。这是快手唯一一条
 * 这样的社交数据接口（与 `visionBaseEmoticons` 同类），所以它既不声明 `sign`
 * 也不需要 `prepare` 去造设备号；`videoWork` / `comments` 那套 H5 迁移与它无关。
 *
 * 两条服务端硬规则，踩中都不报错、只是静默给空数组，全部实测确认：
 *
 * 1. **单次请求的窗口宽度必须 < 60000ms** —— 见 {@link DANMAKU_MAX_WINDOW_MS}。
 * 2. **服务端按 30 秒分桶返回** —— 见 {@link DANMAKU_SCAN_STEP_MS}。取全量的正确姿势
 *    是步长 60000、宽度 59999 连续扫，而不是把窗口开大。
 *
 * 于是这条端点的形态是「多 spec + `partial: 'tolerate'`」而不是 `paginate`：翻的是
 * **时间窗口**不是游标（`pcursor` 实测恒回 `no_more`），窗口之间没有先后依赖，
 * 可以并发；单个窗口失败也不该让整条视频的弹幕一起没有。
 *
 * 另有一个偶发项：合法参数下约 13% 的请求回 `result: 11`（其余字段全 null）。它嵌在
 * `data.visionDanmaku.result` 里，平台默认 judge 只看**顶层** `result` 所以看不见 ——
 * 端点自带的 `judge` 把这一层抬给平台判定表，`retryOn` 才能真的生效。
 *
 * 接口形状与上述全部实测结论来自 @OduckO 的 kuaishou-parser（GPL-3.0-only，与 amagi
 * 同许可）：https://github.com/OduckO —— `src/platform/kuaishou/danmaku.ts` 与
 * `TODO.md:140-164`。
 */
export const danmaku = defineEndpoint({
  name: 'kuaishou.danmaku',
  route: '/fetch_danmaku_list',
  doc: {
    summary: '作品弹幕列表',
    description:
      '完全免鉴权（不需要签名、cookie 或 token）。窗口宽度必须小于 60000ms、服务端按 30 秒分桶返回，' +
      '所以取全量由端点按步长 60000ms、宽度 59999ms 自动分段并发，再合并去重。' +
      '传 `duration`（作品时长，毫秒）即取全量；只想要某一段就传 `from` / `to`。'
  },
  params: zod
    .object({
      photoId: zod.string().min(1, { error: 'photoId 不能为空' }),
      /** 起始位置（毫秒），默认 0 */
      from: zod.coerce.number().int().min(0).max(DANMAKU_MAX_RANGE_MS).optional(),
      /** 结束位置（毫秒）；不传则按 `duration` 推算 */
      to: zod.coerce.number().int().min(1).max(DANMAKU_MAX_RANGE_MS).optional(),
      /** 作品时长（毫秒），取全量用。来自 `videoWork` 响应的 `photo.duration` */
      duration: zod.coerce.number().int().min(1).max(DANMAKU_MAX_RANGE_MS).optional()
    })
    .refine((p) => p.to === undefined || p.to > (p.from ?? 0), {
      error: '结束位置必须大于起始位置',
      path: ['to']
    }),
  build: (p) => {
    const { from, to } = resolveScanRange(p)
    // 一次调用共用一个时间戳：服务端不校验它的单调性，逐窗取 Date.now() 只会让
    // 请求变得不可复现（测试里没法比对）
    const timestamp = Date.now()

    const specs: RequestSpec[] = []
    for (let start = from; start < to; start += DANMAKU_SCAN_STEP_MS) {
      // 硬规则 1 落地处：宽度上限 59999，末窗按剩余长度收窄（至少 1ms）
      const width = Math.min(DANMAKU_MAX_WINDOW_MS, Math.max(1, to - start))
      const req = kuaishouApiUrls.danmaku({
        photoId: p.photoId,
        positionFromInclude: start,
        positionToExclude: start + width,
        timestamp
      })
      specs.push({
        method: 'POST',
        url: req.url,
        body: req.body,
        // Referer 显式给出：基线里那个 `/new-reco` 是首页推荐页，与这条 graphql
        // 请求的实际来源（作品播放页）无关
        headers: { 'Content-Type': 'application/json', Referer: `https://www.kuaishou.com/short-video/${p.photoId}` },
        tag: `window-${start}`
      })
    }
    return specs
  },
  /**
   * 端点级判定：把嵌一层的 `result` 抬到平台判定表能看见的位置。
   *
   * 平台默认 judge 读的是**顶层** `result`（`live_api` 与 H5 那两套的失败信封长那样），
   * 而 GraphQL 这条把状态位放在 `data.visionDanmaku.result` —— 于是 13% 概率的
   * `result: 11`（字段全 null）会一路走成「成功信封 + data 里全是 null」，比失败更糟。
   *
   * 做法是**委托**而不是重写：先拿完整响应体过一遍平台 judge（保住非 JSON 的 WAF 页、
   * `errors`、HTTP 状态那几道），成功了再把节点本身交给同一个 judge，让它用
   * `KUAISHOU_RESULT_VERDICTS` 那张表判 `11` / `21` / `2`。判定语义仍然只有一份。
   */
  judge: ((raw, http) => {
    const outer = kuaishouJudge(raw, http)
    if (!outer.ok) return outer
    const node = (raw as DanmakuWindow | null)?.data?.visionDanmaku
    if (typeof node !== 'object' || node === null) return outer
    return kuaishouJudge(node, http)
  }) satisfies Judge,
  // `result: 11` 经上面的 judge 落到 `unavailable` / PLATFORM_UNAVAILABLE（可重试）。
  // 单次 13% 命中、退避 1s/2s/4s 三次后残留约 0.03% —— 这正是 `retryOn` 该管的
  // 「短退避就能过的偶发抖动」，与 B站 -412 同类。表里其余码都声明成不可重试
  // （`2` 是分钟级 IP 冷却、`21` 是入参错、`50` 是签名 bug），不会被这条捎带上。
  retryOn: ['PLATFORM_UNAVAILABLE'],
  // 单个窗口失败不该让整条视频的弹幕一起没有（execute 的 tolerate：**全部窗口都失败**
  // 时仍返回失败信封）
  partial: 'tolerate',
  /**
   * 合并多个窗口：去重 → 按时间升序 → 放回最后一个窗口的原位。
   *
   * 这不是「归一化」，只是把分段拿到的条目放回它本来的位置（与 `comments` 的跨页累积
   * 同一个语义），所以返回类型仍然描述真实的 GraphQL 形状。只有
   * `positionFromInclude` / `positionToExclude` 被改写成本次**整体**扫描范围 ——
   * 单窗口调用时它们就等于那一窗的值。
   * @param decoded - 每个窗口 decode 之后的值（失败窗口是 `undefined`）
   * @param params - 校验后的参数
   * @returns 合并后的响应
   */
  normalize: (decoded, params): KuaishouReturnTypeMap['danmaku'] => {
    const windows = decoded as Array<DanmakuWindow | undefined>
    const { from, to } = resolveScanRange(params)

    const merged: DanmakuRow[] = []
    const seen = new Set<string>()

    for (const win of windows) {
      const node = win?.data?.visionDanmaku
      if (!node) continue
      for (const row of node.danmakus ?? []) {
        // 30 秒分桶会让相邻窗口重叠地返回同一条，必须去重；
        // id 缺失时退回「时间点 + 正文」，宁可多留一条也不丢
        const key = row.id === undefined || row.id === null ? `${row.position ?? 0}:${row.body ?? ''}` : String(row.id)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(row)
      }
    }

    merged.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    const firstBody = windows.find((win): win is DanmakuWindow => Boolean(win?.data?.visionDanmaku))
    return {
      ...(firstBody ?? {}),
      data: {
        ...(firstBody?.data ?? {}),
        visionDanmaku: {
          ...(firstBody?.data?.visionDanmaku ?? {}),
          positionFromInclude: from,
          positionToExclude: to,
          danmakus: merged
        }
      }
    } as KuaishouReturnTypeMap['danmaku']
  },
  response: type<KuaishouReturnTypeMap['danmaku']>()
})
