/**
 * 手写协议契约，来源于提供的 2026-09-21 小红书移植版本。
 * 这些不是由语料生成的类型，依据和局限见 README.md。
 * 缺失的嵌套结构保持 `unknown`；没有完整响应录制样本支撑的字段均为可选。
 */
interface Envelope {
  code: number
  success: boolean
  msg?: string
  data?: unknown
  [property: string]: unknown
}

interface OpenObject {
  [property: string]: unknown
}

interface RoomInfo extends OpenObject {
  /** 提供的 API 说明指出房间 ID 为 18–19 位十进制字符串。 */
  room_id?: string
}

export interface LiveRoom extends Envelope {
  data?: {
    host_info?: OpenObject
    room_info?: RoomInfo
    [property: string]: unknown
  }
}

export interface LiveSquare extends Envelope {
  data?: {
    feeds?: {
      live?: {
        t_room_info?: RoomInfo
        [property: string]: unknown
      }
      [property: string]: unknown
    }[]
    [property: string]: unknown
  }
}

export interface LiveStatus extends Envelope {
  data?: {
    /** 字段名有文档记载，但取值范围尚无原始录制样本。 */
    status?: unknown
    next_request_interval?: unknown
    [property: string]: unknown
  }
}

/** 提供的归档中不包含热榜数据的结构。 */
export interface SearchHotList extends Envelope {
  data?: unknown
}

export interface SearchUser extends Envelope {
  data?: {
    users?: {
      user_id?: string
      name?: string
      /** 提供的示例是格式化后的字符串，如「8.5万」。 */
      fans?: string
      [property: string]: unknown
    }[]
    [property: string]: unknown
  }
}

/** 与提供的 `subComments` 端点所用的分页字段一致。 */
export interface SubComments extends Envelope {
  data?: {
    comments?: unknown[]
    has_more?: boolean
    cursor?: string
    [property: string]: unknown
  }
}

/**
 * v7 端点读取 `/user/otherinfo`，其字段为 snake_case。旧的生成录制样本描述的是
 * 已弃用的 HTML 状态（`basicInfo`/`tabPublic`）。
 * 保持那份生成的依据不动，改为对外暴露这个显式的替代类型。
 */
export interface UserProfile extends Envelope {
  data?: {
    basic_info?: OpenObject
    interactions?: unknown[]
    tab_public?: OpenObject
    [property: string]: unknown
  }
}
