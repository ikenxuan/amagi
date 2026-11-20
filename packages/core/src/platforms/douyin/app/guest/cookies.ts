import { CookieJar, type SerializedCookieJar } from 'tough-cookie'

/** 持有上游实际下发的 Cookie，不预设每个游客都应拥有相同的键。 */
export class AppCookieJar {
  private readonly jar: CookieJar
  constructor(state?: SerializedCookieJar) {
    this.jar = state ? CookieJar.deserializeSync(state) : new CookieJar()
  }
  accept(url: string, values: string[] = []): void {
    for (const value of values) this.jar.setCookieSync(value, url, { ignoreError: true })
  }
  header(url: string): string {
    return this.jar.getCookieStringSync(url)
  }
  serialize(): SerializedCookieJar {
    const result = this.jar.serializeSync()
    if (!result) throw new Error('App CookieJar 序列化失败')
    return result
  }
}
