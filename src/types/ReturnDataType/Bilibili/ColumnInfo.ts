export type ColumnInfo = {
  code: number
  data: DataData
  message: string
  ttl: number;
  [property: string]: any
}

type DataData = {
  articles: null
  attention: boolean
  author: Author
  last: Last
  list: List;
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
  vip: Vip;
  [property: string]: any
}

type Nameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number;
  [property: string]: any
}

type OfficialVerify = {
  desc: string
  type: number;
  [property: string]: any
}

type Pendant = {
  expire: number
  image: string
  name: string
  pid: number;
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
  vip_pay_type: number;
  [property: string]: any
}

type Label = {
  label_theme: string
  path: string
  text: string;
  [property: string]: any
}

type Last = {
  attributes: number
  author_uid: number
  categories: string[]
  category: Category
  dyn_id_str: string
  id: number
  image_urls: string[]
  only_fans: number
  publish_time: number
  state: number
  summary: string
  title: string
  type: number
  words: number;
  [property: string]: any
}

type Category = {
  id: number
  name: string
  parent_id: number;
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
  words: number;
  [property: string]: any
}