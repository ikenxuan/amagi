/**
 * 手写协议契约，来源是 2026-09-26 在浏览器里对 PC GraphQL `visionSubCommentList`
 * 的实测（形状、键名、游标取值）。选择集是 core 那边自己拼的 12 个字段（前端 bundle
 * 里这条 mutation 的片段没能提出来），服务端接受这 12 个。依据和局限见 README.md。
 *
 * 这不是由语料生成的类型：没有录到可提交的响应样本（返回体里全是真实用户昵称与
 * 评论正文），所以只声明实测**确认过类型**的字段，其余保持 `unknown`。
 */

/**
 * 一条子评论。键就是 core 请求的那 12 个（GraphQL 按选择集原样返回，所以键集合由
 * 请求决定，不是额外的实测结论）；只有确认过类型的才收窄
 */
export interface SubComment {
  /** 实测为字符串 */
  commentId?: string
  /** 实测为字符串 */
  authorId?: string
  /** 实测为数字（毫秒时间戳） */
  timestamp?: number
  /** 实测为布尔 */
  hasSubComments?: boolean
  /** 被回复的评论 ID，实测为字符串 */
  replyTo?: string
  /** 以下 6 个键实测存在，但类型未逐个确认，不猜 */
  authorName?: unknown
  content?: unknown
  headurl?: unknown
  likedCount?: unknown
  liked?: unknown
  status?: unknown
  replyToUserName?: unknown
  [property: string]: unknown
}

/**
 * `visionSubCommentList` 载荷。
 *
 * V1 / V2 两套并存，**数据只在 V2**：实测 5 条带回复的根评论，`subComments`
 * 全为空数组、`subCommentsV2` 有条目。游标同理看 `pcursorV2`，到底时是 `'no_more'`。
 */
export interface SubCommentList {
  /** V1 游标。实测首屏回空串 */
  pcursor?: string
  /** V1 条目。实测的那 5 条根评论都是空数组 */
  subComments?: SubComment[]
  /** V2 游标。实测到底时为 `'no_more'` */
  pcursorV2?: string
  /** V2 条目 —— 真正有数据的那一边 */
  subCommentsV2?: SubComment[]
  [property: string]: unknown
}

/**
 * 子评论响应。
 *
 * 顶层只实测到 `data` 一个键：**没有** `result`，也没有 `data.result`
 * （所以端点的判定只能靠平台默认那几道，不加嵌套 `result` 分支）。
 * 撞风控时形状变成 `errors[] + data.captcha`，由 `kuaishouJudge` 接住。
 */
export interface CommentReplies {
  data?: {
    visionSubCommentList?: SubCommentList | null
    [property: string]: unknown
  }
  [property: string]: unknown
}

/**
 * 一个表情包里的单条表情。
 *
 * 键集合来自 2026-09-27 浏览器实测，2026-09-28 对返回的 275 条逐项复核了
 * ID、类型和尺寸字段；其余仅确认键存在，保持 `unknown`。来源及边界见 README.md。
 */
export interface Emotion {
  /** 所属表情包 ID，实测为字符串 */
  packageId?: string
  /** 表情 ID，实测为字符串 */
  id?: string
  /** 实测为数字 */
  type?: number
  /** 实测为数字（像素） */
  width?: number
  /** 实测为数字（像素） */
  height?: number
  /** 以下键实测存在，类型未逐个确认，不猜 */
  emotionCodes?: unknown
  bizScene?: unknown
  extraInfo?: unknown
  bizType?: unknown
  emotionImageSmallUrl?: unknown
  emotionImageBigUrl?: unknown
  name?: unknown
  [property: string]: unknown
}

/**
 * 一个表情包。
 *
 * 实测列表只有 1 个包，不代表其他账号或登录态下数量固定。
 */
export interface EmotionPackage {
  /** 表情包 ID，实测为字符串 */
  id?: string
  /** 实测为数字 */
  type?: number
  /** 包内表情，实测 275 条 */
  emotions?: Emotion[]
  /** 以下键实测存在，类型未逐个确认，不猜 */
  emotionPackageVersion?: unknown
  introduction?: unknown
  style?: unknown
  name?: unknown
  description?: unknown
  packageImageSmallUrl?: unknown
  packageImageMiddleUrl?: unknown
  packageImageBigUrl?: unknown
  packageBannerUrl?: unknown
  packageImageSmallUrlDarkMode?: unknown
  packageDownloadUrl?: unknown
  [property: string]: unknown
}

/**
 * 表情包列表响应（`www.kuaishou.com/rest/k/emotion/package/list`）。
 *
 * 无凭据 GET / POST 均实测成功，顶层为 `result` / `emotionPackageList` / `host-name`。
 * 本类型是手写协议，未保存原始响应或新增 corpus；复核记录见 README.md。
 */
export interface EmotionPackageList {
  /** 业务状态码，实测成功为 `1` */
  result?: number
  /** 表情包列表；实测 1 个元素，不限定数量 */
  emotionPackageList?: EmotionPackage[]
  /** 服务端主机标识，非业务字段 */
  'host-name'?: unknown
  [property: string]: unknown
}

/**
 * 相关推荐里的一条作品。
 *
 * 2026-09-28 实测：返回的 5 条作品项字段类型完全一致，下列收窄字段逐条核对无例外；
 * `soundTrack` 有 1 条缺失，所以是可选。未逐项确认类型的键保持 `unknown`。
 */
export interface SlideFeedWork {
  /** 作品 ID，实测为字符串 */
  photoId?: string
  /** 作者数字 ID；回传给本接口的 `authorId` 就是它 */
  userId?: number
  /** 作者 eid，实测为 `3x` 开头的字符串 */
  userEid?: string
  /** 实测为字符串 */
  userName?: string
  /** 实测为字符串 */
  caption?: string
  /** 实测为数字（毫秒） */
  duration?: number
  /** 实测为数字（毫秒时间戳） */
  timestamp?: number
  /** 实测为数字（像素） */
  width?: number
  /** 实测为数字（像素） */
  height?: number
  /** 实测为数字 */
  likeCount?: number
  /** 实测为数组 */
  mainMvUrls?: unknown[]
  /** 实测为数组 */
  coverUrls?: unknown[]
  /** 配乐；实测 5 条里有 1 条没有这个键 */
  soundTrack?: unknown
  /** 以下键实测存在，类型未逐个确认，不猜 */
  type?: unknown
  manifest?: unknown
  commentCount?: unknown
  forwardCount?: unknown
  viewCount?: unknown
  shareCount?: unknown
  webpCoverUrls?: unknown
  headUrls?: unknown
  headUrl?: unknown
  verified?: unknown
  userSex?: unknown
  singlePicture?: unknown
  tagShow?: unknown
  collectionCount?: unknown
  photoType?: unknown
  share_info?: unknown
  sameFrame?: unknown
  adminTags?: unknown
  forcePublic?: unknown
  ext_params?: unknown
  exp_tag?: unknown
  serverExpTag?: unknown
  [property: string]: unknown
}

/**
 * 相关推荐响应（`c.kuaishou.com/rest/wd/ugH5App/slide/feed`）。
 *
 * 2026-09-28 无凭据实测成功（`result: 1`，6 条）。
 *
 * **`feeds` 是异构数组**：实测 6 条里 5 条是 35 键的作品（{@link SlideFeedWork}），
 * 另有 1 条只有 8 个键（`cardId` / `cardViewList` / `btn` / `guide` 等）的推荐卡片。
 * 因此条目声明为联合而不是一律按作品算 —— 调用方必须先判别再读作品字段。
 * 卡片一侧没有逐项确认类型，保持 `unknown`。
 *
 * 未保存原始响应或新增 corpus：返回体含真实昵称与作品正文。复核记录见 README.md。
 */
export interface SlideFeed {
  /** 业务状态码，实测成功为 `1` */
  result?: number
  data?: {
    /** 异构列表：作品项与推荐卡片混排 */
    feeds?: Array<SlideFeedWork | unknown>
    /** 实测为字符串 */
    sessionId?: string
    /** 实测为字符串 */
    requestId?: string
    /** 实测为布尔 */
    forceFeedInject?: boolean
    [property: string]: unknown
  }
  /** 实测为数字 */
  timestamp?: number
  /** 服务端主机标识，非业务字段 */
  hostname?: unknown
  [property: string]: unknown
}

/**
 * 直播状态块。
 *
 * 2026-10-01 对 `/rest/v/search/user` 的 30 条用户逐项审计：三个键 30/30 全部存在。
 */
export interface LivingInfo {
  /** 实测 30/30 为布尔 */
  living?: boolean
  /** 直播间 ID；2026-10-01 搜索“直播”实测开播 7 条为 string，其余 23 条为 null。 */
  livingId?: string | null
  /** 实测 30/30 为数字 */
  iconType?: number
  [property: string]: unknown
}

/** 认证详情，2026-10-01 在用户搜索及作品作者中逐字段确认。 */
export interface SearchVerifiedDetail {
  description?: string
  iconType?: number
  viceVerifiedType?: number
  type?: number
  newVerified?: boolean
  musicCompany?: boolean
  [property: string]: unknown
}

/** 播放地址项，普通与 H265 地址数组中均实测为这两个字符串键。 */
export interface SearchPhotoUrl {
  cdn?: string
  url?: string
  [property: string]: unknown
}

/** 播放清单中的码流，2026-10-01 对两组搜索结果逐字段确认。 */
export interface SearchVideoRepresentation {
  id?: number
  url?: string
  backupUrl?: string[]
  maxBitrate?: number
  avgBitrate?: number
  width?: number
  height?: number
  frameRate?: number
  quality?: number
  kvqScore?: {
    FR?: number
    NR?: number
    FRPost?: number
    NRPost?: number
    nnvcScore?: number
    sharpness?: number
    blur?: number
    [property: string]: unknown
  }
  qualityType?: string
  qualityLabel?: string
  featureP2sp?: boolean
  p2spCode?: string
  hidden?: boolean
  disableAdaptive?: boolean
  defaultSelect?: boolean
  comment?: string
  hdrType?: number
  fileSize?: number
  bitratePattern?: number[]
  agc?: boolean
  mute?: boolean
  oriLoudness?: number
  makeupGain?: number
  realLoudness?: number
  realNormalizeGain?: number
  normalizeGain?: number
  volumeInfo?: {
    loudness?: number
    th?: number
    lra?: number
    lraTh?: number
    lraLow?: number
    lraHigh?: number
    tp?: number
    chCorr?: number
    [property: string]: unknown
  }
  colorInfo?: {
    yMean?: number
    yMeanMax?: number
    yMeanMin?: number
    bright?: number
    contrast?: number
    saturation?: number
    [property: string]: unknown
  }
  m3u8Slice?: string
  codecs?: string
  videoCodec?: string
  [property: string]: unknown
}

/** 普通与 H265 播放清单；只声明实测字段，不假设所有作品都返回全部键。 */
export interface SearchVideoManifest {
  version?: string
  businessType?: number
  mediaType?: number
  videoId?: string
  hideAuto?: boolean
  manualDefaultSelect?: boolean
  stereoType?: number
  adaptationSet?: Array<{
    id?: number
    duration?: number
    representation?: SearchVideoRepresentation[]
    [property: string]: unknown
  }>
  playInfo?: {
    bizType?: number
    cdnTimeRangeLevel?: number
    strategyBus?: string
    [property: string]: unknown
  }
  videoFeature?: {
    blurProbability?: number
    blockyProbability?: number
    avgEntropy?: number
    mosScore?: number
    contrast?: number
    underExposed?: number
    overExposed?: number
    capSrc?: number
    yMean?: number
    yMeanMax?: number
    yMeanMin?: number
    [property: string]: unknown
  }
  audioFeature?: {
    audioQuality?: number
    musicProbability?: number
    dialogProbability?: number
    backgroundSoundProbability?: number
    stereophonicRichness?: number
    audioClip?: number
    audioSnr?: number
    effectiveBandwidthInHz?: number
    [property: string]: unknown
  }
  [property: string]: unknown
}

/**
 * 搜索结果里的一个用户。
 *
 * 2026-10-01 在浏览器里对一次真实 `/rest/v/search/user`（`result: 1`、8872 字节）
 * 的 30 条逐项审计：下列 7 个键 **30/30 全部存在且类型一致**，所以收窄有据。
 * 仍全部可选 —— 一次关键词的 30 条不足以证明服务端在任何账号/关键词下都给全。
 *
 * 键名风格与同族的 {@link SearchWorkListAuthor} **不一致**（这里是 `user_id` /
 * `user_name` 下划线风格，那边是 `id` / `name`），照抄服务端，不在类型层归一化。
 */
export interface SearchUserItem {
  /** 作者 eid，不是快手号；实测为 15 字符字符串。 */
  user_id?: string
  /** 实测为字符串 */
  user_name?: string
  /** 个人简介，实测为字符串 */
  user_text?: string
  /** 头像地址，实测为字符串 */
  headurl?: string
  /** 实测为布尔 */
  verified?: boolean
  /** 实测为布尔 */
  isFollowing?: boolean
  /** 实测 30/30 为对象 */
  livingInfo?: LivingInfo
  /** 认证详情，搜索“直播”时 28/30 条返回。 */
  verifiedDetail?: SearchVerifiedDetail
  [property: string]: unknown
}

/**
 * 搜索用户响应（`www.kuaishou.com/rest/v/search/user`）。
 *
 * 顶层实测为 `result` / `pcursor` / `host-name` / `searchSessionId` / `users` 五个键。
 * 本类型是手写协议，未保存原始响应或新增 corpus（返回体全是真实昵称与简介）；
 * 复核记录见 README.md。
 */
export interface SearchUser {
  /** 业务状态码，成功为 1；仅首页 cookie 实测返回 2，注册游客可成功。 */
  result?: number
  /** 用户列表，实测 30 条 */
  users?: SearchUserItem[]
  /** 分页游标，首屏实测为 '1'；按原值传入后续请求。 */
  pcursor?: string
  /** 搜索会话 ID，实测为 55~56 字符字符串；翻页必须回传 */
  searchSessionId?: string
  /** 服务端主机标识，实测为字符串，非业务字段。 */
  'host-name'?: string
  [property: string]: unknown
}

/**
 * 搜索作品条目里的作者。
 *
 * 2026-10-01 对 19 条作品逐项审计：前 5 个键 19/19 存在，verifiedDetail 为 6/19。
 */
export interface SearchWorkListAuthor {
  /** 作者 eid，实测为 15 字符字符串 */
  id?: string
  /** 实测为字符串 */
  name?: string
  /** 头像地址，实测为字符串 */
  headerUrl?: string
  /** 实测为布尔 */
  following?: boolean
  /** 实测 19/19 为对象 */
  livingInfo?: LivingInfo
  /** 认证详情，首批 6/19 条返回；另一次搜索 4/20 条逐字段确认。 */
  verifiedDetail?: SearchVerifiedDetail
  [property: string]: unknown
}

/**
 * 搜索作品条目里的作品本体。
 *
 * 2026-10-01 对 19 条逐项审计：H265 两字段为 18/19，overrideCoverUrl 为 11/19。
 * 缺席原因未确认；其余字段的观测类型见字段注释。
 */
export interface SearchWorkListPhoto {
  /** 作品 ID，实测为 15 字符字符串 */
  id?: string
  /** 实测为字符串 */
  caption?: string
  /** 实测为数字（毫秒） */
  duration?: number
  /** 实测为数字（毫秒时间戳） */
  timestamp?: number
  /** 实测为数字（像素） */
  width?: number
  /** 实测为数字（像素） */
  height?: number
  /** 实测为数字 */
  likeCount?: number
  /** 实测为数字 */
  viewCount?: number
  /** 实测为数字 */
  collectCount?: number
  /** 实测为布尔 */
  liked?: boolean
  /** 实测为布尔 */
  collected?: boolean
  /** 实测为布尔 */
  disableSensitivePhoto?: boolean
  /** 实测为数字 */
  stereoType?: number
  /** 实测为字符串 */
  expTag?: string
  /** 封面地址，实测为字符串 */
  coverUrl?: string
  /** 动图封面地址，实测为字符串 */
  animatedCoverUrl?: string
  /** 替换封面地址，实测只有 11/19 条带这个键 */
  overrideCoverUrl?: string
  /** 风险提示文案；追加 20 条样本中 6 条为 string、14 条为 null。 */
  riskTagContent?: string | null
  /** 风险提示链接，与上述样本中的文案类型一致。 */
  riskTagUrl?: string | null
  /** 播放地址数组，已逐项确认 cdn/url 均为字符串。 */
  photoUrls?: SearchPhotoUrl[]
  /** H265 播放地址数组，首批 18/19 条带此字段。 */
  photoH265Urls?: SearchPhotoUrl[]
  /** 播放清单，包含码流、播放配置及音视频特征。 */
  manifest?: SearchVideoManifest
  /** H265 播放清单。 */
  manifestH265?: SearchVideoManifest
  [property: string]: unknown
}

/**
 * 一条搜索作品结果。
 *
 * 2026-10-01 对首屏 19 条逐项审计。`tags` 只有 10/19、`authorStatement` 只有 1/19 ——
 * 这两个键的缺席是常态，调用方必须按缺省处理。
 */
export interface SearchWorkListItem {
  /** 条目类型，实测 19/19 为数字 */
  type?: number
  /** 作品本体，实测 19/19 为对象 */
  photo?: SearchWorkListPhoto
  /** 作者，实测 19/19 为对象 */
  author?: SearchWorkListAuthor
  /** 实测 19/19 为布尔 */
  danmakuSwitch?: boolean
  /** 评论计数块，实测 19/19 为对象且只有一个 `us_c` 数字键 */
  comment?: {
    /** 实测为数字 */
    us_c?: number
    [property: string]: unknown
  }
  /** 话题标签，已逐项确认 name 为 string、type 为 number。 */
  tags?: Array<{ name?: string; type?: number; [property: string]: unknown }>
  /** 作者声明，追加样本中 1/20、3/20 条返回并逐字段确认。 */
  authorStatement?: {
    content?: string
    type?: number
    riskStyleType?: number
    [property: string]: unknown
  }
  [property: string]: unknown
}

/**
 * 搜索作品响应（`www.kuaishou.com/rest/v/search/feed`）。
 *
 * 2026-10-01 实测首屏 19 条（164740 字节）、第二屏 20 条；另一次隔离游客首屏为 20 条。
 * 顶层 7 个键：`result` / `webPageArea` / `pcursor` / `feeds` / `llsid` /
 * `host-name` / `searchSessionId`。
 *
 * 本类型是手写协议，未保存原始响应或新增 corpus；复核记录见 README.md。
 */
export interface SearchWorkList {
  /** 业务状态码，成功为 1；仅首页 cookie 实测返回 2，注册游客可成功。 */
  result?: number
  /** 作品列表，实测首屏 19 条、第二屏 20 条 */
  feeds?: SearchWorkListItem[]
  /** 分页游标，**页号的字符串形式**：首屏回 `'1'`，拿它当第二屏的 `pcursor` */
  pcursor?: string
  /** 搜索会话 ID，实测为 56 字符字符串；第二屏请求体必须回传 */
  searchSessionId?: string
  /** 页面区域标识，实测响应为 12 字符字符串，首屏请求为空串。 */
  webPageArea?: string
  /** 日志串联 ID，实测为 19 字符字符串 */
  llsid?: string
  /** 服务端主机标识，实测为字符串，非业务字段。 */
  'host-name'?: string
  [property: string]: unknown
}

/**
 * 当前登录账号的资料响应（`www.kuaishou.com/rest/v/profile/get`）。
 *
 * 2026-10-01 实测：GET、无请求体、带签名与 `caver=2`，响应 366 字节、13 个键、
 * 全部平铺在顶层（没有 `data` 包一层）。无 cookie 时 `result: 2`。
 *
 * 返回 cookie 所属账号，eid 与 userDefineId（快手号）不可互换。
 * 注册游客实测返回 result: 109。
 *
 * 本类型是手写协议，未保存原始响应或新增 corpus（返回体含运营者本人的手机号与昵称）；
 * 复核记录见 README.md。
 */
export interface LoginUserProfile {
  /** 业务状态码，实测成功为 `1` */
  result?: number
  /** 账号 eid，实测为 15 字符字符串 */
  eid?: string
  /** 数字 ID，实测为**数字**（与 `eid` 是两个不同的标识） */
  userId?: number
  /** 快手号，实测为字符串（样本是 10 位数字组成的串，不保证总是纯数字） */
  userDefineId?: string
  /** 昵称，实测为字符串 */
  userName?: string
  /** 头像地址，实测为字符串 */
  userHead?: string
  /**
   * 个人简介。**键名就是 `userTex`**（服务端少了个 `t`），不是 `userText` ——
   * 照抄服务端，不在类型层改名。实测为字符串（样本为空串）。
   */
  userTex?: string
  /** 性别，实测为 1 字符字符串 */
  sex?: string
  /** 绑定手机号，服务端已把中间四位打码后再返回，实测为 11 字符字符串 */
  mobile?: string
  /** 粉丝数，实测为数字 */
  fans?: number
  /** 关注数，实测为数字 */
  follows?: number
  /** 获赞数，实测为数字 */
  like?: number
  /** 服务端主机标识，非业务字段 */
  'host-name'?: unknown
  [property: string]: unknown
}
