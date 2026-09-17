// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/kuaishou/comments.requests.json 里
//   photoId  变体0

export type Comments_V0 = {
  commentCount: number
  pcursor: string
  result: number
  rootComments: RootComment[]
  sinkCommentIds: number[]
  subCommentsMap: SubCommentsMap
  [property: string]: any
}

type RootComment = {
  authorVerified: boolean
  author_id: number
  author_liked: boolean
  author_name: string
  cashTags: { [property: string]: any }
  commentAuthorTags: unknown[]
  commentBottomTags: CommentBottomTag[]
  comment_id: number
  content: string
  displaySubCommentCount?: boolean
  headurl: string
  headurls: Headurl[]
  hot?: boolean
  likedCount: number
  photo_id: number
  recallType?: number
  reply_to: number
  subCommentCount?: number
  time: string
  timestamp: number
  type: number
  user_id: number
  user_sex: string
  [property: string]: any
}

type CommentBottomTag = {
  bgColor: string
  bgColorNight: string
  extra: string
  text: string
  textColor: string
  textColorNight: string
  textKey: string
  [property: string]: any
}

type Headurl = {
  cdn: string
  url: string
  [property: string]: any
}

type SubCommentsMap = {
  '1171179464225': T1171179464225
  [property: string]: any
}

type T1171179464225 = {
  pcursor: string
  subComments: SubComment[]
  [property: string]: any
}

type SubComment = {
  authorVerified: boolean
  author_id: number
  author_liked: boolean
  author_name: string
  cashTags: { [property: string]: any }
  commentAuthorTags: unknown[]
  commentBottomTags: unknown[]
  comment_id: number
  content: string
  headurl: string
  headurls: Headurl[]
  likedCount: number
  photo_id: number
  replyToUserName: string
  reply_to: number
  time: string
  timestamp: number
  type: number
  user_id: number
  user_sex: string
  [property: string]: any
}
