// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：3 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/dynamicDetail.requests.json 里
//   dynamic_id  图文动态
//   dynamic_id  视频动态
//   dynamic_id  转发动态

import type { DynamicTypeDraw_V0 } from './DYNAMIC_TYPE_DRAW_V0'

export type DynamicTypeDraw = DynamicTypeDraw_V0
