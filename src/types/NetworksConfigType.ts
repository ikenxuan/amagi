export type NetworksConfigType = {
  /**
   * 请求地址
   */
  url: string
  /**
   * 请求方法
   */
  method?: string
  /**
   * 请求头
   */
  headers?: any
  /**
   * 返回数据类型，默认json
   */
  responseType?: string
  /**
   * 请求体
   */
  body?: object | string
  /**
   * 超时时间，单位毫秒
   */
  timeout?: number
  /**
   * 默认跟随重定向到: 'follow'，不跟随: manual
   */
  redirect?: RequestRedirect
  /**
   * 拓展参数，该次请求数据什么数据类型，注意是平台接口的类型定义，不是请求参数
   */
  methodType?: string
}

/** API标准化HTTP请求错误类型 */
export type ErrorDetail = {
  /**
   * 错误描述信息
   */
  errorDescription: string
  /**
   * 请求类型
   */
  requestType: string
  /**
   * 请求URL地址
   */
  requestUrl: string
}

/** 未知错误 */
export enum amagiAPIErrorCode {
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN_ERROR'
}

/** 抖音平台API错误码 */
export enum douoyinAPIErrorCode {
  /** Cookie无效或已过期 */
  COOKIE = 'INVALID_COOKIE',
  /** 内容被隐藏或下架 */
  FILTER = 'CONTENT_FILTERED',
  /** 未知错误 */
  UNKNOWN = amagiAPIErrorCode.UNKNOWN
}

/** B站平台API错误码 */
export enum bilibiliAPIErrorCode {
  /** 应用程序不存在或已被封禁 */
  APP_NOT_FOUND = '-1',
  /** Access Key 错误 */
  ACCESS_KEY_ERROR = '-2',
  /** API 校验密匙错误 */
  API_KEY_ERROR = '-3',
  /** 调用方对该Method没有权限 */
  METHOD_NOT_PERMITTED = '-4',
  /** 账号未登录 */
  NOT_LOGGED_IN = '-101',
  /** 账号被封停 */
  ACCOUNT_BANNED = '-102',
  /** 积分不足 */
  POINTS_INSUFFICIENT = '-103',
  /** 硬币不足 */
  COINS_INSUFFICIENT = '-104',
  /** 验证码错误 */
  CAPTCHA_ERROR = '-105',
  /** 账号非正式会员或在适应期 */
  MEMBERSHIP_LIMITED = '-106',
  /** 应用不存在或者被封禁 */
  APP_BANNED = '-107',
  /** 未绑定手机 */
  PHONE_NOT_BOUND = '-108',
  /** 未绑定手机 */
  PHONE_NOT_BOUND_2 = '-110',
  /** csrf 校验失败 */
  CSRF_ERROR = '-111',
  /** 系统升级中 */
  SYSTEM_UPDATING = '-112',
  /** 账号尚未实名认证 */
  NOT_REAL_NAME_VERIFIED = '-113',
  /** 请先绑定手机 */
  NEED_BIND_PHONE = '-114',
  /** 请先完成实名认证 */
  NEED_REAL_NAME_VERIFICATION = '-115',
  /** 木有改动 */
  NO_CHANGE = '-304',
  /** 撞车跳转 */
  CONFLICT_REDIRECT = '-307',
  /** 风控校验失败 (UA 或 wbi 参数不合法) */
  RISK_CONTROL_FAILED = '-352',
  /** 请求错误 */
  BAD_REQUEST = '-400',
  /** 未认证 (或非法请求) */
  UNAUTHORIZED = '-401',
  /** 访问权限不足 */
  FORBIDDEN = '-403',
  /** 啥都木有 */
  NOT_FOUND = '-404',
  /** 不支持该方法 */
  METHOD_NOT_ALLOWED = '-405',
  /** 冲突 */
  CONFLICT = '-409',
  /** 请求被拦截 (客户端 ip 被服务端风控) */
  IP_BLOCKED = '-412',
  /** 服务器错误 */
  SERVER_ERROR = '-500',
  /** 过载保护,服务暂不可用 */
  SERVICE_UNAVAILABLE = '-503',
  /** 服务调用超时 */
  GATEWAY_TIMEOUT = '-504',
  /** 超出限制 */
  RATE_LIMITED = '-509',
  /** 上传文件不存在 */
  FILE_NOT_FOUND = '-616',
  /** 上传文件太大 */
  FILE_TOO_LARGE = '-617',
  /** 登录失败次数太多 */
  LOGIN_ATTEMPTS_EXCEEDED = '-625',
  /** 用户不存在 */
  USER_NOT_FOUND = '-626',
  /** 密码太弱 */
  WEAK_PASSWORD = '-628',
  /** 用户名或密码错误 */
  INVALID_CREDENTIALS = '-629',
  /** 操作对象数量限制 */
  OBJECT_LIMIT_EXCEEDED = '-632',
  /** 被锁定 */
  ACCOUNT_LOCKED = '-643',
  /** 用户等级太低 */
  USER_LEVEL_TOO_LOW = '-650',
  /** 重复的用户 */
  DUPLICATE_USER = '-652',
  /** Token 过期 */
  TOKEN_EXPIRED = '-658',
  /** 密码时间戳过期 */
  PASSWORD_TIMESTAMP_EXPIRED = '-662',
  /** 地理区域限制 */
  GEO_RESTRICTED = '-688',
  /** 版权限制 */
  COPYRIGHT_RESTRICTED = '-689',
  /** 扣节操失败 */
  REPUTATION_DEDUCTION_FAILED = '-701',
  /** 请求过于频繁，请稍后再试 */
  TOO_MANY_REQUESTS = '-799',
  /** 服务器开小差了 */
  SERVER_TEMPORARILY_UNAVAILABLE = '-8888',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN'
}


/** 快手平台API错误码 */
export enum kuaishouAPIErrorCode {
  /** Cookie无效或已过期 */
  COOKIE = 'INVALID_COOKIE',
  /** 未知错误 */
  UNKNOWN = amagiAPIErrorCode.UNKNOWN
}