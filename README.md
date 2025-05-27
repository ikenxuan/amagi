# amagi /ˈæmədʒi/ 🎵

抖音、bilibili 的 web 端相关数据接口基于 Node.js 的实现。支持最低 node 版本为 v18 🚀

## 我是真爱粉 🧩

"amagi" /ˈæmədʒi/ 名称灵感来源于网络谐音梗，在网络上 [BV1St41137jm](https://www.bilibili.com/video/BV1St41137jm) 上广泛传播。🎤💃

此生必看 [BV1DL411X7jE](https://www.bilibili.com/video/BV1DL411X7jE)

## 项目简介 📝

本项目最初的代码从 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 抽离。主要负责相关数据接口的封装。

amagi 将作为一个独立的上游模块，提供给下游 [karin-plugin-kkk](https://github.com/ikenxuan/karin-plugin-kkk) 和 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 进行视频解析相关业务使用。这两个项目的主要业务基本已经完成，所以如果它们没有什么特殊新业务需求，amagi 大概也不会有新的 API 更新。

当然，如果你的下游有新的业务需求，欢迎提 issue 或 pr。（其实作者本人很菜，issue 不一定能解决）

## 安装/更新 📦

```bash
pnpm add @ikenxuan/amagi@latest
```

## 快速开始 🚀

### 基本用法 ✨
主要就两个方法，`getDouyinData` 和 `getBilibiliData`。
它接收三个参数，第一个参数是 API 名称，第二个参数是 API 所需的参数，第三个参数是用户的 cookies。
若通过构造器创建实例，就不需要传入 cookies 参数了。

```javascript
import Client from '@ikenxuan/amagi'
// or
// import { getDouyinData, getBilibiliData } from '@ikenxuan/amagi'

// you can use it as a class/function/object
const amagi = Client({...options})
const amagi = new Client({...options})

// 使用示例
async function example() {
  // 获取抖音搜索数据
  const searchData = await amagi.getDouyinData(
    '搜索数据',
    { ...opt }
    )

  // 获取B站视频数据
  const videoData = await amagi.getBilibiliData(
    '单个视频作品数据',
    { ...opt }
    )

  console.log(searchData)
}

example()
```
## Advanced
### 启动本地 HTTP 服务 🌐

```javascript
import Client from '@ikenxuan/amagi'

const amagi = new Client({...options})

// 启动本地服务，默认端口 4567
const app = amagi.startClient()
// 或指定端口
// const app = amagi.startClient(8080)
```

启动后可通过以下路径访问 API：

- 抖音 API: `http://localhost:4567/api/douyin/...` 📱
- bilibili API: `http://localhost:4567/api/bilibili/...` 📺

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
  { ...opt },
  'cookies'
)

const userInfo = await douyinUtils.api.getUserProfile(
  { ...opt },
  'cookies'
)

// 直接获取数据
const searchResult = await douyinUtils.getDouyinData(
  '搜索数据',
  { ...opt }
  )
```

主要功能：

- 📹 视频/图集作品数据获取
- 👤 用户信息获取
- 💬 评论数据获取
- 🔍 搜索功能
- 🎬 直播间信息
- 🎵 音乐数据
- 😄 表情数据

### bilibili 功能模块 📺

bilibili 相关功能模块提供了获取 bilibili 平台数据的工具和 API。

```javascript
import { bilibiliUtils } from '@ikenxuan/amagi'

// 获取视频信息
const videoInfo = await bilibiliUtils.api.getVideoInfo({ ...opt })

// 获取评论数据
const comments = await bilibiliUtils.api.getComments({ ...opt })

// 直接获取数据
const userInfo = await bilibiliUtils.getBilibiliData(
  '用户主页数据',
  { ...opt }
  )
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

🍪 所传递的用户 cookies 只会用于请求官方 API 接口

## 鸣谢 🙏

amagi 的诞生参考了以下开源项目：

- 🎬 [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)
- 📱 [NearHuiwen/TiktokDouyinCrawler](https://github.com/NearHuiwen/TiktokDouyinCrawler)
- 📥 [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)
- 🔄 [Johnserf-Seed/f2](https://github.com/Johnserf-Seed/f2)
