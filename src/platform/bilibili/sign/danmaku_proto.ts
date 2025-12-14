/**
 * B站弹幕 Protobuf 解析器
 * 使用 protobufjs 解析 web/seg.so 接口返回的二进制弹幕数据
 * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/danmaku/danmaku_proto.md
 */

import { BiliProtobufDanmaku } from 'amagi/types/ReturnDataType/Bilibili/ProtobufDanmaku'
import protobuf from 'protobufjs'

/**
 * B站弹幕 Protobuf 定义（内联）
 * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/danmaku/danmaku_proto.md
 */
const DANMAKU_PROTO_JSON = {
  nested: {
    bilibili: {
      nested: {
        community: {
          nested: {
            service: {
              nested: {
                dm: {
                  nested: {
                    v1: {
                      nested: {
                        DmSegMobileReply: {
                          fields: {
                            elems: {
                              rule: 'repeated',
                              type: 'DanmakuElem',
                              id: 1
                            }
                          }
                        },
                        DanmakuElem: {
                          fields: {
                            id: { type: 'int64', id: 1 },
                            progress: { type: 'int32', id: 2 },
                            mode: { type: 'int32', id: 3 },
                            fontsize: { type: 'int32', id: 4 },
                            color: { type: 'uint32', id: 5 },
                            midHash: { type: 'string', id: 6 },
                            content: { type: 'string', id: 7 },
                            ctime: { type: 'int64', id: 8 },
                            weight: { type: 'int32', id: 9 },
                            action: { type: 'string', id: 10 },
                            pool: { type: 'int32', id: 11 },
                            idStr: { type: 'string', id: 12 },
                            attr: { type: 'int32', id: 13 },
                            animation: { type: 'string', id: 22 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

let DmSegMobileReplyType: protobuf.Type | null = null

/**
 * 获取 protobuf 类型定义
 */
function getProtoType (): protobuf.Type {
  if (DmSegMobileReplyType) {
    return DmSegMobileReplyType
  }

  const root = protobuf.Root.fromJSON(DANMAKU_PROTO_JSON)
  DmSegMobileReplyType = root.lookupType('bilibili.community.service.dm.v1.DmSegMobileReply')
  return DmSegMobileReplyType
}

/**
 * 解析弹幕分段响应
 * @param data - 二进制 protobuf 数据
 * @returns 解析后的弹幕数据
 */
export function parseDmSegMobileReply (data: ArrayBuffer | Uint8Array): BiliProtobufDanmaku['data']['elems'][number] {
  const messageType = getProtoType()
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data)
  const message = messageType.decode(buffer)
  const obj = messageType.toObject(message, {
    longs: String,
    defaults: true
  }) as BiliProtobufDanmaku['data']['elems'][number]

  return obj
}
