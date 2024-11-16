import { bilibiliAPI, qtparam, } from 'amagi/business/bilibili'
import { Networks, logger } from 'amagi/model'
import {
  BilibiliDataType,
  NetworksConfigType,
} from 'amagi/types'

export class BilibiliData {
  type: keyof typeof BilibiliDataType
  headers: any
  URL: string | undefined
  constructor (type: keyof typeof BilibiliDataType, cookie: string | undefined) {
    this.type = type
    this.headers = {}
    this.headers.Referer = 'https://api.bilibili.com/'
    this.headers.Cookie = cookie ? cookie.replace(/\s+/g, '') : ''
    this.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0'
  }

  async GetData (data: any) {
    let result: any
    switch (this.type as keyof typeof BilibiliDataType) {
      case '单个视频作品数据': {
        const INFODATA: any = await this.GlobalGetData({ url: bilibiliAPI.视频详细信息({ id_type: 'bvid', id: data.id }) })
        return INFODATA
      }

      case '单个视频下载信息数据': {
        const BASEURL = bilibiliAPI.视频流信息({ avid: data.avid, cid: data.cid })
        const SIGN = await qtparam(BASEURL, this.headers.Cookie)
        const DATA = await this.GlobalGetData({
          url: bilibiliAPI.视频流信息({ avid: data.avid, cid: data.cid }) + SIGN.QUERY,
          headers: this.headers
        })
        return DATA
      }

      case '评论数据': {
        let fetchedComments: any[] = []
        let pn = data.pn || 1 // 页码从1开始
        const maxRequestCount = 100 // 设置一个最大请求次数限制
        const commentGrowthStabilized = 5 // 设置一个连续几次请求评论增长相同的阈值
        let lastFetchedCount = 0 // 上一次请求获取的评论数量
        let stabilizedCount = 0 // 连续几次请求评论增长相同的计数器
        let requestCount = 0 // 初始化请求计数器
        let tmpresp: any

        if (!data.bvid) {
          while (fetchedComments.length < Number(data.number || 20) && requestCount < maxRequestCount) {
            if (data.number === 0) {
              // 如果请求的评论数量为0，那么不需要进行请求
              requestCount = 0
            } else {
              // 否则，计算需要请求的评论数量
              requestCount = Math.min(20, Number(data.number) - fetchedComments.length)
            }
            const url = bilibiliAPI.评论区明细({
              type: data.type,
              oid: data.oid,
              number: requestCount,
              pn
            })
            const response = await this.GlobalGetData({
              url: url,
              headers: this.headers
            })
            tmpresp = response
            // 当请求0条评论的时候，replies为null，需额外判断
            const currentCount = response.data.replies ? response.data.replies.length : 0
            fetchedComments.push(...(response.data.replies || []))
            // 检查评论增长是否稳定
            if (currentCount === lastFetchedCount) {
              stabilizedCount++
            } else {
              stabilizedCount = 0
            }
            lastFetchedCount = currentCount

            // 如果增长稳定，并且增长量为0，或者请求次数达到最大值，则停止请求
            if (stabilizedCount >= commentGrowthStabilized || requestCount >= maxRequestCount) {
              break
            }

            pn++
            requestCount++
          }
        }
        else {
          const INFODATA: any = await this.GlobalGetData({ url: bilibiliAPI.视频详细信息({ id_type: 'bvid', id: data.bvid }) })
          while (fetchedComments.length < Number(data.number || 20) && requestCount < maxRequestCount) {
            let requestCount = Math.min(20, Number(data.number) - fetchedComments.length)
            const url = bilibiliAPI.评论区明细({
              type: data.type,
              oid: INFODATA.data.oid,
              number: requestCount,
              pn
            })
            const response = await this.GlobalGetData({
              url: url,
              headers: this.headers
            })
            tmpresp = response
            // 当请求0条评论的时候，replies为null，需额外判断
            const currentCount = response.data.replies ? response.data.replies.length : 0
            fetchedComments.push(...(response.data.replies || []))

            // 检查评论增长是否稳定
            if (currentCount === lastFetchedCount) {
              stabilizedCount++
            } else {
              stabilizedCount = 0
            }
            lastFetchedCount = currentCount

            // 如果增长稳定，并且增长量为0，或者请求次数达到最大值，则停止请求
            if (stabilizedCount >= commentGrowthStabilized || requestCount >= maxRequestCount) {
              break
            }

            pn++
            requestCount++
          }
        }
        const finalResponse = {
          ...tmpresp,
          data: {
            ...tmpresp.data,
            // 去重
            replies: Array.from(new Map(fetchedComments.map(item => [item.rpid, item])).values()).slice(0, Number(data.number))
          }
        }

        return finalResponse
      }

      case 'Emoji数据':
        return await this.GlobalGetData({ url: bilibiliAPI.表情列表() })

      case '番剧基本信息数据': {
        let cleanedId, isep: any
        if (data.ep_id) {
          cleanedId = data.ep_id.replace('ep', '')
          isep = true
        } else if (data.season_id) {
          cleanedId = data.season_id.replace('ss', '')
          isep = false
        }
        const INFO = await this.GlobalGetData({
          url: isep ? bilibiliAPI.番剧明细({ isep, id: cleanedId }) : bilibiliAPI.番剧明细({ isep, id: cleanedId }),
          headers: this.headers
        })
        return INFO
      }

      case '番剧下载信息数据':
        return await this.GlobalGetData({ url: bilibiliAPI.番剧视频流信息({ cid: data.cid, ep_id: data.ep_id }) })

      case '用户主页动态列表数据':
        delete this.headers.Referer
        result = await this.GlobalGetData({
          url: bilibiliAPI.用户空间动态({ host_mid: data.host_mid }),
          headers: this.headers
        })
        return result

      case '动态详情数据': {
        delete this.headers.Referer
        const dynamicINFO = await this.GlobalGetData({
          url: bilibiliAPI.动态详情({ dynamic_id: data.dynamic_id }),
          headers: this.headers
        })
        return dynamicINFO
      }

      case '动态卡片数据': {
        delete this.headers.Referer
        const dynamicINFO_CARD = await this.GlobalGetData({
          url: bilibiliAPI.动态卡片信息({ dynamic_id: data.dynamic_id }),
          headers: this.headers
        })
        return dynamicINFO_CARD
      }

      case '用户主页数据': {
        result = await this.GlobalGetData({
          url: bilibiliAPI.用户名片信息({ host_mid: data.host_mid }),
          headers: this.headers
        })
        return result
      }

      case '直播间信息': {
        result = await this.GlobalGetData({
          url: bilibiliAPI.直播间信息({ room_id: data.room_id }),
          headers: this.headers
        })
        return result
      }

      case '直播间初始化信息': {
        result = await this.GlobalGetData({
          url: bilibiliAPI.直播间初始化信息({ room_id: data.room_id }),
          headers: this.headers
        })
        return result
      }

      case '申请二维码': {
        result = await this.GlobalGetData({
          url: bilibiliAPI.申请二维码(),
          headers: this.headers
        })
        return result
      }

      case '二维码状态': {
        result = await new Networks({
          url: bilibiliAPI.二维码状态({ qrcode_key: data.qrcode_key }),
          headers: this.headers
        }).getHeadersAndData()
        return result
      }

      case '登录基本信息': {
        result = await this.GlobalGetData({
          url: bilibiliAPI.登录基本信息(),
          headers: this.headers
        })
        return result
      }

      case '获取UP主总播放量': {
        result = await this.GlobalGetData({
          url: bilibiliAPI.获取UP主总播放量({ host_mid: data.host_mid }),
          headers: this.headers
        })
        return result
      }

      default:
        return null
    }
  }

  async GlobalGetData (options: NetworksConfigType): Promise<any | boolean> {
    const result = await new Networks(options).getData()
    if (result && result.code !== 0) {
      const errorMessage = errorMap[result.code] || '未知错误'
      logger.warn(`获取响应数据失败！\n请求接口类型：${this.type}\n请求URL：${options.url}\n错误代码：${result.code}，\n含义：${errorMessage}`)
      return false
    } else {
      return result
    }
  }
}

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
