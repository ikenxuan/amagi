import { fetchData, getHeadersAndData, isNetworkErrorResult, logger } from 'amagi/model'
import { getBilibiliDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import {
  BilibiliDataOptionsMap,
  BiliCheckQrcode
} from 'amagi/types'
import { amagiAPIErrorCode, bilibiliAPIErrorCode, ErrorDetail } from 'amagi/types/NetworksConfigType'
import { AxiosRequestConfig } from 'axios'

import { bilibiliApiUrls } from './API'
/**
 * B站数据获取模块
 *
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/bilibili → DataFetchers
 */
import { qtparam } from './qtparam'
import { av2bv, bv2av } from './sign/bv2av'
import { parseDmSegMobileReply } from './sign/danmaku_proto'
import { wbi_sign } from './sign/wbi'

/**
 * B站数据获取函数
 * @param data - 请求数据参数
 * @param cookie - 用户Cookie
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 返回B站数据
 */
export const fetchBilibili = async <T extends keyof BilibiliDataOptionsMap> (
  data: BilibiliDataOptionsMap[T]['opt'],
  cookie?: string,
  requestConfig?: RequestConfig
) => {
  // 直接使用 getBilibiliDefaultConfig 合并配置，它会处理 headers 优先级
  const baseRequestConfig = getBilibiliDefaultConfig(cookie, requestConfig)

  switch (data.methodType) {
    case '单个视频作品数据': {
      const INFODATA = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.视频详细信息({ bvid: data.bvid })
      })
      return INFODATA
    }

    case '单个视频下载信息数据': {
      const BASEURL = bilibiliApiUrls.视频流信息({ avid: data.avid, cid: data.cid })
      const SIGN = await qtparam(BASEURL, baseRequestConfig.headers?.Cookie as string)
      const DATA = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.视频流信息({ avid: data.avid, cid: data.cid }) + SIGN.QUERY
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
      const checkStatusRes = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: checkStatusUrl
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
        const wbiSignQuery = await wbi_sign(baseUrl, baseRequestConfig.headers?.cookie as string)
        const finalUrl = baseUrl + wbiSignQuery

        const response = await GlobalGetData(data.methodType, {
          ...baseRequestConfig,
          url: finalUrl
        })

        tmpresp = response

        // 懒加载接口返回的数据结构
        const currentComments = response.data?.replies ?? []
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
          replies: Array.from(new Map(fetchedComments.map(item => [item.rpid, item])).values()).slice(0, Number(data.number ?? 20))
        }
      }
      return finalResponse
    }

    case '指定评论的回复': {
      return await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.指定评论的回复(data)
      })
    }

    case 'Emoji数据': {
      return await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.表情列表()
      })
    }

    case '番剧基本信息数据': {
      /** 提取出ep_id或season_id */
      let id = data.ep_id ?? data.season_id
      /** 参数检查 */
      if (!id) {
        return false
      }
      /** 确定id类型 */
      const idType = id ? id.startsWith('ep') ? 'ep_id' : 'season_id' : 'ep_id'

      const newId = idType === 'ep_id' ? id.replace('ep', '') : id.replace('ss', '')
      const INFO = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.番剧明细({ [idType]: newId })
      })
      return INFO
    }

    case '番剧下载信息数据': {
      const BASEURL = bilibiliApiUrls.番剧视频流信息({ cid: data.cid, ep_id: data.ep_id.replace('ep', '') })
      const SIGN = await qtparam(BASEURL, baseRequestConfig.headers?.cookie as string)
      const DATA = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.番剧视频流信息({ cid: data.cid, ep_id: data.ep_id.replace('ep', '') }) + SIGN.QUERY
      })

      return DATA
    }

    case '用户主页动态列表数据': {
      const { host_mid } = data
      // 检查外部是否已配置 referer
      const hasExternalReferer = requestConfig?.headers &&
        ('referer' in requestConfig.headers || 'Referer' in requestConfig.headers)

      const customHeaders = {
        ...baseRequestConfig.headers,
        Origin: 'https://space.bilibili.com',
        // 外部没配置 referer 时，使用用户空间页面作为 referer
        ...(!hasExternalReferer && { Referer: `https://space.bilibili.com/${host_mid}/dynamic` })
      }
      const wbiSignQuery = await wbi_sign(bilibiliApiUrls.用户空间动态({ host_mid }), baseRequestConfig.headers?.cookie)
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        headers: customHeaders,
        url: bilibiliApiUrls.用户空间动态({ host_mid }) + wbiSignQuery
      })
      return result
    }

    case '动态详情数据': {
      // 检查外部是否已配置 referer
      const hasExternalReferer = requestConfig?.headers && 'referer' in requestConfig.headers

      const customHeaders = {
        ...baseRequestConfig.headers,
        // 外部没配置 referer 时，移除默认的 referer
        ...(!hasExternalReferer && { Referer: undefined })
      }

      const dynamicINFO = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        headers: customHeaders,
        url: bilibiliApiUrls.动态详情({ dynamic_id: data.dynamic_id })
      })
      return dynamicINFO
    }

    case '动态卡片数据': {
      const { dynamic_id } = data
      // 检查外部是否已配置 referer
      const hasExternalReferer = requestConfig?.headers && 'referer' in requestConfig.headers

      const customHeaders = {
        ...baseRequestConfig.headers,
        // 外部没配置 referer 时，移除默认的 referer
        ...(!hasExternalReferer && { Referer: undefined })
      }

      const dynamicINFO_CARD = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        headers: customHeaders,
        url: bilibiliApiUrls.动态卡片信息({ dynamic_id })
      })
      return dynamicINFO_CARD
    }

    case '用户主页数据': {
      const { host_mid } = data
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.用户名片信息({ host_mid })
      })
      return result
    }

    case '用户空间详细信息': {
      const baseUrl = bilibiliApiUrls.用户空间详细信息({ host_mid: data.host_mid })
      const wbiSignQuery = await wbi_sign(baseUrl, baseRequestConfig.headers?.cookie)

      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.用户空间详细信息({ host_mid: data.host_mid }) + wbiSignQuery
      })
      return result
    }

    case '直播间信息': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.直播间信息({ room_id: data.room_id })
      })
      return result
    }

    case '直播间初始化信息': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.直播间初始化信息({ room_id: data.room_id })
      })
      return result
    }

    case '申请二维码': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.申请二维码()
      })
      return result
    }

    case '二维码状态': {
      try {
        const result = await getHeadersAndData<BiliCheckQrcode>({
          ...baseRequestConfig,
          url: bilibiliApiUrls.二维码状态({ qrcode_key: data.qrcode_key })
        })

        // 处理网络层错误（自动重试后仍失败）
        if (isNetworkErrorResult(result)) {
          const networkError = new Error(result.error.amagiError.errorDescription)
          Object.assign(networkError, {
            code: result.error.code,
            data: null,
            amagiError: { ...result.error.amagiError, requestType: data.methodType }
          })
          throw networkError
        }

        // 检查B站API返回的code
        if (result.data.code !== 0) {
          const errorMessage = bilibiliErrorCodeMap[String(result.data.code) as keyof typeof bilibiliErrorCodeMap] || result.data.message || '未知错误'
          const Err: ErrorDetail = {
            errorDescription: `获取响应数据失败！原因：${errorMessage}！`,
            requestType: data.methodType,
            requestUrl: bilibiliApiUrls.二维码状态({ qrcode_key: data.qrcode_key })
          }
          return {
            code: result.data.code,
            data: result.data,
            amagiError: Err
          }
        }

        return {
          code: 0,
          data: {
            data: result.data.data,
            headers: result.headers
          },
          message: '0'
        }
      } catch (error) {
        if (error && typeof error === 'object') {
          return error
        }
        return {
          code: amagiAPIErrorCode.UNKNOWN,
          data: (error as any).data,
          amagiError: {
            errorDescription: '未知错误',
            requestType: data.methodType,
            requestUrl: bilibiliApiUrls.二维码状态({ qrcode_key: data.qrcode_key })
          }
        }
      }
    }

    case '登录基本信息': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.登录基本信息()
      })
      return result
    }

    case '获取UP主总播放量': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.获取UP主总播放量({ host_mid: data.host_mid })
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

    case '专栏正文内容': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.专栏正文内容({ id: data.id })
      })
      return result
    }
    case '专栏显示卡片信息': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.专栏显示卡片信息({ ids: data.ids })
      })
      return result
    }

    case '专栏文章基本信息': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.专栏文章基本信息({ id: data.id })
      })
      return result
    }

    case '文集基本信息': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        url: bilibiliApiUrls.文集基本信息({ id: data.id })
      })
      return result
    }
    case '从_v_voucher_申请_captcha': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        method: 'POST',
        url: bilibiliApiUrls.从_v_voucher_申请_captcha(data).Url,
        data: bilibiliApiUrls.从_v_voucher_申请_captcha(data).Body
      })
      return result
    }
    case '验证验证码结果': {
      const result = await GlobalGetData(data.methodType, {
        ...baseRequestConfig,
        method: 'POST',
        url: bilibiliApiUrls.验证验证码结果(data).Url,
        data: bilibiliApiUrls.验证验证码结果(data).Body
      })
      return result
    }

    case '实时弹幕': {
      const url = bilibiliApiUrls.实时弹幕({ cid: data.cid, segment_index: data.segment_index })
      try {
        const response = await fetchData({
          ...baseRequestConfig,
          url,
          responseType: 'arraybuffer'
        })

        // 处理网络层错误
        if (isNetworkErrorResult(response)) {
          const networkError = new Error(response.error.amagiError.errorDescription)
          Object.assign(networkError, {
            code: response.error.code,
            data: null,
            amagiError: { ...response.error.amagiError, requestType: data.methodType }
          })
          throw networkError
        }

        // 解析 protobuf 数据
        const danmakuData = parseDmSegMobileReply(response)

        return {
          code: 0,
          message: 'success',
          data: {
            elems: danmakuData.elems
          }
        }
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
          return error
        }
        const Err: ErrorDetail = {
          errorDescription: `获取弹幕数据失败：${error instanceof Error ? error.message : '未知错误'}`,
          requestType: data.methodType,
          requestUrl: url
        }
        return {
          code: amagiAPIErrorCode.UNKNOWN,
          data: null,
          amagiError: Err
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
const GlobalGetData = async (type: string, options: AxiosRequestConfig, retryCount = 0): Promise<any | ErrorDetail> => {
  const MAX_RETRIES = 3
  let warningMessage = ''
  try {
    const result = await fetchData(options)

    // 处理网络层错误（自动重试后仍失败）
    if (isNetworkErrorResult(result)) {
      const networkError = new Error(result.error.amagiError.errorDescription)
      Object.assign(networkError, {
        code: result.error.code,
        data: null,
        amagiError: { ...result.error.amagiError, requestType: type }
      })
      throw networkError
    }

    if (!result || result === '') {
      const Err: ErrorDetail = {
        errorDescription: '获取响应数据失败！接口返回内容为空，你的B站ck可能已经失效！',
        requestType: type ?? '未知请求类型',
        requestUrl: options.url!
      }

      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的B站ck可能已经失效！')}
      请求类型：「${type}」
      请求URL：${options.url}
      `
      logger.warn(warningMessage)
      const riskError = new Error(Err.errorDescription)
      Object.assign(riskError, {
        code: bilibiliAPIErrorCode.RISK_CONTROL_FAILED,
        data: result,
        amagiError: Err
      })
      throw riskError
    }

    if (result.code !== 0 || (!result.data || (typeof result.data === 'object' && Object.keys(result.data).length === 0))) {
      // 如果是-412错误且未超过重试次数，则自动重试
      if (result.code === -412 && retryCount < MAX_RETRIES) {
        return await GlobalGetData(type, options, retryCount + 1)
      }

      const errorMessage =
        (bilibiliErrorCodeMap[result.code as keyof typeof bilibiliErrorCodeMap]) ||
        ((typeof result.data === 'object' && Object.keys(result.data).length === 0) && '请求成功但无返回内容') ||
        (result.message ??
          '未知错误')
      const Err: ErrorDetail = {
        errorDescription: `获取响应数据失败！原因：${errorMessage}！`,
        requestType: type ?? '未知请求类型',
        requestUrl: options.url!,
        responseCode: result.code
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow(errorMessage)}
      错误代码：${result.code}
      请求类型：「${type}」
      请求URL：${options.url}
      `
      logger.warn(warningMessage)
      const apiError = new Error(Err.errorDescription)
      Object.assign(apiError, {
        code: result.code,
        data: result,
        amagiError: Err
      })
      throw apiError
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
        requestType: type,
        requestUrl: options.url
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
  '-8888': '对不起，服务器开小差了~ (ಥ﹏ಥ)',
  100000: '验证码获取失败',
  100003: '验证码过期'
}
