/**
 * 手写协议契约，来源于提供的 2026-09-23 `mixAweme` 端点。
 * 归档中没有 mix/aweme 的原始响应，这里只描述该实现用到的状态和分页字段；
 * 单个 aweme 的结构保持未知，而不是借用其他端点的 schema。
 * 端点的归一化逻辑总会提供 `aweme_list` 和 `cursor`。
 */
export interface MixAweme {
  status_code?: number
  aweme_list: unknown[]
  cursor: number
  has_more?: number
  [property: string]: unknown
}
