# 快手免 cookie 取数：成因定位与迁移方案

对照项目：`D:\GitHub\kuaishou-parser-src-0.4.1`（`@local/kuaishou-parser` v0.4.1，作者 [OduckO](https://github.com/OduckO)，GPL-3.0-only）。

该项目的 README 自述「接口分层参照 @ikenxuan/amagi……**sig4 纯算实现也来自那个项目**」——
也就是说签名算法本体就是 amagi 的，两边不存在「他有更强的算法」这回事。
差异全部在**接口选择**和**签名的喂料**上。

> 本文档未提交，等 review。四条实现决策已于 2026-09-04 拍板，见「七、已决」，
> todolist 里相应条目已改成决定后的写法。

---

## 结论先讲

amagi 需要 cookie，不是因为快手要求，而是因为 **amagi 的快手请求从来没签过名**，
只能拿 cookie 当替代凭证。对照项目的做法是反过来的：**用签名换匿名访问**，
发出去的 Cookie 头里只有一个自己生成的设备号，没有任何账号凭证。

三层原因，从表到里：

| # | 层 | amagi 现状 | 对照项目 |
|---|---|---|---|
| 1 | 接口命名空间 | PC GraphQL（`www.kuaishou.com/graphql`）+ live_api（`/rest/k/*`） | H5（`c.kuaishou.com` + `/rest/wd/*`、`/rest/wd/ugH5App/*`） |
| 2 | 签名接线 | `KuaishouSigner` 在 `src/` 里**零调用点**，7 个端点全部不声明 `sign` | 每个签名接口都过 `postSigned` |
| 3 | 签名喂料 | `requestBody` 硬编码 `{}`，拼装函数里那条分支是死代码 | 请求体一起签，`photo/info` 才通 |

第 1 层是「为什么必须有 cookie」：PC GraphQL 的 `visionVideoDetail` / `commentListQuery`
对未登录返回全 null 空壳（对照项目 `TODO.md:100-108` 有实测记录），而 H5 的
`/rest/wd/*` 是给微信分享页用的——**设计上就免鉴权**，分享链接谁点开都得能看。

第 2、3 层是「为什么 amagi 换不过去」：就算把域名改成 `c.kuaishou.com`，
没签名一样被拒；把签名接上，body 不参与签名的话 `photo/info` 一律
`result=50 签名验证失败`。三层是串联的，缺一个都走不通。

---

## 一、为什么对照项目不用 cookie

### 1.1 「不用 cookie」的准确说法

它**发** Cookie 头，只是内容是自己造的（`src/model/request.ts:274`）：

```ts
const cookie = `did=${options.did}; didv=${Date.now()}${options.cookie ? `; ${options.cookie}` : ''}`
```

`did` 来自 `resolveDid()`（`src/platform/kuaishou/did.ts:85-93`），优先级
显式传入 > 环境变量 `KSPARSE_DID` > **随机生成**。随机生成就一行
（`did.ts:57`）：

```ts
export const randomDid = (): string => `web_${randomBytes(16).toString('hex')}`
```

所以「零配置可用」的那些接口，跑的是一个**每次进程都不同的随机设备号**，
没有账号、没有登录态、没有 token。

### 1.2 只有三个接口需要真实 did

`did.ts:96` 把门槛写死成一张表：

```ts
const DID_REQUIRED_TYPES = new Set(['searchFeed', 'searchUser', 'feedHot'])
```

命中这三个且 `source === 'random'` 时，`getdata.ts:549 / 619 / 717` 直接返回引导文案，
**不发请求**。原因见对照项目 `TODO.md:167-181`：真实 did 要先在浏览器里走
`gdfp.gifshow.com/s/w/c` 完成设备指纹注册，服务端有账本，本地造不出来
（5 种组合的实测矩阵在那份文档里）。这一条**绕不过去**，迁移时也别试。

### 1.3 签名从来不依赖 cookie

`src/platform/kuaishou/sign/index.ts:111-137` 里，`cookie` 参数只有一个用途：

```ts
const kww = deriveKuaishouKww(cookie)   // → 一个可选的 kww 请求头
...
if (kww) headers.kww = kww
```

`signResult` 全部来自 `payload = { url, query, form, requestBody }`，cookie 不在其中。
而 `deriveKuaishouKww` 在没有 `kwfv1` 时回落到 `deriveKuaishouAnonymousKww()`
——**amagi 这边同名函数一模一样**（`sign/helpers.ts:212-220`），匿名兜底本来就有。

结论：cookie 对快手签名**在两个项目里都不是输入**。amagi 的 cookie 依赖不在算法里。

---

## 二、amagi 这边的四处断线

### 断线 1：签名器在 v7 里零调用点（最要命的一处）

`KuaishouSigner` 写得很完整，`createKuaishouSigner()` 也导出了，但：

- `signLiveApiUrl` / `signLiveApiRequest` 在 `packages/core/src/` 里**除了 `sign/` 目录自身，没有任何调用点**
- `createKuaishouSigner` 的调用点只有两个测试文件（`test/platforms/kuaishou/sign-state.test.ts`、`test/platforms/kuaishou/endpoints.test.ts:213`）
- `PLATFORM_RUNTIME.kuaishou` 没有 `signers` 表（`client/runtime.ts:34`）
- 6 个端点**全部不声明 `sign`**

也就是说 **v7 发出去的每一个快手请求都没有 `__NS_hxfalcon`**，`caver` 与 `kww` 也一个都不发。

`client/runtime.ts:30` 的注释写着「`__NS_hxfalcon` 由 api.ts 在构造请求时处理」——
这句话是错的。`api.ts` 里 `hxfalcon` 只出现在 3 处注释里（`:63`、`:180`、`:264`），
没有一行代码写这个参数。更尴尬的是 `api.ts` 已经给 7 个 live_api URL 加上了
`caver: 2`（`:191/:210/:232/:274/:298/:318/:515`）——版本标记发出去了，签名没有。

这与我上一轮修的「快手根本没装 judge」是**同一个位置的同一类漏项**：
`PLATFORM_RUNTIME.kuaishou` 少一项既不报编译错误也不挂测试。

更值得注意的是：**仓库自己的文档早就记着这件事**。
`packages/docs/content/docs/v7/dev/internals/transport.mdx:94-107` 有一节标题就叫
「快手：签名器存在但没接线」，写明「两者在生产代码里**零调用点**，只被测试引用」，
并且已经指出 `PLATFORM_RUNTIME` 那句「URL 由 api.ts 预签名」的注释与 `api.ts` 不符。
文档写对了，代码没跟上，也没有任何测试把这两者绑在一起。
（那节文档现在略旧：它说 `kuaishou: {}` 连 judge 都没有，而 judge 我上一轮已经接上了。
本次迁移要顺手把这节文档改成现状。）

那节还记了一条我在代码里也确认了的连带问题：`endpoints/userProfile.ts:41-46` 确实往 spec 里
填了 `signPath`（`/rest/k/user/info` 等），但 `transport/client.ts` 构造 axios 配置时
**没有任何地方读它**，直接丢弃。所以「端点已经准备好被签名」这件事只做了一半。

而唯一名字像在守这条线的测试（`test/platforms/kuaishou/endpoints.test.ts:211`，
describe 名就叫「kuaishou 签名器接线」）实际断言是：

```ts
expect(typeof signer.signLiveApiUrl).toBe('function')
expect(signer.getCatVersion()).toBeTruthy()
```

只要类能编译就恒真，对「有没有接上」零覆盖。名字像守卫、内容是同义反复，
所以没人再回头看——这是这个缺口能活到现在的原因。

### 断线 2：`requestBody` 硬编码 `{}`，拼装那条分支是死代码

两个项目的 `buildKuaishouHxfalconSignInput` **逐字一致**，都已经会拼请求体：

```ts
const requestBody = Object.keys(payload.requestBody).length > 0 ? JSON.stringify(payload.requestBody) : ''
return `${normalizePathname(payload.url)}${serializedParams}${requestBody}`
```

（amagi `sign/helpers.ts:140-142`；对照项目 `sign/helpers.ts:126-128`）

差别只在唯一的构造入口。amagi（`sign/helpers.ts:106-121`）：

```ts
export const buildKuaishouHxfalconPayload = (url: string, signPath?: string): KuaishouHxfalconPayload => {
  ...
  return { url: realPath, query, form: {}, requestBody: {} }   // ← 第 120 行，写死
}
```

对照项目（`sign/helpers.ts:88-108`）多一个参数，把它透下去：

```ts
export const buildKuaishouHxfalconPayload = (
  url: string, signPath?: string, requestBody: Record<string, unknown> = {}
): KuaishouHxfalconPayload => { ... return { url: realPath, query, form: {}, requestBody } }
```

所以 amagi 里 `Object.keys(payload.requestBody).length > 0` **永远为假**。
类型上有这个字段、拼装函数会用它、只有生产者不给——一条完整的死分支。

对照项目在 `helpers.ts:78-81` 直接写明了这个坑的来历：

> 我最初照 amagi 的 live_api 路线实现，那边只签 GET，所以这里硬编码成了 `{}` ——
> 结果 `simple/info` / `comment/list` 校验松，空 body 也放行，一路没暴露；
> 而 `photo/info` 严格校验，一律返回 `result=50 签名验证失败`。
> 修好后 `photo/info` 立刻通了，还多拿到了实况的 `mp4Url`。

`TODO.md:193-195` 重复记了一遍，可见踩得够疼。

### 断线 3：GraphQL 的 null 空壳会被判成成功

`endpoints/videoWork.ts` 只有 `params` / `build` / `response`——没有 `decode`、没有端点级
`judge`、没有 `normalize`。未登录时 PC GraphQL 返回的是形如

```json
{ "data": { "visionVideoDetail": null } }
```

这种空壳里没有 `result`、没有 `code`、没有 `errors`，走到 `kuaishouJudge` 会
一路落空，最后 `verdictFromHttpStatus(200)` 也返回 `undefined` → `{ ok: true }`。
于是「成功信封 + data 里啥也没有」。

这是上一轮 `{ result: 2 }` 那个 bug 的同族：判据只覆盖了三种响应形状，
GraphQL 空壳不在其中。要补一条「`data.<operationName>` 为 null 即失败」的判定
（`kind: 'auth'` / `code: 'LOGIN_REQUIRED'` 更贴切）。

顺带说明用户之前看到的 `{ result: 2, error_msg: null, request_id }`：那不是 GraphQL
响应，是快手反爬层在 GraphQL 之前就拦下来的回执——**未签名 + 无 cookie** 的典型结果。
上一轮已经让它正确判失败，这一轮要解决的是让它根本不发生。

### 断线 4：amagi 里没有 `did` 这个概念

全仓 `packages/core/src/` 搜不到快手 `did` 的任何处理：既不从 cookie 里解析，
也不自己生成。cookie 对 amagi 是一整串黑盒，`runtime/execute.ts` 的 `attachCookie`
在空串时**连 Cookie 头都不发**。

还有一处误导：`platforms/kuaishou/config.ts:55` 会 `set('cookie', ...)` 把 cookie 写进平台基线，
但 `client/runtime.ts:119-120` 紧接着 `def.headers.delete('cookie')` ——
设计意图是「cookie 是执行期身份，基线里带上会遮蔽单次调用的覆盖」。
所以 config 里那行对生产路径是**死代码**，只有 `config.test.ts` 在测它。
读代码时容易误以为「cookie 在基线里，所以必需」。

对照项目恰好相反：它从不接收整串 cookie，只接收一个 `did`，Cookie 头由自己拼。
迁移时这是要新增的一层概念，不是改几行参数。

好在 amagi 已经有同类先例可抄：小红书的 `platforms/xiaohongshu/sign/guestCookie.ts`
就是「先打几个请求换游客身份、塞进 `ctx.cookie`」的 `prepare` 实现。
快手的 did bootstrap 照这个形状做即可，不必新发明机制。

---

## 三、端点级对照

amagi 现有 6 个快手端点（`platforms/kuaishou/endpoints/`），没有一个声明 `sign`、
没有一个声明端点级 `judge`、没有一个有 `prepare`：

| 端点 | route | 走哪儿 | 要 cookie？ |
|---|---|---|---|
| `videoWork` | `/fetch_one_work` | graphql `visionVideoDetail`（`api.ts:140-150`） | **要** |
| `comments` | `/fetch_work_comments` | graphql `commentListQuery`（`api.ts:164-171`） | **要** |
| `emojiList` | `/fetch_emoji_list` | graphql `visionBaseEmoticons`（`api.ts:549-553`） | 不要 |
| `userProfile` | `/fetch_user_profile` | live_api ×12，带 `signPath: /rest/k/*` | 不要（但未签名） |
| `userWorkList` | `/fetch_user_work_list` | live_api | 不要 |
| `liveRoomInfo` | `/fetch_live_room_info` | live_api | 不要 |

`emojiList` 走的 `visionBaseEmoticons` 与弹幕的 `visionDanmaku` 一样是**完全免鉴权**的
（对照项目 `model/request.ts:330` 注明「不需要签名、Cookie 或 token」），所以这个端点
理论上现在就该能无 cookie 跑通——迁移时先拿它做基线验证，能排除环境问题。

kkk 实际只用了 3 个方法：`fetchVideoWork`、`fetchWorkComments`、`fetchEmojiList`。
其中前两个正好是唯一两个走 PC GraphQL 的——**下游的痛点与 amagi 的缺口一一对应**。

对照项目替换关系：

| amagi 端点 | 换成 | 方法 | 签名 | 参数位置 |
|---|---|---|---|---|
| `videoWork` | `c.kuaishou.com/rest/wd/photo/info` | POST | 要（**含 body**） | body，另有 share 系列参数 |
| — (新增，免签兜底) | `/rest/wd/ugH5App/photo/simple/info` | POST | 不要 | body 只有 `photoId` |
| `comments` | `/rest/wd/photo/comment/list` | POST | 要 | **必须在 body**，放 query 会 0 条 |
| `emojiList` | 保持 graphql，或 `/rest/wd/emotion/package/list` | POST | 要 | body |

`photo/info` 与 `simple/info` 是「完整版 / 精简版」的关系：前者多返回图集预渲染的
`mp4Url`（对照项目 `TODO.md:11-20`），后者免签但字段少。对照项目的策略是先打完整版、
失败回落精简版，这个降级路径值得照搬——它让「签名万一失效」不至于整条功能挂掉。

---

## 四、好消息：amagi 的骨架已经够用

不需要动管线。`contracts/request.ts` 的 `RequestSpec` 早就备好了槽位：

- `body?: unknown`（`:157`）
- `signPath?: string`（`:160`，注释原文就写着「小红书 `x-s`、**快手 hxfalcon** 都要它」）
- `extra?: Record<string, unknown>`（`:165`，「透传给 `sign` / `decode`」）

而 `SignFn = (spec, ctx) => RequestSpec`（`contracts/endpoint.ts:89`）——签名器拿到的是
**整个 spec，body 就在里面**。也就是说走正规的 `sign` 声明这条路，body 天然可得，
不需要像对照项目那样在 request 层手动把 body 传给签名器。

所以迁移是「把已有零件接上」，不是「重写签名」。

---

## 五、迁移 todolist

### 阶段 0 · 接线（先让签名真的发生）

- [x] `platforms/kuaishou/sign/signers.ts` 新建：导出 `createKuaishouSigners()`，
      返回 `{ hxfalcon: SignFn }`，与另外三个平台的 `sign/signers.ts` 同构
- [x] 签名器实现：从 `spec.url` 取 query（须含 `caver`）、`spec.signPath`、`spec.body`，
      调 `signer.signLiveApiUrl(...)`，把 `__NS_hxfalcon` / `caver` 写回 URL、`kww` 写进 headers
- [x] `client/runtime.ts` 的 `PLATFORM_RUNTIME.kuaishou` 加上 `signers`
- [x] **删掉 `client/runtime.ts:30-31` 那句错注释**（「由 api.ts 在构造请求时处理」）
- [x] 改 `packages/docs/content/docs/v7/dev/internals/transport.mdx:94-107`
      那节「快手：签名器存在但没接线」——接上之后这节要改成现状，
      顺手修掉它「`kuaishou: {}` 连 judge 都没有」的过期说法
- [x] `test/client/runtime.test.ts` 补一条：四个平台都必须有 `signers` 或显式注明无
      （与我上一轮给 `judge` 加的那条同源，把「静默漏项」这一类彻底钉住）
- [x] 重写 `test/platforms/kuaishou/endpoints.test.ts:211` 那个同义反复的「接线」测试：
      断言的应该是「跑一次端点，最终 URL 里有 `__NS_hxfalcon`」

### 阶段 1 · 签名喂请求体

- [x] `sign/helpers.ts` 的 `buildKuaishouHxfalconPayload` 加第三参 `requestBody = {}`，
      去掉第 120 行的硬编码（对照项目 `helpers.ts:88-108`）
- [x] `sign/index.ts` 的 `signLiveApiUrl` / `signLiveApiRequest` 各加一个 `requestBody` 参数
      （`KuaishouSigner` 与遗留静态类 `kuaishouSign` 两处都要，签名保持向后兼容的默认值）
- [x] 单测：同一 URL 带 body / 不带 body 必须产出**不同**的 `signResult`，
      且 `signInput` 尾部确实是 `JSON.stringify(body)`（这是死分支复活的唯一证明）
- [x] v6 目录 `platform/kuaishou/sign/` **一行都不改**（已定：v6 整体冻结）。
      `platform/kuaishou/sign/helpers.ts:93` 那处一模一样的硬编码保持原样，
      只在文件头加一条注释指明「v6 已冻结，新实现在 `platforms/kuaishou/sign/`」

### 阶段 2 · H5 命名空间

- [x] `platforms/kuaishou/api.ts` 加 `KUAISHOU_H5_HOST = 'https://c.kuaishou.com'`
- [x] `contracts/ua.ts` 加一个移动端 UA 常量（现在只有桌面 `DEFAULT_UA`）
- [x] `platforms/kuaishou/config.ts` 支持按端点切换 UA 与 `Referer`
      （H5 接口的 Referer 是 `https://c.kuaishou.com/fw/photo/<photoId>`，
      而 config 现在恒为 `/new-reco`）
- [x] 新增 did：**内部生成**（已定）。生成规则照 `did.ts:57`（`web_` + 16 字节 hex，
      即 32 位小写十六进制），只放进 Cookie 头，不进 query、不进签名
- [x] did 的生命周期：一个 client 实例持有一个 did（与 `KuaishouSignState` 同款——
      每实例一份、进程内稳定），实现形状抄 `platforms/xiaohongshu/sign/guestCookie.ts`
- [x] Cookie 头拼装：`did=<did>; didv=<Date.now()>`，用户配了 `cookies.kuaishou`
      就追加在后面（对照项目 `request.ts:274` 是同一形状，只是它那条追加分支没人用）
- [x] **不暴露成配置项**（已定：内部生成）。搜索 / 创作者搜索 / 热榜那三个要真实 did
      的接口因此暂时做不了，这是本次接受的代价——阶段 5 里那几条相应降级为「暂不实现」
- [x] `endpoints/liveRoomInfo.ts:11-13`、`userWorkList.ts:9` 的 JSDoc 写「live_api GET」
      但 build 返回 POST，顺手修掉
- [x] `platforms/kuaishou/config.ts:55` 那行 `set('cookie', ...)` 是死代码
      （`client/runtime.ts:119` 立刻删掉它），加注释或直接移除，别再误导读代码的人

### 阶段 3 · 换端点

- [x] `endpoints/videoWork.ts` 改走 `/rest/wd/photo/info`：POST、`sign: 'hxfalcon'`、
      `signPath` 显式给、body 照 **附 A** 的 14 个键一字不差地填
      （对照项目 `TODO.md:17-19` 说漏 share 参数会 `result=50` / `result=2`）
- [x] `api.ts` 里 `videoWork` 那个 graphql 构造器（`:140-150`，`visionVideoDetail`）
      **整条删掉**（已定：直接替换，不留 `videoWorkGraphql` 并行端点）
- [x] 新增 `endpoints/videoWorkSimple.ts` 走 `/rest/wd/ugH5App/photo/simple/info`（免签）
- [x] ~~`videoWork` 加 `prepare` 或 partial 降级：完整版失败回落精简版~~
      **改成「降级由调用方做」**：管线里没有「judge 判失败后换一条 spec 重发」的钩子
      （`decode` 拿不到 `send`，`retryOn` 重试的是同一条 spec），而 `partial: 'tolerate'`
      那条路会让**每次**调用都白发一个请求 —— 快手评论接口有 IP 级冷却，多一倍请求是
      实打实的代价。另外精简版的响应字段更少，把它塞进 `videoWork` 的返回类型就等于
      让类型说谎，与「不归一化」那条决定冲突。所以兜底做成独立可调端点
      `fetchVideoWorkSimple`，理由写在它的 JSDoc 里。
- [x] `endpoints/comments.ts` 改走 `/rest/wd/photo/comment/list`，
      **参数放 body**（对照项目 `TODO.md:197-199`：路由表的 `parameterNames` 是 OPTIONS
      预检用的，照搬会拿到 `result=1` 但 0 条）
- [x] `emojiList` 不动（`visionBaseEmoticons` 本就免鉴权），只补 `Referer`
- [x] **不做归一化**（已定）。H5 响应原样透出，`videoWork` 的返回类型直接换成
      H5 `photo/info` 的形状，不写 GraphQL↔H5 的映射层
- [x] 响应类型换形状：`types/ReturnDataType/Kuaishou/OneWork/OneWork_V0.ts` 整份重写成
      H5 `photo/info` 的 `{ result, photo, counts, atlas, single, serialInfo }`。
      对外名字 `KsOneWork` 与 `KuaishouReturnTypeMap.videoWork: KsOneWork`
      （`Kuaishou/index.ts`）都不动，改动只落在叶子文件里
- [x] 注意 `ReturnDataType/Kuaishou/` **不是**单文件而是目录，且它下面 4 个文件
      （`UserCommon.ts` / `UserHomeDetail.ts` / `UserProfile.ts` / `UserWorkList.ts`）
      是 `#178` 目录结构重构漏改的扁平文件——本次别顺手一起动，留给类型自动化那份 PRD
- [x] 保留顶层 `[property: string]: any`：`test/types/response-types.test-d.ts` 用它
      承诺「平台加字段不算 breaking」，去掉会直接挂测试
- [ ] 因为不归一化，**下游 kkk 必须改**：`platform/kuaishou/getdata.ts` 与
      `kuaishou.ts` 里读 `visionVideoDetail` 那套字段的地方要改成读 `photo` / `atlas`

### 阶段 4 · judge 补两类漏判

- [x] `platforms/kuaishou/judge.ts` 加「GraphQL `data.<op>` 为 null → `auth` /
      `LOGIN_REQUIRED`」（断线 3）
- [x] 补 H5 的 result 码语义：`50`=签名验证失败（`kind: 'internal'`，重试无用）、
      `2`=平台拒绝/IP 冷却（`rate_limit`，可重试但要长退避）、
      `11`=字段全 null（可重试，弹幕接口约 13% 概率）、`21`=缺 position 参数
- [x] 风控响应识别：PC `result=400002`、H5 `result=2001`，两种格式归一化后
      把滑块地址交出去（对照项目 `platform/kuaishou/captcha.ts` 有完整实现，**不自动绕过**）
- [x] 每一条都补 judge 单测

### 阶段 5 · 可选新端点（按需，不阻塞主线）

- [ ] 弹幕 `visionDanmaku`：免鉴权，但有两条硬规则——窗口宽度必须 < 60000ms、
      服务端按 30 秒分桶。取全量用步长 60000 / 宽度 59999。细节见 `TODO.md:140-164`
- [x] ~~相关推荐 `/rest/wd/ugH5App/slide/feed`（免签）~~ **按需再加**：免签、能做，
      但当前没有下游要它。理由记在 `api.ts` 的模块 JSDoc 里，免得下一个人以为是漏了
- [x] ~~搜索热词 `/rest/wd/ugH5App/search/guess`（免签）~~ 同上，**按需再加**
- [x] ~~音乐标签页：刻意抓 HTML 解 `INIT_STATE`，不打 `tag/music/*` 接口~~
      **不做**：抓分享页 HTML 解全局变量不属于「接口库」该干的事，
      而且 HTML 结构一变就废，比签名失效更难察觉。理由同样记进 `api.ts`
- [x] ~~搜索 / 创作者搜索 / 热榜~~ **暂不实现**（已定：did 内部生成，拿不到真实 did）。
      `api.ts` 里没有这几条的 URL 构造器，所以改成在该文件的模块 JSDoc 里列了
      「刻意没有实现的接口」一节，写明这条绕不过去（对照项目 5 种组合全被拒），
      别让下一个人以为是漏了

### 阶段 6 · 验证

- [ ] 离线单测：把对照项目 `test/fixtures/*.json` 那几份真实响应形状拿来做 fixture
      （video / single_picture / vertical_atlas / horizontal_atlas / comment / search）
- [ ] 端到端探针：无 cookie 跑 `videoWork` / `comments` / `emojiList`，确认 `success: true`
      且 `data` 非空——这是本次迁移的验收条件
- [x] `PLATFORM_RUNTIME` 一致性：client fetcher / `createKuaishouRoutes` / 静态 fetcher
      三个入口都要验一遍（漏装表就是从这里漏的）
- [x] amagi 全门禁：typecheck / lint / test / test:types / openapi:check / deps:check
- [ ] kkk 侧：`fetchVideoWork` / `fetchWorkComments` / `fetchEmojiList` 清掉 cookie 配置后仍可用

### 阶段 7 · 署名与提交

- [x] 提交信息里 @OduckO（本次思路与 H5 接口形状全部来自该项目）
- [x] 在 `platforms/kuaishou/sign/helpers.ts` 与新增端点的 JSDoc 里注明来源与
      对照项目的 `TODO.md` 条目号，方便后来人溯源
- [x] 许可证已核对：**两边都是 GPL-3.0-only**（amagi `package.json:18` 与
      `packages/core/package.json:16`；对照项目 `package.json:43`），照搬实现无兼容问题，
      但按 GPL 要求必须保留署名

建议的提交信息形状：

```
feat(kuaishou): 走 H5 命名空间，签名带上请求体，免 cookie 取数

思路与接口形状来自 @OduckO 的 kuaishou-parser（GPL-3.0-only）：
https://github.com/OduckO
```

---

## 六、已排除的路径（对照项目实测过，别重复试）

这些都写在对照项目 `TODO.md` 里，附了验证方式和结果，直接采信可省大量时间：

| 路径 | 结果 | 出处 |
|---|---|---|
| 随机 did + 借来的完整风控指纹跑搜索 | 拒 | `TODO.md:169-176` |
| 服务端 `Set-Cookie` 刚下发的新 did | 拒 | 同上 |
| 新 did 先走 `system/startup` 预热 | 拒 | 同上 |
| Node 侧裸打 `gdfp.gifshow.com/s/w/c` 注册指纹 | `result=-4 SERVER_ERR` | `TODO.md:177-179` |
| 换 App UA（含 `Kwai/`、`ksNebula/`）换更多字段 | 6 种 UA 返回完全一致，差异 0 | `TODO.md:34` |
| 图集单张动态：CDN 12 种命名变体 + mov CDN 5×4 | 全 404 | `TODO.md:30-32` |
| 分享页 SSR（H5 `INIT_STATE` / PC `APOLLO_STATE`）取视频字段 | 无 | `TODO.md:35` |
| `/rest/wd/photo/subComment/list` 取子评论 | 该路径不存在，是猜的 | `TODO.md:107-108` |
| PC GraphQL 未登录取评论 | 全 null 空壳 | `TODO.md:100-105` |
| 评论 `attachments` 在 H5 接口 | 条件性不下发，出现率 ~0.4% | `TODO.md:45-86` |

一条附带的工程教训也值得抄进 amagi 的 CI：对照项目 `TODO.md:200-203` 记录，
`sign/` 目录 8 处相对 import 缺 `.js` 后缀，`tsc --noEmit` 与 `tsx` 都不报，
只有真跑产物才暴露——所以它在 `build` 后加了产物冒烟。

---

## 七、已决（2026-09-04 拍板）

四条都定了，todolist 里对应条目已经改成决定后的写法。

1. **did 用内部生成。** 不暴露成 `ClientOptions` 配置项，amagi 自己造
   `web_<32位hex>`、自己拼 Cookie 头。
   *代价*：搜索、创作者搜索、热榜这三个要「浏览器激活过的真实 did」的接口做不了
   （门槛在快手服务端的设备指纹账本上，本地造不出来，见「六、已排除的路径」）。
   阶段 5 里这三条降级为「暂不实现」，等以后真要做再考虑开配置项。

2. **响应不归一化，直接用原接口的类型。** `videoWork` 的返回类型换成 H5
   `photo/info` 的形状，不写 GraphQL↔H5 映射层。
   *理由*：amagi 是接口库，抹平平台差异是下游的事；而且归一化会丢掉 H5 独有的
   `mp4Url` / `atlas`——那正是这次迁移的净收益。
   *代价*：kkk 要改读字段的地方，已写进阶段 3。

3. **v6 全部冻结。** `packages/core/src/platform/**` 一行都不改，
   包括 v6 那处一模一样的 `requestBody: {}` 硬编码。只加注释指向 v7。

4. **`videoWork` 直接替换实现。** 不保留 `videoWorkGraphql` 之类的并行端点。
   这是破坏性变更，下游只有 kkk，一起改掉即可。少一条并行路径也少一份维护。

---

## 八、风险与边界

- **评论接口有 IP 级冷却**：连续查十几个作品后全线 `result=2`，随机 did 和重试都救不回来，
  要等几分钟（`TODO.md:184-187`）。这会影响端到端探针的可重复性，别把它当成实现 bug。
- **搜索类的 did 门槛绕不过**，只能做成可选能力，不能承诺「零配置可用」。
- **签名是逆向产物**，快手改了前端 sig4 就会失效。所以阶段 3 的「完整版失败回落精简版」
  不是锦上添花，是唯一的安全网。
- **风控只做中转不做绕过**：撞到滑块就把地址交给用户，不引入任何识别或轨迹模拟代码。
  这条与对照项目的立场一致，也是 amagi 该守的线。

---

## 附 A · `photo/info` 的完整请求形状（照抄用）

```
POST https://c.kuaishou.com/rest/wd/photo/info
     ?kpn=NEBULA&captchaToken=&caver=2&__NS_hxfalcon=HUDR_<base64url>%24HE_<hex>
```

请求体 14 个键，**全部必须存在**，缺值填空串（对照项目 `API.ts:198-214`）：

```ts
{
  fid: '', efid: '', shareToken: '', shareObjectId: '', shareMethod: '',
  shareId: '', shareResourceType: '', shareChannel: '',
  kpn: 'NEBULA',
  subBiz: '',
  env: 'SHARE_VIEWER_ENV_TX_TRICK',   // 前端硬编码常量，照抄
  h5Domain: 'c.kuaishou.com',
  photoId: '<photoId>',
  isLongVideo: false
}
```

share 系列的值来自短链展开后的 URL query（`shareChannel` 取 query 里的 `cc`）。
直接用 photoId 调用时全填空串也能通。

请求头只有 6 个，**没有 `Origin`、没有任何 `x-` 头、没有 `Sec-*`**：

| 头 | 值 |
|---|---|
| `kww` | 本地 AES 生成的匿名值，形如 `<base64>###ssrd` |
| `Content-Type` | `application/json` |
| `Accept` | `application/json, text/plain, */*` |
| `User-Agent` | iPhone Safari 17（移动 UA，**不是桌面 UA**） |
| `Referer` | `https://c.kuaishou.com/fw/photo/<photoId>` |
| `Cookie` | `did=web_<32位hex>; didv=<Date.now()>` |

签名输入 = `/rest/wd/photo/info` + `captchaToken=caver=2kpn=NEBULA` + `JSON.stringify(body)`
（排序后的 `k=v` 直接拼接，跳过含 `__NS` 的键）。

免签的精简版对比：`POST /rest/wd/ugH5App/photo/simple/info`，无 query，
body 只有 `{ photoId }`，头只有 4 个，**一个 Cookie 头都不发**。

## 附 B · 对照项目自己还留着的坑（别一起抄过来）

- `subscribe.ts:142-143` 调 `signLiveApiUrl(url, cookie)` **省略了第 4 个 requestBody 参数**，
  而 `:154` 确实发了 body ——就是 `TODO.md:193` 记录的那个 `result=50` 陷阱，在这条路上仍然存在。
- `types.ts:128` 说 H5 链路把 verifyToken 拼成 `captchaToken` query 参数，
  但 `API.ts:219` 把 `captchaToken` 硬编码成空串，实际只会变成 `identity-verification-token` 头。
- `postSigned` 把 `Cookie` 放在头对象末位，调用方通过 `headers` 传的 `Cookie` 会被静默丢弃。
- `emoticon.ts:132` 调 `resolveDid()` 不带参数，所以表情套装永远用 env 或随机 did，
  调用方传的 did 到不了那里。
- `liveRoomInfo` / `userWorkList` 的 JSDoc 写「live_api GET」，实际 build 返回 POST
  ——这条是 **amagi 自己的**（`endpoints/liveRoomInfo.ts:11-13`、`userWorkList.ts:9`），顺手一起修。

