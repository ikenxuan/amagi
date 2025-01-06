import { KuaishouAPIOptionsMap } from 'amagi/types'

class API {
  单个作品信息<T extends KuaishouAPIOptionsMap['VideoInfoParams']> (data: T) {
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

  作品评论信息<T extends KuaishouAPIOptionsMap['CommentParams']> (data: T) {
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

  表情 () {
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
}/** 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据 */
export const KuaishouAPI = new API()
