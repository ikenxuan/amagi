import { logger, Networks, validateData } from 'amagi/model'
import { av2bv, bilibiliAPI, bv2av, qtparam } from 'amagi/platform/bilibili'
import {
  BilibiliDataOptionsMap,
  NetworksConfigType
} from 'amagi/types'
import { RawAxiosResponseHeaders } from 'axios'

interface CustomHeaders extends RawAxiosResponseHeaders {
  referer?: string
}

const defheaders: CustomHeaders = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'cache-control': 'max-age=0',
  priority: 'u=0, i',
  'sec-ch-ua': '\'Microsoft Edge\';v=\'131\', \'Chromium\';v=\'131\', \'Not_A Brand\';v=\'24\'',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '\'Windows\'',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  referer: 'https://www.bilibili.com/'
}

export const BilibiliData = async <T extends keyof BilibiliDataOptionsMap> (
  data: BilibiliDataOptionsMap[T],
  cookie?: string
) => {
  const headers = {
    ...defheaders,
    cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }

  switch (data.methodType) {
    case '单个视频作品数据': {
      validateData(data, ['bvid'])
      const INFODATA = await GlobalGetData({
        url: bilibiliAPI.视频详细信息({ bvid: data.bvid }),
        ...data
      })
      return INFODATA
    }

    case '单个视频下载信息数据': {
      validateData(data, ['avid', 'cid'])
      const BASEURL = bilibiliAPI.视频流信息({ avid: data.avid, cid: data.cid })
      const SIGN = await qtparam(BASEURL, headers.cookie)
      const DATA = await GlobalGetData({
        url: bilibiliAPI.视频流信息({ avid: data.avid, cid: data.cid }) + SIGN.QUERY,
        headers,
        ...data
      })
      return DATA
    }

    case '评论数据': {
      validateData(data, ['oid', 'type'])
      let { oid, number, pn, type } = data
      let fetchedComments: any[] = []
      pn = pn ?? 1 // 页码从1开始
      const maxRequestCount = 100 // 设置一个最大请求次数限制
      const commentGrowthStabilized = 5 // 设置一个连续几次请求评论增长相同的阈值
      let lastFetchedCount = 0 // 上一次请求获取的评论数量
      let stabilizedCount = 0 // 连续几次请求评论增长相同的计数器
      let requestCount = 0 // 初始化请求计数器
      let tmpresp: any

      try {
        while (fetchedComments.length < Number(number ?? 20) && requestCount < maxRequestCount) {
          if (number === 0 || number === undefined) {
            // 如果请求的评论数量为0，那么不需要进行请求
            requestCount = 0
          } else {
            // 否则，计算需要请求的评论数量
            requestCount = Math.min(20, Number(number) - fetchedComments.length)
          }
          const url = bilibiliAPI.评论区明细({
            type,
            oid,
            number: requestCount,
            pn
          })
          const checkStatusUrl = bilibiliAPI.评论区状态({ oid, type })
          const checkStatusRes = await GlobalGetData({
            url: checkStatusUrl,
            headers,
            ...data
          })
          if (checkStatusRes.data === null) {
            logger.error('评论区未开放')
            return {
              code: 404,
              message: '评论区未开放',
              data: null
            }
          }
          const response = await GlobalGetData({
            url,
            headers,
            ...data
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
      } catch {
        return false
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

    case 'Emoji数据': {
      return await GlobalGetData({
        url: bilibiliAPI.表情列表(),
        ...data
      })
    }

    case '番剧基本信息数据': {
      /** 提取出ep_id或season_id */
      let id = data.ep_id ? data.ep_id : data.season_id
      /** 参数检查 */
      if (!id) {
        validateData(data, ['ep_id'])
        return false
      }
      /** 确定id类型 */
      const idType = id ? id.startsWith('ep') ? 'ep_id' : 'season_id' : 'ep_id'

      const newId = idType === 'ep_id' ? id.replace('ep', '') : id.replace('ss', '')
      const INFO = await GlobalGetData({
        url: bilibiliAPI.番剧明细({ [idType]: newId }),
        headers,
        ...data
      })
      return INFO
    }

    case '番剧下载信息数据': {
      validateData(data, ['cid', 'ep_id'])
      const result = await GlobalGetData({
        url: bilibiliAPI.番剧视频流信息({ cid: data.cid, ep_id: data.ep_id.replace('ep', '') }),
        ...data
      })
      return result
    }
    case '用户主页动态列表数据': {
      validateData(data, ['host_mid'])
      delete headers.referer
      const { host_mid } = data
      const result = await GlobalGetData({
        url: bilibiliAPI.用户空间动态({ host_mid }),
        headers,
        ...data
      })
      return result
    }

    case '动态详情数据': {
      validateData(data, ['dynamic_id'])
      delete headers.referer
      const dynamicINFO = await GlobalGetData({
        url: bilibiliAPI.动态详情({ dynamic_id: data.dynamic_id }),
        headers,
        ...data
      })
      return dynamicINFO
    }

    case '动态卡片数据': {
      validateData(data, ['dynamic_id'])
      delete headers.referer
      const { dynamic_id } = data
      const dynamicINFO_CARD = await GlobalGetData({
        url: bilibiliAPI.动态卡片信息({ dynamic_id }),
        headers,
        ...data
      })
      return dynamicINFO_CARD
    }

    case '用户主页数据': {
      validateData(data, ['host_mid'])
      const { host_mid } = data
      const result = await GlobalGetData({
        url: bilibiliAPI.用户名片信息({ host_mid }),
        headers,
        ...data
      })
      return result
    }

    case '直播间信息': {
      validateData(data, ['room_id'])
      const result = await GlobalGetData({
        url: bilibiliAPI.直播间信息({ room_id: data.room_id }),
        headers,
        ...data
      })
      return result
    }

    case '直播间初始化信息': {
      validateData(data, ['room_id'])
      const result = await GlobalGetData({
        url: bilibiliAPI.直播间初始化信息({ room_id: data.room_id }),
        headers,
        ...data
      })
      return result
    }

    case '申请二维码': {
      const result = await GlobalGetData({
        url: bilibiliAPI.申请二维码(),
        headers,
        ...data
      })
      return result
    }

    case '二维码状态': {
      validateData(data, ['qrcode_key'])
      const result = await new Networks({
        url: bilibiliAPI.二维码状态({ qrcode_key: data.qrcode_key }),
        headers,
        ...data
      }).getHeadersAndData()
      return result
    }

    case '登录基本信息': {
      const result = await GlobalGetData({
        url: bilibiliAPI.登录基本信息(),
        headers,
        ...data
      })
      return result
    }

    case '获取UP主总播放量': {
      validateData(data, ['host_mid'])
      const result = await GlobalGetData({
        url: bilibiliAPI.获取UP主总播放量({ host_mid: data.host_mid }),
        headers,
        ...data
      })
      return result
    }

    case 'AV转BV': {
      validateData(data, ['avid'])
      const result = av2bv(Number(data.avid.toString().replace(/^av/i, '')))
      return {
        code: 0,
        message: 'success',
        data: {
          bvid: result
        }
      }
    }

    case 'BV转AV': {
      validateData(data, ['bvid'])
      const result = 'av' + bv2av(data.bvid)
      return {
        code: 0,
        message: 'success',
        data: {
          aid: result
        }
      }
    }

    default:
      return null
  }
}

/**
   * 获取数据
   * @param options - 网络请求配置
   * @returns
   */
const GlobalGetData = async (options: NetworksConfigType): Promise<any | boolean> => {
  const result = await new Networks(options).getData()

  if (result && result.code === 0) {
    return result
  } else if (result.code === 12061) {
    logger.warn(`获取响应数据失败！\n请求接口类型：${options.methodType}\n请求URL：${options.url}\n错误代码：${result.code}，\n含义：${result.message}`)
    return result
  } else {
    const errorMessage = errorMap[result.code] || result.message || '未知错误'
    logger.warn(`获取响应数据失败！\n请求接口类型：${options.methodType}\n请求URL：${options.url}\n错误代码：${result.code}，\n含义：${errorMessage}`)
    return false
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
