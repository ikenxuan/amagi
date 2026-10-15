// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.9）。参数与说明在 corpus/xiaohongshu/searchHotList.requests.json 里
//   无参数  变体0

export type SearchHotList_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  host: string
  hot_list_id: string
  is_new_hot_list_exp: boolean
  items: Item[]
  result: Result
  scene: string
  title: string
  word_request_id: string
  [property: string]: any
}

type Item = {
  icon?: string
  id: string
  rank_change: number
  score: string
  title: string
  title_img: string
  type: string
  word_type: string
  [property: string]: any
}

type Result = {
  success: boolean
  [property: string]: any
}
