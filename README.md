# amagi（泥干嘛哈哈... 🎉

- 抖音、B 站的 web 端相关数据接口基于 Node.js 的实现，支持最低 node 版本为 v18

![amagi](https://socialify.git.ci/ikenxuan/amagi/image?font=Source%20Code%20Pro&forks=1&issues=1&language=1&name=1&owner=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Auto)

## 使用 📦

```
pnpm add @ikenxuan/amagi@latest
```

## 快速上手 🚀

**_直接获取相关数据_**

```js
import Client, { amagi, getDouyinData, getBilibiliData } from '@ikenxuan/amagi'

const douyinck = '你的抖音ck'
const bilibilick = '你的B站ck'

// 方法1（函数重载使得参数二和参数三可互换）
getDouyinData('视频作品数据', douyinck, { aweme_id: '7403311630219578660' })
  .then((data) => console.log('抖音：' + data))
  .catch((err) => console.error(err))

getBilibiliData('单个视频作品数据', bilibilick, { bvid: 'BV1Nx4y147n3' })
  .then((data) => console.log('B站' + data))
  .catch((err) => console.error(err))

// 方法2
// 初始化
const instance = new Client({
  douyin: douyinck,
  // ......
})
// 或者可以这样
const instance = amagi({
  douyin: douyinck,
  // ......
})
instance
  .getDouyinData('评论数据', { aweme_id: '7403311630219578660', number: 25 })
  .then((data) => console.log(data))
  .catch((err) => console.error(err))
```

- 参数一详见 [**抖音数据类型**](./src/types/DouyinAPIParams.ts) [**B 站数据类型**](./src/types/BilibiliAPIParams.ts)

- 传递对象的参数 **同上** 或参照 [**API 文档**](https://amagi.apifox.cn)

---

**_本地部署一个服务端_**

- API 文档: [**Apifox**](https://amagi.apifox.cn)

```js
import amagi from '@ikenxuan/amagi'

const Client = new amagi({
  douyin: '你的抖音ck',
  bilibili: '你的B站ck',
})

Client.startClient(4567) // 监听端口
```

**如果你是使用的 `commonjs` 模块，请使用 `require()` 导入**

```js
const Client = require('@ikenxuan/amagi').default
const { amagi } = require('@ikenxuan/amagi')
const { getBilibiliData } = require('@ikenxuan/amagi')

const douyinck = '你的抖音ck'
const bilibilick = '你的B站ck'

// 初始化
const instance = new Client({
  douyin: douyinck,
  // ......
})
// 或者可以这样
const instance = amagi({
  douyin: douyinck,
  // ......
})

// 启动http服务
instance.startClient(6666)

// 获取抖音评论数据
instance
  .getDouyinData('评论数据', { aweme_id: '7403311630219578660', number: 25 })
  .then((data) => console.log('抖音：' + data))
  .catch((err) => console.error(err))

// 获取B站视频信息
getBilibiliData('单个视频作品数据', bilibilick, { bvid: 'BV1Nx4y147n3' })
  .then((data) => console.log('B站' + data))
  .catch((err) => console.error(err))
```

## 开发构建 🛠️

> [!IMPORTANT] > **开发环境下，支持最低 node 版本为 v18**

- [**fork**](https://github.com/ikenxuan/amagi/fork) 项目到自己的仓库并克隆到本地
- 安装依赖

```
pnpm install
```

- 编译

```
pnpm build
```

## License 📜

[GPL-3.0](https://github.com/ikenxuan/amagi/blob/main/LICENSE)

## 声明 ⚠️

本库没有后门，本库不会上传有关你的任何信息到第三方。
所配置的 ck 只会用于请求官方 API 接口

<h2>未经同意，禁止将本项目的开源代码用于任何商业目的。因使用本项目产生的一切问题与后果由使用者自行承担，项目开发者不承担任何责任</h2>

## amagi 的诞生参考了以下开源项目 🙏:

- [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)
- [NearHuiwen/TiktokDouyinCrawler](https://github.com/NearHuiwen/TiktokDouyinCrawler)
- [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)
- [Johnserf-Seed/f2](https://github.com/Johnserf-Seed/f2)
