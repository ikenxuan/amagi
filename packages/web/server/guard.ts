/**
 * 请求准入判定。**三道闸 + 口令，全在这一个纯函数里。**
 *
 * 抽出来的理由与 `outcome.ts` 一样（PRD 待决 #9）：`server/` 的纯逻辑要能测，
 * HTTP 路由层不测。而这一段是整个包里最不该没有测试的地方 —— 它决定
 * 「哪些请求能拿本机 cookie 发出去、能往 `corpus/` 与 `packages/response-types/` 写文件」。
 *
 * 三道闸各自拦什么，以及为什么单独一道都不够：
 *
 * 1. **`Host`** —— 拦 DNS rebinding，**这道闸永远开着**。任何网页都能把自己控制的域名解析到
 *    `127.0.0.1`（或你的局域网地址），浏览器认为同源，而请求真的打到本机这个服务上。
 *    回环绑定时只认回环 `Host`；绑局域网时只认**回环名或 IP 字面量** ——
 *    rebinding 必须经过一个**域名**（攻击者控制的是 DNS，不是别人的 IP），
 *    而合法用户访问局域网上的服务用的就是 IP。所以「只认 IP 字面量」这一条恰好把两者分开。
 *    另外正常两进程跑法里浏览器根本不直连 API：Vite 代理过来的 `Host` 是代理目标
 *    （`127.0.0.1:7345`），本来就是回环。
 * 2. **`Origin`** —— 拦跨站写。它**只在没有口令时才是必需的**：口令不是 cookie，
 *    浏览器不会替攻击者页面带上它，所以有口令时那道更强的闸已经在了。
 *    这一条同时修掉一个真 bug：原先 `Origin` 闸无条件生效、白名单又硬编码成回环名，
 *    于是按 README 那条 `--host 0.0.0.0 --token …` 起服务、从另一台机器打开界面时，
 *    每个写请求都 403（Vite 的 `changeOrigin` 只改 `Host`，不改 `Origin`）。
 *    **绑局域网时挡 rebinding 的是第 1 条，不是这一条** —— 早先那版让这一条在有口令时让路、
 *    同时又让第 1 条在非回环绑定时整个跳过，两个一起让路就只剩一个 8 位口令，
 *    而 rebinding 之后攻击者页面与服务同源、**读得到响应**，可以逐个试。那是个真洞。
 * 3. **`Content-Type: application/json`** —— 拦**免预检**的跨站写。这一条原先只写在注释里
 *    没有实现，而它恰好是 `Origin` 闸漏掉的那一类：`Origin` 只比主机名、比不了端口
 *    （也不该比 —— 合法前端在 Vite 的 5173，本来就与 API 端口不同源），
 *    于是本机任何一个 `http://localhost:<别的端口>` 的页面都能发
 *    `content-type: text/plain` 的 `POST`（CORS 安全列表值，**不触发预检**），
 *    主机名是 `localhost` 所以放行。要求 `application/json` 之后，跨源请求必须先预检，
 *    而这个服务从不回 CORS 头，浏览器自己就把它拦了。
 *
 * **端口刻意不比**：合法前端与 API 天生不同端口，比端口要把 Vite 的端口一路传进来，
 * 而那个洞由第 3 条堵，比再引一处配置更可靠。
 */

/** 回环主机名。IPv6 两种写法都收 —— `Host` 头带方括号，`new URL().hostname` 也带 */
export const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])

/**
 * `--host` 是不是回环。**只有这一处定义** —— 原先启动检查与 `Host` 闸各写了一份
 * 一模一样的三项比较，两处哪天不一致就是一个安全洞（一边认为不用口令、一边认为不用查 Host）。
 */
export const isLoopbackBind = (bindHost: string): boolean => bindHost === '127.0.0.1' || bindHost === 'localhost' || bindHost === '::1'

/** `Host` 头去掉端口。IPv6 的 `[::1]:7345` 要保住方括号那一段 */
export const hostnameOf = (value: string): string => {
  if (value.startsWith('[')) {
    const close = value.indexOf(']')
    // `[evil`（有左括号没右括号）不是合法写法 —— 回空串让调用方拒掉，别猜
    if (close < 0) return ''
    // `]` 后面只允许是空串或 `:port`。少了这一条，`[::1]evil.com:7345` 会被切成 `[::1]`
    // 然后当回环放过去 —— 那正是这道闸声称拦住的东西（判不出来就该拒，别猜）
    const rest = value.slice(close + 1)
    if (rest !== '' && !rest.startsWith(':')) return ''
    return value.slice(0, close + 1)
  }
  const colon = value.lastIndexOf(':')
  return colon < 0 ? value : value.slice(0, colon)
}

/**
 * 这个主机名是不是 IP 字面量（v4 点分十进制，或方括号包起来的 v6）。
 *
 * **它是绑局域网时挡 DNS rebinding 的判据。** rebinding 必须经过一个域名 ——
 * 攻击者能控制的是自己域名的 DNS 记录，不是别人的 IP；而合法用户访问局域网上的服务
 * 用的就是 IP（`http://192.168.1.9:5173`）。所以「只认 IP 字面量」正好把两者分开。
 * 代价是用 mDNS 名（`mymac.local`）或自建 hosts 别名访问会被拒 —— 报错里说清换 IP。
 */
const isIpLiteral = (hostname: string): boolean =>
  /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || (hostname.startsWith('[') && hostname.endsWith(']') && hostname.length > 2)

/** `application/json; charset=utf-8` → `application/json` */
const mediaTypeOf = (value: string): string => (value.split(';')[0] ?? '').trim().toLowerCase()

export interface GuardInput {
  /** HTTP 方法。判「是不是写请求」只看它是不是 `POST` —— 这个服务没有别的写方法 */
  method: string | undefined
  /** `Host` 头原样（可能带端口） */
  host: string | undefined
  /** `Origin` 头。浏览器发跨站请求时一定带，curl 与本机脚本不带 */
  origin: string | undefined
  contentType: string | undefined
  /** query 里的 `token`，没有给 `null`（`URLSearchParams.get` 的原样返回值） */
  queryToken: string | null
  /**
   * `x-amagi-token` 头原样。
   *
   * 类型带 `string[]` 只是照 Node 的类型声明，**这个服务里走不到那一支** ——
   * Node 只把 `set-cookie` 折成数组，别的重复头折成逗号拼接的字符串
   * （两个 `X-Amagi-Token: tok` / `nope` 会变成 `'tok, nope'`，那当然对不上口令）。
   */
  headerToken: string | string[] | undefined
}

export interface GuardConfig {
  /** `--host` 的值 */
  bindHost: string
  /** `--token` 的值。回环模式下通常没有 */
  token: string | undefined
}

export type GuardVerdict = { ok: true } | { ok: false; status: number; message: string }

/** 只有 JSON 才是这个服务的写请求正文格式 */
const REQUIRED_MEDIA_TYPE = 'application/json'

export const checkRequest = (input: GuardInput, config: GuardConfig): GuardVerdict => {
  // ① Host：**永远开着，而且判不出来就拒**（fail closed）。
  // 早先那版在非回环绑定时把这道闸整个跳过、又让 ② 在有口令时让路，两个一起让路的结果是
  // rebinding 只剩一个 8 位口令挡着 —— 而 rebinding 之后攻击者页面与服务同源、读得到响应，
  // 可以逐个试。现在绑局域网时它仍然开着，只是白名单放宽到「IP 字面量」（见 `isIpLiteral`）
  const hostname = hostnameOf(input.host ?? '').toLowerCase()
  const hostAllowed = LOOPBACK_HOSTNAMES.has(hostname) || (!isLoopbackBind(config.bindHost) && isIpLiteral(hostname))
  if (!hostAllowed) {
    return {
      ok: false,
      status: 403,
      message: isLoopbackBind(config.bindHost)
        ? `Host 是 ${hostname === '' ? '（缺失或读不出来）' : hostname}，回环模式下只认回环地址 —— 这道闸拦的是 DNS rebinding`
        : `Host 是 ${hostname === '' ? '（缺失或读不出来）' : hostname}，绑局域网时只认 IP 字面量或回环名 —— 这道闸拦的是 DNS rebinding。用地址而不是域名访问`
    }
  }

  if ((input.method ?? '').toUpperCase() === 'POST') {
    // ② Origin：只在没有口令时把关。有口令时浏览器替攻击者页面带不上它，那道闸更强
    const origin = input.origin
    if (config.token === undefined && typeof origin === 'string' && origin !== '') {
      let originHost: string
      try {
        originHost = new URL(origin).hostname
      } catch {
        // `Origin: null`（沙箱 iframe、`file://`）走这里 —— 一律拒
        originHost = ''
      }
      if (originHost === '' || !(LOOPBACK_HOSTNAMES.has(originHost) || LOOPBACK_HOSTNAMES.has(`[${originHost}]`))) {
        return {
          ok: false,
          status: 403,
          message: `Origin 是 ${origin}，不接受跨站的写请求 —— 这些接口能拿本机 cookie 发请求、能往仓库里写文件`
        }
      }
    }

    // ③ Content-Type：拦免预检的跨站写。见文件头第 3 条
    const mediaType = mediaTypeOf(input.contentType ?? '')
    if (mediaType !== REQUIRED_MEDIA_TYPE) {
      return {
        ok: false,
        status: 415,
        message:
          `写接口只收 \`content-type: ${REQUIRED_MEDIA_TYPE}\`，收到的是 ${mediaType === '' ? '（没有这个头）' : mediaType}。` +
          '这不是洁癖：别的类型属于 CORS 安全列表值，跨源发过来不触发预检，等于绕开同源限制'
      }
    }
  }

  // ④ 口令：给了就每个请求都验（绑局域网时才有，回环下不打扰人）
  if (config.token !== undefined && input.queryToken !== config.token && input.headerToken !== config.token) {
    return { ok: false, status: 401, message: '口令不对' }
  }

  return { ok: true }
}
