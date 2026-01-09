import { DynamicType } from './DynamicInfo'
import { DynamicTypeArticle, DynamicTypeAV, DynamicTypeDraw, DynamicTypeForwardUnion, DynamicTypeLiveRcmd, DynamicTypeWord } from './index'

export type BiliUserDynamic = {
  code: number
  data: DataData
  message: string
  ttl: number;
  [property: string]: any
}

type AVItem = DynamicTypeAV['data']['item']
type DrawItem = DynamicTypeDraw['data']['item']
type WordItem = DynamicTypeWord['data']['item']
type LiveRcmdItem = DynamicTypeLiveRcmd['data']['item']
type ForwardItem = DynamicTypeForwardUnion['data']['item']
type ArticleItem = DynamicTypeArticle['data']['item']

type DynamicTypeItemMap = {
  [DynamicType.AV]: AVItem
  [DynamicType.DRAW]: DrawItem
  [DynamicType.WORD]: WordItem
  [DynamicType.LIVE_RCMD]: LiveRcmdItem
  [DynamicType.FORWARD]: ForwardItem
  [DynamicType.ARTICLE]: ArticleItem
}

type DataData<T extends DynamicType = DynamicType> = {
  has_more: boolean
  items: DynamicTypeItemMap[T][]
  offset: string
  update_baseline: string
  update_num: number;
  [property: string]: any
}
