import { getCookieValue } from '../../contracts/cookie'
import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { generateSecChUa } from '../../contracts/ua'

/** uifid 会话设备指纹的 cookie 键（大小写变体，DouyinDataAPI 同表） */
export const DOUYIN_UIFID_KEYS = ['uifid', 'uifid_temp', 'uifidtemp', 'UIFID', 'UIFID_TEMP', 'UIFIDTEMP'] as const

/**
 * 解析本次请求的 uifid：取实例 cookie 的 uifid 系键值。
 *
 * uifid 是 64 位 hex 设备指纹，只能从真实客户端 cookie 里带出 —— 桌面登录态的
 * cookie 自带，直接按 {@link DOUYIN_UIFID_KEYS} 提取即可。
 *
 * 这是签名器（query+header 双带、secsdk 签名）与基线桌面形态判定共用的唯一口径，
 * 保证「签名里算的 uifid」与「请求里带的 uifid」始终是同一个值。
 * @param cookie - 实例 cookie
 * @returns uifid；拿不到返回空串
 */
export const resolveDouyinUifid = (cookie?: string | null): string => {
  if (!cookie) return ''
  return DOUYIN_UIFID_KEYS.map((key) => getCookieValue(cookie, key)).find((value): value is string => !!value) ?? ''
}

/**
 * 抖音默认 header 基线。
 *
 * UA / sec-ch-ua / `x-tt-session-dtrait` 分两种形态，按**能否拿到 uifid** 切换
 * （见 {@link resolveDouyinUifid}，即 cookie 的 uifid 系键值）：
 *
 * - **有 uifid** —— 完整桌面客户端形态：默认 Edge 151 UA + Edge 专属 sec-ch-ua +
 *   `x-tt-session-dtrait`（与 DouyinDataAPI 抓包口径一致）；调用方显式传入非 Edge
 *   UA 时，sec-ch-ua 按该 UA 现场计算。
 * - **无 uifid** —— 普通浏览器形态：强制 Chrome 桌面 UA、不挂 dtrait。桌面特征
 *   被 Argus 识别为桌面客户端后会强制校验 uifid，缺失即「Uifid Not Found」403，
 *   所以此时即使调用方显式传了 Edge UA 也强制降级。
 *
 * 调用方 header 经 `AmagiHeaders` 合并后优先生效（无 uifid 的降级分支除外）。
 * `uifid` 的 query+header 双带与 `x-secsdk-csrf-token: DOWNGRADE` 由签名器补发，
 * 不进基线。
 *
 * 与旧版一致：`timeout: 10000`、Cookie trim、Referer 抖音首页。
 * `method` 归端点声明（抖音端点各自声明 GET / POST），不属于基线。
 */
export const createDouyinConfig = (cookie?: string, requestConfig?: RequestConfig) => {
  const desktop = !!resolveDouyinUifid(cookie)

  const headers = new AmagiHeaders()
    .set('accept', 'application/json, text/plain, */*')
    .set('accept-encoding', 'gzip, deflate, br, zstd')
    .set('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6')
    .set('priority', 'u=1, i')
    .set('referer', 'https://www.douyin.com/')
    .set('sec-ch-ua-mobile', '?0')
    .set('sec-ch-ua-platform', '"Windows"')
    .set('sec-fetch-dest', 'empty')
    .set('sec-fetch-mode', 'cors')
    .set('sec-fetch-site', 'same-origin')
    .set('cookie', cookie?.trim() ?? '')
    .merge(requestConfig?.headers as HeadersInput) // 调用方 header 优先生效

  if (desktop) {
    // 有 uifid：完整桌面客户端形态（与 DouyinDataAPI 抓包口径一致）。
    // UA 缺省走 Edge 151；调用方显式传了非 Edge UA 时，按该 UA 现场算 sec-ch-ua。
    const configuredUA = headers.get('user-agent')
    const ua = configuredUA ?? DOUYIN_DESKTOP_UA
    headers.set('user-agent', ua)
    headers.set('sec-ch-ua', !configuredUA || /Edg\/\d+/.test(configuredUA) ? DOUYIN_DESKTOP_SEC_CH_UA : generateSecChUa(ua))
    headers.set('x-tt-session-dtrait', DOUYIN_DTRAIT) // TTElectron 原生会话特征头
    // uifid 的 query+header 双带、`x-secsdk-csrf-token: DOWNGRADE` 回退验证开关，
    // 都由签名器在 secsdk 签名实际生效时补发（见 `signers.ts`），不进基线。
  } else {
    // 拿不到 uifid：**不伪装桌面客户端**，走普通浏览器形态。
    // 桌面特征（Edge UA + dtrait）被 Argus 识别为桌面客户端后，会强制校验 uifid
    // 设备指纹 —— 缺失就是「Uifid Not Found」403。所以即使调用方显式配了 Edge UA
    // 也强制降级，避免自相矛盾的指纹组合。
    headers.set('user-agent', DOUYIN_WEB_UA)
    headers.set('sec-ch-ua', DOUYIN_WEB_SEC_CH_UA)
    headers.delete('x-tt-session-dtrait')
  }

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

/**
 * 抖音桌面端默认 UA：Edge 151（与 DouyinDataAPI 对官方 web 接口的抓包一致）。
 *
 * 之所以不放进 `contracts/ua.ts`：那边的 `DEFAULT_UA` 被 bilibili / xiaohongshu /
 * kuaishou 共用，抖音风控要求 UA、sec-ch-ua、参数指纹一致，单独收敛在抖音侧。
 */
export const DOUYIN_DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0'

/** 与 {@link DOUYIN_DESKTOP_UA} 配套的 Edge 专属 Sec-Ch-Ua */
export const DOUYIN_DESKTOP_SEC_CH_UA = '"Microsoft Edge";v="151", "Chromium";v="151", "Not.A/Brand";v="99"'

/**
 * 无 uifid 时的兜底 UA：普通 Chrome 桌面浏览器（非 Edge）。
 *
 * 拿不到 uifid 时**必须**保持普通浏览器形态：Edge 桌面 UA + `x-tt-session-dtrait`
 * 会被 Argus 识别为桌面客户端，随即强制校验 uifid 设备指纹，缺失直接
 * 「Uifid Not Found」403。与 {@link DOUYIN_DESKTOP_UA} 同为 Windows Chrome 151
 * 内核 —— 指纹版本一致，只在「是否伪装桌面客户端」上有差别。
 */
export const DOUYIN_WEB_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

/** 与 {@link DOUYIN_WEB_UA} 配套的 Chrome 专属 Sec-Ch-Ua */
export const DOUYIN_WEB_SEC_CH_UA = '"Not_A Brand";v="99", "Chromium";v="151", "Google Chrome";v="151"'

/**
 * `x-tt-session-dtrait`：TTElectron 原生会话特征头，写操作类接口必需（缺失返「未登录 /
 * 需验证」）。会话级值，浏览器刷新后变化 —— 可用环境变量 `DOUYIN_DTRAIT` 注入新抓的值；
 * 兜底内置一份已知有效值（2026-08-19 抓取，DouyinDataAPI 同源）。
 */
export const DOUYIN_DTRAIT =
  (typeof process !== 'undefined' && process.env?.DOUYIN_DTRAIT) ||
  'd0_WmYT4C/AQEicCgcxYrJYpgD29T0aQYUPzLbYRgAu5V0wwx3GVAbxWV/9d/lHxtj8nX8fHLFuLkQR+F1/qnKC3MGyLTOV1WmwQ0+vCDn/6ICL2DiVY9NBHnatSoZn3g5SR5AlaMrjMpFhIFC5RMbA/awuayDda+fkFLco9avBVQ1UsBZcb3emnAP3ESNd4kQ4gnaFp3xeEeVAJJSKNtpOqQ5g0572uDk7WrQmL/pUCI10vFPuYh4VXsBDdOEfdZt5mGB2gBrzHTzuv1H5tlRE7thA2pJBL9q6eX2xoB6iRYw4Q2QByTrEpiVZrua1rhLcMgTIlO7A4TqSZ0EV79x9zw==_DKeOD0wor5Ahvu0uQX89Jx0G/d+x1v/kxJaPYTZkLDnoMrUS84lQjarnETl3itYpfPt4oLFslGDCzc/5Tiq32LyLSGwMxhePfRxQHOfMUCEulyjwwYyXF4U57lI+dJmjJhxuUzhoCQoZ4XKEIUcYPC3Osc3ao7B+VX/4xtSEAjTQOVJKDv89e5JYnOslsuWcNo4z53mdUhQ82n0K0numjxnNXSYtLU32qVtuMaww+L5WVK9Z/rKwfeuf2ksE6xOgZzqU5A1ittIUdNwCN3ETvB1bUtIaQ/Pm4DYjn7I0cl7bY9t+806hCLg36XJ79zIZ48n3UZJ8LvifQE8gJQ25iPlKK8v2BkSIz7lR/2qSHMz/ybYw2HJ0kofAeDNGKsCCqGWwXQwbCRbDMMRxxc82rgJiUanj9Qvbvd/A2P+mGbF1RuYB2Jf7cGyz+tVoezSh/cRfN1VFt74ptku4TqeIHw=='
