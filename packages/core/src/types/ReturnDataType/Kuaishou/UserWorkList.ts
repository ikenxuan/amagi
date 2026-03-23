import type { KsUserHomeWork } from './UserHomeDetail'

/**
 * 快手用户公开视频列表。
 *
 * 该结构对应 `live_api/profile/public` 的分页结果，
 * 用于对标抖音等平台的独立用户作品列表能力。
 */
export type KsUserWorkList = {
  principalId: string
  list: KsUserHomeWork[]
  pcursor: string
  hasMore: boolean
  result: number
  [property: string]: any
}

export type { KsUserHomeWork } from './UserHomeDetail'
