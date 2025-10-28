export type ArticleContent = {
  code: number
  data: DataData
  message: string
  ttl: number;
  [property: string]: any
}

type DataData = {
  act_id: number
  apply_time: string
  authenMark: null
  author: Author
  banner_url: string
  categories: CategoryElement[]
  category: PurpleCategory
  check_state: number
  check_time: string
  content: string
  content_pic_list: null
  cover_avid: number
  ctime: number
  dispute: null
  dyn_id_str: string
  id: number
  image_urls: string[]
  is_like: boolean
  keywords: string
  list: null
  media: Media
  mtime: number
  opus: Opus
  origin_image_urls: string[]
  origin_template_id: number
  original: number
  private_pub: number
  publish_time: number
  reprint: number
  state: number
  stats: Stats
  summary: string
  template_id: number
  title: string
  top_video_info: null
  total_art_num: number
  type: number
  version_id: number
  words: number;
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

type CategoryElement = {
  id: number
  name: string
  parent_id: number;
  [property: string]: any
}

type PurpleCategory = {
  id: number
  name: string
  parent_id: number;
  [property: string]: any
}

type Media = {
  area: string
  cover: string
  media_id: number
  score: number
  season_id: number
  spoiler: number
  title: string
  type_id: number
  type_name: string;
  [property: string]: any
}

type Opus = {
  article: Article
  content: Content
  opus_id: number
  opus_source: number
  pub_info: PubInfo
  title: string
  translate_result: TranslateResult
  version: Version;
  [property: string]: any
}

type Article = {
  category_id: number
  cover: Cover[];
  [property: string]: any
}

type Cover = {
  height?: number
  size?: number
  url?: string
  width?: number;
  [property: string]: any
}

type Content = {
  paragraphs: Paragraph[];
  [property: string]: any
}

type Paragraph = {
  para_type: number
  pic: ParagraphPic
  text: Text;
  [property: string]: any
}

type ParagraphPic = {
  pics: PicElement[]
  style: number;
  [property: string]: any
}

type PicElement = {
  height: number
  size: number
  url: string
  width: number;
  [property: string]: any
}

type Text = {
  nodes: Node[];
  [property: string]: any
}

type Node = {
  node_type: number
  word: Word;
  [property: string]: any
}

type Word = {
  font_level: string
  font_size: number
  style: Style
  words: string;
  [property: string]: any
}

type Style = {
  bold: boolean;
  [property: string]: any
}

type PubInfo = {
  pub_time: number
  uid: number;
  [property: string]: any
}

type TranslateResult = {
  lang_match_result: number
  source_lang: string
  state: number;
  [property: string]: any
}

type Version = {
  cvid: number
  version_id: number;
  [property: string]: any
}

type Stats = {
  coin: number
  dislike: number
  dynamic: number
  favorite: number
  like: number
  reply: number
  share: number
  view: number;
  [property: string]: any
}