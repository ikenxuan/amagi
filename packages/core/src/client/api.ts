import type { Registry } from '../contracts/endpoint'
import type { Platform } from '../contracts/platform'
import { API_NAMES, type ApiName } from './api-names'
import type { FetcherMethod } from './fetcher'
import { methodNameFor } from './fetcher'

export type DataApi<P extends Platform, R extends Registry> = {
  [K in keyof R as ApiName<P, K & string> extends `${string}.${string}` ? never : ApiName<P, K & string>]: FetcherMethod<R[K]>
}
export type AuthApi<P extends Platform, R extends Registry> = {
  [K in keyof R as ApiName<P, K & string> extends `auth.${infer Name}` ? Name : never]: FetcherMethod<R[K]>
}

/** 仅重命名并分组；业务调用使用原 registry 执行器。 */
export const createApi = <P extends Platform, R extends Registry>(
  platform: P,
  registry: R,
  fetcher: object
): { data: DataApi<P, R>; auth: AuthApi<P, R> } => {
  const data: Record<string, unknown> = {},
    auth: Record<string, unknown> = {}
  for (const endpoint of Object.keys(registry)) {
    const name = API_NAMES[`${platform}.${endpoint}` as keyof typeof API_NAMES]
    if (!name || name.startsWith('tools.')) continue
    const target = name.startsWith('auth.') ? auth : data
    const key = name.startsWith('auth.') ? name.slice(5) : name
    if (Object.hasOwn(target, key)) throw new Error(`公开方法重名：${platform}.${name}`)
    target[key] = (fetcher as Record<string, unknown>)[methodNameFor(platform, endpoint)]
  }
  return { data, auth } as { data: DataApi<P, R>; auth: AuthApi<P, R> }
}
