/**
 * ⚠️ **这份类型的字段名已经漂了，不要照它写代码。**
 *
 * 整棵 `data` 用的是驼峰（`basicInfo` / `extraInfo` / `ipLocation` / `redId` /
 * `tabPublic` / `verifyInfo`），而接口**实测返回下划线**（`basic_info`）——
 * 对应端点因此没有复用这个映射条目，自己写了一份最小声明。
 *
 * 更糟的是这些键声明成**必需**的，所以类型不只是不全，是在说谎：读
 * `data.basicInfo` 编译期毫无问题，运行时永远 `undefined`。
 *
 * 没有在这里直接改成下划线：目前只有一处证据（那份只覆盖 3 个字段的本地声明），
 * 拿不到整份真实响应。凭猜把 7 个键逐个改名，等于用一份新的猜测替换旧的猜测 ——
 * 一份「已知有问题且写明了问题」的类型，比一份「看起来对但没人验过」的类型安全。
 */
export type XiaohongshuUserProfile_V0 = {
  code: number
  data: DataData
  msg: string
  [property: string]: any
}

type DataData = {
  basicInfo: BasicInfo
  extraInfo: ExtraInfo
  interactions: Interaction[]
  result: Result
  tabPublic: TabPublic
  tags: Tag[]
  verifyInfo: VerifyInfo
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
  collectionNote: CollectionNote
  [property: string]: any
}

type CollectionBoard = {
  count: number
  display: boolean
  lock: boolean
  [property: string]: any
}

type CollectionNote = {
  count: number
  display: boolean
  lock: boolean
  [property: string]: any
}

type Tag = {
  icon?: string
  tagType?: string
  [property: string]: any
}

type VerifyInfo = {
  redOfficialVerifyType: number
  [property: string]: any
}
