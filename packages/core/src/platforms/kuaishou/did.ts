import { randomBytes } from 'node:crypto'

/**
 * 快手设备标识（did）。
 *
 * ## did 由 amagi 内部生成
 *
 * cookie 对 amagi 是一整串黑盒：用户配了就整串塞进 Cookie 头，没配就连 Cookie 头
 * 都不发。H5 命名空间（`c.kuaishou.com` + `/rest/wd/*`）反过来 —— 它从不需要整串
 * cookie，只需要一个自己造的设备号，Cookie 头由 amagi 自己拼。did 由此成为 amagi
 * 内部生成、不进 `ClientOptions` 的一层。
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
 * ## PC 游客凭据
 *
 * 本地 did 的形状正确不代表已完成 PC 设备注册，单独使用不能保证 PC 搜索可用。
 * 官网首页下发 did 后，由页面 SDK 请求 `gdfp.gifshow.com/s/w/c` 并写入
 * `kwfv1` / `kwssectoken` / `kwscode`。2026-10-01 隔离游客实测注册后两条搜索成功，
 * 当前账号资料仍返回未登录的 `109`。
 *
 * 已有 cookie 不在此替换，H5 的本地 did 行为保持不变。
 *
 * 同命名空间的 `commentReplies` 门槛低一档：带上 PC 上下文常量、保持同一个 did，
 * 请求层只挑战第一发（见 {@link kuaishouPcPrepare}）。
 *
 * ## 写法
 *
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
 * 见模块注释「PC 游客凭据」一节。
 *
 * @returns 形如 `web_36aba77ad01b71bdfc98c0e250ec166b` 的 did
 */
export const randomKuaishouDid = (): string => `web_${randomBytes(KUAISHOU_DID_RANDOM_BYTES).toString('hex')}`

/**
 * 校验 did 的形状。
 *
 * 只看形状对不对，判断不了「是否在浏览器里激活过」—— 那个只有快手服务端知道。
 *
 * 只接受 `web_` + 32 位小写 hex 这一种形状：amagi 的 did 是自己生成的，只需要认
 * 自己这一种，放宽反而会让写坏的值蒙混过关。
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
  /**
   * 丢掉当前 did，下次 {@link KuaishouDidState.getDid} 现造一个新的。
   *
   * did 不带账号身份，所以换掉它没有任何要还原的状态 —— 代价只是「这台设备」在
   * 服务端眼里变成了另一台。用途是**风控层面的换号**：H5 那几条被按 did 限流 /
   * 标记之后，同进程会一直复用那个已经脏了的值，除了重启进程没有别的出路。
   *
   * PC GraphQL 那边慎用：它是「同一个 did 挑战一次之后放行」，换号等于把预热丢掉，
   * 下一发重新吃一次 captcha（见 {@link kuaishouPcPrepare}）。
   */
  rotate: () => void
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
    },
    rotate: () => {
      did = ''
    }
  }
}

/**
 * 拼装快手 H5 请求的 Cookie 头。
 *
 * 形状 `did=<did>; didv=<Date.now()>`，用户配了 `cookies.kuaishou` 就以 `; `
 * 追加在后面。两条约束：
 *
 * 1. 用户 cookie 为**空串或纯空白都不追加**，因此不会出现尾随的 `; `。
 * 2. **用户 cookie 里已有的 `did` / `didv` 不再重复发** —— 同名 cookie 出现两次
 *    时服务端取前者，用户的真实 `did` 比自造的随机值更可信，所以用户给了就让位，
 *    一个都不补。
 *
 * @param did - 设备标识，通常来自 {@link KuaishouDidState.getDid}
 * @param userCookie - 调用方配置的原始 cookie，可空
 * @returns 可直接写入 HTTP `Cookie` 请求头的字符串
 */
export const buildKuaishouDidCookie = (did: string, userCookie?: string): string => {
  const trimmedUserCookie = userCookie?.trim()
  const userKeys = new Set(
    (trimmedUserCookie ?? '')
      .split(';')
      .map((pair) => pair.split('=')[0]?.trim().toLowerCase())
      .filter((name): name is string => name !== undefined && name !== '')
  )

  const parts: string[] = []
  if (!userKeys.has('did')) parts.push(`did=${did}`)
  if (!userKeys.has('didv')) parts.push(`didv=${Date.now()}`)
  if (trimmedUserCookie) parts.push(trimmedUserCookie)

  return parts.join('; ')
}

/**
 * H5 端点共用的那一份 did 状态。
 *
 * **是进程级的，不是每 client 一份** —— 端点定义（`defineEndpoint` 的产物）本身
 * 就是模块级单例，`prepare` 从端点上取状态，取到的必然是同一份。
 *
 * 对 did 来说进程级恰好是**对的**：它不携带任何账号身份（不是 token、不是登录态），
 * 而「同一个进程每次请求都换一个设备号」比「一个进程一台设备」更不像真实客户端。
 */
export const kuaishouDidState = createKuaishouDidState()

/**
 * H5 端点的 `prepare`：把 did 写进本次调用的 cookie。
 *
 * did 走 `prepare` 而不放进 build 的 headers：cookie 在 amagi 里是**执行期
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

/**
 * PC 站的四个上下文常量 cookie。
 *
 * 值都是前端硬编码的（首屏响应的 `Set-Cookie` 里能直接看到），不是密钥、不带身份。
 *
 * **为什么非带不可**：2026-09-27 实测，PC GraphQL 对「带着 `did` 却不带这几个常量」的
 * 请求一律回 `errors: ["Need captcha"]`，连打四次都是。补上它们、并且**保持同一个 did**
 * 之后，只有第一发被挑战，第二发起就放行：
 *
 * ```text
 * 新 did + 常量，did 固定 : captcha -> ok -> ok -> ok
 * 新 did + 无常量，did 固定 : captcha -> captcha -> captcha -> captcha
 * 每发都换新 did + 常量     : captcha -> captcha -> captcha -> captcha
 * ```
 *
 * 所以这一组与 {@link kuaishouDidState} 的「进程级稳定 did」是配套的：换 did 等于把
 * 预热成果丢掉。首发那次挑战由端点的 `retryOn: ['CAPTCHA_REQUIRED']` 吸收。
 *
 * **只给 PC GraphQL 用，不能给 H5。** H5 那套是分享页语境（`kpn` 走 `NEBULA`、移动 UA），
 * 塞 `kpf=PC_WEB` 进去是自相矛盾的。所以 H5 继续用 {@link kuaishouDidPrepare}。
 */
const KUAISHOU_PC_CONTEXT_COOKIE = 'kpf=PC_WEB; clientid=3; kpn=KUAISHOU_VISION; kwpsecproductname=kuaishou-vision'

/**
 * PC GraphQL 端点的 `prepare`：did + PC 上下文常量。
 *
 * 与 {@link kuaishouDidPrepare} 的唯一差别是多带
 * {@link KUAISHOU_PC_CONTEXT_COOKIE}，理由见那份 JSDoc。调用方自己传的同名 cookie
 * 依旧优先（`buildKuaishouDidCookie` 让位那一段），所以配了浏览器真实 did 的照旧生效。
 * @param ctx - 端点上下文（只读 `cookie`）
 * @returns 覆盖进 ctx 的片段
 */
export const kuaishouPcPrepare = async (ctx: { cookie: string }): Promise<{ cookie: string }> => {
  const withDid = buildKuaishouDidCookie(kuaishouDidState.getDid(), ctx.cookie)
  // 常量垫在最后：用户 cookie 里若已有同名键，前面那份先出现、以它为准
  return { cookie: `${withDid}; ${KUAISHOU_PC_CONTEXT_COOKIE}` }
}
