# Amagi v6 重构计划

## 目标

将所有中文 API 重构为英文，移除对 v5 `getXXXData` API 的兼容，建立标准化的 API 废弃机制。

## 重构原则

1. **代码中不能有任何中文**（注释除外）
2. **废弃的 API 调用时抛出错误**，而不是静默兼容
3. **使用统一的废弃模块**管理所有废弃 API
4. **保持类型安全**，所有重构后的 API 都有完整的 TypeScript 类型

## 重构进度

### 第一阶段：基础设施 ✅

- [x] 创建废弃模块 `utils/deprecation.ts`
- [x] 创建重构计划文档

### 第二阶段：Bilibili 平台重构 ✅

- [x] `types/BilibiliAPIParams.ts` - methodType 改为英文
- [x] `platform/bilibili/API.ts` - 方法名改为英文
- [x] `platform/bilibili/getdata.ts` - switch case 改为英文
- [x] `validation/bilibili.ts` - schema key 改为英文
- [x] `types/ReturnDataType/Bilibili/index.ts` - 返回类型映射改为英文

### 第三阶段：Douyin 平台重构 ✅

- [x] `types/DouyinAPIParams.ts` - methodType 改为英文
- [x] `platform/douyin/API.ts` - 方法名改为英文
- [x] `platform/douyin/getdata.ts` - switch case 改为英文
- [x] `validation/douyin.ts` - schema key 改为英文
- [x] `types/ReturnDataType/Douyin/index.ts` - 返回类型映射改为英文

### 第四阶段：Kuaishou 平台重构 ✅

- [x] `types/KuaishouAPIParams.ts` - methodType 改为英文
- [x] `platform/kuaishou/API.ts` - 方法名改为英文
- [x] `platform/kuaishou/getdata.ts` - switch case 改为英文
- [x] `validation/kuaishou.ts` - schema key 改为英文
- [x] `types/ReturnDataType/Kuaishou/index.ts` - 返回类型映射改为英文

### 第五阶段：Xiaohongshu 平台重构 ✅

- [x] `types/XiaohongshuAPIParams.ts` - methodType 改为英文
- [x] `platform/xiaohongshu/API.ts` - 方法名改为英文
- [x] `platform/xiaohongshu/getdata.ts` - switch case 改为英文
- [x] `validation/xiaohongshu.ts` - schema key 改为英文
- [x] `types/ReturnDataType/Xiaohongshu/index.ts` - 返回类型映射改为英文

### 第六阶段：Fetcher 模块更新 ✅

- [x] `model/fetchers/bilibili/*` - 更新 methodType 引用
- [x] `model/fetchers/douyin/*` - 更新 methodType 引用
- [x] `model/fetchers/kuaishou/*` - 更新 methodType 引用
- [x] `model/fetchers/xiaohongshu/*` - 更新 methodType 引用

### 第七阶段：API 封装更新 ✅

- [x] `platform/bilibili/BilibiliApi.ts` - 更新 methodType 引用
- [x] `platform/douyin/DouyinApi.ts` - 更新 methodType 引用
- [x] `platform/kuaishou/KuaishouApi.ts` - 更新 methodType 引用
- [x] `platform/xiaohongshu/XiaohongshuApi.ts` - 更新 methodType 引用

### 第八阶段：废弃旧 API ✅

- [x] `model/DataFetchers.ts` - 改为废弃存根，调用时抛出错误
- [x] `server/index.ts` - 移除废弃 API 实现，改为存根
- [x] `platform/*/routes.ts` - 更新使用 fetchXXXInternal 替代废弃的 getXXXData
- [x] `platform/bilibili/BilibiliApi.ts` - 改为废弃存根
- [x] `platform/douyin/DouyinApi.ts` - 改为废弃存根
- [x] `platform/kuaishou/KuaishouApi.ts` - 改为废弃存根
- [x] `platform/xiaohongshu/XiaohongshuApi.ts` - 改为废弃存根
- [x] `dev.ts` - 更新测试代码使用新的 fetcher API

## 废弃 API 行为

v6 版本中，以下 API 调用时会抛出 `DeprecatedApiError` 错误：

- `getDouyinData()` → 请使用 `douyinFetcher` 或 `client.douyin.fetcher`
- `getBilibiliData()` → 请使用 `bilibiliFetcher` 或 `client.bilibili.fetcher`
- `getKuaishouData()` → 请使用 `kuaishouFetcher` 或 `client.kuaishou.fetcher`
- `getXiaohongshuData()` → 请使用 `xiaohongshuFetcher` 或 `client.xiaohongshu.fetcher`
- `client.douyin.api.*` → 请使用 `client.douyin.fetcher.*`
- `client.bilibili.api.*` → 请使用 `client.bilibili.fetcher.*`
- `client.kuaishou.api.*` → 请使用 `client.kuaishou.fetcher.*`
- `client.xiaohongshu.api.*` → 请使用 `client.xiaohongshu.fetcher.*`

## 方法名映射表

### Bilibili

| 旧名称（中文） | 新名称（英文） |
|--------------|--------------|
| 单个视频作品数据 | videoInfo |
| 单个视频下载信息数据 | videoStream |
| 评论数据 | comments |
| 指定评论的回复 | commentReplies |
| 用户主页数据 | userCard |
| 用户主页动态列表数据 | userDynamicList |
| 用户空间详细信息 | userSpaceInfo |
| 获取UP主总播放量 | uploaderTotalViews |
| Emoji数据 | emojiList |
| 番剧基本信息数据 | bangumiInfo |
| 番剧下载信息数据 | bangumiStream |
| 动态详情数据 | dynamicDetail |
| 动态卡片数据 | dynamicCard |
| 直播间信息 | liveRoomInfo |
| 直播间初始化信息 | liveRoomInit |
| 登录基本信息 | loginStatus |
| 申请二维码 | loginQrcode |
| 二维码状态 | qrcodeStatus |
| AV转BV | avToBv |
| BV转AV | bvToAv |
| 专栏正文内容 | articleContent |
| 专栏显示卡片信息 | articleCards |
| 专栏文章基本信息 | articleInfo |
| 文集基本信息 | articleListInfo |
| 实时弹幕 | videoDanmaku |
| 从_v_voucher_申请_captcha | captchaFromVoucher |
| 验证验证码结果 | validateCaptcha |

### Douyin

| 旧名称（中文） | 新名称（英文） |
|--------------|--------------|
| 视频作品数据 | videoWork |
| 图集作品数据 | imageAlbumWork |
| 合辑作品数据 | slidesWork |
| 文字作品数据 | textWork |
| 聚合解析 | parseWork |
| 评论数据 | comments |
| 指定评论回复数据 | commentReplies |
| 用户主页数据 | userProfile |
| 用户主页视频列表数据 | userVideoList |
| 热点词数据 | suggestWords |
| 搜索数据 | search |
| 音乐数据 | musicInfo |
| 直播间信息数据 | liveRoomInfo |
| 申请二维码数据 | loginQrcode |
| Emoji数据 | emojiList |
| 动态表情数据 | dynamicEmojiList |
| 弹幕数据 | danmakuList |

### Kuaishou

| 旧名称（中文） | 新名称（英文） |
|--------------|--------------|
| 单个视频作品数据 | videoWork |
| 评论数据 | comments |
| Emoji数据 | emojiList |

### Xiaohongshu

| 旧名称（中文） | 新名称（英文） |
|--------------|--------------|
| 首页推荐数据 | homeFeed |
| 单个笔记数据 | noteDetail |
| 评论数据 | noteComments |
| 用户数据 | userProfile |
| 用户笔记数据 | userNoteList |
| 表情列表 | emojiList |
| 搜索笔记 | searchNotes |

## 注意事项

- 每个阶段完成后都要运行类型检查 `pnpm typecheck`
- 保持 git 提交粒度小，便于回滚
- 更新相关文档和迁移指南
- **注释必须使用中文**，代码实现逻辑使用英文
