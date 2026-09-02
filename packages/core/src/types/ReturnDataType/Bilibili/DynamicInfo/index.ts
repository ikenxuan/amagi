import { DynamicType } from '../DynamicType'

import {
  DynamicTypeArticle,
  DynamicTypeAV,
  DynamicTypeDraw,
  DynamicTypeForwardUnion,
  DynamicTypeLiveRcmd,
  DynamicTypeWord
} from '../Dynamic'

export { DynamicType }

export type BiliDynamicInfoUnion =
  | DynamicTypeAV
  | DynamicTypeDraw
  | DynamicTypeWord
  | DynamicTypeLiveRcmd
  | DynamicTypeForwardUnion
  | DynamicTypeArticle

type DynamicTypeItemMap = {
  [DynamicType.AV]: DynamicTypeAV['data']['item']
  [DynamicType.DRAW]: DynamicTypeDraw['data']['item']
  [DynamicType.WORD]: DynamicTypeWord['data']['item']
  [DynamicType.LIVE_RCMD]: DynamicTypeLiveRcmd['data']['item']
  [DynamicType.FORWARD]: DynamicTypeForwardUnion['data']['item']
  [DynamicType.ARTICLE]: DynamicTypeArticle['data']['item']
}

type DataData<T extends DynamicType> = {
  item: DynamicTypeItemMap[T]
}

export type BiliDynamicInfo<T extends DynamicType> = {
  code: number
  data: DataData<T>
  message: string
  ttl: number
  [property: string]: any
}
