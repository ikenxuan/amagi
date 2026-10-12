# 手写协议类型的来源

本目录不属于 `src/generated/`。生成器只清空 `src/generated/`，不会覆盖这些协议扩展。
本次没有新增 corpus 响应，没有为示例、测试夹具或字段说明补造 `recordedAt`。

录到真实样本的端点由生成类型接替，对应的手写扩展随之下线：`XiaohongshuUserNoteListResponse`
在 beta.9 合并时改由 `generated/xiaohongshu/UserNoteList`（上游录制的 `user_posted` 样本）提供。

| 类型                                 | 来源                                                                                                                 | 已知边界                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DouyinMixAwemeResponse`             | `_1790248674248.zip` 内 `src-ts-v7/platforms/douyin/endpoints/mixAweme.ts`（包内说明日期 2026-09-23）                | 归一化结果保证 `aweme_list` 数组与数字 `cursor`；数字 `has_more` 保持可选。无完整响应，所以条目为 `unknown`。`COLLECTION-FIELDS.md` 描述的是 `parseWork`，不能假定 mix 列表每项都有相同字段。                                                                                                                                                                                                                                                                                                                                                                    |
| `DouyinMusicAwemeListResponse`       | 2026-10-07 Node 带登录 cookie 实测签名版 `/aweme/v1/web/music/aweme/`                                                | 只收窄 `aweme_list[].music` 里取 mp3 用得到的 `mid` / `title` / `author` / `duration` / `play_url.url_list`，作品本体保持 `unknown`。返回体是真实作品与昵称，没有录 corpus。                                                                                                                                                                                                                                                                                                                                                                                     |
| `XiaohongshuSubCommentsResponse`     | `amagi-xhs-port2-20260921.tar.gz` 内 `endpoints/subComments.ts` 的 `SubCommentsResp`                                 | `comments`、布尔 `has_more`、字符串 `cursor`；评论条目没有完整记录。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `XiaohongshuSearchUserResponse`      | 同包 `API-使用示例.md`                                                                                               | `data.users`、字符串 `user_id` / `name` / `fans`；示例成功码为 `1000`，不收窄成 `0`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `XiaohongshuLiveRoomResponse`        | 同包 `API-使用示例.md`                                                                                               | `data.host_info` / `room_info`；文档说明长 `room_id` 是字符串。其他嵌套字段未知。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `XiaohongshuLiveSquareResponse`      | 同包 `API-使用示例.md`                                                                                               | `data.feeds[].live.t_room_info.room_id`；其余字段未知。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `XiaohongshuLiveStatusResponse`      | 同包 `API-使用示例.md`                                                                                               | 只说明 `status` / `next_request_interval` 字段名，未提供具体值域。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `XiaohongshuSearchHotListResponse`   | 同包 `endpoints/searchHotList.ts`                                                                                    | 只有端点与成功信封说明，`data` 保持 `unknown`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `XiaohongshuUserProfileResponse`     | 同包 `endpoints/userProfile.ts` 与 `API-使用示例.md`                                                                 | v7 改读 `/user/otherinfo`，使用 `basic_info` / `interactions` / `tab_public`；现存生成类型仍是旧 HTML 状态的 `basicInfo` / `tabPublic`。                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `KuaishouCommentRepliesResponse`     | 2026-09-26 浏览器实测 PC GraphQL `visionSubCommentList`（游客态、登录态各一轮，结果一致）                            | 选择集的 12 个键是本仓库拼的（前端 bundle 里这条 mutation 的片段槽没能提出来），服务端接受；前端实际请求的字段可能多于或少于这 12 个。只收窄确认过类型的 5 个（`commentId` / `authorId` 字符串、`timestamp` 数字、`hasSubComments` 布尔、`replyTo` 字符串），其余 `unknown`。实测数据在 `subCommentsV2`（V1 为空数组），游标看 `pcursorV2`、到底为 `'no_more'`。顶层只有 `data`，**没有 `result`**。没有录 corpus：返回体全是真实昵称与评论正文，不可提交。                                                                                                      |
| `KuaishouEmotionPackageListResponse` | 2026-09-27 浏览器实测；2026-09-28 Node 无凭据 GET / POST 复核 `https://www.kuaishou.com/rest/k/emotion/package/list` | 两次复核均为 HTTP 200、`result: 1`，1 包、275 条表情；GET 响应 263273 字节。POST 遍历全部条目验证：包 `id`、表情 `id` / `packageId` 为字符串，包及表情 `type`、表情 `width` / `height` 为数字，不匹配计数均为 0。其余已观察键保持 `unknown`；数量不作为固定契约。仅输出状态码、键名、长度和计数，未保存响应或新增 corpus。                                                                                                                                                                                                                                       |
| `KuaishouSlideFeedResponse`          | 2026-09-28 Node 无凭据实测 `https://c.kuaishou.com/rest/wd/ugH5App/slide/feed`，POST `{photoId, authorId}`           | HTTP 200、`result: 1`，`data.feeds` 6 条。**异构数组**：5 条为 35 键的作品项，1 条为 8 键的推荐卡片（`cardId` / `cardViewList` / `btn` / `guide`），因此条目类型为联合，未按作品统一声明。5 条作品项逐条核对：`photoId` / `userEid` / `userName` / `caption` 为字符串，`userId` / `duration` / `timestamp` / `width` / `height` / `likeCount` 为数字，`mainMvUrls` / `coverUrls` 为数组，不匹配计数均为 0；`soundTrack` 有 1 条缺失故为可选。`authorId` 取自作品响应的 `photo.userId`（数字），非 `userEid`。仅输出状态码、键名与计数，未保存响应或新增 corpus。 |
| `KuaishouSearchUserResponse`         | 2026-10-01 PC `/rest/v/search/user` 浏览器请求及逐项审计                                                             | 首批 30 条用户、8872 字节。追加搜索“直播”的 30 条：7 条开播的 `livingId` 为 string、23 条为 null；28 条认证详情的六个字段逐项确认。首屏请求三键来自抓包，翻页三键来自 PC bundle 的 fetchMore，未抓用户第二屏。                                                                                                                                                                                                                                                                                                                                                   |
| `KuaishouSearchWorkListResponse`     | 2026-10-01 PC `/rest/v/search/feed` 两屏真实请求及两组追加审计                                                       | 首屏 19 条、164740 字节，第二屏 20 条；追加两组各 20 条，逐项确认地址数组、普通/H265 清单及深层码流、认证详情、标签和作者声明。风险提示两字段在一组中 6 条为 string、14 条为 null。首批 H265 字段 18/19、替换封面 11/19、认证详情 6/19，仅记录出现次数，不推断缺失原因。                                                                                                                                                                                                                                                                                         |
| `KuaishouLoginUserProfileResponse`   | 2026-10-01 PC `/rest/v/profile/get` 登录态 GET                                                                       | 无请求体，响应 366 字节、13 键平铺；eid 与快手号 userDefineId 不同，简介键为 userTex。手机号样本由服务端打码。只记录字段类型、键和长度，未保存账号资料。                                                                                                                                                                                                                                                                                                                                                                                                         |

2026-10-01 独立未登录浏览器对照：官网请求 `gdfp.gifshow.com/s/w/c` 后出现
`kwfv1` / `kwssectoken` / `kwscode`，没有 `userId` 或 `kuaishou.server.webday7_ph`。
同一上下文账号资料返回 `109`，用户搜索和作品搜索返回 `1`，分别为 30 条、20 条。
因此两条搜索支持注册后的游客，不要求账号登录。未逐项移除 cookie，不能断言任一项
单独必要或这三项足以替代全部 cookie。以上均未保存原始响应、凭据或新增 corpus。

`UserProfile` 是一处明确的协议替代：包入口用具名导出覆盖同名旧生成类型及 Success 别名，
不更改旧生成文件或它的样本来源注释。表中其余类型填补原先没有生成类型的端点。
协议类型只声明说明中能够确认的结构；不完整字段为可选，未描述字段为 `unknown`。
这不同于旧生成类型的 `any` 索引，调用方需先检查未知字段。

## 长整数 ID 兼容

`douyin-safe-integers.ts` 为现存抖音生成类型增加有限的类型投影，以匹配传输层保留长整数
原值的解析方式。仅以下数字字段允许 `number | string`：

- `author_user_id`、`comment_gid`、`stream_id`。
- 同一对象中存在必需字符串 `id_str` 的数字 `id`。

作用于 Comments、ImageAlbumWork、LiveRoomInfo、MusicInfo、ParseWork、Search、SlidesWork、
TextWork、UserFavoriteList、UserRecommendList、UserVideoList、VideoWork 共 12 个响应族的
公开主类型与 Success/Error 别名。列表来自对现有生成树中上述字段的检查；其他响应没有
整体扩宽。计数、时间戳、状态码、时长、尺寸、码率及数字字面量仍保持原类型，数组、联合、
可选字段以及原有 `any` / `unknown` 也保持原语义。

来源证据包括当前生成树中显式的 ID 字段，以及 `corpus/douyin/musicInfo.requests.json`
的成功请求元数据（例如 `7683618325565623078`、`7682402882607516425`）。请求元数据
不是原始响应，不能用来声称某个返回字段已经实录；因此只添加 `number | string` 兼容，
不将字段一律改为字符串，也不补造 corpus。原生成文件及其来源注释保持不变。

公共包入口的具名导出应用这层投影，核心端点令牌和静态/绑定 fetcher 复用同一类型。
OpenAPI 生成器读取同一份字段与响应族列表，对生成 schema 应用对应兼容，并按平台隔离
同名类型；例如抖音和快手各自的 `VideoWork_V0` 不会串用。类型测试检查 ID 与普通数字的
边界，运行时测试直接检查生成器实际产出的响应结构。

取得真实、脱敏的响应后，应按原有录制流程添加 corpus、生成对应端点，再移除被真实
样本完整覆盖的协议导出并更新类型测试。`response-source.test.ts` 会阻止新增类型与生成
树意外重名；只有 `UserProfile` 和上述 12 个 ID 兼容族的明确覆盖被允许。`UserProfile`
需在新 API 样本生成后退出覆盖；ID 兼容投影需在生成类型自身可靠表达精度策略后退出。
