// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/emojiList.requests.json 里
//   无参数  变体0

export type EmojiList_V0 = {
  code: number
  data: Data
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  packages: Package[]
  setting: Setting
  [property: string]: any
}

type Package = {
  attr: number
  emote: Emote[]
  flags: Flags2
  id: number
  label: null
  meta: Meta2
  mtime: number
  package_sub_title: string
  ref_mid: number
  resource_type: number
  text: string
  type: number
  url: string
  [property: string]: any
}

type Emote = {
  activity: null
  attr: number
  flags: Flags
  gif_url?: string
  id: number
  meta: Meta
  mtime: number
  package_id: number
  text: string
  type: number
  url: string
  [property: string]: any
}

type Flags = {
  unlocked: boolean
  [property: string]: any
}

type Meta = {
  alias?: string
  size: number
  suggest: string[]
  [property: string]: any
}

type Flags2 = {
  added: boolean
  preview?: boolean
  [property: string]: any
}

type Meta2 = {
  item_id: number
  size: number
  [property: string]: any
}

type Setting = {
  attr: number
  focus_pkg_id: number
  recent_limit: number
  schema: string
  [property: string]: any
}
