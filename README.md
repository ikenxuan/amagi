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

## 版本说明 📋

### v4 版本 (推荐) 🔄

v4 版本保持向后兼容，是默认导入版本，适合现有项目的平滑迁移。

### v5 版本 (测试中 慎用) 🆕

v5 版本是当前的主要开发版本，提供了更好的错误处理、统一的响应格式和更强的类型安全性。

## 快速开始 (v4 版本) 🚀

### 基本用法 ✨
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

## v5 版本完整指南 🆕

### v5 版本使用方式

```javascript
// v5 版本导入方式
import { createAmagiClient } from '@ikenxuan/amagi/v5'
// 或者
import amagi from '@ikenxuan/amagi/v5'

const client = createAmagiClient({ douyin: 'your_cookie' })
const result = await client.getDouyinData('搜索数据', { keyword: '测试' })
```

### v5 版本主要变化

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

#### 4. 强化的参数验证 🔍
v5 版本引入了 Zod 进行运行时参数验证，确保数据类型安全和参数完整性。
PS: 当前更改已在 v4.5.0 往后的版本实装

```javascript
// 自动参数验证
const result = await client.getDouyinData('搜索数据', {
  keyword: '测试',        // ✅ 必需参数
  offset: 0,             // ✅ 可选参数，类型正确
  count: 20              // ✅ 可选参数，类型正确
})

// 参数验证失败示例
const invalidResult = await client.getDouyinData('搜索数据', {
  // ❌ 缺少必需参数 keyword
  offset: 'invalid'      // ❌ 类型错误，应为 number
})
// 返回: { success: false, message: '参数验证失败: ...', code: 400 }
```

验证特性：

- 🔒 类型安全 ：确保参数类型正确
- ✅ 必需参数检查 ：自动验证必需参数是否存在
- 🎯 值范围验证 ：验证数值范围、字符串长度等
- 🛡️ 注入防护 ：防止恶意参数注入
- 📝 详细错误信息 ：提供具体的验证失败原因

```javascript
// 验证错误响应示例
{
  code: 400,
  message: "参数验证失败",
  data: null,
  errors: [
    {
      path: ["keyword"],
      message: "必需参数",
      code: "invalid_type"
    },
    {
      path: ["offset"],
      message: "期望 number 类型，收到 string",
      code: "invalid_type"
    }
  ]
}
```

### v5 版本兼容性更改 🔄

#### 向后兼容性 ✅

- **v4 API 完全兼容**：现有的 v4 代码无需修改即可继续使用
- **默认导入保持 v4**：`import Client from '@ikenxuan/amagi'` 仍然使用 v4 版本
- **渐进式迁移**：可以逐步迁移到 v5 版本，无需一次性重写

#### 迁移指南 📖

##### 从 v4 迁移到 v5

1. **更新导入语句**：
```javascript
// v4
import Client from '@ikenxuan/amagi'

// v5
import Client from '@ikenxuan/amagi/v5'
```

2. **处理响应格式**：
```javascript
// v4 - 直接返回数据
const data = await amagi.getDouyinData('搜索数据', { keyword: '测试' })

// v5 - 包装的响应格式
const response = await client.getDouyinData('搜索数据', { keyword: '测试' })
const data = response.data
```

#### 破坏性变更 ⚠️

v5 版本的破坏性变更：

1. **响应格式变更**：所有 API 返回包装的响应对象而非直接数据
2. **服务器方法重命名**：`startClient()` 重命名为 `startServer()`
3. **错误处理方式**：错误不再抛出异常，而是在响应对象中返回

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
虽有类型但写得和迷宫一样

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
