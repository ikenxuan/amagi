# aamagi /ˈæmədʒi/ 🎵

抖音、B 站的 web 端相关数据接口基于 Node.js 的实现。支持最低 node 版本为 v18 🚀

## 我是真爱粉 🧩

"Amagi" /ˈæmədʒi/ 名称灵感来源于网络流行的"你干嘛~哎呦~"视频，这是由歌手蔡徐坤的一段采访视频衍生而来的网络文化现象。这个梗在抖音和 bilibili [BV1St41137jm](https://www.bilibili.com/video/BV1St41137jm) 上广泛传播，成为了中国互联网文化的一部分。选择这个名称也象征着本项目与这些平台内容的紧密联系。🎤💃

此生必看 [BV1DL411X7jE](https://www.bilibili.com/video/BV1DL411X7jE)

本项目最初的代码从 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 抽离。主要负责相关数据接口的封装。

amagi 将作为一个独立的模块，提供给 [karin-plugin-kkk](https://github.com/ikenxuan/karin-plugin-kkk) 和 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 使用。

## 安装 📦

```bash
pnpm add @ikenxuan/amagi@latest
```

## 默认导出使用方法 🚀

### 基本用法 ✨

```javascript
import Client from '@ikenxuan/amagi'

// 创建客户端实例
const amagi = new Client({
  douyin: '', // 抖音 cookie（可选）
  bilibili: '', // B站 cookie（可选）
})

// 使用示例
async function example() {
  // 获取抖音搜索数据
  const searchData = await amagi.getDouyinData('搜索数据', {
    query: '热门视频',
    number: 10,
  })

  // 获取B站视频数据
  const videoData = await amagi.getBilibiliData('单个视频作品数据', {
    bvid: 'BV1fK4y1q79u',
  })

  console.log(searchData)
}

example()
```

### 启动本地 HTTP 服务 🌐

```javascript
import Client from '@ikenxuan/amagi'

const amagi = new Client({
  douyin: '你的抖音cookie',
  bilibili: '你的B站cookie',
})

// 启动本地服务，默认端口 4567
const app = amagi.startClient()
// 或指定端口
// const app = amagi.startClient(8080)
```

启动后可通过以下路径访问 API：

- 抖音 API: `http://localhost:4567/api/douyin/...` 📱
- B 站 API: `http://localhost:4567/api/bilibili/...` 📺

API 文档: https://amagi.apifox.cn 📝

## 平台功能模块 🧩

PS: 以下功能模块的使用方法与上述基本用法类似，我也不知道为什么要写这个。。。

### 抖音功能模块 📱

抖音相关功能模块提供了一系列工具和 API 接口，用于获取抖音平台的数据。

```javascript
import { douyinUtils } from '@ikenxuan/amagi'

// 使用签名算法
const mstoken = douyinUtils.sign.Mstoken(107)
const verifyFp = douyinUtils.sign.VerifyFpManager()
const abSign = douyinUtils.sign.AB('需要签名的地址')

// 使用 API 接口
const videoData = await douyinUtils.api.getWorkInfo(
  {
    aweme_id: '视频ID',
  },
  '有效的用户 Cookie'
)

const userInfo = await douyinUtils.api.getUserProfile(
  {
    sec_uid: '用户ID',
  },
  '有效的用户 Cookie'
)

// 直接获取数据
const searchResult = await douyinUtils.getDouyinData('搜索数据', {
  query: '搜索关键词',
  number: 10,
})
```

主要功能：

- 📹 视频/图集作品数据获取
- 👤 用户信息获取
- 💬 评论数据获取
- 🔍 搜索功能
- 🎬 直播间信息
- 🎵 音乐数据
- 😄 表情数据

### B 站功能模块 📺

B 站相关功能模块提供了获取 B 站平台数据的工具和 API。

```javascript
import { bilibiliUtils } from '@ikenxuan/amagi'

// 获取视频信息
const videoInfo = await bilibiliUtils.api.getVideoInfo({
  bvid: 'BV1fK4y1q79u',
})

// 获取评论数据
const comments = await bilibiliUtils.api.getComments({
  oid: 111111, // 稿件ID，也就是AV号去除前缀后的内容
  type: 1,
})

// 直接获取数据
const userInfo = await bilibiliUtils.getBilibiliData('用户主页数据', {
  host_mid: 1340190821, // 用户ID
})
```

主要功能：

- 📹 视频信息获取
- 💬 评论数据获取
- 👤 用户信息获取
- 🎬 番剧信息获取
- 📡 直播间信息
- 📊 动态数据获取
- 🔄 AV/BV 号转换

## 类型支持 🧰

该库提供完整的 TypeScript 类型支持，可以获得良好的代码提示和类型检查。✅

## 许可证 📜

[GPL-3.0](https://github.com/ikenxuan/amagi/blob/main/LICENSE) ⚖️

## 免责声明 ⚠️

- ⭐ 这个项目免费开源，不存在收费。
- 🛡️ 本项目的作者不承担任何责任，包括但不限于因使用本项目而导致的任何损失或损害。
- 📚 本项目仅供学习和研究使用，不得用于任何商业目的。
- 🔒 本项目的作者不对因使用本项目而产生的任何后果负责。
- 📝 本项目的使用者在下载、安装、运行或使用本工具时，即表示已阅读并同意本免责声明。如有异议，请立即停止使用本工具，并删除所有相关文件。
- 🔄 本项目的作者保留随时修改、更新、删除或终止本工具的权利，无需事先通知或承担任何义务。

🔐 本仓库没有后门，本仓库不会上传有关你的任何信息到第三方。
🍪 所传递的用户 ck 只会用于请求官方 API 接口

## 鸣谢 🙏

amagi 的诞生参考了以下开源项目：

- 🎬 [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)
- 📱 [NearHuiwen/TiktokDouyinCrawler](https://github.com/NearHuiwen/TiktokDouyinCrawler)
- 📥 [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)
- 🔄 [Johnserf-Seed/f2](https://github.com/Johnserf-Seed/f2)
