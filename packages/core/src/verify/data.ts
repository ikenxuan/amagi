/**
 * renderVerifyPage 内联给验证页（`packages/core/verify-page`，React）的数据契约。
 * 纯类型、零依赖：两边都 import 这一份，改字段两边一起报错。
 *
 * @module verify/data
 */
import type { Platform } from '../contracts/platform'

/** 有风控 challenge 的平台（B 站没有 challenge 提取器） */
export type VerifyPlatform = Exclude<Platform, 'bilibili'>

/** 抖音自建模式：加载官方 TTGCaptcha SDK 在页内渲染滑块所需的全部材料 */
export interface VerifyPageSdk {
  /** 官方 SDK 脚本地址，已校验为 http(s) */
  jsSdkUrl: string
  /** `TTGCaptcha.render({ verify_data })` 的入参，原样来自 challenge */
  verifyData: Record<string, unknown>
  /** `TTGCaptcha.init` 的 commonOptions（宿主常量） */
  commonOptions: Record<string, unknown>
  /** `TTGCaptcha.init` 的 captchaOptions（宿主常量，页面再挂上回调） */
  captchaOptions: Record<string, unknown>
}

/** 页面上 `window.__AMAGI_VERIFY__` 的形状 */
export interface VerifyPageData {
  platform: VerifyPlatform
  /** 页面标题（未转义，页面用 textContent 渲染） */
  title: string
  /** 平台官方验证页地址，已校验为 http(s)；缺省时托管模式不可用 */
  url?: string
  /** 只有抖音且 challenge 带齐 jsSdkUrl + verifyData 时才有 */
  sdk: VerifyPageSdk | null
}
