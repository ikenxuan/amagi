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
//
// 兜底支（开放联合）：`data.item.type` 取到**样本里没见过的值**时落到这里。
// 形状是剪出来的，只留信封与判别字段；其余字段一律走每层的索引签名，读什么都不会编译红。
// 判别字段写成 `?: never`：它在 `===` 比较里被筛掉（裸 `if` / `switch` 照常收窄到已知支），
// 但 `else` / `default` 分支里它还在，下游可以照常渲染 —— 这是它跟 `type: string` 的唯一区别。

export type DynamicDetailUnknown = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  item: Item
  [property: string]: any
}

type Item = {
  type?: never
  [property: string]: any
}
