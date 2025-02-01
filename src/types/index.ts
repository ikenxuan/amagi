import type { BilibiliDataOptionsMap, BilibiliMethodOptionsMap } from './BilibiliAPIParams'
import type { DouyinDataOptionsMap, DouyinMethodOptionsMap } from './DouyinAPIParams'
import type { KuaishouDataOptionsMap } from './KuaishouAPIParams'
import type { NetworksConfigType } from './NetworksConfigType'

/** 定义一个泛型类型 OmitMethodType<T>，从类型 T 中排除 'methodType' 属性 */
export type OmitMethodType<T> = Omit<T, 'methodType'>

// 定义排除 methodType 后的新类型
export type DouyinDataOptions<T extends keyof DouyinDataOptionsMap> = OmitMethodType<DouyinDataOptionsMap[T]['opt']>
export type BilibiliDataOptions<T extends keyof BilibiliDataOptionsMap> = OmitMethodType<BilibiliDataOptionsMap[T]['opt']>
export type KuaishouDataOptions<T extends keyof KuaishouDataOptionsMap> = OmitMethodType<KuaishouDataOptionsMap[T]['opt']>

export {
  BilibiliDataOptionsMap,
  BilibiliMethodOptionsMap,
  DouyinDataOptionsMap,
  DouyinMethodOptionsMap,
  KuaishouDataOptionsMap,
  NetworksConfigType
}
