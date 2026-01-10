export type NoteComments = {
  code: number
  data: DataData
  msg: string
  success: boolean;
  [property: string]: any
}

type DataData = {
  comments: Comment[]
  cursor: string
  has_more: boolean
  time: number
  user_id: string
  xsec_token: string;
  [property: string]: any
}

type Comment = {
  at_users: string[]
  content: string
  create_time: number
  id: string
  ip_location: string
  like_count: string
  liked: boolean
  note_id: string
  pictures: Picture[]
  show_tags: string[]
  status: number
  sub_comment_count: string
  sub_comment_cursor: string
  sub_comment_has_more: boolean
  sub_comments: SubComment[]
  user_info: CommentUserInfo;
  [property: string]: any
}

type Picture = {
  height: number
  info_list: InfoList[]
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

type SubComment = {
  at_users: string[]
  content: string
  create_time: number
  id: string
  ip_location: string
  like_count: string
  liked: boolean
  note_id: string
  pictures: string[]
  show_tags: string[]
  status: number
  target_comment: TargetComment
  user_info: SubCommentUserInfo;
  [property: string]: any
}

type TargetComment = {
  id: string
  user_info: TargetCommentUserInfo;
  [property: string]: any
}

type TargetCommentUserInfo = {
  image: string
  nickname: string
  user_id: string
  xsec_token: string;
  [property: string]: any
}

type SubCommentUserInfo = {
  image: string
  nickname: string
  user_id: string
  xsec_token: string;
  [property: string]: any
}

type CommentUserInfo = {
  image: string
  nickname: string
  user_id: string
  xsec_token: string;
  [property: string]: any
}
