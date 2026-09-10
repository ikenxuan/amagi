// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/xiaohongshu/userProfile.requests.json 里
//   user_id  变体0

export type UserProfile_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  basicInfo: BasicInfo
  extraInfo: ExtraInfo
  interactions: Interaction[]
  result: Result
  tabPublic: TabPublic
  tags: Tag[]
  [property: string]: any
}

type BasicInfo = {
  desc: string
  gender: number
  imageb: string
  images: string
  ipLocation: string
  nickname: string
  redId: string
  [property: string]: any
}

type ExtraInfo = {
  blockType: string
  fstatus: string
  [property: string]: any
}

type Interaction = {
  count: string
  i18nCount: string
  name: string
  type: string
  [property: string]: any
}

type Result = {
  code: number
  message: string
  success: boolean
  [property: string]: any
}

type TabPublic = {
  collection: boolean
  collectionBoard: CollectionBoard
  collectionFile: CollectionBoard
  collectionNote: CollectionBoard
  [property: string]: any
}

type CollectionBoard = {
  count: number
  display: boolean
  lock: boolean
  [property: string]: any
}

type Tag = {
  name: string
  tagType: string
  [property: string]: any
}
