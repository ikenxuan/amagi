// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：6 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/search.requests.json 里
//   query
//   query / type
//   query / type  用户搜索
//   query / type  视频类型
//   query / type  通用搜索

import type { General_V0 } from './general_V0'

export type General = General_V0
