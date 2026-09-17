// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/articleListInfo.requests.json 里
//   id  变体0

export type ArticleListInfo_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  articles: null
  attention: boolean
  author: Author
  last: Last
  list: List
  [property: string]: any
}

type Author = {
  face: string
  fans: number
  level: number
  mid: number
  name: string
  nameplate: Nameplate
  official_verify: OfficialVerify
  pendant: Pendant
  vip: Vip
  [property: string]: any
}

type Nameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number
  [property: string]: any
}

type OfficialVerify = {
  desc: string
  type: number
  [property: string]: any
}

type Pendant = {
  expire: number
  image: string
  name: string
  pid: number
  [property: string]: any
}

type Vip = {
  avatar_subscript: number
  due_date: number
  label: Label
  nickname_color: string
  status: number
  theme_type: number
  type: number
  vip_pay_type: number
  [property: string]: any
}

type Label = {
  label_theme: string
  path: string
  text: string
  [property: string]: any
}

type Last = {
  attributes: number
  author_uid: number
  categories: unknown[]
  category: Category
  dyn_id_str: string
  id: number
  image_urls: unknown[]
  only_fans: number
  publish_time: number
  state: number
  summary: string
  title: string
  type: number
  words: number
  [property: string]: any
}

type Category = {
  id: number
  name: string
  parent_id: number
  [property: string]: any
}

type List = {
  apply_time: string
  articles_count: number
  check_time: string
  ctime: number
  id: number
  image_url: string
  mid: number
  name: string
  publish_time: number
  read: number
  reason: string
  state: number
  summary: string
  update_time: number
  words: number
  [property: string]: any
}
