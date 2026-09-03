import { randomBytes } from 'node:crypto'

/**
 * 快手设备标识（did）。
 *
 * ## 为什么要新增这一层概念
 *
 * amagi 此前**没有 did 这个概念**：全仓 `src/` 搜不到快手 did 的任何处理 ——
 * 既不从 cookie 里解析，也不自己生成。cookie 对 amagi 是一整串黑盒：用户配了
 * 就整串塞进 Cookie 头，没配就连 Cookie 头都不发。H5 命名空间
 * （`c.kuaishou.com` + `/rest/wd/*`）反过来 —— 它从不需要整串 cookie，
 * 只需要一个自己造的设备号，Cookie 头由 amagi 自己拼。
 *
 * ## did 是「零配置可用」的关键
 *
 * H5 接口是给微信分享页用的，设计上就免鉴权：一个本地生成的 `web_<32 位 hex>`
 * 就足够取数，**没有账号、没有登录态、没有 token**。
 * did 是**纯本地生成的，不发任何请求** —— 这是它与小红书
 * `sign/guestCookie.ts` 的根本差异（那边要先打 scripting / webprofile /
 * activate 三个会话请求才能换到游客身份）。
 *
 * ## did 只进 Cookie 头
 *
 * did **不进 query、不进签名**。快手签名 `__NS_hxfalcon` 的输入是
 * url + query + body 三段拼接（见 `sign/helpers.ts` 的
 * `buildKuaishouHxfalconSignInput`），**cookie 从不是签名输入**。
 * 所以换 did 不会让签名失效，签名也不会因为缺 did 而算错，两者互不影响。
 *
 * ## did 不暴露成配置项
 *
 * did 由 amagi 内部生成，不进 `ClientOptions`。代价是明确的：
 * `searchFeed` / `searchUser` / `feedHot` 这三个接口要「浏览器激活过的真实
 * did」，因此**本次不实现**。快手服务端存着一份「这个 did 激活过没有」的
 * 设备指纹账本，真实 did 得先在浏览器里走 `gdfp.gifshow.com/s/w/c` 完成注册
 * （Node 侧裸打那个端点只会返回 `result=-4 SERVER_ERR`），**本地造不出来**。
 * 已实测排除：随机 did + 借来的完整风控指纹、服务端 `Set-Cookie` 刚下发的新
 * did、新 did 先走 `system/startup` 预热 —— 全部 `result=2` 拒。
 * 门槛在 did 本身，与签名、风控头、验证票据都无关：
 * 这条**绕不过去，别再试**。
 *
 * ## 来源署名
 *
 * 这个形状来自 @OduckO 的 kuaishou-parser（GPL-3.0-only，
 * https://github.com/OduckO）的 `src/platform/kuaishou/did.ts`；
 * 上面 5 种组合的实测矩阵记在其 `TODO.md:167-181`。
 * 「每实例一份状态 + 惰性创建」的写法照
 * `platforms/xiaohongshu/sign/guestCookie.ts`。
 */

/** did 随机段的字节数：16 字节 → 32 位十六进制 */
const KUAISHOU_DID_RANDOM_BYTES = 16

/** did 的合法形状：`web_` 前缀 + 32 位**小写**十六进制 */
const KUAISHOU_DID_PATTERN = /^web_[0-9a-f]{32}$/

/**
 * 生成一个随机 did。
 *
 * 形状与浏览器里的真实 did 一致：`web_` + 16 字节随机数的小写十六进制
 * （即 `web_` 后跟 32 位 hex）。形状一致但**不等于「激活过」** ——
 * 见模块注释「did 不暴露成配置项」一节。
 *
 * @returns 形如 `web_36aba77ad01b71bdfc98c0e250ec166b` 的 did
 */
export const randomKuaishouDid = (): string => `web_${randomBytes(KUAISHOU_DID_RANDOM_BYTES).toString('hex')}`

/**
 * 校验 did 的形状。
 *
 * 只看形状对不对，判断不了「是否在浏览器里激活过」—— 那个只有快手服务端知道。
 *
 * 比对照项目的 `isValidDid`（`/^web_[0-9a-f]{16,40}$/i`，允许大写、长度 16~40）
 * **更严**：那边要接用户从浏览器粘过来的值，所以放宽；amagi 的 did 是自己生成的，
 * 只需要认自己这一种形状，宽松反而会让写坏的值蒙混过关。
 *
 * @param did - 待校验的 did
 * @returns 是否是 `web_` + 32 位小写 hex
 */
export const isValidKuaishouDid = (did: string): boolean => KUAISHOU_DID_PATTERN.test(did)

/**
 * 快手 did 的持有者。
 *
 * 生命周期与 `KuaishouSignState` 同款：**一份状态一个 did、取多少次都是同一个**
 * （模拟浏览器侧「同一台设备复用同一个设备号」），两份状态的 did 互不相同。
 */
export type KuaishouDidState = {
  /** 取当前状态的 did：首次调用惰性生成，之后返回同一个值 */
  getDid: () => string
}

/**
 * 创建一份独立的快手 did 状态。
 *
 * 形状照 `platforms/xiaohongshu/sign/guestCookie.ts`：状态是工厂调用内的局部
 * 变量、由闭包持有（不是模块级 `let`），并且**惰性创建** —— 已有值就直接复用，
 * 没有才生成。差异只在「拿到值的方式」：小红书那边要打三个会话请求换游客身份，
 * 快手的 did 是本地 `randomBytes` 造的，不发任何请求，所以这里没有 async。
 *
 * @returns 新的 did 状态（此刻还没生成 did，首次 `getDid()` 才生成）
 */
export const createKuaishouDidState = (): KuaishouDidState => {
  let did = ''

  return {
    getDid: () => {
      if (!did) {
        did = randomKuaishouDid()
      }
      return did
    }
  }
}

/**
 * 拼装快手 H5 请求的 Cookie 头。
 *
 * 形状 `did=<did>; didv=<Date.now()>`，用户配了 `cookies.kuaishou` 就以 `; `
 * 追加在后面。对照项目 `src/model/request.ts:274` 是同一形状（只是它那条追加
 * 分支没人用），一处收紧：那边 `options.cookie ? ...` 只判 truthy，纯空白的
 * cookie 会拼出一段空值；这里先 trim，**空串或纯空白都不追加**，
 * 因此不会出现尾随的 `; `。
 *
 * @param did - 设备标识，通常来自 {@link KuaishouDidState.getDid}
 * @param userCookie - 调用方配置的原始 cookie，可空
 * @returns 可直接写入 HTTP `Cookie` 请求头的字符串
 */
export const buildKuaishouDidCookie = (did: string, userCookie?: string): string => {
  const parts = [`did=${did}`, `didv=${Date.now()}`]
  const trimmedUserCookie = userCookie?.trim()

  if (trimmedUserCookie) {
    parts.push(trimmedUserCookie)
  }

  return parts.join('; ')
}

/**
 * H5 端点共用的那一份 did 状态。
 *
 * **是进程级的，不是每 client 一份** —— 端点定义（`defineEndpoint` 的产物）本身
 * 就是模块级单例，`prepare` 从端点上取状态，取到的必然是同一份。这里如实写出来，
 * 不重复 `bilibili/sign/signers.ts` 那个「注释说随实例、实现是模块级」的错。
 *
 * 对 did 来说进程级恰好是**对的**：它不携带任何账号身份（不是 token、不是登录态），
 * 而「同一个进程每次请求都换一个设备号」比「一个进程一台设备」更不像真实客户端。
 * 要按 client 隔离得把状态搬到 `ClientCtx` 上，本次不做 —— did 不暴露成配置项，
 * 隔离它没有可观察的收益。
 */
export const kuaishouDidState = createKuaishouDidState()

/**
 * H5 端点的 `prepare`：把 did 写进本次调用的 cookie。
 *
 * 为什么走 `prepare` 而不是在 build 里塞 Cookie 头：cookie 在 amagi 里是**执行期
 * 身份**（`ctx.cookie` + execute 的 `attachCookie` 管理），基线与 build 的 headers
 * 都不该碰它 —— `client/runtime.ts` 甚至会主动 `delete('cookie')`。`prepare` 返回
 * `{ cookie }` 覆盖 ctx 是小红书换游客 cookie 用的同一条路，形状一致。
 *
 * 这也是「零配置可用」的落点：用户什么都不配时，Cookie 头里只有一个自己造的设备号，
 * 没有账号、没有登录态、没有 token；用户配了 `cookies.kuaishou` 就追加在后面。
 * @param ctx - 端点上下文（只读 `cookie`）
 * @returns 覆盖进 ctx 的片段
 */
export const kuaishouDidPrepare = async (ctx: { cookie: string }): Promise<{ cookie: string }> => ({
  cookie: buildKuaishouDidCookie(kuaishouDidState.getDid(), ctx.cookie)
})
