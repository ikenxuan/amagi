/**
 * 登录流程用的轻量 CookieJar
 *
 * 登录过程会跨 `www.douyin.com` / `login.douyin.com` / `ttwid.bytedance.com` 三个域，
 * 且同一个 cookie 名会被多次下发（例如 `ttwid` 在换取可信指纹后会被替换、
 * `sessionid` 在二次验证通过后会被升级）。这里只做一件事：**按下发顺序覆盖同名 cookie**，
 * 保证最终拿到的永远是最后一次下发的值，同时正确处理服务端的删除指令。
 *
 * 不做域/路径隔离：整个登录流程都在抖音自己的域下，隔离反而会漏掉跨子域下发的凭证。
 *
 * 另外承载一小部分**本地会话状态**（见 `INTERNAL_PREFIX`）：passport 的几个接口对外是
 * 无状态的，会话全靠 cookie 串在调用之间传递，而 bd-ticket-guard 需要在多次调用之间
 * 记住自己生成的密钥与服务端签发的票据。这些条目以 `__amagi_` 开头，
 * `toString()` 不会把它们放进 Cookie 请求头，只有 `serialize()` 才会带上。
 */

/** 本地会话状态的 cookie 名前缀，这些条目永远不会发给服务端 */
export const INTERNAL_PREFIX = '__amagi_'

/** 是否为本地会话状态条目 */
const isInternal = (name: string): boolean => name.startsWith(INTERNAL_PREFIX)

/** 判断一条 Set-Cookie 是否表示「删除该 cookie」 */
const isDeletion = (value: string, attributes: string[]): boolean => {
  if (value === '') return true

  for (const attribute of attributes) {
    const [rawName, ...rest] = attribute.split('=')
    const name = rawName.trim().toLowerCase()
    const rawValue = rest.join('=').trim()

    if (name === 'max-age') {
      const maxAge = Number(rawValue)
      if (Number.isFinite(maxAge) && maxAge <= 0) return true
    }

    if (name === 'expires') {
      const expires = Date.parse(rawValue)
      if (Number.isFinite(expires) && expires <= Date.now()) return true
    }
  }

  return false
}

export class CookieJar {
  /** Map 保留插入顺序，重复 set 只更新值、不改变位置 */
  private readonly cookies = new Map<string, string>()

  /**
   * @param initial 初始 cookie 串，形如 `a=1; b=2`
   */
  constructor(initial?: string) {
    if (initial) this.merge(initial)
  }

  /** 当前持有的 cookie 数量 */
  get size(): number {
    return this.cookies.size
  }

  /**
   * 写入一条 cookie
   * @param name cookie 名
   * @param value cookie 值
   */
  set(name: string, value: string): this {
    this.cookies.set(name, value)
    return this
  }

  /**
   * 读取一条 cookie
   * @param name cookie 名
   */
  get(name: string): string | undefined {
    return this.cookies.get(name)
  }

  /**
   * 是否持有某条 cookie
   * @param name cookie 名
   */
  has(name: string): boolean {
    return this.cookies.has(name)
  }

  /**
   * 合并一段 `name=value; name=value` 形式的 cookie 串
   * @param cookieString cookie 串，空值直接忽略
   */
  merge(cookieString?: string | null): this {
    if (!cookieString) return this

    for (const pair of cookieString.split(';')) {
      const index = pair.indexOf('=')
      if (index <= 0) continue
      const name = pair.slice(0, index).trim()
      const value = pair.slice(index + 1).trim()
      if (name && value) this.cookies.set(name, value)
    }
    return this
  }

  /**
   * 应用响应的 Set-Cookie 头
   * @param setCookies 单条或多条 Set-Cookie 原始值
   */
  applySetCookie(setCookies?: string | string[] | null): this {
    if (!setCookies) return this

    for (const line of Array.isArray(setCookies) ? setCookies : [setCookies]) {
      const [pair, ...attributes] = line.split(';')
      const index = pair.indexOf('=')
      if (index <= 0) continue

      const name = pair.slice(0, index).trim()
      const value = pair.slice(index + 1).trim()
      if (!name) continue

      if (isDeletion(value, attributes)) {
        this.cookies.delete(name)
        continue
      }

      this.cookies.set(name, value)
    }
    return this
  }

  /**
   * 是否已经拿到登录态凭证（`ttwid` 是匿名设备指纹，不算登录）
   */
  isLoggedIn(): boolean {
    return this.has('sessionid') || this.has('sessionid_ss') || this.has('sid_guard')
  }

  /** 序列化为可直接放进 Cookie 请求头的字符串，不含本地会话状态 */
  toString(): string {
    return [...this.cookies]
      .filter(([name]) => !isInternal(name))
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }

  /**
   * 序列化为在两次调用之间传递的会话串，包含本地会话状态
   *
   * 登录流程内部用这个；最终落库的登录凭证用 `toString()`，避免把本地密钥写进配置。
   */
  serialize(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  /** 导出为普通对象，便于断言与日志 */
  toJSON(): Record<string, string> {
    return Object.fromEntries(this.cookies)
  }
}
