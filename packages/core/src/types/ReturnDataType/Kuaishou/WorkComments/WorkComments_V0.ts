/**
 * 快手 `comments` 响应类型（H5 `/rest/wd/photo/comment/list`）。
 *
 * 从 PC GraphQL 的 `commentListQuery` 整条换过来，**不做归一化**（amagi 是接口库，
 * 抹平平台差异是下游的事）。与 GraphQL 那套的三处结构差异因此原样留给调用方：
 *
 * 1. 没有 `data.visionCommentList` 那两层，条目与游标都在顶层
 * 2. 字段名是 **snake_case**（`comment_id` / `author_id` / `reply_to`），
 *    GraphQL 那套是 camelCase（`commentId` / `authorId` / `replyTo`）—— 两套不通用
 * 3. 子评论**不内嵌**在根评论里，而是在 {@link KsWorkComments_V0.subCommentsMap}
 *    里按根评论 ID 分组
 *
 * 下游改读字段时的对照表（左 = 原 GraphQL，右 = 现 H5）：
 * `commentId` → `comment_id`、`authorId` → `author_id`、`authorName` → `author_name`、
 * `authorLiked` → `author_liked`、`replyTo` → `reply_to`、
 * `realLikedCount` → 无（只有 `likedCount`）、
 * `rootComments[i].subComments` → `subCommentsMap[comment_id].subComments`、
 * `rootComments[i].subCommentsPcursor` → `subCommentsMap[comment_id].pcursor`。
 *
 * 形状与其中的实测结论来自 @OduckO 的 kuaishou-parser（GPL-3.0-only，与 amagi 同许可）：
 * https://github.com/OduckO —— 对照其 `src/types.ts` 的 `KsCommentRestRaw` /
 * `KsCommentRaw` / `KsAttachmentRaw` 与 `test/fixtures/comment.json`。
 *
 * 每一层都保留 `[property: string]: any`：平台加字段不算 breaking，这条承诺由
 * `test/types/response-types.test-d.ts` 锁着，去掉索引签名会直接挂 `test:types`。
 */
export type KsWorkComments_V0 = {
  /**
   * 接口状态码。`1` = 成功。
   *
   * 失败码语义与 PC GraphQL 那套完全不同：`2` = 平台拒绝 / IP 级冷却
   * （连查十几个作品后全线 `2`，随机 did 和重试都救不回来，要等几分钟）、
   * `50` = 签名验证失败（body 没进签名输入，重试无用）、`2001` = 撞风控滑块。
   */
  result: number
  /** 失败原因文案，成功时不返回 */
  error_msg?: string | null
  /** 评论总数（含子评论） */
  commentCount?: number
  /** 下一页游标，`no_more` 或空表示到底 */
  pcursor?: string
  /**
   * 根评论列表。
   *
   * 多页调用时这里是**跨页累积**后的条目 —— `endpoints/comments.ts` 的 `normalize`
   * 把累积结果回填到最后一页的原位，所以这个键一定在（没有评论时是空数组）。
   */
  rootComments: KsCommentRaw[]
  /**
   * 子评论，按**根评论 ID** 分组。
   *
   * 这是 H5 这套最容易踩的结构差异：`rootComments[i].subComments` 是空的，
   * 回复串要拿根评论的 `comment_id` 到这张表里取。
   */
  subCommentsMap?: Record<string, KsSubCommentGroup>
  /** 风控挑战配置（撞滑块时才有）。amagi 只做中转不做绕过，滑块地址交给用户自己过 */
  captchaConfig?: string
  [property: string]: any
}

/** `subCommentsMap` 里的一组子评论（键是根评论的 `comment_id`） */
export type KsSubCommentGroup = {
  /** 该根评论下已加载的子评论。快手评论区只有两层，这一串是平铺的，不会再往下嵌 */
  subComments?: KsCommentRaw[]
  /** 这一串子评论的游标，`no_more` 表示已到底 */
  pcursor?: string
  [property: string]: any
}

/**
 * 一条评论（根评论与子评论同形状）。
 *
 * 字段名以 H5 REST 的实测形状为准：**snake_case**。PC GraphQL 那套 camelCase
 * （`commentId` / `authorId` / `replyTo`）在这条链路上一个都不出现。
 */
export type KsCommentRaw = {
  /** 评论 ID */
  comment_id?: string
  /** 评论者用户 ID。实测数字与字符串都出现过 */
  author_id?: string | number
  /** 评论者昵称 */
  author_name?: string
  /** 是否被作品作者点赞（YouTube 里「创作者已点赞」的同类信息） */
  author_liked?: boolean
  /** 正文。表情是 `[捂脸]` 这样的文本码，要靠 `emojiList` 的映射表才能还原成图片 */
  content?: string
  /** 头像（单张） */
  headurl?: string
  /** 头像多 CDN 列表 */
  headurls?: KsCdnUrl[]
  /** 毫秒时间戳 */
  timestamp?: number
  /** 接口直接给好的时间文案。实测两种形式都出现过：相对式「3天前」与绝对式 `2026-08-07 21:17:25` */
  time?: string
  /** 点赞数。类型不稳定：有时是数字，有时是字符串（还可能是「1.2万」这种展示值） */
  likedCount?: string | number
  /** 当前登录账号是否点过赞（未登录恒为 false / 不返回） */
  liked?: boolean
  /** 评论者所在地区，如「广东」—— 快手评论区会把它展示出来 */
  authorArea?: string
  /** 评论者是否官方认证 */
  authorVerified?: boolean
  /** 认证详情 */
  authorVerifiedDetail?: Record<string, any>
  /** 是否「神评论」（快手对高赞置顶评论的标记） */
  godComment?: boolean
  /** 是否热评 */
  hot?: boolean
  /** 子评论总数 */
  subCommentCount?: number
  /**
   * 展示用的子评论数标记。
   *
   * 实测样本里给的是布尔 `true`，对照项目的类型声明写的是 `number`，两种都容得下。
   */
  displaySubCommentCount?: number | boolean
  /** 子评论是否可见 */
  subCommentVisible?: boolean
  /** 子评论可见条数上限 */
  subCommentVisibleLimit?: number
  /**
   * 被回复者的**用户 ID**（不是评论 ID）。
   *
   * 实测确认：拉了 79 条根评论 + 76 条子评论，`reply_to` 的值全部对不上任何
   * `comment_id`，但能和 `author_id` 对上 —— 它存的是「回复给哪个人」。
   *
   * 根评论的 `reply_to` 为 `0`。
   *
   * 这决定了回复关系只能还原到「谁回复谁」这一层：同一组里多人回复同一个人时，
   * 无法区分他们回复的是那个人的哪一条发言。要展示层级用 {@link replyToUserName} 更直接。
   */
  reply_to?: string | number
  /**
   * 被回复者的昵称（子评论才有）。
   *
   * 这是快手表达回复关系的主要方式。它**不区分**被回复者的哪一条发言 ——
   * 快手的评论区只有两层（根评论 + 平铺的回复），没有 YouTube 那种真正的树。
   */
  replyToUserName?: string
  /** 当前查看者的用户 ID（接口按请求上下文回填，与评论本身无关） */
  user_id?: string | number
  /** 评论者性别，实测取值 `F` / `M` / `U` */
  user_sex?: string
  /** 所属作品 ID（长数字形式） */
  photo_id?: number | string
  /** 评论状态 */
  status?: number
  /** 评论类型标记，实测恒为 0 */
  type?: number
  /** 召回类型（热评/推荐链路的标记），实测取值 1 */
  recallType?: number
  /** 评论者身份标签（实测为空数组） */
  commentAuthorTags?: any[]
  /** 评论底部标签（实测为空数组） */
  commentBottomTags?: any[]
  /** 现金活动标签（实测为空对象） */
  cashTags?: Record<string, any>
  /** 图片附件 —— 评论区的表情包图片就在这里 */
  attachments?: KsAttachmentRaw[]
  [property: string]: any
}

/**
 * 评论里的图片附件。
 *
 * 这就是用户口中「评论区的表情包图片」—— 用户从自己收藏里发出来的图，在评论区显示为
 * 一张图片而不是 `[xxx]` 文本码，与官方表情是两套完全不同的机制（官方表情靠映射表
 * 还原，这个本身就是可直接下载的 URL）。实测出现率不高（约 500 条评论里 7 个），
 * 所以所有字段都要当可选处理。
 */
export type KsAttachmentRaw = {
  /** 附件类型，实测取值 `PHOTO` */
  type?: string
  /** 附件 ID，同时也是被引用作品的 photoId（长数字形式） */
  id?: string
  /** App 内预览链接（`kwai://` scheme，网页端不可用） */
  previewURL?: string
  /** 尺寸信息。注意 `width` / `height` 实测恒为 0，真实尺寸看 `thumbWidth` / `thumbHeight` */
  layout?: {
    width?: number
    height?: number
    thumbWidth?: number
    thumbHeight?: number
    [property: string]: any
  }
  content?: {
    /** 图片直链，多 CDN 备份 */
    smallUrl?: KsCdnUrl[]
    /** 被引用作品的元信息 */
    photoInfo?: {
      userName?: string
      /** 来源标记，如 `LIKE_TAB`（来自用户的点赞收藏） */
      photoSource?: string
      photoId?: string
      photoType?: number
      serverExpTag?: string
      [property: string]: any
    }
    [property: string]: any
  }
  [property: string]: any
}

/** CDN 地址项。快手的多 CDN 字段（`headurls` / `smallUrl` / `audioUrls` …）都是这个形状 */
export type KsCdnUrl = {
  cdn?: string
  url?: string
  [property: string]: any
}
