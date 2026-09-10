// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/emojiResourceMeta.requests.json 里
//   无参数  成功响应

export type EmojiResourceMeta_V0 = {
  android_emoji_resource: AndroidEmojiResource
  android_emoji_status: number
  extra: Extra
  ios_emoji_resource: { [property: string]: any }
  ios_emoji_status: number
  log_pb: LogPb
  status_code: number
  status_msg: string
  [property: string]: any
}

type AndroidEmojiResource = {
  create_time: number
  id: number
  md5: string
  resource_url: string
  update_time: number
  [property: string]: any
}

type Extra = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}
