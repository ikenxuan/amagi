import { BilibiliAPIParams } from 'amagi/types'

class BiLiBiLiAPI {

  登录基本信息 () {
    return 'https://api.bilibili.com/x/web-interface/nav'
  }

  视频详细信息 (data: BilibiliAPIParams['VideoInfoParams']) {
    return `https://api.bilibili.com/x/web-interface/view?${data.id_type === 'bvid' ? 'bvid=' + data.id : 'aid=' + data.id}`
  }

  视频流信息 (data: BilibiliAPIParams['VideoStreamParams']) {
    return `https://api.bilibili.com/x/player/playurl?avid=${data.avid}&cid=${data.cid}`
  }

  /** type参数详见https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码 */
  评论区明细 (data: BilibiliAPIParams['CommentParams']) {
    return `https://api.bilibili.com/x/v2/reply?sort=1&ps=${data.number || 20}&type=${data.type}&oid=${data.oid}`
  }

  表情列表 () {
    return 'https://api.bilibili.com/x/emote/user/panel/web?business=reply&web_location=0.0'
  }

  番剧明细 (data: BilibiliAPIParams['BangumiInfoParams']) {
    return `https://api.bilibili.com/pgc/view/web/season?${data.isep ? 'ep_id' : 'season_id'}=${data.id}`
  }

  番剧视频流信息 (data: BilibiliAPIParams['BangumiStreamParams']) {
    return `https://api.bilibili.com/pgc/player/web/playurl?cid=${data.cid}&ep_id=${data.ep_id}`
  }

  用户空间动态 (data: BilibiliAPIParams['UserParams']) {
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${data.host_mid}`
  }

  动态详情 (data: BilibiliAPIParams['DynamicParams']) {
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${data.dynamic_id}`
  }

  动态卡片信息 (data: BilibiliAPIParams['DynamicParams']) {
    return `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?dynamic_id=${data.dynamic_id}`
  }

  用户名片信息 (data: BilibiliAPIParams['UserParams']) {
    return `https://api.bilibili.com/x/web-interface/card?mid=${data.host_mid}&photo=true`
  }

  直播间信息 (data: BilibiliAPIParams['LiveRoomParams']) {
    return `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${data.room_id}`
  }

  直播间初始化信息 (data: BilibiliAPIParams['LiveRoomParams']) {
    return `https://api.live.bilibili.com/room/v1/Room/room_init?id=${data.room_id}`
  }

  申请二维码 () {
    return 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate'
  }

  二维码状态 (data: BilibiliAPIParams['QrcodeParams']) {
    return `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${data.qrcode_key}`
  }
}
export default new BiLiBiLiAPI()
