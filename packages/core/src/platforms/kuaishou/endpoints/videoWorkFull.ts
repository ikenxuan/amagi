import zod from 'zod'

import { kuaishouApiUrls } from '../api'
import { KUAISHOU_H5_DROP_HEADERS, kuaishouH5Headers } from '../config'
import { kuaishouDidPrepare } from '../did'
import { hxfalcon } from '../sign/steps'
import { defineKuaishouEndpoint, type } from './define'

/**
 * 获取单个作品信息（H5 完整版 `photo/info`，POST + 签名含请求体）。
 *
 * **这条零凭据稳定撞风控**，回 `result=2001 antispam need captcha`。它不是主通道，
 * 主通道是 {@link videoWork}（`/fetch_one_work`，走免签的 `simple/info`）。解法见文末
 * 「怎么让这条过」：人拖一次滑块，整个 `did` 解风控。
 *
 * 排除过的可能原因（每条都真发过请求）：
 *
 * | 试过的 | 结果 |
 * |---|---|
 * | 签名（逐字核过；签名错回的是 `50`） | 2001 |
 * | 请求头只留真实 H5 请求那 6 个 | 2001 |
 * | 随机 did / 浏览器里激活过的真实 did | 2001 |
 * | 完全不发 Cookie 头 | 2001 |
 * | 先 GET H5 分享页 / PC 页，用服务端下发的 cookie 预热 | 2001 |
 * | 把分享页给的 `webShareToken` 填进 `shareToken`（+ `shareResourceType` 等） | 2001 |
 * | 数字形式的 photoId 替代短 ID | 2001 |
 *
 * 保留这条端点的价值：它是唯一可能返回图集预渲染 `mp4Url`、同类推荐 `photos`、
 * 前几条评论 `comments` 的通道。但那三个字段在现有样本里从未出现过，
 * 所以「完整版更好」目前缺证据。
 *
 * 三件事缺一不可（换个域名试试走不通的原因）：
 * 1. `sign: 'hxfalcon'`
 * 2. `signPath` 透给签名器
 * 3. body 参与签名 —— 不进 sign input 就一律 `result=50`
 *
 * 响应**不归一化**：amagi 是接口库，抹平平台差异是下游的事。
 *
 * ## 怎么让这条过（2026-10-10 实测订正）
 *
 * **人过一次滑块，整个 `did` 解风控**，这条随之从 `2001` 变 `result=2`，**不必回填票据**。
 *
 * 实机对照：拿 `error.challenge` 的地址在干净浏览器里拖过一次（`kSecretApiVerify`
 * 回 `result=1`），然后**原样重发、票据一个字都不带** —— **三条**签名路径
 * （`user/profile`、`photo/info`、`feed/profile`）的 `2001` 一起消失，全部变成
 * `result=2`（`captchaConfig` 不再下发）。当天晚上隔约 9 小时又打了一轮**交错**对照
 * （过滑块那个 `did`（尾 4 位 `c426`）与一个同时刻生成的全新 `did` 轮流打同四条路径，
 * 每条各一发、消除时间漂移）：过滑块那个仍是 `result=2`、没回弹到 `2001`，全新那个
 * 这三条照旧 `2001`。所以解风控的粒度是 `did`，不是接口、不是 IP，也不是「这张票据
 * 对这条路径有效」，且**至少持续约 9 小时**（上限没测到 —— 没观察到反弹）。
 *
 * **证据只到三条**：第四条 `live/byUser` 在全新 `did` 下**本来就回 `result=2`**、
 * 从没进过 `2001`（上午、晚上两轮都如此），所以它那个 `2` 另有成因，不能当作
 * 「风控已解除」的证据。早先记成「四条同时从 `2001` 变 `2`」是把它的基线读错了。
 *
 * 由此，**`2001 → 2` 是风控已解除的标志，不是票据被拒**。2026-09-27 把它记成「票据
 * 回填对这条无效 / 同一 did 此后一直坏」，两个归因都是错的，别照着排查：当时真正的
 * 缺口是只把票据塞进了 query，没带 `identity-verification-token` 请求头（配套的
 * `identity-verification-type` 见 `captcha.ts` 对 `type` 的注释）。而订正后的结论更省事 ——
 * 那一步根本不需要，拖完同一个 `did` 原样重发即可。
 *
 * 变成 `result=2` 之后仍然取不到数据，但那是另一道闸：限流冷却 + 要登录态
 * （见 `judge.ts` 对 `2` 的四种成因）。两轮实测里都没见过 `result=1`。
 *
 * `captchaToken` 参数保留：前端确实有回填通道，但只给白名单 4 条路径回填 ——
 * `ugH5App/photo/simple/info`、`user/profile`、`feed/profile`、`live/byUser`，
 * **`photo/info` 不在其中**（票据按路径分开存在 localStorage 的 `captcha-uri-token-map`）。
 * 留着它只为 query 形状与前端一致，不是过风控的必要条件。
 *
 * **只中转不绕过**：amagi 不含验证码识别与轨迹模拟，滑块必须由真人拖。
 */
export const videoWorkFull = defineKuaishouEndpoint({
  name: 'kuaishou.videoWorkFull',
  route: '/fetch_one_work_full',
  doc: {
    summary: '单个作品详细信息（完整版，当前稳定撞风控）',
    description: '日常取作品信息请用 `videoWork`；这条是唯一可能返回图集预渲染地址与同类推荐的通道。'
  },
  params: zod.object({
    photoId: zod.string().min(1, { error: 'photoId 不能为空' }).describe('作品 ID'),
    captchaToken: zod
      .string()
      .optional()
      .describe(
        '滑块票据，进 query 参与签名；不给即空串。**过风控不需要它**：人过一次滑块整个 did 就解，原样重发即可。留它只为 query 形状与前端一致'
      )
  }),
  sign: [hxfalcon()],
  prepare: kuaishouDidPrepare,
  build: (p) => {
    const req = kuaishouApiUrls.videoWorkFull(p)
    return {
      method: 'POST' as const,
      url: req.url,
      body: req.body,
      signPath: req.signPath,
      headers: kuaishouH5Headers(req.referer),
      dropHeaders: KUAISHOU_H5_DROP_HEADERS
    }
  },
  response: type<any>()
})
