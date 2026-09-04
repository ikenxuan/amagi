/**
 * `checkRequest` —— 三道闸（`Host` / `Origin` / `Content-Type`）加口令。
 *
 * 这一层原先长在 `createServer` 的回调里、**一条测试都没有**，而它决定的是
 * 「哪些请求能拿本机 cookie 发出去、能往 `corpus/` 与 `packages/response-types/` 写文件」。
 * 抽成纯函数照 `outcome.ts` 那条既有做法（PRD 待决 #9：`server/` 的纯逻辑抽出来测、
 * HTTP 路由层不测）—— 于是这些用例不起服务、不发请求、不 mock 任何全局。
 *
 * 里面有两条是**修 bug 时补的回归用例**，各自钉住一个旧实现会做错的判断：
 * 「本机另一个端口的免预检写请求」与「绑局域网后从另一台机器发的写请求」。
 */

import { describe, expect, it } from 'vitest'

import { checkRequest, type GuardConfig, type GuardInput, hostnameOf, isLoopbackBind } from '../server/guard'

/** 回环模式的常态：没有口令 */
const LOOPBACK: GuardConfig = { bindHost: '127.0.0.1', token: undefined }

/** README 里那条绑局域网的命令：`--host 0.0.0.0 --token …` */
const LAN: GuardConfig = { bindHost: '0.0.0.0', token: 'hunter2hunter2' }

const post = (overrides: Partial<GuardInput> = {}): GuardInput => ({
  method: 'POST',
  host: '127.0.0.1:7345',
  origin: 'http://localhost:5173',
  contentType: 'application/json',
  queryToken: null,
  headerToken: undefined,
  ...overrides
})

const statusOf = (verdict: ReturnType<typeof checkRequest>): number | 'ok' => (verdict.ok ? 'ok' : verdict.status)

describe('小工具', () => {
  it('`Host` 去端口，IPv6 保住方括号；左括号没配对时回空串（判不出来就该拒）', () => {
    expect(hostnameOf('127.0.0.1:7345')).toBe('127.0.0.1')
    expect(hostnameOf('localhost')).toBe('localhost')
    expect(hostnameOf('[::1]:7345')).toBe('[::1]')
    expect(hostnameOf('')).toBe('')
    expect(hostnameOf('[evil')).toBe('')
    // `]` 后面跟着别的东西也判不出来 —— 不能切成 `[::1]` 当回环放过去
    expect(hostnameOf('[::1]evil.com:7345')).toBe('')
    expect(hostnameOf('[::1]')).toBe('[::1]')
  })

  it('只有这三个值算回环 —— 启动检查与 `Host` 闸共用它', () => {
    expect(isLoopbackBind('127.0.0.1')).toBe(true)
    expect(isLoopbackBind('localhost')).toBe(true)
    expect(isLoopbackBind('::1')).toBe(true)
    // `0.0.0.0` 是「所有网卡」，最不该被当成回环的那一个
    expect(isLoopbackBind('0.0.0.0')).toBe(false)
    expect(isLoopbackBind('192.168.1.9')).toBe(false)
  })
})

describe('闸一：Host（DNS rebinding）', () => {
  it('回环 Host 放过，三种写法都认，大小写不敏感', () => {
    for (const value of ['127.0.0.1:7345', 'localhost:7345', '[::1]:7345', 'LOCALHOST:7345']) {
      expect(statusOf(checkRequest(post({ host: value }), LOOPBACK))).toBe('ok')
    }
  })

  it('别的域名一律 403 —— 攻击者把自己的域名解析到 127.0.0.1 就是这一形', () => {
    const verdict = checkRequest(post({ host: 'corpus.evil.example:7345' }), LOOPBACK)
    expect(statusOf(verdict)).toBe(403)
    expect(verdict.ok ? '' : verdict.message).toContain('DNS rebinding')
  })

  it('**Host 缺失或读不出来时拒，不是跳过** —— 安全闸在输入畸形时该 fail closed', () => {
    for (const value of [undefined, '', ':7345', '[evil']) {
      expect(statusOf(checkRequest(post({ host: value }), LOOPBACK))).toBe(403)
    }
  })

  it('**绑局域网时这道闸仍然开着**，只放 IP 字面量与回环名', () => {
    const token = LAN.token!
    // 合法：从另一台机器按 IP 访问
    expect(statusOf(checkRequest(post({ host: '192.168.1.9:7345', queryToken: token }), LAN))).toBe('ok')
    expect(statusOf(checkRequest(post({ host: '[fe80::1]:7345', queryToken: token }), LAN))).toBe('ok')
    expect(statusOf(checkRequest(post({ host: '127.0.0.1:7345', queryToken: token }), LAN))).toBe('ok')
  })

  it('**rebinding 在绑局域网时也拦得住** —— 这是早先那版真开的洞', () => {
    // 旧实现：闸一在非回环绑定时整个跳过、闸二又因为有口令而让路，于是只剩一个 8 位口令；
    // 而 rebinding 之后攻击者页面与服务同源、**读得到响应**，可以逐个试
    const verdict = checkRequest(post({ host: 'evil.example:7345', origin: 'http://evil.example:7345', queryToken: LAN.token! }), LAN)
    expect(statusOf(verdict)).toBe(403)
    expect(verdict.ok ? '' : verdict.message).toContain('IP 字面量')
  })
})

describe('闸二：Origin（跨站写）', () => {
  it('跨站 POST 403', () => {
    const verdict = checkRequest(post({ origin: 'https://evil.example.com' }), LOOPBACK)
    expect(statusOf(verdict)).toBe(403)
    expect(verdict.ok ? '' : verdict.message).toContain('不接受跨站的写请求')
  })

  it('无 Origin 放过 —— 那是 curl 与本机脚本，浏览器发跨站请求时一定带它', () => {
    expect(statusOf(checkRequest(post({ origin: undefined }), LOOPBACK))).toBe('ok')
    expect(statusOf(checkRequest(post({ origin: '' }), LOOPBACK))).toBe('ok')
  })

  it('`Origin: null`（沙箱 iframe / file://）算跨站，403', () => {
    expect(statusOf(checkRequest(post({ origin: 'null' }), LOOPBACK))).toBe(403)
  })

  it('GET 不受这道闸管（读接口不写任何东西）', () => {
    expect(statusOf(checkRequest(post({ method: 'GET', origin: 'https://evil.example.com', contentType: undefined }), LOOPBACK))).toBe(
      'ok'
    )
  })

  it('**有口令时这道闸让路** —— 口令不是 cookie，浏览器不会替攻击者页面带上它', () => {
    // 这条是修掉的第二个 bug：旧实现里 Origin 白名单硬编码成回环名、且无条件生效，
    // 于是按 README 那条 `--host 0.0.0.0 --token …` 起服务、从另一台机器打开界面时，
    // 每个写请求都 403（Vite 的 `changeOrigin` 只改 Host，不改 Origin）
    const verdict = checkRequest(post({ host: '192.168.1.9:7345', origin: 'http://192.168.1.9:5173', queryToken: LAN.token! }), LAN)
    expect(statusOf(verdict)).toBe('ok')
  })
})

describe('闸三：Content-Type（免预检的跨站写）', () => {
  it('**本机另一个端口发的 text/plain 写请求要被拦住** —— 这是 Origin 闸漏掉的那一类', () => {
    // Origin 只比主机名、比不了端口（合法前端在 Vite 的 5173，本来就与 API 端口不同源），
    // 所以本机任何一个 `http://localhost:<别的端口>` 的页面都能过 Origin 那道闸。
    // 而 `text/plain` 是 CORS 安全列表值 —— 不触发预检，请求真的会打出去
    const verdict = checkRequest(post({ origin: 'http://localhost:9999', contentType: 'text/plain' }), LOOPBACK)
    expect(statusOf(verdict)).toBe(415)
    expect(verdict.ok ? '' : verdict.message).toContain('不触发预检')
  })

  it('表单那三种 Content-Type 都拦（这里测的是**无 Origin** 那条路，比如本机脚本）', () => {
    for (const value of ['application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'text/plain;charset=UTF-8']) {
      expect(statusOf(checkRequest(post({ origin: undefined, contentType: value }), LOOPBACK))).toBe(415)
    }
  })

  it('真的 `<form>` 跨站 POST 在闸二就被拦下，到不了这里 —— 它一定带 Origin', () => {
    // 这条与上面那条是两件事。原先只有上面那条、标题却写着「跨站」，
    // 而它传的是 `origin: undefined` —— 断言的是一条真实浏览器走不到的路径
    const verdict = checkRequest(
      post({ origin: 'https://evil.example', contentType: 'application/x-www-form-urlencoded' }),
      LOOPBACK
    )
    expect(statusOf(verdict)).toBe(403)
  })

  it('没有 Content-Type 头也拦', () => {
    const verdict = checkRequest(post({ contentType: undefined }), LOOPBACK)
    expect(statusOf(verdict)).toBe(415)
    expect(verdict.ok ? '' : verdict.message).toContain('没有这个头')
  })

  it('带参数与大小写都认 —— 前端发的就是带 charset 的那种', () => {
    for (const value of ['application/json', 'application/json; charset=utf-8', 'Application/JSON']) {
      expect(statusOf(checkRequest(post({ contentType: value }), LOOPBACK))).toBe('ok')
    }
  })

  it('有口令也照样要求 JSON —— 口令万一泄漏时这一条还在', () => {
    const verdict = checkRequest(post({ host: '192.168.1.9:7345', contentType: 'text/plain', queryToken: LAN.token! }), LAN)
    expect(statusOf(verdict)).toBe(415)
  })
})

describe('口令', () => {
  /** 绑局域网时的合法 Host（闸一只放 IP 字面量与回环名，所以这里不能用随手编的名字） */
  const LAN_HOST = '192.168.1.9:7345'

  it('回环模式没有口令，不打扰人', () => {
    expect(statusOf(checkRequest(post(), LOOPBACK))).toBe('ok')
  })

  it('query 与 `x-amagi-token` 头都收', () => {
    expect(statusOf(checkRequest(post({ host: LAN_HOST, queryToken: LAN.token! }), LAN))).toBe('ok')
    expect(statusOf(checkRequest(post({ host: LAN_HOST, headerToken: LAN.token! }), LAN))).toBe('ok')
  })

  it('不对 / 没给都是 401', () => {
    expect(statusOf(checkRequest(post({ host: LAN_HOST, queryToken: 'nope' }), LAN))).toBe(401)
    expect(statusOf(checkRequest(post({ host: LAN_HOST }), LAN))).toBe(401)
    // 重复头在这个服务里会被 Node 折成**逗号拼接的字符串**（只有 set-cookie 折成数组），
    // 所以走的是 `'tok, nope' !== tok` 这一支。数组那一支到不了，写在这里只为类型完整
    expect(statusOf(checkRequest(post({ host: LAN_HOST, headerToken: `${LAN.token!}, nope` }), LAN))).toBe(401)
  })

  it('读接口也验口令 —— 端点清单本身不敏感，但它是那台机器上有什么的地图', () => {
    expect(statusOf(checkRequest(post({ method: 'GET', host: LAN_HOST, contentType: undefined }), LAN))).toBe(401)
  })
})
