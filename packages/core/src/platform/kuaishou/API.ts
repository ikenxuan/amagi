import { OmitMethodType } from 'amagi/types'
import { KuaishouMethodOptionsMap } from 'amagi/types/KuaishouAPIParams'

/**
 * 根据 KuaishouMethodOptionsMap 创建一个新的类型，去除每个字段中的 methodType
 */
type KuaishouMethodOptionsWithoutMethodType = {
  [K in keyof KuaishouMethodOptionsMap]: OmitMethodType<KuaishouMethodOptionsMap[K]>
}

type KuaishouLiveApiQueryValue = string | number | boolean

type KuaishouBaseApiRequest = {
  type: string
  url: string
}

/**
 * 快手 `live_api` 请求描述对象。
 *
 * 除了最终请求地址外，还可以携带 `signPath`，用于声明
 * `__NS_hxfalcon` 实际参与签名的规范路径。
 */
export type KuaishouLiveApiRequest = KuaishouBaseApiRequest & {
  method: 'GET' | 'POST'
  requiresSign?: boolean
  signPath?: string
  body?: Record<string, unknown>
}

/**
 * 快手 GraphQL 请求描述对象。
 *
 * 该结构只负责描述请求，不负责执行网络请求。
 */
export type KuaishouGraphqlRequest = KuaishouBaseApiRequest & {
  body: {
    operationName: string
    variables: Record<string, unknown>
    query: string
  }
}

/**
 * 构造快手 `live_api` 请求描述对象。
 *
 * 之所以将 `signPath` 放在 API 描述层，而不是放进签名器内部硬编码，
 * 是为了让“接口公开路径”和“算法规范路径”的关系显式可见。
 *
 * @param type - 内部请求类型标识
 * @param pathname - 实际请求路径
 * @param query - 要拼接到 URL 上的查询参数
 * @param signPath - 可选的签名规范路径；当页面路径与算法路径不一致时必须传入
 * @returns 可供请求层和签名层复用的请求描述对象
 */
export const createKuaishouLiveApiRequest = (
  type: string,
  pathname: string,
  query: Record<string, KuaishouLiveApiQueryValue>,
  options?: {
    body?: Record<string, unknown>
    method?: 'GET' | 'POST'
    requiresSign?: boolean
    signPath?: string
  }
): KuaishouLiveApiRequest => {
  const url = new URL(`https://live.kuaishou.com${pathname}`)

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value))
  }

  return {
    type,
    url: url.toString(),
    method: options?.method ?? 'GET',
    ...(typeof options?.requiresSign === 'boolean' ? { requiresSign: options.requiresSign } : {}),
    ...(options?.signPath ? { signPath: options.signPath } : {}),
    ...(options?.body ? { body: options.body } : {})
  }
}

/**
 * 快手 API 地址构建类
 * 该类下的方法只负责返回请求描述对象，需要手动请求对应地址以获取数据。
 */
class API {
  /**
   * 获取单个作品信息
   * @param data - 作品参数
   * @returns 请求配置
   */
  videoWork<T extends KuaishouMethodOptionsWithoutMethodType['VideoInfoParams']> (data: T): KuaishouGraphqlRequest {
    return {
      /** 接口类型 */
      type: 'visionVideoDetail',
      /** 请求url */
      url: 'https://www.kuaishou.com/graphql',
      /** 请求参数 */
      body: {
        /** 接口类型 */
        operationName: 'visionVideoDetail',
        variables: {
          /** 作品ID */
          photoId: data.photoId,
          page: 'detail'
        },
        query: 'query visionVideoDetail($photoId: String, $type: String, $page: String, $webPageArea: String) {\n  visionVideoDetail(photoId: $photoId, type: $type, page: $page, webPageArea: $webPageArea) {\n    status\n    type\n    author {\n      id\n      name\n      following\n      headerUrl\n      __typename\n    }\n    photo {\n      id\n      duration\n      caption\n      likeCount\n      realLikeCount\n      coverUrl\n      photoUrl\n      liked\n      timestamp\n      expTag\n      llsid\n      viewCount\n      videoRatio\n      stereoType\n      musicBlocked\n      manifest {\n        mediaType\n        businessType\n        version\n        adaptationSet {\n          id\n          duration\n          representation {\n            id\n            defaultSelect\n            backupUrl\n            codecs\n            url\n            height\n            width\n            avgBitrate\n            maxBitrate\n            m3u8Slice\n            qualityType\n            qualityLabel\n            frameRate\n            featureP2sp\n            hidden\n            disableAdaptive\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      manifestH265\n      photoH265Url\n      coronaCropManifest\n      coronaCropManifestH265\n      croppedPhotoH265Url\n      croppedPhotoUrl\n      videoResource\n      __typename\n    }\n    tags {\n      type\n      name\n      __typename\n    }\n    commentLimit {\n      canAddComment\n      __typename\n    }\n    llsid\n    danmakuSwitch\n    __typename\n  }\n}\n'
      }
    }
  }

  /**
   * 获取作品评论信息
   * @param data - 评论参数
   * @returns 请求配置
   */
  comments<T extends KuaishouMethodOptionsWithoutMethodType['CommentParams']> (data: T): KuaishouGraphqlRequest {
    return {
      type: 'commentListQuery',
      url: 'https://www.kuaishou.com/graphql',
      body: {
        operationName: 'commentListQuery',
        variables: {
          photoId: data.photoId,
          pcursor: ''
        },
        query: 'query commentListQuery($photoId: String, $pcursor: String) {\n  visionCommentList(photoId: $photoId, pcursor: $pcursor) {\n    commentCount\n    pcursor\n    rootComments {\n      commentId\n      authorId\n      authorName\n      content\n      headurl\n      timestamp\n      likedCount\n      realLikedCount\n      liked\n      status\n      authorLiked\n      subCommentCount\n      subCommentsPcursor\n      subComments {\n        commentId\n        authorId\n        authorName\n        content\n        headurl\n        timestamp\n        likedCount\n        realLikedCount\n        liked\n        status\n        authorLiked\n        replyToUserName\n        replyTo\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n'
      }
    }
  }

  /**
   * 获取表情列表
   * @returns 请求配置
   */
  emojiList (): KuaishouGraphqlRequest {
    return {
      type: 'visionBaseEmoticons',
      url: 'https://www.kuaishou.com/graphql',
      body: {
        operationName: 'visionBaseEmoticons',
        variables: {},
        query: 'query visionBaseEmoticons {\n  visionBaseEmoticons {\n    iconUrls\n    __typename\n  }\n}\n'
      }
    }
  }
}

/** 该类下的方法只会返回请求描述对象，需要手动请求对应地址以获取数据 */
export const kuaishouApiUrls = new API()
