export type BiliEmojiList = {
  code: number
  data: Data
  message: string
  ttl: number;
  [property: string]: any
}

type Data = {
  packages: Package[]
  setting: Setting;
  [property: string]: any
}

type Package = {
  attr: number
  emote: Emote[]
  flags: PackageFlags
  id: number
  label: null
  meta: PackageMeta
  mtime: number
  package_sub_title: string
  ref_mid: number
  resource_type: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type Emote = {
  activity: null
  attr: number
  flags: EmoteFlags
  gif_url: string
  id: number
  meta: EmoteMeta
  mtime: number
  package_id: number
  text: string
  type: number
  url: string;
  [property: string]: any
}

type EmoteFlags = {
  no_access: boolean
  unlocked: boolean;
  [property: string]: any
}

type EmoteMeta = {
  alias: string
  gif_url?: string
  size: number
  suggest: string[];
  [property: string]: any
}

type PackageFlags = {
  added: boolean
  preview?: boolean;
  [property: string]: any
}

type PackageMeta = {
  item_id: number
  size: number;
  [property: string]: any
}

type Setting = {
  attr: number
  focus_pkg_id: number
  recent_limit: number
  schema: string;
  [property: string]: any
}
