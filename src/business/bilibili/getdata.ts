import { BiLiBiLiAPI, qtparam, wbi_sign } from 'amagi/business/bilibili'
import { BilibiliDataType, BilibiliOptionsType, NetworksConfigType } from 'amagi/types'
import { Networks, logger } from 'amagi/model'

export default class BilibiliData {
  type: BilibiliDataType
  headers: any
  URL: string | undefined
  constructor (type: BilibiliDataType, cookie: string) {
    this.type = type
    this.headers = {}
    this.headers.Referer = 'https://api.bilibili.com/'
    this.headers.Cookie = cookie
    this.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0'
  }

  async GetData (data: BilibiliOptionsType = {} as BilibiliOptionsType) {
    let result: any
    switch (this.type) {
      case 'VideoData': {
        const INFODATA: any = await this.GlobalGetData({ url: BiLiBiLiAPI.视频详细信息({ id_type: 'bvid', id: data.id as string }) })
        const BASEURL = BiLiBiLiAPI.视频流信息({ avid: INFODATA.data.aid, cid: INFODATA.data.cid })
        const SIGN = await qtparam(BASEURL, this.headers.cookie)
        const DATA = await this.GlobalGetData({
          url: BiLiBiLiAPI.视频流信息({ avid: INFODATA.data.aid, cid: INFODATA.data.cid }) + SIGN.QUERY,
          headers: this.headers
        })
        return { INFODATA, DATA, }
      }

      case 'CommentData': {
        const INFODATA: any = await this.GlobalGetData({ url: BiLiBiLiAPI.视频详细信息({ id_type: 'bvid', id: data.bvid as string }) })
        const PARAM = await wbi_sign(BiLiBiLiAPI.评论区明细({ type: 1, oid: INFODATA.data.aid as number }), this.headers.cookie)
        const COMMENTSDATA = await this.GlobalGetData({ url: BiLiBiLiAPI.评论区明细({ type: 1, oid: INFODATA.data.aid as number }) + PARAM, headers: this.headers })
        return COMMENTSDATA
      }

      case 'EmojiData':
        return await this.GlobalGetData({ url: BiLiBiLiAPI.表情列表() })

      case 'BangumiVideoData': {
        let isep
        if (data?.id?.startsWith('ss')) {
          data.id = data.id.replace('ss', '')
          isep = false
        } else if (data?.id?.startsWith('ep')) {
          data.id = data?.id?.replace('ep', '')
          isep = true
        }
        const INFO = await this.GlobalGetData({
          url: BiLiBiLiAPI.番剧明细({ id: data.id as string, isep }),
          headers: this.headers
        })
        return INFO
      }

      case 'BangumiVideoDownloadLinkData':
        return await this.GlobalGetData({ url: BiLiBiLiAPI.番剧视频流信息({ cid: data.cid as string, ep_id: data.ep_id as string }) })

      case 'UserDynamicListData':
        delete this.headers.Referer
        result = await this.GlobalGetData({
          url: BiLiBiLiAPI.用户空间动态({ host_mid: data.host_mid as string }),
          headers: this.headers
        })
        return result

      case 'DynamicInfoData': {
        delete this.headers.Referer
        const dynamicINFO = await this.GlobalGetData({
          url: BiLiBiLiAPI.动态详情({ dynamic_id: data.dynamic_id as string }),
          headers: this.headers
        })
        return dynamicINFO
      }

      case 'DynamicCardData': {
        delete this.headers.Referer
        const dynamicINFO_CARD = await this.GlobalGetData({
          url: BiLiBiLiAPI.动态卡片信息({ dynamic_id: data.dynamic_id as string }),
          headers: this.headers
        })
        return dynamicINFO_CARD
      }

      case 'UserInfoData':
        result = await this.GlobalGetData({
          url: BiLiBiLiAPI.用户名片信息({ host_mid: data.host_mid as string }),
          headers: this.headers
        })
        return result
    }
  }

  async GlobalGetData (options: NetworksConfigType) {
    const result = await new Networks(options).getData()
    if (result && result.code !== 0) {
      const errorMessage = errorMap[result.code] || '未知错误'
      logger.error(`响应数据失败！\n请求接口类型：${this.type}\n请求URL：${options.url}\n错误代码：${result.code}，\n含义：${errorMessage}`)
      return null
    } else {
      return result
    }
  }
}
function mapping_table (type: string) {
  // 使用类型断言来告诉 TypeScript 编译器 Array 对象实际上是一个可以接受字符串索引的对象
  const Array: { [key: string]: string[] } = {
    1: ['DYNAMIC_TYPE_AV', 'DYNAMIC_TYPE_PGC', 'DYNAMIC_TYPE_UGC_SEASON'],
    11: ['DYNAMIC_TYPE_DRAW'],
    12: ['DYNAMIC_TYPE_ARTICLE'],
    17: ['DYNAMIC_TYPE_LIVE_RCMD', 'DYNAMIC_TYPE_FORWARD', 'DYNAMIC_TYPE_WORD', 'DYNAMIC_TYPE_COMMON_SQUARE'],
    19: ['DYNAMIC_TYPE_MEDIALIST']
  }
  for (const key in Array) {
    if (Array[key].includes(type)) {
      return parseInt(key)
    }
  }
  return 1
}

function oid (dynamicINFO: any, dynamicINFO_CARD: any): string {
  if (dynamicINFO.data.item.type == 'DYNAMIC_TYPE_WORD') {
    return dynamicINFO.data.item.id_str
  } else return dynamicINFO_CARD.data.card.desc.rid
}

// 同上
const errorMap: { [key: string]: string } = {
  '-1': '应用程序不存在或已被封禁',
  '-2': 'Access Key 错误',
  '-3': 'API 校验密匙错误',
  '-4': '调用方对该 Method 没有权限',
  '-101': '账号未登录',
  '-102': '账号被封停',
  '-103': '积分不足',
  '-104': '硬币不足',
  '-105': '验证码错误',
  '-106': '账号非正式会员或在适应期',
  '-107': '应用不存在或者被封禁',
  '-108': '未绑定手机',
  '-110': '未绑定手机',
  '-111': 'csrf 校验失败',
  '-112': '系统升级中',
  '-113': '账号尚未实名认证',
  '-114': '请先绑定手机',
  '-115': '请先完成实名认证',
  '-304': '木有改动',
  '-307': '撞车跳转',
  '-352': '风控校验失败 (UA 或 wbi 参数不合法)',
  '-400': '请求错误',
  '-401': '未认证 (或非法请求)',
  '-403': '访问权限不足',
  '-404': '啥都木有',
  '-405': '不支持该方法',
  '-409': '冲突',
  '-412': '请求被拦截 (客户端 ip 被服务端风控)',
  '-500': '服务器错误',
  '-503': '过载保护,服务暂不可用',
  '-504': '服务调用超时',
  '-509': '超出限制',
  '-616': '上传文件不存在',
  '-617': '上传文件太大',
  '-625': '登录失败次数太多',
  '-626': '用户不存在',
  '-628': '密码太弱',
  '-629': '用户名或密码错误',
  '-632': '操作对象数量限制',
  '-643': '被锁定',
  '-650': '用户等级太低',
  '-652': '重复的用户',
  '-658': 'Token 过期',
  '-662': '密码时间戳过期',
  '-688': '地理区域限制',
  '-689': '版权限制',
  '-701': '扣节操失败',
  '-799': '请求过于频繁，请稍后再试',
  '-8888': '对不起，服务器开小差了~ (ಥ﹏ಥ)'
}
