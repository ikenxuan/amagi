import type { SignDecl } from '../../contracts/endpoint'
import type { AmagiErrorCode } from '../../contracts/error'
import type { Platform } from '../../contracts/platform'
import type { HttpMethod, RequestSpec } from '../../contracts/request'
import { douyinSign } from '../../platforms/douyin/sign'

/**
 * 平台请求档案：`client.<平台>.request` 需要的「与端点无关」的平台知识。
 *
 * 与 `client/runtime.ts` 的 `PLATFORM_RUNTIME` 同构 —— 那张表装签名器 / judge /
 * 风控提取器 / 响应旁观者，这张表只装「裸请求」这条路才用得上的三样：默认签名器、
 * 重试策略、以及 `retryFresh` 时怎么换参数。
 *
 * 这些东西**不进 `amagi` 子对象**：它们是平台协议知识，不是调用方的旋钮。
 * 但也不能写死在通用代码里 —— 那样四个平台的差异会挤进同一串 `if`。
 */
export interface PlatformRequestProfile {
  /**
   * 不给 `amagi.sign` 时用的签名器。
   *
   * 给函数形态的平台按 method 现算（目前只有小红书：POST 与 GET 是两套签名）。
   */
  defaultSign: SignDecl | ((method: HttpMethod) => SignDecl)
  /**
   * 命中这些错误码时退避重试，与端点声明的 `retryOn` 同义。
   *
   * 裸请求没有端点声明可写，所以按平台给一份默认值。
   */
  retryOn?: AmagiErrorCode[]
  /**
   * 重试时重新 build + 重新签名，而不是重放同一个 `RequestSpec`。
   *
   * 只有抖音开：Argus 按**单次请求的 token 组**判定、不锁账号，重放同一个
   * `msToken` + `a_bogus` 结果必然相同。
   */
  retryFresh?: boolean
  /**
   * `retryFresh` 重试时用来换参数的钩子。缺省返回原 spec（只重新签名）。
   * @param spec - 上一次用的请求描述
   * @returns 下一次请求用的请求描述
   */
  refresh?: (spec: RequestSpec) => RequestSpec
}

/**
 * 抖音：重抽 URL 里已有的 `msToken`。
 *
 * Argus 按整组 token 判定，只换 `a_bogus` 不够。`msToken` 是调用方的 URL
 * 构造器写进去的（这一层**不补**参数），所以能换的只有「URL 里本来就有」的
 * 那一种情况 —— 长度保持原样（作品详情 184、其余 116），因为长度本身就是
 * 参数的一部分。
 * @param spec - 上一次用的请求描述
 * @returns 换过 msToken 的请求描述；没有可换的就原样返回
 */
const refreshDouyinMsToken = (spec: RequestSpec): RequestSpec => {
  let url: URL
  try {
    url = new URL(spec.url)
  } catch {
    // 相对 URL：签名器那边会抛更明确的话，这里不抢它的活
    return spec
  }
  const current = url.searchParams.get('msToken')
  if (current === null || current === '') return spec
  url.searchParams.set('msToken', douyinSign.Mstoken(current.length))
  return { ...spec, url: url.toString() }
}

/** 平台档案表。四个平台必须齐全 —— 少一项不会编译报错，会静默不签名 */
const PROFILES: Record<Platform, PlatformRequestProfile> = {
  douyin: {
    defaultSign: 'a-bogus',
    retryOn: ['ANTIBOT_PAGE'],
    retryFresh: true,
    refresh: refreshDouyinMsToken
  },
  bilibili: {
    // 27 条端点里只有 5 条签名（wbi 三条、qtparam 两条）。默认签会大面积签错，
    // 而且是**静默**签错：多出来的 wts/w_rid 不一定让请求当场失败
    defaultSign: false,
    retryOn: ['RISK_CONTROL']
  },
  kuaishou: {
    defaultSign: 'hxfalcon',
    retryOn: ['PLATFORM_UNAVAILABLE']
  },
  xiaohongshu: {
    // 四个平台里只有它能从 method 推出来：POST 签 body、GET 签 query。
    // `xhs-get-trace`（多一个 x-b3-traceid）推不出来，要用的调用方显式传
    defaultSign: (method: HttpMethod) => (method === 'POST' ? 'xhs-post' : 'xhs-get')
  }
}

/**
 * 取平台的请求档案
 * @param platform - 平台
 * @returns 该平台的档案
 */
export const requestProfileOf = (platform: Platform): PlatformRequestProfile => PROFILES[platform]

/**
 * 取本次调用该用的签名器声明（函数形态的平台在这里按 method 求值）
 * @param profile - 平台档案
 * @param method - 本次请求的 HTTP 方法
 * @returns 签名器声明
 */
export const resolveDefaultSign = (profile: PlatformRequestProfile, method: HttpMethod): SignDecl => {
  const { defaultSign } = profile
  if (typeof defaultSign !== 'function') return defaultSign
  // 这里的 `typeof` 收窄不到「按 method 现算」那一支：`SignDecl` 里本来也含一种
  // 函数（`SignFn`），两个函数形态在类型上分不开，只能手动断言。档案表里函数形态
  // 只用 method → SignDecl 这一支 —— `SignFn` 形态的签名器从 `runtime.ts` 的
  // `signers` 表按名字取，不进这张表。
  return (defaultSign as (method: HttpMethod) => SignDecl)(method)
}
