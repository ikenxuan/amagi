// 一次性机械脚本：给 59 个端点声明补 `doc.summary`（PRD 阶段 8.1 第 2 项）。
// 与 `swap-response-type.mjs` 同性质 —— 落盘后保留作 provenance，不进构建。
//
//   node packages/core/scripts/add-endpoint-doc.mjs           插入（幂等，已有 doc 的跳过）
//   node packages/core/scripts/add-endpoint-doc.mjs --check    只报缺口，不写文件
//
// 文案出处（逐条核对，无一条是凭空拟的）：v6 `types/api-spec.ts` 的
// `XxxMethodMapping` 中文键（d401cee 删除前，用 `git show d401cee^:...` 取回）、
// 文档站 `usage/guide/http-server.mdx` 平台路由表的说明列、
// `usage/api/<platform>.mdx` 各 fetcher 首句、端点文件 JSDoc 首行。
// 约定：中文名词短语、不带句号、≤40 字（`test/contracts/endpoint-doc.test.ts` 钉住）。

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SUMMARIES = {
  // ---- 抖音 19 ----
  'douyin.parseWork': '聚合解析作品数据（自动识别类型）',
  'douyin.videoWork': '视频作品详细信息',
  'douyin.imageAlbumWork': '图集作品详细信息',
  'douyin.slidesWork': '合辑作品详细信息',
  'douyin.textWork': '文字作品详细信息',
  'douyin.comments': '作品评论列表',
  'douyin.commentReplies': '指定评论的回复列表',
  'douyin.userProfile': '用户主页信息',
  'douyin.userVideoList': '用户主页作品列表',
  'douyin.userFavoriteList': '用户主页点赞作品列表',
  'douyin.userRecommendList': '用户主页推荐作品列表',
  'douyin.search': '搜索结果列表（综合/用户/视频）',
  'douyin.suggestWords': '搜索联想词与热点词列表',
  'douyin.musicInfo': '音乐作品信息',
  'douyin.liveRoomInfo': '直播间信息',
  'douyin.loginQrcode': '登录二维码',
  'douyin.emojiList': '表情列表',
  'douyin.dynamicEmojiList': '动态表情列表',
  'douyin.danmakuList': '作品弹幕列表',
  // ---- B站 27 ----
  'bilibili.videoInfo': '视频作品详细信息',
  'bilibili.videoStream': '视频下载流信息',
  'bilibili.videoDanmaku': '视频实时弹幕列表',
  'bilibili.comments': '作品评论列表',
  'bilibili.commentReplies': '指定评论的回复列表',
  'bilibili.userCard': '用户名片信息',
  'bilibili.userDynamicList': '用户空间动态列表',
  'bilibili.userLiveStatus': '用户直播状态与直播间基础信息',
  'bilibili.userSpaceInfo': '用户空间详细信息',
  'bilibili.uploaderTotalViews': 'UP 主总播放量',
  'bilibili.dynamicDetail': '动态详情',
  'bilibili.bangumiInfo': '番剧基本信息',
  'bilibili.bangumiStream': '番剧下载流信息',
  'bilibili.liveRoomInfo': '直播间信息',
  'bilibili.liveRoomInit': '直播间初始化信息',
  'bilibili.articleContent': '专栏正文内容',
  'bilibili.articleCards': '专栏显示卡片信息',
  'bilibili.articleInfo': '专栏文章基本信息',
  'bilibili.articleListInfo': '文集基本信息',
  'bilibili.loginStatus': '登录基本信息',
  'bilibili.loginQrcode': '登录二维码',
  'bilibili.qrcodeStatus': '二维码扫码状态',
  'bilibili.captchaFromVoucher': '由 v_voucher 申请的验证码信息',
  'bilibili.validateCaptcha': '验证码校验结果',
  'bilibili.avToBv': 'AV 号转换得到的 BV 号',
  'bilibili.bvToAv': 'BV 号转换得到的 AV 号',
  'bilibili.emojiList': '表情列表',
  // ---- 快手 6 ----
  'kuaishou.videoWork': '单个作品详细信息',
  'kuaishou.comments': '作品评论列表',
  'kuaishou.userProfile': '用户主页聚合信息',
  'kuaishou.userWorkList': '用户公开作品列表',
  'kuaishou.liveRoomInfo': '直播间聚合信息',
  'kuaishou.emojiList': '表情列表',
  // ---- 小红书 7 ----
  'xiaohongshu.homeFeed': '首页推荐笔记列表',
  'xiaohongshu.noteDetail': '笔记详细信息',
  'xiaohongshu.noteComments': '笔记评论列表',
  'xiaohongshu.userProfile': '用户主页信息',
  'xiaohongshu.userNoteList': '用户笔记列表',
  'xiaohongshu.emojiList': '表情列表',
  'xiaohongshu.searchNotes': '笔记搜索结果列表'
}

const PLATFORMS = ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu']
const check = process.argv.includes('--check')
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'platforms')

const NAME_RE = /^\s*name:\s*'([^']+)'\s*,/m
// 行尾一起捕获：工作区是 CRLF，只按 `\n` 拼会把 route 行的行尾换成 LF，
// 留下混合行尾的文件（第一版就踩了这个坑）
const ROUTE_LINE_RE = /^([ \t]*)route:\s*'[^']+',[^\r\n]*(\r?\n)/m

let inserted = 0
let skipped = 0
const missing = []
const seen = new Set()

for (const platform of PLATFORMS) {
  const dir = join(root, platform, 'endpoints')
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
    const path = join(dir, file)
    const source = readFileSync(path, 'utf8')

    const name = source.match(NAME_RE)?.[1]
    if (!name) throw new Error(`${platform}/${file}：找不到 name 字面量`)
    seen.add(name)

    const summary = SUMMARIES[name]
    if (!summary) {
      missing.push(name)
      continue
    }
    if (/^\s*doc:\s/m.test(source)) {
      skipped += 1
      continue
    }

    const route = source.match(ROUTE_LINE_RE)
    if (!route) throw new Error(`${name}：route 不是「一行一个字面量」的形态，需人工处理`)
    const [line, indent, eol] = route
    const next = `${line}${indent}doc: { summary: '${summary}' },${eol}`
    if (!check) writeFileSync(path, source.replace(line, next), 'utf8')
    inserted += 1
  }
}

const unused = Object.keys(SUMMARIES).filter((n) => !seen.has(n))
console.log(`端点文件 ${seen.size} 个；${check ? '待插入' : '已插入'} ${inserted}，已有 doc 跳过 ${skipped}`)
if (missing.length > 0) console.error(`缺 summary 的端点 ${missing.length} 个：${missing.join(', ')}`)
if (unused.length > 0) console.error(`映射里多出的键 ${unused.length} 个：${unused.join(', ')}`)
if (missing.length > 0 || unused.length > 0) process.exitCode = 1
