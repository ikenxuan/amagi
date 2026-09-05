/**
 * 快手 `danmaku` 响应类型（PC GraphQL `visionDanmaku`）。
 *
 * **不做归一化**（amagi 是接口库，抹平平台差异是下游的事）：GraphQL 的
 * `data.visionDanmaku` 两层原样留着，字段名与 `__typename` 也一个不动。
 * 端点的 `normalize` 只做一件事 —— 把多个时间窗口拿到的 `danmakus` 合并去重后
 * 放回**最后**的原位，并把 `positionFromInclude` / `positionToExclude` 改写成
 * 本次实际扫描的整体范围（单窗口时它们就是那一窗的值）。
 *
 * 读这份类型前要知道两件反直觉的事，否则会把数据读错：
 *
 * 1. **`isShow: false` 不是「隐藏」，是「还没显示过」。** 服务端返回的每一条都是
 *    `false`（实测 75/75）—— 前端 `timeupdate` 里的判断是 `!isShow`，false 才该上屏，
 *    上屏后前端自己改成 true。按 `isShow !== false` 过滤等于把全部弹幕丢掉。
 * 2. **`userId` 为 `'0'` 表示匿名发送者**，不是某个真实用户的 ID。
 *
 * 另外 `position` 是**毫秒偏移**（不是秒），`id` 是**数字**而不是字符串。
 *
 * 形状与其中的实测结论来自 @OduckO 的 kuaishou-parser（GPL-3.0-only，与 amagi 同许可）：
 * https://github.com/OduckO —— 对照其 `src/types.ts` 的 `KsDanmakuRaw` 与
 * `test/fixtures/danmaku.json`。
 *
 * 每一层都保留 `[property: string]: any`：平台加字段不算 breaking，这条承诺由
 * `test/types/response-types.test-d.ts` 锁着，去掉索引签名会直接挂 `test:types`。
 */
export type KsDanmaku_V0 = {
  /** GraphQL 的固定外层。免鉴权接口，未登录也是这个形状（不会回 null 空壳） */
  data: KsDanmakuData
  [property: string]: any
}

/** `data` 层：只有 `visionDanmaku` 一个业务键 */
export type KsDanmakuData = {
  /** 弹幕结果节点 */
  visionDanmaku: KsDanmakuNode
  [property: string]: any
}

/** `data.visionDanmaku`：一次（或合并多次）窗口查询的结果 */
export type KsDanmakuNode = {
  /**
   * 接口状态码。`1` = 成功。
   *
   * 合法参数下约 13% 的请求回 `11`（其余字段全 null）—— 偶发抖动，退避重试就好，
   * 端点声明了 `retryOn` 自动处理。`21` = 缺 position 参数（入参问题，重试无用）。
   */
  result?: number
  /** 本次结果的起点（毫秒，含）。多窗口合并后是整体扫描范围的起点 */
  positionFromInclude?: number | null
  /** 本次结果的终点（毫秒，排他）。多窗口合并后是整体扫描范围的终点 */
  positionToExclude?: number | null
  /** 下一页游标。弹幕不靠游标翻页（实测恒为 `no_more`），翻的是时间窗口 */
  pcursor?: string | null
  /**
   * 弹幕列表，按 `position` 升序。
   *
   * 多窗口调用时这里是**跨窗口合并去重**后的条目，所以这个键一定在
   * （没有弹幕时是空数组）。
   */
  danmakus: KsDanmakuItem[]
  /** GraphQL 类型名，恒为 `VisionDanmakuResult` */
  __typename?: string
  [property: string]: any
}

/** 一条弹幕 */
export type KsDanmakuItem = {
  /** 弹幕 ID。**是数字**，不是字符串 */
  id?: number
  /** 弹幕正文。快手限 40 字，表情以 `[捂脸]` 这类文本码内嵌 */
  body?: string
  /** 出现时间，**毫秒**偏移 */
  position?: number
  /** 发送者 ID。`'0'` = 匿名发送者，不是真实用户 */
  userId?: string | null
  /** 当前登录用户是否点过赞。匿名请求恒为 null */
  isLiked?: boolean | null
  /** 点赞数。实测多为 null */
  likeCount?: number | null
  /** 质量分（服务端排序用） */
  quality?: number | null
  /** **不是「是否可见」**：服务端恒给 `false`，含义是「还没上屏」。见本文件顶部说明 */
  isShow?: boolean
  /** GraphQL 类型名，恒为 `VisionDanmaku` */
  __typename?: string
  [property: string]: any
}
