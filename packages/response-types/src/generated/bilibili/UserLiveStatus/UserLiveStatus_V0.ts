// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份样本（amagi 6.6.0）。样本不进 git，在本地 corpus/ 里
//   9b11f1fbea19  2026-09-04  host_mid

export type UserLiveStatus_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  broadcast_type: number
  cover: string
  link: string
  liveStatus: number
  online: number
  online_hidden: number
  roomStatus: number
  roomid: number
  roundStatus: number
  title: string
  url: string
  [property: string]: any
}
