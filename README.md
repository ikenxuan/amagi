# @ikenxuan/amagi

> 抖音、B站、快手、小红书 Web 端相关数据接口的 Node.js 封装与服务。支持“直接调用（SDK）”与“本地 HTTP 服务”两种使用方式，并内置严格的参数校验与统一响应格式。

文档站点（API 文档）：https://amagi.apifox.cn
开发者文档（Typedoc）：https://ikenxuan.github.io/amagi

本项目最初的代码从 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 解耦。主要负责相关数据接口的封装。

[@ikenxuan/amagi](https://www.npmjs.com/package/@ikenxuan/amagi) 将作为一个独立的上游模块，提供给下游 [karin-plugin-kkk](https://github.com/ikenxuan/karin-plugin-kkk) 和 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 进行视频解析相关业务使用。这两个项目已完成了几乎所有由 ikenxuan 安排的功能和任务，所以它们如果没有什么新的业务需求，本项目大概再也不会封装新的任何接口。

当然，如果你的下游有新的业务需求，欢迎提 issue 或 pr。（作者本人很菜，尤其不会逆向工程，所以 issue 不一定能解决）

## 特性

- 多平台支持：抖音、B站、快手、小红书的主流数据接口
- 两种使用姿势：
  - 直接调用：通过 SDK 获取数据，支持绑定 Cookie
  - 本地服务：一键启动 Express 服务，REST 风格路由
- 参数校验：基于 Zod，按方法类型校验必填与可选参数
- 统一响应：约定化 `ApiResponse` 返回结构，含 `success`/`code`/`message`/`data`
- 类型模式：`strict` 与 `loose` 可选，开发友好与容错可控
- 工具集齐全：签名算法、URL 拼接器、AV/BV 转换等常用工具
- 双模块输出：同时支持 ESM 与 CJS 引入

## 安装

使用 npm：

```bash
npm i @ikenxuan/amagi
```

或使用 pnpm / yarn：

```bash
pnpm add @ikenxuan/amagi
```

```bash
yarn add @ikenxuan/amagi
```

## 快速上手

### 1) 直接调用（推荐）

SDK 方式最灵活，适合在 Node.js 程序里按需拉取数据。

```ts
import amagi from '@ikenxuan/amagi'

// 绑定各平台 Cookie（可选）与请求配置（可选）
const client = amagi({
  cookies: {
    bilibili: 'SESSDATA=xxx; bili_jct=yyy; ...',
    douyin: 'ttwid=...; ...',
    kuaishou: 'did=...; ...',
    xiaohongshu: 'a1=...; ...',
  },
  request: {
    // 例如自定义 headers、代理等
    headers: { 'User-Agent': 'Mozilla/5.0 ...' }
  }
})

// B站：获取单个视频信息（bvid）
const video = await client.getBilibiliData('单个视频作品数据', {
  bvid: 'BV1xx411c7mD',
  typeMode: 'strict' // 严格类型（可选，默认 loose）
})
if (video.success) {
  console.log(video.data)
}

// 抖音：获取评论数据（aweme_id）
const comments = await client.getDouyinData('评论数据', {
  aweme_id: '1234567890123456789',
  number: 20
})
console.log(comments)

// 也可使用绑定 Cookie 的 API 对象：不再传 cookie
const { bilibili, douyin, kuaishou, xiaohongshu } = client

const bInfo = await bilibili.api.getVideoInfo({ bvid: 'BV1xx411c7mD' })
const dCom = await douyin.api.getComments({ aweme_id: '1234567890123456789', number: 10 })
const kInfo = await kuaishou.api.getWorkInfo({ photoId: '3xqxxxxxx' })
const xNote = await xiaohongshu.api.getNote({ note_id: '64xxxxxxxx', xsec_token: 'xsec_xxx' })
```

也可以不用实例，直接调用静态方法（手动给 cookie）：

```ts
import amagi from '@ikenxuan/amagi'

const res = await amagi.getBilibiliData('单个视频作品数据', { bvid: 'BV1xx411c7mD' }, 'SESSDATA=...')
console.log(res)
```

### 2) 启动本地 HTTP 服务

一行代码启动 Express 服务，路由自动注册。

```ts
import amagi from '@ikenxuan/amagi'

// 端口默认 4567，可自定义
amagi({
  cookies: {
    bilibili: 'SESSDATA=xxx; bili_jct=yyy; ...',
    douyin: 'ttwid=...; ...',
    kuaishou: 'did=...; ...',
    xiaohongshu: 'a1=...; ...',
  }
}).startServer(4567)

// 打开 http://localhost:4567/ 或 http://localhost:4567/docs
// 文档自动重定向至 https://amagi.apifox.cn
```

## 服务端路由（HTTP API）

- 路由与参数请直接参考 API 文档：https://amagi.apifox.cn
- 本地启动示例：`amagi({ cookies: {...} }).startServer(4567)`

启动服务后，默认挂载在 `/api/<platform>` 下。以下列出主要路由与典型参数（查询串/JSON 皆可）：

- Douyin `/api/douyin`
  - `GET /fetch_one_work` 聚合解析（`aweme_id`）
  - `GET /fetch_work_comments` 评论数据（`aweme_id`, `number?`, `cursor?`）
  - `GET /fetch_user_info` 用户主页数据（`sec_uid`）
  - `GET /fetch_user_post_videos` 用户主页视频列表（`sec_uid`）
  - `GET /fetch_search_info` 搜索/热点词（`query`, `number?`, `search_id?`）
  - `GET /fetch_suggest_words` 热点词数据（`query`, `number?`）
  - `GET /fetch_music_work` 音乐数据（`music_id`）
  - `GET /fetch_emoji_list` Emoji 列表
  - `GET /fetch_emoji_pro_list` 动态表情列表
  - `GET /fetch_user_live_videos` 直播间信息（`sec_uid`）
  - `GET /fetch_video_comment_replies` 指定评论回复（`aweme_id`, `comment_id`, `number?`, `cursor?`）
  - `GET /fetch_work_danmaku` 弹幕数据（`aweme_id`, `duration`, `start_time?`, `end_time?`）

- Bilibili `/api/bilibili`
  - `GET /fetch_one_video` 单个视频作品数据（`bvid`）
  - `GET /fetch_video_playurl` 单个视频下载信息（`avid`, `cid`）
  - `GET /fetch_work_comments` 评论数据（`oid`, `type`, `pn?`, `number?`）
  - `GET /fetch_user_profile` 用户主页数据（`host_mid`）
  - `GET /fetch_user_dynamic` 用户主页动态列表（`host_mid`）
  - `GET /fetch_emoji_list` Emoji 列表
  - `GET /fetch_bangumi_video_info` 番剧基本信息（二选一：`ep_id` 或 `season_id`）
  - `GET /fetch_bangumi_video_playurl` 番剧下载信息（`cid`, `ep_id`）
  - `GET /fetch_dynamic_info` 动态详情（`dynamic_id`）
  - `GET /fetch_dynamic_card` 动态卡片（`dynamic_id`）
  - `GET /fetch_live_room_detail` 直播间信息（`room_id`）
  - `GET /fetch_liveroom_def` 直播间初始化信息（`room_id`）
  - `GET /login_basic_info` 登录基本信息
  - `GET /new_login_qrcode` 申请二维码
  - `GET /check_qrcode` 二维码状态（`qrcode_key`）
  - `GET /fetch_user_full_view` UP 主总播放量（`host_mid`）
  - `GET /av_to_bv` AV 转 BV（`avid`）
  - `GET /bv_to_av` BV 转 AV（`bvid`）

- Kuaishou `/api/kuaishou`
  - `GET /fetch_one_work` 单个视频作品数据（`photoId`）
  - `GET /fetch_work_comments` 评论数据（`photoId`）
  - `GET /fetch_emoji_list` Emoji 列表

- Xiaohongshu `/api/xiaohongshu`
  - `GET /fetch_home_feed` 首页推荐（`cursor_score?`, `num?`, `refresh_type?`, `note_index?`, `category?`, `search_key?`）
  - `GET /fetch_one_note` 单个笔记数据（`note_id`, `xsec_token`）
  - `GET /fetch_note_comments` 评论数据（`note_id`, `xsec_token`, `cursor?`）
  - `GET /fetch_user_profile` 用户数据（`user_id`）
  - `GET /fetch_user_notes` 用户笔记（`user_id`, `cursor?`, `num?`）
  - `GET /fetch_emoji_list` 表情列表
  - `GET /fetch_search_notes` 搜索笔记（`keyword`, `page?`, `page_size?`, `sort?`, `note_type?`）

说明：
- 路由内部已固定 `methodType`，你只需传具体业务参数即可。
- 抖音的 `/fetch_one_work` 同路径注册了多个方法（视频 / 图集 / 合辑 / 聚合），推荐使用“聚合解析”。

## 统一响应结构

所有 API 返回统一结构：

```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": { ... }, 
  "requestPath": "/api/bilibili/fetch_one_video?bvid=BV1xx411c7mD"
}
```

错误时：

```json
{
  "success": false,
  "code": 400,
  "message": "参数错误",
  "error": { "name": "ZodError", "details": [ ... ] },
  "requestPath": "/api/douyin/fetch_work_comments?aweme_id=..."
}
```

## 类型模式与参数校验

- 类型模式 `typeMode`
  - `strict`：返回严格类型（基于已知响应结构，可能缺少平台新增字段）
  - `loose`：返回 `any`，容错更强（默认）
  - 使用位置：仅 SDK 直接调用可指定 `typeMode`，HTTP 路由默认等价于 `loose`

- 参数校验（Zod）
  - 每个方法类型对应一套完整参数校验规则
  - 请求入参不合法时将返回错误响应（含详细错误信息）

## 工具集与常用能力

所有平台工具集从包顶层导出，可直接使用：

```ts
import { douyinUtils, bilibiliUtils, kuaishouUtils } from '@ikenxuan/amagi'
import { xiaohongshuUtils } from '@ikenxuan/amagi'
```

- 抖音 `douyinUtils`
  - `sign`: `douyinSign.Mstoken(length)`, `douyinSign.AB(url, ua)`, `douyinSign.XB(url, ua)`, `douyinSign.VerifyFpManager()`
  - `douyinApiUrls`: 仅负责拼接基础 URL，需要再次以该 URL 生成反爬参数
  - `api`: 原始 API 调用（需传 cookie）；若使用 `client.douyin.api` 则已绑定 cookie

- B站 `bilibiliUtils`
  - `sign`: `wbi_sign(baseUrl, cookie)`, `av2bv(aid: number)`, `bv2av(bvid: string)`
  - `bilibiliApiUrls`: 仅拼接基础 URL
  - `api`: 原始 API 调用（同上）

- 快手 `kuaishouUtils`
  - `kuaishouApiUrls`: 仅拼接基础 URL
  - `api`: 原始 API 调用（同上）

- 小红书 `xiaohongshuUtils`
  - `sign`: `xiaohongshuSign.generateXSGet(path, a1Cookie, clientType?, params?)`，`generateXSPost(...)`，`generateXS(url, body, ua?, method?, a1Cookie?)`，`generateXSCommon(length?)`，`generateXT()`，`generateXB3Traceid()`，`extractA1FromCookie(cookieString)`，`getSearchId()`
  - `xiaohongshuApiUrls`: 拼接 URL + POST 参数
  - `api`: 原始 API 调用（同上）

### AV/BV 转换示例

```ts
import { bilibiliUtils } from '@ikenxuan/amagi'

const bv = bilibiliUtils.sign.av2bv(170001)
const av = bilibiliUtils.sign.bv2av('BV1xx411c7mD')
```

## 运行建议与注意事项

- Cookie 与 UA：部分接口需要有效 Cookie 与合理的 `User-Agent`；请遵循平台使用政策
- 频率与限流：避免高频调用，合理设置请求重试与指数退避
- ESM/CJS：包 `type` 为 `module`，同时提供 ESM/CJS 两类入口
  - ESM：`import amagi from '@ikenxuan/amagi'`
  - CJS：`const amagi = require('@ikenxuan/amagi')`

## 许可证

GPL-3.0-only

## 变更日志与反馈

- 变更日志：请查看 GitHub Releases 或提交记录
- 问题反馈：GitHub Issues https://github.com/ikenxuan/amagi/issues
- 文档站点：https://amagi.apifox.cn

## 鸣谢
请求签名部分参考了以下项目的实现：

- [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)
- [NearHuiwen/TiktokDouyinCrawler](https://github.com/NearHuiwen/TiktokDouyinCrawler)
- [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)
- [Johnserf-Seed/f2](https://github.com/Johnserf-Seed/f2)
- [ikenxuan/xhshow-ts](https://github.com/ikenxuan/xhshow-ts)
