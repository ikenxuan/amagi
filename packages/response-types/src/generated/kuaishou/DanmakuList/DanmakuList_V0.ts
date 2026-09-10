// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/kuaishou/danmakuList.requests.json 里
//   photoId  变体0

export type DanmakuList_V0 = {
  data: Data
  [property: string]: any
}

type Data = {
  visionDanmaku: VisionDanmaku
  [property: string]: any
}

type VisionDanmaku = {
  __typename: string
  danmakus: Danmaku[]
  pcursor: string
  positionFromInclude: number
  positionToExclude: number
  result: number
  [property: string]: any
}

type Danmaku = {
  __typename: string
  body: string
  id: number
  isLiked: null
  isShow: boolean
  likeCount: null
  position: number
  quality: number
  userId: string
  [property: string]: any
}
