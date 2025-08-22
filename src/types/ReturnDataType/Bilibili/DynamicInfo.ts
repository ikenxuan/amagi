import { DynamicTypeAV, DynamicTypeDraw, DynamicTypeForwardUnion, DynamicTypeLiveRcmd, DynamicTypeWord } from './index'

type AVItem = DynamicTypeAV['data']['item']
type DrawItem = DynamicTypeDraw['data']['item']
type WordItem = DynamicTypeWord['data']['item']
type LiveRcmdItem = DynamicTypeLiveRcmd['data']['item']
type ForwardItem = DynamicTypeForwardUnion['data']['item']

type DynamicTypeItemMap = {
  [DynamicType.AV]: AVItem
  [DynamicType.DRAW]: DrawItem
  [DynamicType.WORD]: WordItem
  [DynamicType.LIVE_RCMD]: LiveRcmdItem
  [DynamicType.FORWARD]: ForwardItem
}

export enum DynamicType {
  AV = 'DYNAMIC_TYPE_AV',
  DRAW = 'DYNAMIC_TYPE_DRAW',
  WORD = 'DYNAMIC_TYPE_WORD',
  LIVE_RCMD = 'DYNAMIC_TYPE_LIVE_RCMD',
  FORWARD = 'DYNAMIC_TYPE_FORWARD'
}

type DataData<T extends DynamicType> = {
  item: DynamicTypeItemMap[T];
  [property: string]: any
}

export type BiliDynamicInfo<T extends DynamicType> = {
  code: number
  data: DataData<T>
  message: string
  ttl: number;
  [property: string]: any
}

export type BiliDynamicInfoUnion =
  | BiliDynamicInfo<DynamicType.AV>
  | BiliDynamicInfo<DynamicType.DRAW>
  | BiliDynamicInfo<DynamicType.WORD>
  | BiliDynamicInfo<DynamicType.LIVE_RCMD>
  | BiliDynamicInfo<DynamicType.FORWARD>