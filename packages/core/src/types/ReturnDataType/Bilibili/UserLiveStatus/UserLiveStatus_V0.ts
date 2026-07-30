/**
 * B站按用户 UID 查询直播状态接口返回值。
 *
 * @remarks
 * `data.liveStatus` 为 `1` 时表示正在直播，`data.roomStatus` 为 `1` 时表示用户已开通直播间。
 */
export type BiliUserLiveStatus_V0 = {
  code: number
  data: {
    /** 直播类型，`0` 为普通直播。 */
    broadcast_type: number
    /** 直播封面。 */
    cover: string
    /** 当前直播状态，`0` 为未开播，`1` 为直播中。 */
    liveStatus: number
    /** 直播间跳转链接。 */
    link: string
    /** 当前人气值。 */
    online: number
    /** 人气值是否隐藏。 */
    online_hidden: number
    /** 轮播状态。 */
    roundStatus: number
    /** 直播间状态，`0` 为未开通，`1` 为已开通。 */
    roomStatus: number
    /** 直播间 ID，未开通直播间时为 `0`。 */
    roomid: number
    /** 直播间标题。 */
    title: string
    /** 直播间地址。 */
    url: string
    [property: string]: any
  }
  message: string
  ttl: number
  [property: string]: any
}
