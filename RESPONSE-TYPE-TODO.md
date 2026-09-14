# 还没有 response-types 的端点（补录清单）

> 生成于 2026-09-11。判据：`packages/core/src/platforms/*/endpoints/*.ts` 里写着
> `response: type<any>()` 的端点 —— 也就是「生成树里还没有对应类型、先拿 `any` 兜底」的那些。
> **这些洞补完，这个文件就该删掉。**

为什么会有这个文件：2026-09-11 端点声明的 `response` 换成了
`@ikenxuan/amagi-response-types` 的生成类型。65 个端点 = **54 个有生成类型** +
**9 个待补**（下面第一、二组）+ **2 个 compute**（第三组，本地算完就返回、永远没有响应）。
待补的那些没有样本，所以先回退 `any`。样本是运行时内容、不进 git，只能人来录。

## 怎么用

1. 起控制台（两个进程都要）：`pnpm console:server` + `pnpm console`
2. 逐端点：填参数 → 发请求 → 看 diff → 入库 → 点「生成类型」
3. 录完一批：

   ```bash
   pnpm gen:types
   pnpm --filter @ikenxuan/amagi-response-types run build   # ← 别忘了这步，core 读的是那个包的 dist
   pnpm test
   ```

4. 第 3 步的 `pnpm test` 里，`packages/core/test/contracts/response-source.test.ts` 会**红**，
   并逐条告诉你该动哪里：

   ```
   bilibili/articleContent：生成树里已经有 BilibiliArticleContentResponse 了，
   把 response 换成 type<BilibiliArticleContentResponse>()，
   并把 response-mapping.test-d.ts 里那条 toBeAny() 改成 toEqualTypeOf<BilibiliArticleContentResponse>()
   ```

5. 按提示改完再跑一遍 —— 绿了就是收工。

## 现在一个种子文件都没有

`corpus/seeds.json` **不存在** → 下面这些端点在控制台里**全部要手填参数**，没有自动建议。
想省事可以先建一个（每平台填几个根值：UID / 关键词 / `principalId` 这类），
依赖图会从这些起点长出其余 ID。

## 一、普通数据端点（6 个，直接录）

| 端点                       | 参数                                | 说明                                           |
| -------------------------- | ----------------------------------- | ---------------------------------------------- |
| ~~`douyin/textWork`~~      | `aweme_id`                          | ✅ 已完成（2026-09-12 接入，见提交 `6f61a4c`） |
| `kuaishou/liveRoomInfo`    | `principalId`                       | 直播间聚合信息                                 |
| `kuaishou/userProfile`     | `principalId`                       | 用户主页聚合信息                               |
| `kuaishou/userWorkList`    | `principalId` / `number`            | 用户公开作品列表                               |
| `kuaishou/videoWorkFull`   | `photoId`                           | 单个作品详细信息（完整版，当前稳定撞风控）     |
| `xiaohongshu/noteComments` | `note_id` / `xsec_token` / `number` | 笔记评论列表                                   |
| `xiaohongshu/userNoteList` | `user_id` / `cursor` / `num`        | 用户笔记列表                                   |

## 二、凭证 / 验证码类（3 个，录之前先拍板）

| 端点                          | 参数                                                    | 说明                          |
| ----------------------------- | ------------------------------------------------------- | ----------------------------- |
| `bilibili/captchaFromVoucher` | `csrf` / `v_voucher`                                    | 由 v_voucher 申请的验证码信息 |
| `bilibili/validateCaptcha`    | `csrf` / `challenge` / `token` / `validate` / `seccode` | 验证码校验结果                |
| `douyin/loginQrcode`          | `verify_fp`                                             | 登录二维码                    |

这几个要不要进 corpus 是你的判断：它们要么需要真实凭证（`v_voucher` / `challenge`）、
要么返回登录态、要么**会签发凭证**（`douyin/loginQrcode`）。`bilibili/qrcodeStatus` 当初也在这一档，
后来还是录了 —— 所以这不是规则，是取舍。

## 三、compute 端点（2 个，不用录）

`bilibili/avToBv`、`bilibili/bvToAv` —— 本地算完就返回、**一个网络请求都不发**，永远不存在「响应」。
它们保留各自的本地声明，并在 `response-source.test.ts` 的白名单里。

## 录完之后

- 端点声明那行从 `type<any>()` 换成 `type<XxxYxxResponse>()`
- `packages/core/test/types/response-mapping.test-d.ts` 里对应的 `toBeAny()` 换成
  `toEqualTypeOf<XxxYxxResponse>()`
- 那个端点就正式进「已接入」那一列了

## 已知障碍

- `kuaishou/videoWorkFull`：端点注释里写着「当前稳定撞 `2001` 风控」—— 大概率录不到，别在这上面耗
