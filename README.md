# amagi

抖音、bilibili 的 web 端相关数据接口基于 Node.js 的实现。支持最低 node 版本为 v18 🚀

## 我是真爱粉 🧩

"amagi" /ˈæmədʒi/ 名称灵感来源于网络谐音梗，在网络上 [BV1St41137jm](https://www.bilibili.com/video/BV1St41137jm) / [BV1DL411X7jE](https://www.bilibili.com/video/BV1DL411X7jE) 上广泛传播。🎤💃

## 项目简介 📝

本项目最初的代码从 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 抽离。主要负责相关数据接口的封装。

amagi 将作为一个独立的上游模块，提供给下游 [karin-plugin-kkk](https://github.com/ikenxuan/karin-plugin-kkk) 和 [kkkkkk-10086](https://github.com/ikenxuan/kkkkkk-10086) 进行视频解析相关业务使用。这两个项目已完成了几乎所有由 ikenxuan 安排的功能和任务，所以它们如果没有什么新的业务需求，本项目大概再也不会封装新的任何接口。

当然，如果你的下游有新的业务需求，欢迎提 issue 或 pr。（作者本人很菜，issue 不一定能解决）

## 安装/更新 📦

```bash
pnpm add @ikenxuan/amagi@latest
```


## 基本用法 ✨
主要就两个方法，`getDouyinData` 和 `getBilibiliData`。

> 它接收三个参数，
> * 第一个参数是对应平台封装好的数据接口名称
> * 第二个参数是接口所需的参数
> * 第三个参数是用户的 cookies。
> * 得益于函数重载，参数二和参数三可以互换位置

你可以通过直接导入或者构造器创建实例。
若通过构造器创建实例，就不需要传入 cookies 参数了，参数二默认接口所需参数。

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

#### 1. 统一的响应格式 📦

v5 版本所有 API 返回统一的响应格式：

```typescript
interface ApiResponse<T> {
  data: T | null           // 实际数据
  message: string          // 响应消息
  code: number             // 状态码
  requestPath?: string     // 请求路径
}
```

#### 2. 更好的错误处理 🛡️

```javascript
// v5 版本错误处理
const result = await client.getDouyinData('搜索数据', { keyword: '测试' })
if (result.success) {
  console.log('数据:', result.data)
} else {
  console.error('错误:', result.message)
}
```

#### 3. 类型模式控制 🎯

> 接口返回数据的类型类型为自动生成，仅供参考，不保证 100% 准确。

支持 `strict` 和 `loose` 两种类型模式：

```javascript
// 严格模式 - 完整类型检查
const strictResult = await client.getDouyinData(
  '搜索数据', 
  { keyword: '测试', typeMode: 'strict' }
)

// 宽松模式 - 灵活的类型处理
const looseResult = await client.getDouyinData(
  '搜索数据', 
  { keyword: '测试', typeMode: 'loose' }
)
```

## 高级用法 🔧

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

API 文档: https://amagi.apifox.cn 或 https://ikenxuan.github.io/amagi📝

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
