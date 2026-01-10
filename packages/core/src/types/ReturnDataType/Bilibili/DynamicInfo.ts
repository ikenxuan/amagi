import { DynamicTypeArticle, DynamicTypeAV, DynamicTypeDraw, DynamicTypeForwardUnion, DynamicTypeLiveRcmd, DynamicTypeWord } from './index'

export enum DynamicType {
  AV = 'DYNAMIC_TYPE_AV',
  DRAW = 'DYNAMIC_TYPE_DRAW',
  WORD = 'DYNAMIC_TYPE_WORD',
  LIVE_RCMD = 'DYNAMIC_TYPE_LIVE_RCMD',
  FORWARD = 'DYNAMIC_TYPE_FORWARD',
  ARTICLE = 'DYNAMIC_TYPE_ARTICLE'
}

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
  ttl: number;
  [property: string]: any
}
