# Amagi v6 迁移指南

本文档描述了从 Amagi v5.x 升级到 v6.x 的主要变更和迁移步骤。

## 主要变更概览

1. **日志系统重构** - 移除 `log4js`，改用事件驱动架构
2. **API 方法名英文化** - 所有中文方法名改为英文
3. **类型系统增强** - 支持 `typeMode: 'strict'` 获取严格类型
4. **Fetcher 架构** - 新增 `IBoundXxxFetcher` 接口，支持绑定 Cookie 后无需重复传递

---

## 快速开始

### 安装

```bash
npm install @ikenxuan/amagi@^6.0.0
```

### 基本用法

```typescript
import Client from '@ikenxuan/amagi'

// 实例化客户端，绑定 cookie
const amagi = Client({
  cookies: {
    douyin: 'your_douyin_cookie',
    bilibili: 'your_bilibili_cookie',
    kuaishou: 'your_kuaishou_cookie',
    xiaohongshu: 'your_xiaohongshu_cookie'
  }
})

// 使用 fetcher API (无需再传递 cookie)
const videoInfo = await amagi.bilibili.fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' })
const douyinWork = await amagi.douyin.fetcher.fetchVideoWork({ aweme_id: '7123456789' })

// 严格类型模式 - 返回完整类型定义
const strictResult = await amagi.bilibili.fetcher.fetchVideoInfo({ 
  bvid: 'BV1xx411c7mD', 
  typeMode: 'strict' 
})
// strictResult.data 有完整的类型提示

// 事件监听
amagi.events.on('api:success', (data) => {
  console.log(`[${data.platform}] ${data.methodType} 成功`)
})
```

---

## 详细迁移指南

### 1. 日志系统迁移

v6 移除了 `log4js` 依赖，改用事件驱动架构。

#### v5 用法 (已废弃)

```typescript
import { logger, initLogger } from '@ikenxuan/amagi'
initLogger()
logger.info('消息')
```

#### v6 用法

```typescript
import { amagiEvents } from '@ikenxuan/amagi'

amagiEvents.on('log:info', (data) => console.log(data.message))
amagiEvents.on('log:error', (data) => console.error(data.message))
amagiEvents.on('api:success', (data) => console.log(`${data.platform} 成功`))
amagiEvents.on('api:error', (data) => console.error(`${data.platform} 失败`))
```

#### 可用事件

| 事件名 | 描述 |
|--------|------|
| `log:info/warn/error/debug/mark` | 日志事件 |
| `http:request/response` | HTTP 请求/响应 |
| `network:retry/error` | 网络重试/错误 |
| `api:success/error` | API 调用成功/失败 |

---

### 2. API 调用方式迁移

#### v5 用法 (仍支持，已废弃)

```typescript
import { getDouyinData, getBilibiliData } from '@ikenxuan/amagi'

const result = await getDouyinData('视频作品数据', { aweme_id: '123' }, cookie)
const biliResult = await getBilibiliData('单个视频作品数据', { bvid: 'BV1xx' }, cookie)
```

#### v6 用法

**方式 1: 客户端实例 (推荐)**

```typescript
import Client from '@ikenxuan/amagi'

const amagi = Client({
  cookies: { bilibili: 'cookie', douyin: 'cookie' }
})

// 无需传递 cookie
const result = await amagi.bilibili.fetcher.fetchVideoInfo({ bvid: 'BV1xx' })
const result2 = await amagi.douyin.fetcher.fetchVideoWork({ aweme_id: '123' })
```

**方式 2: 静态 Fetcher**

```typescript
import Client from '@ikenxuan/amagi'

// 需要传递 cookie
const result = await Client.bilibiliFetcher.fetchVideoInfo({ bvid: 'BV1xx' }, cookie)
const result2 = await Client.douyinFetcher.fetchVideoWork({ aweme_id: '123' }, cookie)
```

**方式 3: createBound 工厂函数**

```typescript
import Client from '@ikenxuan/amagi'

const fetcher = Client.createBoundBilibiliFetcher('your_cookie')
const result = await fetcher.fetchVideoInfo({ bvid: 'BV1xx' }) // 无需 cookie
```

---

### 3. 类型模式 (TypeMode)

v6 新增 `typeMode` 参数，控制返回类型精度：

```typescript
// 宽松模式 (默认) - 返回 any
const loose = await fetcher.fetchVideoInfo({ bvid: 'BV1xx' })
loose.data // any

// 严格模式 - 返回完整类型
const strict = await fetcher.fetchVideoInfo({ bvid: 'BV1xx', typeMode: 'strict' })
strict.data // 有完整类型提示
```

---

### 4. Fetcher 方法名

v6 使用语义化的英文方法名：

#### B站 (Bilibili)

| Fetcher 方法 | 说明 |
|-------------|------|
| `fetchVideoInfo` | 获取视频信息 |
| `fetchVideoStreamUrl` | 获取视频流 |
| `fetchVideoDanmaku` | 获取弹幕 |
| `fetchComments` | 获取评论 |
| `fetchCommentReplies` | 获取评论回复 |
| `fetchUserCard` | 获取用户信息 |
| `fetchUserDynamicList` | 获取用户动态 |
| `fetchUserSpaceInfo` | 获取用户空间信息 |
| `fetchUploaderTotalViews` | 获取总播放量 |
| `fetchDynamicDetail` | 获取动态详情 |
| `fetchDynamicCard` | 获取动态卡片 |
| `fetchBangumiInfo` | 获取番剧信息 |
| `fetchBangumiStreamUrl` | 获取番剧流 |
| `fetchLiveRoomInfo` | 获取直播间信息 |
| `fetchLiveRoomInitInfo` | 获取直播间初始化 |
| `fetchArticleContent` | 获取专栏内容 |
| `fetchArticleCards` | 获取专栏卡片 |
| `fetchArticleInfo` | 获取专栏信息 |
| `fetchArticleListInfo` | 获取文集信息 |
| `fetchLoginStatus` | 获取登录信息 |
| `requestLoginQrcode` | 申请二维码 |
| `checkQrcodeStatus` | 获取二维码状态 |
| `convertAvToBv` | AV号转BV号 |
| `convertBvToAv` | BV号转AV号 |
| `fetchEmojiList` | 获取表情列表 |

#### 抖音 (Douyin)

| Fetcher 方法 | 说明 |
|-------------|------|
| `fetchVideoWork` | 获取视频作品 |
| `fetchImageAlbumWork` | 获取图集作品 |
| `fetchSlidesWork` | 获取合辑作品 |
| `fetchTextWork` | 获取文字作品 |
| `parseWork` | 聚合解析作品 |
| `fetchDanmakuList` | 获取弹幕 |
| `fetchWorkComments` | 获取评论 |
| `fetchCommentReplies` | 获取评论回复 |
| `fetchUserProfile` | 获取用户信息 |
| `fetchUserVideoList` | 获取用户视频列表 |
| `searchContent` | 搜索 |
| `fetchSuggestWords` | 获取热词建议 |
| `fetchMusicInfo` | 获取音乐信息 |
| `fetchLiveRoomInfo` | 获取直播间信息 |
| `requestLoginQrcode` | 申请登录二维码 |
| `fetchEmojiList` | 获取表情列表 |
| `fetchDynamicEmojiList` | 获取动态表情 |

#### 快手 (Kuaishou)

| Fetcher 方法 | 说明 |
|-------------|------|
| `fetchVideoWork` | 获取视频作品 |
| `fetchWorkComments` | 获取评论 |
| `fetchEmojiList` | 获取表情列表 |

#### 小红书 (Xiaohongshu)

| Fetcher 方法 | 说明 |
|-------------|------|
| `fetchHomeFeed` | 获取首页推荐 |
| `fetchNoteDetail` | 获取笔记详情 |
| `fetchNoteComments` | 获取评论 |
| `fetchUserProfile` | 获取用户信息 |
| `fetchUserNoteList` | 获取用户笔记 |
| `searchNotes` | 搜索笔记 |
| `fetchEmojiList` | 获取表情列表 |

---

### 5. 搜索类型参数变更

抖音搜索 `type` 参数从中文改为英文：

| v5 | v6 |
|----|-----|
| `综合` | `general` |
| `用户` | `user` |
| `视频` | `video` |

```typescript
// v5
await getDouyinData('搜索数据', { query: '关键词', type: '用户' }, cookie)

// v6
await douyinFetcher.searchContent({ query: '关键词', type: 'user' }, cookie)
```

---

## 架构说明

### Fetcher 层级结构

```
Client (入口)
├── bilibili
│   └── fetcher (IBoundBilibiliFetcher) - 绑定 cookie，调用时无需传递
├── douyin
│   └── fetcher (IBoundDouyinFetcher)
├── kuaishou
│   └── fetcher (IBoundKuaishouFetcher)
└── xiaohongshu
    └── fetcher (IBoundXiaohongshuFetcher)

静态 Fetcher (需要传递 cookie)
├── Client.bilibiliFetcher (IBilibiliFetcher)
├── Client.douyinFetcher (IDouyinFetcher)
├── Client.kuaishouFetcher (IKuaishouFetcher)
└── Client.xiaohongshuFetcher (IXiaohongshuFetcher)
```

### 类型文件结构

```
src/model/fetchers/
├── types.ts              # 通用类型 (TypeMode, BaseRequestOptions 等)
├── bilibili/
│   ├── types.ts          # B站 Options 类型 + IBilibiliFetcher 接口
│   └── bound.ts          # IBoundBilibiliFetcher 接口 + createBound 工厂
├── douyin/
│   ├── types.ts
│   └── bound.ts
├── kuaishou/
│   └── types.ts          # Options + IKuaishouFetcher + IBoundKuaishouFetcher
└── xiaohongshu/
    └── types.ts
```

### 方法名映射架构

v6 采用分层设计，内部实现与外部 API 使用不同的方法名：

```
┌─────────────────────────────────────────────────────────────┐
│  外部 API (Fetcher 层)                                       │
│  英文方法名: fetchVideoInfo, fetchUserProfile, ...          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  方法名映射 (src/types/method-keys.ts)                       │
│  BilibiliMethodToFetcher, DouyinMethodToFetcher, ...        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  内部实现 (getdata.ts, API.ts)                               │
│  中文方法名: '单个视频作品数据', '用户主页数据', ...            │
└─────────────────────────────────────────────────────────────┘
```

这种设计的优势：
- 外部 API 使用语义化英文方法名，便于国际化和代码可读性
- 内部实现保持中文 key，与原有 API 文档和类型定义保持一致
- 通过 `method-keys.ts` 提供双向映射，用于日志、事件等场景

```typescript
import { BilibiliMethodToFetcher, toFetcherMethod } from '@ikenxuan/amagi'

// 内部方法名 -> Fetcher 方法名
const fetcherMethod = BilibiliMethodToFetcher['单个视频作品数据'] // 'fetchVideoInfo'

// 工具函数
const method = toFetcherMethod('bilibili', '单个视频作品数据') // 'fetchVideoInfo'
```

---

## 兼容性说明

- v5 的 `getDouyinData`、`getBilibiliData` 等方法仍可用，但已废弃
- v5 中文方法名会自动映射到 v6 英文方法名
- 建议尽快迁移到 v6 API，v5 兼容层将在未来版本移除

---

## 常见问题

### Q: 如何实现自定义日志？

```typescript
import { amagiEvents } from '@ikenxuan/amagi'
import pino from 'pino'

const logger = pino()
amagiEvents.on('log:info', (data) => logger.info(data.message))
amagiEvents.on('log:error', (data) => logger.error(data.message))
```

### Q: 如何监控 API 调用？

```typescript
amagiEvents.on('api:success', (data) => {
  console.log(`[${data.platform}] ${data.methodType} 成功`)
})

amagiEvents.on('api:error', (data) => {
  console.error(`[${data.platform}] ${data.methodType} 失败: ${data.errorMessage}`)
})
```

### Q: 如何获取严格类型？

```typescript
// 添加 typeMode: 'strict' 参数
const result = await fetcher.fetchVideoInfo({ bvid: 'BV1xx', typeMode: 'strict' })
// result.data 现在有完整类型提示
```
