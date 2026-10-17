// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.9）。参数与说明在 corpus/douyin/shortUrl.requests.json 里
//   belong / target  belong 不是 aweme：平台拒绝缩短

export type ShortUrl_Error_V0 = {
  code: number
  data: string
  message: string
  now: number
  reason: string
  [property: string]: any
}
