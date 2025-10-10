export type XiaohongshuUserProfile = {
  code: number
  data: DataData
  msg: string;
  [property: string]: any
}

type DataData = {
  basicInfo: BasicInfo
  extraInfo: ExtraInfo
  interactions: Interaction[]
  result: Result
  tabPublic: TabPublic
  tags: Tag[]
  verifyInfo: VerifyInfo;
  [property: string]: any
}

type BasicInfo = {
  desc: string
  gender: number
  imageb: string
  images: string
  ipLocation: string
  nickname: string
  redId: string;
  [property: string]: any
}

type ExtraInfo = {
  blockType: string
  fstatus: string;
  [property: string]: any
}

type Interaction = {
  count: string
  name: string
  type: string;
  [property: string]: any
}

type Result = {
  code: number
  message: string
  success: boolean;
  [property: string]: any
}

type TabPublic = {
  collection: boolean
  collectionBoard: CollectionBoard
  collectionNote: CollectionNote;
  [property: string]: any
}

type CollectionBoard = {
  count: number
  display: boolean
  lock: boolean;
  [property: string]: any
}

type CollectionNote = {
  count: number
  display: boolean
  lock: boolean;
  [property: string]: any
}

type Tag = {
  icon?: string
  tagType?: string;
  [property: string]: any
}

type VerifyInfo = {
  redOfficialVerifyType: number;
  [property: string]: any
}