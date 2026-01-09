import { DynamicType } from '../DynamicInfo'
import { DynamicTypeAV, DynamicTypeDraw, DynamicTypeLiveRcmd, DynamicTypeWord } from './Forward'

type OriginalDynamicItemMap = {
  [DynamicType.AV]: DynamicTypeAV['data']['item']
  [DynamicType.DRAW]: DynamicTypeDraw['data']['item']
  [DynamicType.WORD]: DynamicTypeWord['data']['item']
  [DynamicType.LIVE_RCMD]: DynamicTypeLiveRcmd['data']['item']
}

type ItemBasic = OriginalDynamicItemMap[DynamicType.DRAW]['basic']
type ItemModules = OriginalDynamicItemMap[DynamicType.DRAW]['modules']

type DataData<T extends keyof OriginalDynamicItemMap> = {
  item: {
    basic: ItemBasic
    id_str: string
    modules: ItemModules
    orig: OriginalDynamicItemMap[T]['orig']
    type: DynamicType.FORWARD
    visible: boolean;
    [property: string]: any
  };
  [property: string]: any
}

export type DynamicTypeForward<T extends keyof OriginalDynamicItemMap> = {
  code: number
  data: DataData<T>
  message: string
  ttl: number;
  [property: string]: any
}

export type DynamicTypeForwardUnion =
  | DynamicTypeForward<DynamicType.AV>
  | DynamicTypeForward<DynamicType.DRAW>
  | DynamicTypeForward<DynamicType.WORD>
  | DynamicTypeForward<DynamicType.LIVE_RCMD>
