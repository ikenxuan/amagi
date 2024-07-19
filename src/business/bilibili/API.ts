class BiLiBiLiAPI {

  LOGIN_INFO () {
    return 'https://api.bilibili.com/x/web-interface/nav'
  }

  INFO (data: { id_type: string, id: string }) {
    return `https://api.bilibili.com/x/web-interface/view?${data.id_type === 'bvid' ? 'bvid=' + data.id : 'aid=' + data.id}`
  }

  VIDEO (data: { avid: string, cid: string }) {
    return `https://api.bilibili.com/x/player/playurl?avid=${data.avid}&cid=${data.cid}`
  }

  /** type参数详见https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码 */
  COMMENTS (data: { type: number, oid: string }) {
    return `https://api.bilibili.com/x/v2/reply?sort=1&ps=20&type=${data.type}&oid=${data.oid}`
  }

  EMOJI () {
    return 'https://api.bilibili.com/x/emote/user/panel/web?business=reply&web_location=0.0'
  }

  bangumivideo (data: { id: string, isep: boolean | undefined }) {
    return `https://api.bilibili.com/pgc/view/web/season?${data.isep ? 'ep_id' : 'season_id'}=${data.id}`
  }

  bangumidata (data: { cid: string, ep_id: string }) {
    return `https://api.bilibili.com/pgc/player/web/playurl?cid=${data.cid}&ep_id=${data.ep_id}`
  }

  获取用户空间动态 (data: { host_mid: string }) {
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${data.host_mid}`
  }

  动态详情 (data: { dynamic_id: string }) {
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${data.dynamic_id}`
  }

  动态卡片信息 (data: { dynamic_id: string }) {
    return `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?dynamic_id=${data.dynamic_id}`
  }

  用户名片信息 (data: { host_mid: string }) {
    return `https://api.bilibili.com/x/web-interface/card?mid=${data.host_mid}&photo=true`
  }
}
export default new BiLiBiLiAPI()
