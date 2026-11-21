import { callEndpoint } from '../../../client/fetcher'
import { methodNameFor } from '../../../client/fetcher'
import type { MethodNameOfEndpoint } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import type { StaticFetcherMethod } from '../../../client/static'
import type { RequestConfig } from '../../../contracts/request'
import { awemeRegistry } from '../../../platforms/douyin/app/endpoints'
import type { DouyinAppOptions } from '../../../platforms/douyin/app/options'

type StaticMethods = {
  [K in keyof typeof awemeRegistry as MethodNameOfEndpoint<'douyin', K>]: StaticFetcherMethod<(typeof awemeRegistry)[K], DouyinAppOptions>
}

/** 裸 App 方法的第二参为签名配置；账号 Cookie 不属于 App 接口的入参。 */
export interface AwemeStaticFetcher extends StaticMethods {}

export const createStaticAwemeFetcher = (): AwemeStaticFetcher =>
  Object.fromEntries(
    Object.entries(awemeRegistry).map(([name, def]) => [
      methodNameFor('douyin', name),
      (params?: unknown, douyinApp: DouyinAppOptions = {}, requestConfig?: RequestConfig) =>
        callEndpoint(def, makeClientCtx('douyin', '', requestConfig, 'static-douyin-app', { douyinApp }), params)
    ])
  ) as unknown as AwemeStaticFetcher
