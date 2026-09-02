// 一次性脚本：把端点 response 令牌从本地最小接口换成 v6 ReturnTypeMap 条目。
// 用法：node scripts/swap-response-type.mjs <平台小写>
// 处理：① response: type<X>() → type<Map['endpointName']>() ② 插入 map 类型导入 ③ 删除尾部本地接口块
import fs from 'node:fs'
import path from 'node:path'

const MAP_FILE = {
  douyin: 'Douyin',
  bilibili: 'Bilibili',
  kuaishou: 'Kuaishou',
  xiaohongshu: 'Xiaohongshu'
}

// [端点文件名, 本地响应类型名]
const TABLE = {
  douyin: [
    ['parseWork', 'WorkDetailData'],
    ['textWork', 'WorkDetailData'],
    ['imageAlbumWork', 'WorkDetailData'],
    ['slidesWork', 'WorkDetailData'],
    ['videoWork', 'WorkDetailData'],
    ['userProfile', 'UserProfileData'],
    ['suggestWords', 'SuggestWordsData'],
    ['emojiList', 'EmojiListData'],
    ['dynamicEmojiList', 'EmojiProListData'],
    ['musicInfo', 'MusicInfoData'],
    ['liveRoomInfo', 'LiveRoomInfoData'],
    ['comments', 'CommentsData'],
    ['commentReplies', 'CommentsData'],
    ['userVideoList', 'UserListData'],
    ['userFavoriteList', 'UserListData'],
    ['userRecommendList', 'UserListData'],
    ['danmakuList', 'DanmakuData'],
    ['search', 'SearchData']
  ],
  bilibili: [
    ['videoInfo', 'VideoInfoData'],
    ['videoStream', 'VideoStreamData'],
    ['videoDanmaku', 'DanmakuData'],
    ['comments', 'CommentsData'],
    ['commentReplies', 'CommentRepliesData'],
    ['userCard', 'UserCardData'],
    ['userDynamicList', 'UserDynamicListData'],
    ['userLiveStatus', 'UserLiveStatusData'],
    ['userSpaceInfo', 'UserSpaceInfoData'],
    ['uploaderTotalViews', 'UploaderTotalViewsData'],
    ['dynamicDetail', 'DynamicDetailData'],
    ['bangumiInfo', 'BangumiInfoData'],
    ['bangumiStream', 'BangumiStreamData'],
    ['liveRoomInfo', 'LiveRoomInfoData'],
    ['liveRoomInit', 'LiveRoomInitData'],
    ['loginQrcode', 'LoginQrcodeData'],
    ['articleContent', 'ArticleContentData'],
    ['articleCards', 'ArticleCardsData'],
    ['articleInfo', 'ArticleInfoData'],
    ['articleListInfo', 'ArticleListInfoData'],
    ['captchaFromVoucher', 'CaptchaData'],
    ['validateCaptcha', 'CaptchaData'],
    ['emojiList', 'EmojiListData']
  ],
  kuaishou: [
    ['videoWork', 'VideoWorkData'],
    ['comments', 'CommentsData'],
    ['emojiList', 'EmojiListData'],
    ['userProfile', 'UserProfileData'],
    ['userWorkList', 'UserWorkListData'],
    ['liveRoomInfo', 'LiveRoomInfoData']
  ],
  xiaohongshu: [
    ['homeFeed', 'HomeFeedData'],
    ['noteDetail', 'NoteDetailData'],
    ['noteComments', 'NoteCommentsData'],
    ['searchNotes', 'SearchNotesData'],
    ['emojiList', 'EmojiListData']
  ]
}

const platform = process.argv[2]
const platformDir = { douyin: 'douyin', bilibili: 'bilibili', kuaishou: 'kuaishou', xiaohongshu: 'xiaohongshu' }[platform]
const mapName = `${platform[0].toUpperCase()}${platform.slice(1)}ReturnTypeMap`
const importLine = `import type { ${mapName} } from '../../../types/ReturnDataType/${MAP_FILE[platform]}'\n`
const anchor = `import { defineEndpoint, type } from '../../../contracts/endpoint'\n`

let failed = []
for (const [endpoint, localName] of TABLE[platform]) {
  const file = path.resolve(`src/platforms/${platformDir}/endpoints/${endpoint}.ts`)
  let src = fs.readFileSync(file, 'utf8')
  const token = `response: type<${localName}>()`
  const tokenTrailing = `response: type<${localName}>(),`
  if (!src.includes(token) && !src.includes(tokenTrailing)) {
    failed.push(`${endpoint}: 找不到 token ${token}`)
    continue
  }
  src = src.replace(
    new RegExp(`response: type<${localName}>\\(\\)(,?)`),
    `response: type<${mapName}['${endpoint}']>()$1`
  )
  if (!src.includes(anchor)) {
    failed.push(`${endpoint}: 找不到 import 锚点`)
    continue
  }
  src = src.replace(anchor, `${anchor}${importLine}`)
  // 删除尾部的 JSDoc + export interface 块（localName 最后一次出现处到文件尾）
  const declIdx = src.lastIndexOf(`export interface ${localName}`)
  if (declIdx === -1) {
    failed.push(`${endpoint}: 找不到 export interface ${localName}`)
    continue
  }
  // 前面的 JSDoc 块起点
  const before = src.slice(0, declIdx)
  const jsdocStart = before.lastIndexOf('/**')
  const cutFrom = jsdocStart === -1 ? declIdx : jsdocStart
  const tail = src.slice(cutFrom)
  // 校验：从 JSDoc 到接口块结尾就是文件尾（允许尾部空白）
  if (!new RegExp(`^[\\s\\S]*\\}\\s*$`).test(tail) || tail.includes('export const')) {
    failed.push(`${endpoint}: 尾部块结构异常，请人工检查`)
    continue
  }
  src = src.slice(0, cutFrom).replace(/\s+$/, '\n')
  fs.writeFileSync(file, src)
  console.log(`ok ${endpoint} (${localName} → ${mapName}['${endpoint}'])`)
}
if (failed.length) {
  console.error('FAILED:\n' + failed.join('\n'))
  process.exit(1)
}
