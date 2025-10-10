export type SearchNotes = {
  code: number
  data: DataData
  msg: string
  success: boolean;
  [property: string]: any
}

type DataData = {
  has_more: boolean
  items: Item[];
  [property: string]: any
}

type Item = {
  id: string
  model_type: string
  note_card: NoteCard
  rec_query: RecQuery
  xsec_token: string;
  [property: string]: any
}

type NoteCard = {
  corner_tag_info: CornerTagInfo[]
  cover: Cover
  display_title: string
  image_list: ImageList[]
  interact_info: InteractInfo
  type: string
  user: User;
  [property: string]: any
}

type CornerTagInfo = {
  text: string
  type: string;
  [property: string]: any
}

type Cover = {
  height: number
  url_default: string
  url_pre: string
  width: number;
  [property: string]: any
}

type ImageList = {
  height: number
  info_list: InfoList[]
  width: number;
  [property: string]: any
}

type InfoList = {
  image_scene: string
  url: string;
  [property: string]: any
}

type InteractInfo = {
  collected: boolean
  collected_count: string
  comment_count: string
  liked: boolean
  liked_count: string
  shared_count: string;
  [property: string]: any
}

type User = {
  avatar: string
  nick_name: string
  nickname: string
  user_id: string
  xsec_token: string;
  [property: string]: any
}

type RecQuery = {
  queries: Query[]
  source: number
  title: string
  word_request_id: string;
  [property: string]: any
}

type Query = {
  id: string
  name: string
  search_word: string;
  [property: string]: any
}