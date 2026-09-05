/**
 * 快手 H5 真实响应 fixture 的离线断言（全程不发一个请求）。
 *
 * ## 这是本仓库第一份真实响应样本
 *
 * amagi 在此之前没有 `test/fixtures/` —— 四个平台的响应类型全是照着文档与记忆手写的，
 * 于是「类型声明与平台实际返回的形状对不上」这类错误在离线一条都测不出来，只能等线上炸
 * （`RESPONSE-TYPE-AUTOGEN-PRD.md` 的核心论点正是这个）。快手这次从 PC GraphQL 换到
 * H5 REST，顺带把第一批样本落进仓库。
 *
 * ## 来源与许可
 *
 * 样本取自 @OduckO 的 kuaishou-parser（GPL-3.0-only，与 amagi 同许可）
 * <https://github.com/OduckO> 的 `test/fixtures/`。H5 的接口形状、`result` 码语义、
 * 「子评论按根评论 ID 分组」这些结论同样出自该项目的实测。
 *
 * ## 已脱敏
 *
 * 替换过的值：用户 ID / eid / 昵称 / 快手号、作品长短 ID 与曝光标记里的内部 ID、头像与媒体
 * URL 里 base64 编码的 `uid_photoId` 段（解码替换后按原长编回去）、签名与追踪串
 * （`pkey` / `tag` / `di`）、`forcePublic`（gzip 过的 protobuf，载荷就是内部作品 ID，已按假 ID
 * 重建）、caption 里的 @昵称墙、评论区昵称与附件引用的作品 ID。
 *
 * 同一个真实值在所有文件里换成同一个假值，且**位数与字符集与真值同形** —— 否则
 * 「子评论按根评论 ID 分组」这类关系会被打散，断言就成了假绿；位数变了还会顺手改掉
 * 大整数掉精度这条形状。**结构与字段名一字未改**，文件格式也保持抓取时的原样
 * （没重排、没美化）：这些样本的价值就在形状。
 *
 * ## 它们在验什么
 *
 * 不是「代码能编译」。是三件具体的事：
 *
 * 1. `satisfies KsOneWork` / `satisfies KsWorkComments` 让 tsc 拿**真实响应**去核类型声明 ——
 *    声明里写成必选的键，样本里必须真的有；写成什么类型，样本里必须真是那个类型。
 * 2. `kuaishouJudge` 对真实成功响应必须判成功。judge 是全仓唯一判定成败的地方，它把
 *    `result: 1` 判成失败、或把未登录空壳判成成功，调用方都会拿到错的东西。
 * 3. 类型注释里那些「实测结论」逐条对着样本核（图集同一份数据两种扩展名、单图节点没有
 *    `list`、`photo.type` 恒为 1 不能拿来分类、大整数 photoId 掉精度、子评论不内嵌）。
 *    **有对不上的如实写在对应的 it 里，没有改断言去迁就** —— 见文件末尾那个 describe。
 */
import { kuaishouJudge } from 'amagi/platforms/kuaishou/judge'
import type { KsOneWork, KsWorkComments } from 'amagi/types/ReturnDataType/Kuaishou/index'
import type { KsAttachmentRaw } from 'amagi/types/ReturnDataType/Kuaishou/WorkComments/WorkComments_V0'
import { describe, expect, it } from 'vitest'

import commentJson from '../../fixtures/kuaishou/comment.json'
import horizontalAtlasJson from '../../fixtures/kuaishou/horizontal_atlas.json'
import searchJson from '../../fixtures/kuaishou/search.json'
import singlePictureJson from '../../fixtures/kuaishou/single_picture.json'
import verticalAtlasJson from '../../fixtures/kuaishou/vertical_atlas.json'
import videoJson from '../../fixtures/kuaishou/video.json'

/**
 * 用 `satisfies` 而不是类型标注：既让 tsc 真的核一遍「真实响应能不能赋给声明的类型」——
 * 缺一个必选键、或某个键的实际类型对不上，这里就直接编译失败 —— 又保留 JSON 推出来的窄类型，
 * 下面的断言才能直接点字段，而不是全靠索引签名兜成 `any`。
 */
const video = videoJson satisfies KsOneWork
const singlePicture = singlePictureJson satisfies KsOneWork
const verticalAtlas = verticalAtlasJson satisfies KsOneWork
const horizontalAtlas = horizontalAtlasJson satisfies KsOneWork
const comments = commentJson satisfies KsWorkComments

/** 四份作品样本（`photo/info` 那条链路）。刻意不标 `KsOneWork[]`，标了就把窄类型冲掉了 */
const WORKS = [
  { name: 'video', work: video },
  { name: 'single_picture', work: singlePicture },
  { name: 'vertical_atlas', work: verticalAtlas },
  { name: 'horizontal_atlas', work: horizontalAtlas }
]

/** 两份图集样本：同一套结构，只有 `atlas.type` 与张数不同 */
const ATLASES = [
  { name: 'vertical_atlas', work: verticalAtlas, atlasType: 2, count: 22 },
  { name: 'horizontal_atlas', work: horizontalAtlas, atlasType: 1, count: 3 }
]

const HTTP_OK = { status: 200 }

describe('fixtures/kuaishou - judge 对真实成功响应一律判成功', () => {
  it.each(WORKS)('$name：result 是 1，judge 判成功', ({ work }) => {
    expect(work.result).toBe(1)
    expect(kuaishouJudge(work, HTTP_OK).ok).toBe(true)
  })

  it('评论样本：result 是 1，judge 判成功', () => {
    expect(comments.result).toBe(1)
    expect(kuaishouJudge(comments, HTTP_OK).ok).toBe(true)
  })

  it('搜索样本：judge 判成功（amagi 本次没实现搜索端点，这份只当形状参考）', () => {
    expect(searchJson.result).toBe(1)
    expect(searchJson.feeds.length).toBeGreaterThan(0)
    expect(kuaishouJudge(searchJson, HTTP_OK).ok).toBe(true)
  })

  it('未登录的 GraphQL 空壳判 auth / LOGIN_REQUIRED（自造，不是样本）', () => {
    // 这个形状取不到样本：它是 PC GraphQL 未登录时的响应 —— HTTP 200、没有 errors、没有
    // result、没有 code，只有 data 里一片 null。判据是 judge 的 kuaishouGraphqlNullVerdict
    const verdict = kuaishouJudge({ data: { visionVideoDetail: null } }, HTTP_OK)
    expect(verdict.ok).toBe(false)
    expect(verdict.kind).toBe('auth')
    expect(verdict.code).toBe('LOGIN_REQUIRED')
  })
})

describe('fixtures/kuaishou - 作品类型的分发判据', () => {
  it('video：视频数据在 manifest 与 mainMvUrls 里，没有 atlas / single', () => {
    expect(video.photo.photoType).toBe('VIDEO')
    expect(video.photo.singlePicture).toBe(false)
    expect(video.photo.duration).toBe(8783)
    expect(video.photo.mainMvUrls).toHaveLength(2)
    // 取流优先 manifest.adaptationSet 的档位，回落 mainMvUrls。样本里两档同分辨率、不同编码
    const representation = video.photo.manifest.adaptationSet[0].representation
    expect(representation.map((item) => item.videoCodec)).toEqual(['avc', 'hevc'])
    expect(representation[0].url).toContain('.mp4')
    expect('atlas' in video).toBe(false)
    expect('single' in video).toBe(false)
  })

  it('single_picture：顶层 single 存在且**没有 list** —— 原图走 photo.coverUrls', () => {
    expect(singlePicture.photo.photoType).toBe('SINGLE_PICTURE')
    expect(singlePicture.single.type).toBe(3)
    expect('list' in singlePicture.single).toBe(false)
    expect(singlePicture.single.music).toMatch(/\.m4a$/)
    expect(singlePicture.photo.ext_params.single).toBeDefined()
    expect(singlePicture.photo.coverUrls.length).toBeGreaterThan(0)
    // 图片类作品没有视频：manifest 整个缺失，mainMvUrls 是空数组（不是不返回）
    expect('manifest' in singlePicture.photo).toBe(false)
    expect(singlePicture.photo.mainMvUrls).toEqual([])
  })

  it.each(ATLASES)('$name：atlas.type=$atlasType，$count 张图，顶层给 jpg、ext_params 给 webp', ({ work, atlasType, count }) => {
    expect(work.photo.photoType).toMatch(/ATLAS$/)
    expect(work.atlas.type).toBe(atlasType)
    expect(work.atlas.list).toHaveLength(count)
    expect(work.atlas.size).toHaveLength(count)
    expect(work.atlas.list.every((path) => path.endsWith('.jpg'))).toBe(true)
    // 同一份图片数据在响应里出现两次，只有扩展名不同；精简版 simple/info 只有 ext_params 这一处
    expect(work.photo.ext_params.atlas.list).toHaveLength(count)
    expect(work.photo.ext_params.atlas.list.every((path) => path.endsWith('.webp'))).toBe(true)
    // 图集的配乐走 atlas.music，视频的原声才走 photo.soundTrack —— 图集没有 soundTrack
    expect(work.atlas.music).toMatch(/\.m4a$/)
    expect('soundTrack' in work.photo).toBe(false)
    // 图集也是 singlePicture: true，只有视频是 false
    expect(work.photo.singlePicture).toBe(true)
  })

  it.each(WORKS)('$name：photo.type 恒为 1，拿它分类会全错', ({ work }) => {
    expect(work.photo.type).toBe(1)
  })

  it.each(WORKS)('$name：counts 与 serialInfo 挂在顶层，不在 photo 里', ({ work }) => {
    expect(work.counts.fanCount).toBeTypeOf('number')
    expect('counts' in work.photo).toBe(false)
    // 四份样本的作品都不属于任何合集，valid=false 时 title / serialId 全为 null
    expect(work.serialInfo.valid).toBe(false)
    expect(work.serialInfo.serialId).toBeNull()
  })

  it('四份样本都没有 mp4Url / photos / comments —— 这三个可选键样本里验不到', () => {
    // 类型声明把它们写成「只有完整版 photo/info 返回」。对照项目提交的这几份样本里没有，
    // 所以这三个键的形状**尚无样本背书**；别把「样本里没有」当成「接口不返回」
    for (const { work } of WORKS) {
      expect('mp4Url' in work).toBe(false)
      expect('photos' in work).toBe(false)
      expect('comments' in work).toBe(false)
    }
  })
})

/** 根评论 + 所有子评论，拉平成一串，用来查 ID 空间 */
const ALL_COMMENTS = [...comments.rootComments, ...Object.values(comments.subCommentsMap).flatMap((group) => group.subComments)]
const SUB_COMMENTS = Object.values(comments.subCommentsMap).flatMap((group) => group.subComments)
const COMMENT_IDS = new Set(ALL_COMMENTS.map((item) => String(item.comment_id)))
const AUTHOR_IDS = new Set(ALL_COMMENTS.map((item) => String(item.author_id)))

describe('fixtures/kuaishou - 评论：子评论不内嵌，按根评论 ID 分组', () => {
  it('rootComments 非空，且没有一条根评论内嵌 subComments', () => {
    expect(comments.rootComments.length).toBeGreaterThan(0)
    // 这是 H5 这套最容易踩的结构差异：GraphQL 那套是 rootComments[i].subComments，
    // H5 这套根评论里根本没有这个键，回复串在 subCommentsMap 里
    for (const root of comments.rootComments) expect('subComments' in root).toBe(false)
  })

  it('subCommentsMap 的键必须是某条根评论的 comment_id', () => {
    const rootIds = comments.rootComments.map((root) => root.comment_id)
    const keys = Object.keys(comments.subCommentsMap)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(rootIds).toContain(key)
  })

  it('分组里的 subComments 非空，pcursor 到底时是 no_more', () => {
    for (const group of Object.values(comments.subCommentsMap)) {
      expect(group.subComments.length).toBeGreaterThan(0)
      expect(group.pcursor).toBe('no_more')
    }
  })

  it('字段名是 snake_case，GraphQL 那套 camelCase 一个都不出现', () => {
    for (const item of ALL_COMMENTS) {
      expect('comment_id' in item).toBe(true)
      expect('author_id' in item).toBe(true)
      expect('commentId' in item).toBe(false)
      expect('authorId' in item).toBe(false)
      expect('replyTo' in item).toBe(false)
    }
  })

  it('根评论的 reply_to 为 0，子评论的 reply_to 非 0 且带 replyToUserName', () => {
    for (const root of comments.rootComments) expect(root.reply_to).toBe(0)
    for (const sub of SUB_COMMENTS) {
      expect(sub.reply_to).not.toBe(0)
      expect(sub.replyToUserName).toBeTruthy()
    }
  })

  it('评论区图片附件（表情包图）：直链在 content.smallUrl，layout.width 实测恒为 0', () => {
    // 标 KsAttachmentRaw[] 顺手把附件节点也核一遍：真实附件能不能赋给这份声明
    const attachments = ALL_COMMENTS.flatMap((item): KsAttachmentRaw[] => ('attachments' in item ? (item.attachments ?? []) : []))
    expect(attachments.length).toBeGreaterThan(0)
    for (const attachment of attachments) {
      expect(attachment.type).toBe('PHOTO')
      expect(attachment.content?.smallUrl?.[0]?.url).toMatch(/^https:\/\//)
    }
    // 真实尺寸看 thumbWidth / thumbHeight —— width / height 实测恒为 0
    const widths = attachments.map((attachment) => attachment.layout?.width).filter((width) => width !== undefined)
    expect(widths.length).toBeGreaterThan(0)
    expect(widths.every((width) => width === 0)).toBe(true)
  })
})

describe('fixtures/kuaishou - 大整数 photoId：字符串那份才是精确值', () => {
  it('soundTrack.photoId 是 JSON 数字，parse 之后与 photo.photoId 那份字符串不相等', () => {
    // 接口给的是超出 Number.MAX_SAFE_INTEGER 的 JSON 数字，JSON.parse 之后末几位就废了。
    // 脱敏时假 ID 特意也用 19 位，才留得住这条形状 —— 换成短 ID 这个 it 就永远绿了
    const exact = video.photo.photoId
    const lossy = video.photo.soundTrack.photoId
    expect(typeof exact).toBe('string')
    expect(typeof lossy).toBe('number')
    expect(String(lossy)).not.toBe(exact)
    // 但数值上仍是同一个作品：两者只差在精度
    expect(Number(exact)).toBe(lossy)
    expect(exact.endsWith('1')).toBe(true)
    expect(String(lossy).endsWith('0')).toBe(true)
  })

  it('评论的 photo_id 同样是掉过精度的数字，认作品别用它', () => {
    const photoId = comments.rootComments[0].photo_id
    expect(typeof photoId).toBe('number')
    expect(photoId).toBeGreaterThan(Number.MAX_SAFE_INTEGER)
  })
})

describe('fixtures/kuaishou - 实测结论与样本对不上的地方（如实记账，没有改断言迁就）', () => {
  /**
   * `WorkComments_V0.reply_to` 的注释写着：「拉了 79 条根评论 + 76 条子评论，`reply_to` 的值
   * 全部对不上任何 `comment_id`，但能和 `author_id` 对上 —— 它存的是回复给哪个人」。
   * 那是对照项目**线上跑出来**的结论（`TODO.md:116`），而提交进 `test/fixtures/comment.json`
   * 的这份样本是**加工过的**：只有 3 条根评论 + 2 条子评论，还塞了图片附件、`likedCount: "1.2万"`
   * 这类边界值。所以这份样本给不了那条结论背书，两条子评论各差一半：
   *
   * - `1166572075983`：`reply_to` 对不上任何 `comment_id`（方向对），但也对不上本页任何
   *   `author_id` —— 被回复的那个人没出现在这 5 条里，所以证不实。
   * - `1166572075984`：`reply_to` 正好等于**兄弟子评论的 `comment_id`**，与结论直接冲突。
   *
   * 下面按样本的实际取值钉住事实。将来谁把这份换成真抓包，这两条会红，正好逼人重新核对，
   * 而不是让一条编出来的绿灯替线上结论作证。
   */
  it('一条子评论的 reply_to 落在用户 ID 空间：对不上任何 comment_id，也对不上本页任何 author_id', () => {
    const sub = SUB_COMMENTS.find((item) => item.comment_id === '1166572075983')
    expect(sub).toBeDefined()
    expect(COMMENT_IDS.has(String(sub?.reply_to))).toBe(false)
    expect(AUTHOR_IDS.has(String(sub?.reply_to))).toBe(false)
    // 位数就能看出它属于哪个空间：用户 ID 10 位，评论 ID 13 位
    expect(String(sub?.reply_to)).toHaveLength(10)
  })

  it('另一条子评论的 reply_to 等于兄弟子评论的 comment_id —— 这份样本无法给「reply_to 是用户 ID」作证', () => {
    const sub = SUB_COMMENTS.find((item) => item.comment_id === '1166572075984')
    expect(sub).toBeDefined()
    expect(String(sub?.reply_to)).toBe('1166572075983')
    expect(COMMENT_IDS.has(String(sub?.reply_to))).toBe(true)
    expect(AUTHOR_IDS.has(String(sub?.reply_to))).toBe(false)
    expect(String(sub?.reply_to)).toHaveLength(13)
  })

  it('search 样本里有一条 _comment 编者注 —— 它是对照项目的注释，不是平台字段', () => {
    // 留着不删是为了不改结构：这个键本身就是「这份样本是加工过的」的证据。
    // amagi 也没有搜索端点与搜索响应类型，所以这份只当形状参考，没有 satisfies 可核
    const annotated = searchJson.feeds.filter((feed) => '_comment' in feed)
    expect(annotated).toHaveLength(1)
  })
})
