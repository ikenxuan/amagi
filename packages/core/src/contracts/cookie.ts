/**
 * Cookie 契约。
 *
 * **全仓唯一的 cookie 解析与序列化实现。** v6 里这件事至少有三处各写一遍：
 * 小红书 `extractA1FromCookie` 用 `/a1=([^;]+)/` 匹配（键名两侧都没有边界，
 * 于是 `'xa1=WRONG; a1=RIGHT'` 取到 `'WRONG'`，`'xa1=nope'` 也能"取到"值
 * —— 而小红书的 `x-s` / `x-s-common` 全部依赖 a1，取错值等于签名必然失败，
 * 表现却只是接口返回风控页，极难定位，这就是 A8）；抖音 passport 的 cookieJar
 * 用 `indexOf('=')` 逐段解析；B站 qtparam 又直接从 header 上摸 `Cookie`。
 *
 * `contracts/` 是零依赖叶子层，本文件不 import 任何模块。
 */

/**
 * 解析 `name=value; name=value` 形式的 cookie 串。
 *
 * 规则：
 * - 以第一个 `=` 分割，所以值里可以含 `=`（如 base64）。
 * - 名与值两端去空白（修 #32：v6 小红书不 trim）。
 * - 名为空、或整段没有 `=` 的片段直接跳过。
 * - 同名多次出现时**后者覆盖前者**。
 * - 值不做 URL 解码 —— 签名依赖原始字节，解码会改变签名输入。
 *
 * cookie 名按 RFC 6265 是**大小写敏感**的，因此本函数不做任何大小写归一化。
 * 这与 header 名大小写不敏感（见 `AmagiHeaders`）是两件不同的事。
 * @param cookieString - cookie 串，`undefined` / `null` / 空串都安全
 * @returns 名 → 值的普通对象，无有效项时是空对象
 */
export const parseCookie = (cookieString?: string | null): Record<string, string> => {
  const result: Record<string, string> = {}
  if (!cookieString) return result

  for (const pair of cookieString.split(';')) {
    const index = pair.indexOf('=')
    if (index <= 0) continue
    const name = pair.slice(0, index).trim()
    if (!name) continue
    result[name] = pair.slice(index + 1).trim()
  }
  return result
}

/**
 * 取单条 cookie 的值。
 *
 * **按名精确匹配**，不是子串匹配 —— 这是 A8 的修正点：
 * `getCookieValue('xa1=WRONG; a1=RIGHT', 'a1')` 返回 `'RIGHT'` 而不是 `'WRONG'`。
 * @param cookieString - 完整 cookie 串
 * @param name - cookie 名，大小写敏感
 * @returns 值；不存在时返回 `undefined`（而非 v6 的空串）
 */
export const getCookieValue = (cookieString: string | null | undefined, name: string): string | undefined => {
  if (!cookieString || !name) return undefined
  return parseCookie(cookieString)[name]
}

/**
 * 序列化为可直接放进 `Cookie` 请求头的字符串。
 *
 * `undefined` / `null` 的值视为「不带这条 cookie」，方便直接摊入可选字段；
 * 空串值保留（有些平台用空串表示占位）。
 * @param cookies - 名 → 值的对象
 * @returns `name=value; name=value` 形式的串，无有效项时是空串
 */
export const serializeCookie = (cookies: Record<string, string | number | undefined | null>): string =>
  Object.entries(cookies)
    .filter(([name, value]) => name.length > 0 && value !== undefined && value !== null)
    .map(([name, value]) => `${name}=${String(value)}`)
    .join('; ')
