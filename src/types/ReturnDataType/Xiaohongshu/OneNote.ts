export type OneNote = {
  code: number
  data: DataData
  msg: string
  success: boolean;
  [property: string]: any
}

type DataData = {
  current_time: number
  cursor_score: string
  items: Item[];
  [property: string]: any
}

type Item = {
  id?: string
  model_type?: string
  note_card?: NoteCard;
  [property: string]: any
}

type NoteCard = {
  at_user_list: AtUserList[]
  desc: string
  image_list: ImageList[]
  interact_info: InteractInfo
  ip_location: string
  last_update_time: number
  note_id: string
  share_info: ShareInfo
  tag_list: TagList[]
  time: number
  title: string
  type: string
  user: User;
  [property: string]: any
}

type AtUserList = {
  nickname: string
  user_id: string
  xsec_token: string;
  [property: string]: any
}

type ImageList = {
  file_id: string
  height: number
  info_list: InfoList[]
  live_photo: boolean
  stream: { [key: string]: any }
  trace_id: string
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
  collected: boolean
  collected_count: string
  comment_count: string
  followed: boolean
  liked: boolean
  liked_count: string
  relation: string
  share_count: string;
  [property: string]: any
}

type ShareInfo = {
  un_share: boolean;
  [property: string]: any
}

type TagList = {
  id: string
  name: string
  type: string;
  [property: string]: any
}

type User = {
  avatar: string
  nickname: string
  user_id: string
  xsec_token: string;
  [property: string]: any
}
