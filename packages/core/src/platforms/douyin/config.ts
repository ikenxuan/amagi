import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { DEFAULT_UA, generateSecChUa } from '../../contracts/ua'

/**
 * 抖音默认 header 基线。
 *
 * 默认 UA 取 `contracts/ua.ts` 集中维护的 `DEFAULT_UA`；`sec-ch-ua` 与
 * `user-agent` 用**同一个** UA 计算，两个头描述的必然是同一种浏览器。
 * 调用方 header 经 `AmagiHeaders` 合并后优先生效。
 *
 * 与旧版一致：`timeout: 10000`、Cookie trim、Referer 抖音首页。
 * `method` 归端点声明（抖音端点各自声明 GET / POST），不属于基线。
 */
export const createDouyinConfig = (cookie?: string, requestConfig?: RequestConfig) => {
  const userAgent = new AmagiHeaders(requestConfig?.headers as HeadersInput).get('user-agent') ?? DEFAULT_UA
  const secChUa = generateSecChUa(userAgent)

  const headers = new AmagiHeaders()
    .set('accept', 'application/json, text/plain, */*')
    .set('accept-encoding', 'gzip, deflate, br, zstd')
    .set('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6')
    .set('priority', 'u=1, i')
    .set('referer', 'https://www.douyin.com/')
    .set('sec-ch-ua', secChUa) // 与 user-agent 同源计算，两值必一致
    .set('sec-ch-ua-mobile', '?0')
    .set('sec-ch-ua-platform', '"Windows"')
    .set('sec-fetch-dest', 'empty')
    .set('sec-fetch-mode', 'cors')
    .set('sec-fetch-site', 'same-origin')
    .set('user-agent', userAgent) // 默认值取 DEFAULT_UA
    .set('cookie', cookie?.trim() ?? '')
    .merge(requestConfig?.headers as HeadersInput) // 调用方 header 优先生效

  return {
    headers,
    requestConfig: {
      timeout: 10000,
      ...requestConfig
    } satisfies RequestConfig
  }
}

/**
 * 免鉴权端点要从基线里删掉的头。
 *
 * 这四条端点打的不是 `www.douyin.com`（`iesdouyin.com` 的 v2 游客接口、
 * `api.amemv.com` 的 App 接口），而基线是按 douyin.com 的同源 XHR 攒的：
 *
 * - **`cookie`** —— 最要紧的一条。带上 cookie 只会多一层「设备参数 × 会话」的
 *   交叉校验，而这几条接口本来不需要身份。cookie 在 amagi 里是执行期身份，
 *   端点 `headers` 覆盖不掉（`execute` 的 `attachCookie` 在 build 之后才写），
 *   只有 `dropHeaders` 能删 —— 它在所有 header 合并**之后**执行，
 *   所以连调用方自己从 `requestConfig.headers` 传进来的 cookie 也一并删掉。
 * - **`referer`** —— 基线指向 `https://www.douyin.com/`，跨站发过去是自相矛盾的。
 * - **`sec-fetch-site`** —— 基线是 `same-origin`，而这几条是跨站请求。
 *
 * `sec-ch-ua*` 不在清单里：`emojiResourceMeta` 用 Android UA，它自己在 build 里
 * 覆盖整组头；另外三条是桌面浏览器打 iesdouyin，那几个头本来就该在。
 */
export const DOUYIN_GUEST_DROP_HEADERS = ['cookie', 'referer', 'sec-fetch-site'] as const

/**
 * `emojiResourceMeta` 用的 Android UA。
 *
 * 那条接口是抖音 App 的资源包接口，桌面 UA 会被拒。不进 `contracts/ua.ts` 的
 * 集中表：`MOBILE_UA` 是 iPhone Safari（快手 H5 在用），这里要的是 Android Chrome，
 * 而且只有这一条端点用得上。
 */
export const DOUYIN_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
