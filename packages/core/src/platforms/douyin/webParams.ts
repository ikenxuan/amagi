/**
 * 抖音 Web API（`/aweme/v1/web/*`）的 query 版式。
 *
 * ## 为什么要管顺序
 *
 * `a_bogus` 签的是**它之前那一整段 query 字符串**，服务端按收到的顺序重算。换句话说，
 * query 的键序本身就是被校验的内容之一 —— 同一组键值换个顺序，签名就对不上。
 * 这是本模块存在的唯一理由：别的平台只要「参数齐」，抖音还要「参数位置对」。
 *
 * 2026-10-05 对照浏览器抓包（Edge 登录态打开作品页，读 `performance` 里的 XHR），
 * 2026-10-06 在作品页 + 用户页共 70 个 `/aweme/v1/web/*` 端点上复核过 tail 键序，
 * 抖音自己拼出来的版式是固定三段：
 *
 * ```text
 * ┌ head ──────────┬ endpoint ──────────┬ env ─────────────────┬ tail ───────────────────────┐
 * │ device_platform│ 本端点特有的参数    │ 25 个浏览器环境参数   │ webid,uifid,verifyFp,fp,    │
 * │ aid            │（aweme_id / cursor │（顺序见 {@link webEnv}）│ msToken,a_bogus             │
 * │ channel        │  / sec_user_id …） │                      │ [,timestamp,签名]           │
 * └────────────────┴────────────────────┴──────────────────────┴─────────────────────────────┘
 * ```
 *
 * head 与 env 由本模块给，endpoint 段由 `api.ts` 各方法给，tail 由 `sign/steps.ts`
 * 在签名时按序追加（它是唯一同时看得到 URL 与 cookie 的地方）。
 *
 * ## 覆盖某个环境参数时为什么要用 {@link webQuery}
 *
 * 作品详情发 `version_code=190500`、互动表情发 `aid=1128`，都是在上面这个版式里
 * **原位改值**，不是追加到末尾。JS 对象展开正好是这个语义（已存在的键保留原位置），
 * 所以覆盖值走 `webQuery(endpoint, { head, env })` 而不是塞进 endpoint 段。
 *
 * @module platforms/douyin/webParams
 */

import type { BrowserIdentity } from '../../contracts/ua'

/** query 头三个键，所有 `/aweme/v1/web/*` 都一样（互动表情的 `aid` 是 1128，走覆盖） */
export const WEB_HEAD = {
  device_platform: 'webapp',
  aid: '6383',
  channel: 'channel_pc_web'
} as const

/** 作品详情刻意使用比其他 Web 端点更新的版本号（抓包里只有 `aweme/detail` 发这个值） */
export const WEB_WORKDETAIL_VERSION_OVERRIDE = {
  version_code: '190500',
  version_name: '19.5.0'
} as const

/** 综合搜索（`general/search/stream`）自己一档版本号 */
export const WEB_SEARCH_VERSION_OVERRIDE = {
  version_code: '190600',
  version_name: '19.6.0'
} as const

/** {@link webEnv} 的返回形状 */
export type WebEnvParams = Record<string, string>

/**
 * 25 个浏览器环境参数，**键序与浏览器抓包逐字一致**。
 *
 * 值里有几项与真实浏览器不同，是刻意的（本库跑在 Node 里，没有真实设备可测）：
 * `cpu_core_num` / `device_memory` / 分辨率 / `downlink` / `round_trip_time` 都是写死的
 * 典型值。抖音校验的是「这些键在不在、位置对不对」，不核对值与真实硬件是否相符。
 * @param browser - 从 UA 认出的浏览器，见 `browserOf`
 * @returns 按浏览器顺序排好的环境参数
 */
export const webEnv = (browser: BrowserIdentity): WebEnvParams => ({
  update_version_code: '170400',
  pc_client_type: '1',
  pc_libra_divert: 'Windows',
  support_h265: '0',
  support_dash: '1',
  cpu_core_num: '16',
  version_code: '170400',
  version_name: '17.4.0',
  cookie_enabled: 'true',
  screen_width: '1920',
  screen_height: '1080',
  browser_language: 'zh-CN',
  browser_platform: 'Win32',
  browser_name: browser.name,
  browser_version: browser.version,
  browser_online: 'true',
  engine_name: 'Blink',
  engine_version: browser.engineVersion,
  os_name: 'Windows',
  os_version: '10',
  device_memory: '8',
  platform: 'PC',
  downlink: '10',
  effective_type: '4g',
  round_trip_time: '50'
})

/** {@link webQuery} 的覆盖项 */
export interface WebQueryOverrides {
  /** 覆盖 head 段的值（原位替换，如互动表情的 `aid: '1128'`） */
  head?: Record<string, string>
  /** 覆盖 env 段的值（原位替换，如作品详情的 `version_code: '190500'`） */
  env?: Record<string, string>
}

/**
 * 按浏览器版式拼出一条 `/aweme/v1/web/*` 的 query 参数表：`head → endpoint → env`。
 *
 * tail（`webid,uifid,verifyFp,fp,msToken,a_bogus`）不在这里 —— 它由
 * `sign/steps.ts` 在签名时追加，因为那几个值要么来自 cookie、要么是签名本身。
 * @param browser - 从 UA 认出的浏览器，透传给 {@link webEnv}
 * @param endpoint - 本端点特有的参数，按浏览器里的顺序书写
 * @param overrides - head / env 段的原位覆盖值
 * @returns 可直接交给 query 串构造器的有序参数表
 */
export const webQuery = (
  browser: BrowserIdentity,
  endpoint: Record<string, unknown> = {},
  overrides: WebQueryOverrides = {}
): Record<string, unknown> => ({
  ...WEB_HEAD,
  ...overrides.head,
  ...endpoint,
  ...webEnv(browser),
  ...overrides.env
})
