/**
 * 快手 `videoWork` 响应类型（H5 完整版 `/rest/wd/photo/info`）。
 *
 * 从 PC GraphQL 的 `visionVideoDetail` 整条换过来，**不做归一化**：H5 接口原本的形状
 * 原样透出。所以这份类型不再有 `data.visionVideoDetail` 那两层，顶层就是
 * `{ result, photo, counts, atlas, single, serialInfo, mp4Url }` —— 净收益正是 GraphQL
 * 那条根本没有的 `atlas`（图集原图）与 `mp4Url`（图集的视频版）。
 *
 * 形状与其中的实测结论来自 @OduckO 的 kuaishou-parser（GPL-3.0-only，与 amagi 同许可）：
 * https://github.com/OduckO —— 对照其 `src/types.ts` 的 `KsOneWorkRaw` / `KsPhotoRaw` /
 * `KsExtParams` / `KsAtlasNode` / `KsManifest`，以及 `test/fixtures/` 里五份真实响应
 * （video / video_soundtrack / single_picture / vertical_atlas / horizontal_atlas）。
 *
 * 可选性判据：五份样本全都有的键为必选；随作品类型或接口版本变化的键为可选
 * （视频才有 `manifest` / `duration`，图集才有 `atlas`，单图才有 `single`，
 * 完整版才有 `mp4Url` / `photos` / `comments`）。`result !== 1` 的失败响应只有
 * `result` + `error_msg`，这种响应由 `platforms/kuaishou/judge.ts` 拦在前面，
 * 不会以 `data` 的形式交到调用方手上，所以这里按成功响应的形状声明。
 *
 * 每一层都保留 `[property: string]: any`：平台加字段不算 breaking，这条承诺由
 * `test/types/response-types.test-d.ts` 锁着，去掉索引签名会直接挂 `test:types`。
 */
// 预览评论与 CDN 地址项跟 comments 端点是同一套节点，直接复用，免得两处声明各自漂移
import type { KsCdnUrl, KsCommentRaw } from '../WorkComments/WorkComments_V0'

export type KsOneWork_V0 = {
  /**
   * 接口状态码。`1` = 成功。
   *
   * 失败码语义与 PC GraphQL 那套完全不同：`50` = 签名验证失败（body 没进签名输入，
   * 重试无用）、`2` = 平台拒绝 / IP 级冷却（可重试但要长退避）、`2001` = 撞风控滑块。
   */
  result: number
  /** 失败原因文案，成功时不返回 */
  error_msg?: string | null
  /** 作品主体。视频、图集、单图三类作品的字段都在这里 */
  photo: KsPhoto
  /** 作者维度的计数 */
  counts?: KsAuthorCounts
  /**
   * 图集数据（图集类作品才有）。
   *
   * 同一份数据在响应里出现两次，扩展名不同：顶层这份给 `.jpg`，
   * {@link KsExtParams.atlas} 那份给 `.webp`（同一张图实测 348KB，jpg 变体通常翻倍）。
   * 快手自己的 H5 页用的是 webp，两处都要认 —— 精简版 `simple/info` 只有
   * `photo.ext_params.atlas` 那一处。
   */
  atlas?: KsAtlasNode
  /**
   * 单图作品的图片节点，与 {@link atlas} 同形状（`type` 恒为 3）。
   *
   * 注意它**不带 `list`**：单图作品的原图就是 `photo.coverUrls`，这个节点只用来带配乐。
   */
  single?: KsAtlasNode
  /** 合集 / 剧集信息 */
  serialInfo?: KsSerialInfo
  /**
   * **图集的视频版**（只有完整版 `/rest/wd/photo/info` 返回）。
   *
   * 这是解开「App 里图集会动、下载下来是静态图」之谜的关键 —— 快手把整个图集预渲染成了
   * 一个带配乐的 mp4。实测样本：31 张图 → 26 秒 / 720×960 / 780 帧 / 1.99 MB，
   * 路径含 `newWatermark`（带水印）。
   *
   * 也就是说 App 播的是这个文件，长按保存走的是 `atlas.list` 的静态 webp —— 两条不同的通道。
   */
  mp4Url?: string
  /** 同类推荐作品（只有完整版返回）。实测返回 6 条同题材作品，对「收集某类素材」很实用 */
  photos?: KsPhoto[]
  /** 接口顺带返回的前几条评论（只有完整版返回，省掉一次 `photo/comment/list`） */
  comments?: KsCommentRaw[]
  [property: string]: any
}

/** 作者维度的计数。挂在响应顶层，不在 `photo` 里 */
type KsAuthorCounts = {
  /** 粉丝数 */
  fanCount?: number
  /** 关注数 */
  followCount?: number
  /** 收藏数（语义未逐一核对，实测样本给 2142） */
  collectionCount?: number
  /** 作品数 */
  photoCount?: number
  [property: string]: any
}

/**
 * 合集 / 剧集信息。
 *
 * 五份样本里 `valid` 为 false、`title` / `msg` / `serialId` / `serialType` 全为 null，
 * 也就是「这个作品不属于任何合集」时的形状；属于合集时的取值没采到样本。
 */
type KsSerialInfo = {
  /** 是否有合集 */
  valid?: boolean
  /** 合集标题 */
  title?: string | null
  /** 提示文案 */
  msg?: string | null
  /** 合集 ID */
  serialId?: string | number | null
  /** 合集类型 */
  serialType?: string | number | null
  /** 是否展示合集入口 */
  show?: boolean
  [property: string]: any
}

/**
 * 图集 / 单图节点（顶层 `atlas` / `single` 与 `ext_params.atlas` / `.single` 同形状）。
 *
 * 图片直链要自己拼：`https://` + `cdn[0]`（或 `cdnList[0].cdn`）+ `list[i]`；
 * 配乐同理，用 `musicCdnList[0].cdn` + `music`。
 */
type KsAtlasNode = {
  /** 图片 CDN 域名列表 */
  cdn?: string[]
  /** 图片 CDN 域名列表（对象形式，与 {@link cdn} 内容一致） */
  cdnList?: Array<{ cdn?: string; [property: string]: any }>
  /** 图片相对路径列表。单图作品没有这个字段 */
  list?: string[]
  /** 每张图的尺寸，下标与 {@link list} 对齐 */
  size?: Array<{ w?: number; h?: number; [property: string]: any }>
  /** 配乐相对路径（.m4a）。图集的配乐走这里，视频的原声走 `photo.soundTrack` */
  music?: string
  /** 配乐 CDN 域名列表 */
  musicCdnList?: Array<{ cdn?: string; [property: string]: any }>
  /** 音量 */
  volume?: number
  /** `1` = 横版图集，`2` = 竖版图集，`3` = 单图 */
  type?: number
  [property: string]: any
}

/**
 * 作品主体。
 *
 * 类型分发规则（实测）：
 * - `ext_params.atlas` 存在 → 图集（`atlas.type` `1` 横版 / `2` 竖版），图片是 webp，另有 m4a 配乐
 * - `ext_params.single` / `ext_params.karaoke` 存在 → 单图，原图走 `coverUrls`
 * - 否则 → 视频，优先 `manifest.adaptationSet`，回落 `mainMvUrls`
 *
 * 最省事的判据是 {@link photoType}；{@link type} 五份样本恒为 1，拿它分类会全错。
 */
type KsPhoto = {
  /** 作品长数字 ID（字符串形式）。请求用的短 ID 不在响应里 */
  photoId: string
  /**
   * 作品类型。实测取值 `VIDEO` / `SINGLE_PICTURE` / `VERTICAL_ATLAS` / `HORIZONTAL_ATLAS`，
   * 另有 `SPHERICAL_VIDEO`（全景视频）/ `PAY_COURSE_VIDEO`（付费课程试看）。
   *
   * 刻意声明成 `string` 而不是字面量联合：平台加一种新作品类型不该让下游编译失败。
   */
  photoType: string
  /** 媒体类型标记，五份样本恒为 1 —— **不是**作品类型，别拿它分类 */
  type: number
  /** 是否图片类作品。注意图集也是 `true`，只有视频是 `false` */
  singlePicture: boolean
  /** 作品文案。话题标签（`#xxx`）混在正文里，要自己抽 */
  caption: string
  /** 发布时间，毫秒时间戳 */
  timestamp: number
  /** 视频时长（毫秒）。图集 / 单图不返回 */
  duration?: number
  /** 封面宽 */
  width: number
  /** 封面高 */
  height: number
  /** 作者昵称 */
  userName: string
  /** 作者数字 ID */
  userId: number
  /** 作者 eid（`3xhm7mmxrcewj92` 形式），拼主页地址用的就是它 */
  userEid: string
  /** 作者性别，实测取值 `F` / `M` / `U` */
  userSex: string
  /** 作者快手号（设置过才有） */
  kwaiId?: string
  /** 作者头像（单张） */
  headUrl: string
  /** 作者头像多 CDN 列表 */
  headUrls: KsCdnUrl[]
  /** 是否官方认证 */
  verified: boolean
  /** 认证详情，只有认证账号才返回 */
  verifiedDetail?: KsVerifiedDetail
  /** 点赞数 */
  likeCount: number
  /** 评论数 */
  commentCount: number
  /** 播放数 */
  viewCount: number
  /** 转发数 */
  forwardCount: number
  /** 分享数（图集样本有，视频样本没有） */
  shareCount?: number
  /** 封面图多 CDN 列表（jpg 原图） */
  coverUrls: KsCdnUrl[]
  /** 封面图 webp 变体，体积比 jpg 小得多 */
  webpCoverUrls: KsCdnUrl[]
  /** 视频直链（单档）。图集 / 单图作品这里是空数组 */
  mainMvUrls: KsCdnUrl[]
  /** 视频多档位清单。只有视频作品返回，图集 / 单图没有这个字段 */
  manifest?: KsManifest
  /** 作品使用的音乐 */
  music?: KsMusicNode
  /**
   * 作品原声：视频作品的独立音轨（.m4a），可脱离视频单独播放。
   *
   * 与 {@link music} 同形状。图集类作品没有 `soundTrack`，配乐走 `ext_params.atlas.music`。
   */
  soundTrack?: KsMusicNode
  /** 扩展参数。图集 / 单图的图片数据就藏在这里 */
  ext_params: KsExtParams
  /**
   * 分享信息，形如 `userId=...&photoId=...&...` 的 query 串。
   *
   * 推荐流条目（{@link KsOneWork_V0.photos}）的作品 ID 只能从这里正则抠出来。
   */
  share_info: string
  /** 作品状态 */
  photoStatus: number
  /** 是否强制公开，实测是字符串 */
  forcePublic: string
  /** 曝光标记（推荐链路用） */
  exp_tag: string
  /** 服务端曝光标记 */
  serverExpTag: string
  /** 话题 / 活动标签展示信息 */
  tagShow?: KsTagShow
  /** 评论区展示样式 */
  commentShowType: number
  /** 运营标签（实测为空数组） */
  adminTags: any[]
  /** 合拍设置 */
  sameFrame?: { allow?: boolean; availableDepth?: number; [property: string]: any }
  [property: string]: any
}

/** 认证详情 */
type KsVerifiedDetail = {
  /** 认证说明，如「XX 领域优质创作者」 */
  description?: string
  iconType?: number
  type?: number
  viceVerifiedType?: number
  newVerified?: boolean
  /** 是否音乐公司认证 */
  musicCompany?: boolean
  [property: string]: any
}

/** 话题 / 活动标签展示信息 */
type KsTagShow = {
  /** 标签业务 ID */
  bizId?: string
  /** 使用该标签的作品数，实测是字符串 */
  usedCount?: string
  bannerType?: number
  type?: number
  [property: string]: any
}

/**
 * 扩展参数。
 *
 * 图集 / 单图作品的图片数据在这里 —— 而且这一份的图片路径是 **webp**，
 * 顶层 {@link KsOneWork_V0.atlas} 那份是 jpg。精简版 `simple/info` 只有这一处。
 */
type KsExtParams = {
  /** 图集数据（webp 变体） */
  atlas?: KsAtlasNode
  /** 单图数据 */
  single?: KsAtlasNode
  /** K 歌作品的数据，与 `single` 同形状（单图的兜底判据之一） */
  karaoke?: KsAtlasNode
  /** 媒体类型标记，实测 `3` = 视频，`6` = 图集 / 单图 */
  mtype?: number
  /** 主色调，形如 `#RRGGBB` */
  color?: string
  /** 宽 */
  w?: number
  /** 高 */
  h?: number
  /** 视频时长（毫秒），视频作品才有 */
  video?: number
  /** 音轨时长（毫秒），视频作品才有 */
  sound?: number
  /** 视频作品才有，含义未确认 */
  interval?: number
  /** 图片类作品才有，含义未确认（实测恒为 0） */
  f?: number
  [property: string]: any
}

/**
 * 视频多档位清单（只有视频作品返回）。
 *
 * 除了这里声明的键，实测还有 `playInfo` / `videoFeature` / `audioFeature` /
 * `stereoType` / `hideAuto` / `manualDefaultSelect` 等一批画质与音频分析字段，
 * 都是平台内部用的，交给索引签名兜。
 */
type KsManifest = {
  /** 档位分组，视频直链在 `representation` 里 */
  adaptationSet?: KsAdaptationSet[]
  mediaType?: number
  businessType?: number
  version?: string
  /** 视频 ID */
  videoId?: string
  [property: string]: any
}

/** 一组档位 */
type KsAdaptationSet = {
  id?: number
  /** 时长（毫秒） */
  duration?: number
  /** 同一视频的不同清晰度档位 */
  representation?: KsRepresentation[]
  [property: string]: any
}

/**
 * 一个清晰度档位。
 *
 * 实测每档还带一堆音量归一化与画质评分字段（`normalizeGain` / `kvqScore` /
 * `colorInfo` …），要用哪个自己从索引签名里取。
 */
type KsRepresentation = {
  id?: number
  /** 视频直链 */
  url?: string
  /** 备用 CDN 直链 */
  backupUrl?: string[]
  width?: number
  height?: number
  /** 平均码率 */
  avgBitrate?: number
  maxBitrate?: number
  frameRate?: number
  /** 编码，如 `avc` / `hevc` */
  videoCodec?: string
  /** 档位标识，如 `1080p` */
  qualityType?: string
  /** 档位中文名，如「超清」 */
  qualityLabel?: string
  /** 文件大小（字节） */
  fileSize?: number
  /** 是否默认选中的档位 */
  defaultSelect?: boolean
  /** 是否在画质列表里隐藏 */
  hidden?: boolean
  [property: string]: any
}

/**
 * 音乐节点（`photo.music` 与 `photo.soundTrack` 同形状）。
 *
 * `soundTrack` 是「作品原声」——一条独立的 m4a 音轨，可以脱离视频单独播放，
 * 这也是「只想听声音」场景的数据来源。
 */
type KsMusicNode = {
  /** 音乐 ID */
  id?: number
  /** 音乐名，如「噜啦噜啦的作品原声」 */
  name?: string
  /** 演唱 / 上传者 */
  artist?: string
  /** 音频直链多 CDN 列表（.m4a） */
  audioUrls?: KsCdnUrl[]
  /** 封面图多 CDN 列表 */
  imageUrls?: KsCdnUrl[]
  /** 头像多 CDN 列表 */
  avatarUrls?: KsCdnUrl[]
  /** 时长（毫秒） */
  duration?: number
  /** 音乐所属作品的长 ID */
  photoId?: number | string
  type?: number
  audioType?: number
  /** 使用该音乐的作品数 */
  photoCount?: number
  /** 使用次数 */
  usageCount?: number
  /** 是否有版权 */
  hasCopyright?: boolean
  /** 是否已下架 */
  isOffline?: boolean
  /** 音乐上传者。注意这一层的字段名是 snake_case */
  user?: KsMusicUser
  [property: string]: any
}

/** 音乐上传者 */
type KsMusicUser = {
  user_id?: number | string
  user_name?: string
  /** 性别，实测取值 `F` / `M` / `U` */
  user_sex?: string
  /** 用户 eid，拼主页地址用 */
  eid?: string
  headurl?: string
  headurls?: KsCdnUrl[]
  /** 当前登录账号是否已关注（未登录恒为 false） */
  following?: boolean
  visitorBeFollowed?: boolean
  [property: string]: any
}
