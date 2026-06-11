import { DynamicType } from '../../DynamicInfo'
import { DynamicTypeAV, DynamicTypeDraw, DynamicTypeLiveRcmd, DynamicTypeWord } from './Forward'

// 辅助类型：只修正 orig.type，不动其他字段。不用 Omit，避免索引签名导致所有属性变 any
type FixOrig<O, LiteralType extends string> = O & { type: LiteralType }

type OriginalDynamicItemMap = {
  [DynamicType.AV]: DynamicTypeAV['data']['item']
  [DynamicType.DRAW]: DynamicTypeDraw['data']['item']
  [DynamicType.WORD]: DynamicTypeWord['data']['item']
  [DynamicType.LIVE_RCMD]: DynamicTypeLiveRcmd['data']['item']
}

// 所有转发动态的 item 结构都一样，从 WORD 取一份做公共类型
type ItemBasic =
  | DynamicTypeWord['data']['item']['basic']
  | DynamicTypeLiveRcmd['data']['item']['basic']
  | DynamicTypeDraw['data']['item']['basic']
  | DynamicTypeAV['data']['item']['basic']
type ItemModules =
  | DynamicTypeWord['data']['item']['modules']
  | DynamicTypeLiveRcmd['data']['item']['modules']
  | DynamicTypeDraw['data']['item']['modules']
  | DynamicTypeAV['data']['item']['modules']

type DataData<T extends keyof OriginalDynamicItemMap> = {
  item: {
    basic: ItemBasic
    id_str: string
    modules: ItemModules
    orig: FixOrig<OriginalDynamicItemMap[T]['orig'], T>
    type: DynamicType.FORWARD
    visible: boolean
    [property: string]: any
  }
  [property: string]: any
}

export type DynamicTypeForward<T extends keyof OriginalDynamicItemMap> = {
  code: number
  data: DataData<T>
  message: string
  ttl: number
  [property: string]: any
}

export type DynamicTypeForwardUnion =
  | DynamicTypeForward<DynamicType.AV>
  | DynamicTypeForward<DynamicType.DRAW>
  | DynamicTypeForward<DynamicType.WORD>
  | DynamicTypeForward<DynamicType.LIVE_RCMD>
