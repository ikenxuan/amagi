import { logger, Networks } from 'amagi/model'
/**
 * B站数据获取模块
 * 
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/bilibili → DataFetchers
 */
import { qtparam } from './qtparam'
import { av2bv, bv2av } from './sign/bv2av'
import { bilibiliApiUrls } from './API'
import {
  BilibiliDataOptionsMap,
  NetworksConfigType
} from 'amagi/types'
import { amagiAPIErrorCode, bilibiliAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
import { RawAxiosResponseHeaders } from 'axios'
import { wbi_sign } from './sign/wbi'

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

export const fetchBilibili = async <T extends keyof BilibiliDataOptionsMap> (
  data: BilibiliDataOptionsMap[T]['opt'],
  cookie?: string
) => {
  const headers = {
    ...defheaders,
    cookie: cookie ? cookie.replace(/\s+/g, '') : ''
  }

  switch (data.methodType) {
    case '单个视频作品数据': {
      const INFODATA = await GlobalGetData({
        url: bilibiliApiUrls.视频详细信息({ bvid: data.bvid }),
        ...data
      })
      return INFODATA
    }

    case '单个视频下载信息数据': {
      const BASEURL = bilibiliApiUrls.视频流信息({ avid: data.avid, cid: data.cid })
      const SIGN = await qtparam(BASEURL, headers.cookie)
      const DATA = await GlobalGetData({
        url: bilibiliApiUrls.视频流信息({ avid: data.avid, cid: data.cid }) + SIGN.QUERY,
        headers,
        ...data
      })
      return DATA
    }

    case '评论数据': {
      let { oid, number, type, mode, pagination_str, plat, seek_rpid, web_location } = data
      let fetchedComments: any[] = []
      const maxRequestCount = 100 // 设置一个最大请求次数限制
      let requestCount = 0 // 初始化请求计数器
      let tmpresp: any
      let nextPaginationStr = pagination_str // 用于懒加载的分页字符串
      let isEnd = false // 是否到达末尾

      // 检查评论区状态
      const checkStatusUrl = bilibiliApiUrls.评论区状态({ oid, type })
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

      while (fetchedComments.length < Number(number ?? 20) && requestCount < maxRequestCount && !isEnd) {
        // 构建基础URL（不包含WBI签名）
        const baseUrl = bilibiliApiUrls.评论区明细({
          type,
          oid,
          mode: mode ?? 3,
          pagination_str: nextPaginationStr,
          plat: plat ?? 1,
          seek_rpid,
          web_location: web_location ?? '1315875'
        })

        // 每次请求都需要进行WBI签名
        const wbiSignQuery = await wbi_sign(baseUrl, headers.cookie)
        const finalUrl = baseUrl + wbiSignQuery

        const response = await GlobalGetData({
          url: finalUrl,
          headers,
          ...data
        })

        tmpresp = response

        // 懒加载接口返回的数据结构
        const currentComments = response.data?.replies || []
        fetchedComments.push(...currentComments)

        // 更新分页信息和结束状态
        if (response.data?.cursor) {
          // 从cursor.pagination_reply.next_offset获取下一页的分页字符串
          nextPaginationStr = response.data.cursor.pagination_reply?.next_offset
          isEnd = response.data.cursor.is_end
        } else {
          isEnd = true
        }

        requestCount++

        // 如果已经到达末尾或没有更多评论，停止请求
        if (isEnd || currentComments.length === 0 || !nextPaginationStr) {
          logger.info('已到达评论末尾或无更多评论')
          break
        }
      }

      const finalResponse = {
        ...tmpresp,
        data: {
          ...tmpresp.data,
          // 去重并限制数量
          replies: Array.from(new Map(fetchedComments.map(item => [item.rpid, item])).values()).slice(0, Number(data.number || 20))
        }
      }
      return finalResponse
    }

    case 'Emoji数据': {
      return await GlobalGetData({
        url: bilibiliApiUrls.表情列表(),
        ...data
      })
    }

    case '番剧基本信息数据': {
      /** 提取出ep_id或season_id */
      let id = data.ep_id ? data.ep_id : data.season_id
      /** 参数检查 */
      if (!id) {
        return false
      }
      /** 确定id类型 */
      const idType = id ? id.startsWith('ep') ? 'ep_id' : 'season_id' : 'ep_id'

      const newId = idType === 'ep_id' ? id.replace('ep', '') : id.replace('ss', '')
      const INFO = await GlobalGetData({
        url: bilibiliApiUrls.番剧明细({ [idType]: newId }),
        headers,
        ...data
      })
      return INFO
    }

    case '番剧下载信息数据': {
      const BASEURL = bilibiliApiUrls.番剧视频流信息({ cid: data.cid, ep_id: data.ep_id.replace('ep', '') })
      const SIGN = await qtparam(BASEURL, headers.cookie)
      const DATA = await GlobalGetData({
        url: bilibiliApiUrls.番剧视频流信息({ cid: data.cid, ep_id: data.ep_id.replace('ep', '') }) + SIGN.QUERY,
        headers,
        ...data
      })

      return DATA
    }

    case '用户主页动态列表数据': {
      delete headers.referer
      const { host_mid } = data
      const result = await GlobalGetData({
        url: bilibiliApiUrls.用户空间动态({ host_mid }),
        headers,
        ...data
      })
      return result
    }

    case '动态详情数据': {
      delete headers.referer
      const dynamicINFO = await GlobalGetData({
        url: bilibiliApiUrls.动态详情({ dynamic_id: data.dynamic_id }),
        headers,
        ...data
      })
      return dynamicINFO
    }

    case '动态卡片数据': {
      delete headers.referer
      const { dynamic_id } = data
      const dynamicINFO_CARD = await GlobalGetData({
        url: bilibiliApiUrls.动态卡片信息({ dynamic_id }),
        headers,
        ...data
      })
      return dynamicINFO_CARD
    }

    case '用户主页数据': {
      const { host_mid } = data
      const result = await GlobalGetData({
        url: bilibiliApiUrls.用户名片信息({ host_mid }),
        headers,
        ...data
      })
      return result
    }

    case '直播间信息': {
      const result = await GlobalGetData({
        url: bilibiliApiUrls.直播间信息({ room_id: data.room_id }),
        headers,
        ...data
      })
      return result
    }

    case '直播间初始化信息': {
      const result = await GlobalGetData({
        url: bilibiliApiUrls.直播间初始化信息({ room_id: data.room_id }),
        headers,
        ...data
      })
      return result
    }

    case '申请二维码': {
      const result = await GlobalGetData({
        url: bilibiliApiUrls.申请二维码(),
        headers,
        ...data
      })
      return result
    }

    case '二维码状态': {
      const result = await new Networks({
        url: bilibiliApiUrls.二维码状态({ qrcode_key: data.qrcode_key }),
        headers,
        ...data
      }).getHeadersAndData()
      return result
    }

    case '登录基本信息': {
      const result = await GlobalGetData({
        url: bilibiliApiUrls.登录基本信息(),
        headers,
        ...data
      })
      return result
    }

    case '获取UP主总播放量': {
      const result = await GlobalGetData({
        url: bilibiliApiUrls.获取UP主总播放量({ host_mid: data.host_mid }),
        headers,
        ...data
      })
      return result
    }

    case 'AV转BV': {
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
      logger.warn(`未知的B站数据接口：「${logger.red((data as any).methodType)}」`)
      return null
  }
}

/**
 * 获取数据
 * @param options - 网络请求配置
 * @returns
 */
const GlobalGetData = async (options: NetworksConfigType): Promise<any | ErrorDetail> => {
  let warningMessage = ''
  try {
    const result = await new Networks(options).getData()

    if (!result || result === '') {
      const Err: ErrorDetail = {
        errorDescription: '获取响应数据失败！接口返回内容为空，你的B站ck可能已经失效！',
        requestType: options.methodType ?? '未知请求类型',
        requestUrl: options.url,
      }

      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的B站ck可能已经失效！')}
      请求类型：「${options.methodType}」
      请求URL：${options.url}
      `
      logger.warn(warningMessage)
      throw {
        code: bilibiliAPIErrorCode.RISK_CONTROL_FAILED,
        data: result,
        amagiError: Err
      }
    }

    if (result.code !== 0) {
      const errorMessage = bilibiliErrorCodeMap[result.code as keyof typeof bilibiliErrorCodeMap] || result.message || '未知错误'
      const Err: ErrorDetail = {
        errorDescription: `获取响应数据失败！原因：${errorMessage}！`,
        requestType: options.methodType ?? '未知请求类型',
        requestUrl: options.url,
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow(errorMessage)}
      错误代码：${result.code}
      请求类型：「${options.methodType}」
      请求URL：${options.url}
      `
      logger.warn(warningMessage)
      throw {
        code: result.code,
        data: result,
        amagiError: Err
      }
    }

    return result
  } catch (error) {
    if (error && typeof error === 'object') {
      const err = error as ErrorDetail
      return { ...err, amagiMessage: warningMessage }
    }
    return {
      code: amagiAPIErrorCode.UNKNOWN,
      data: (error as any).data,
      amagiError: {
        errorDescription: '未知错误',
        requestType: options.methodType,
        requestUrl: options.url,
      },
      amagiMessage: warningMessage
    }
  }
}

/**
 * 哔哩哔哩API官方HTTP请求错误码
 */
export const bilibiliErrorCodeMap = {
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
