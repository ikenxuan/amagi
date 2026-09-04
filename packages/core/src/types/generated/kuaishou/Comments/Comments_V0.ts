// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。

export type Comments_V0 = {
  commentCount: number
  pcursor: string
  result: number
  rootComments: RootComment[]
  subCommentsMap: { [property: string]: any }
  [property: string]: any
}

type RootComment = {
  attachments?: Attachment[]
  authorArea: string
  authorVerified: boolean
  author_id: number
  author_liked: boolean
  author_name: string
  cashTags: { [property: string]: any }
  commentAuthorTags: unknown[]
  commentBottomTags: unknown[]
  comment_id: number
  content: string
  displaySubCommentCount?: boolean
  headurl: string
  headurls: SmallUrl[]
  hot?: boolean
  likedCount: number
  photo_id: number
  recallType?: number
  reply_to: number
  subCommentCount?: number
  subCommentVisible?: boolean
  subCommentVisibleLimit?: number
  time: string
  timestamp: number
  type: number
  user_id: number
  user_sex: string
  [property: string]: any
}

type Attachment = {
  content: Content
  id: string
  layout: Layout
  previewURL: string
  type: string
  [property: string]: any
}

type Content = {
  photoInfo: PhotoInfo
  smallUrl: SmallUrl[]
  [property: string]: any
}

type PhotoInfo = {
  photoId: string
  photoSource: string
  photoType: number
  serverExpTag: string
  userName: string
  [property: string]: any
}

type SmallUrl = {
  cdn: string
  url: string
  [property: string]: any
}

type Layout = {
  height: number
  thumbHeight: number
  thumbWidth: number
  width: number
  [property: string]: any
}
