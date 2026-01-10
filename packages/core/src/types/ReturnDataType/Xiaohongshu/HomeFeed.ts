export type HomeFeed = {
  code: number
  data: DataData
  msg: string
  success: boolean;
  [property: string]: any
}

type DataData = {
  cursor_score: string
  items: Item[];
  [property: string]: any
}

type Item = {
  id: string
  ignore: boolean
  model_type: string
  note_card: NoteCard
  track_id: string
  xsec_token: string;
  [property: string]: any
}

type NoteCard = {
  cover: Cover
  display_title: string
  interact_info: InteractInfo
  type: string
  user: User
  video?: Video;
  [property: string]: any
}

type Cover = {
  file_id: string
  height: number
  info_list: InfoList[]
  url: string
  url_default: string
  url_pre: string
  width: number;
  [property: string]: any
}

type InfoList = {
  image_scene: string
  url: string;
  [property: string]: any
}

type InteractInfo = {
  liked: boolean
  liked_count: string;
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

type Video = {
  capa: Capa;
  [property: string]: any
}

type Capa = {
  duration: number;
  [property: string]: any
}
