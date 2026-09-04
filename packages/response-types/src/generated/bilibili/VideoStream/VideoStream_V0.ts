// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。

/**
 * 视频流地址。要 `avid`（= 稿件的 `aid`）与 `cid`（= 分P 的 ID）两个参数，依赖图从 `videoInfo` 的 `data.aid` / `data.cid` 取。
 *
 * **这份样本是未登录录的，所以只覆盖到 `durl` 那一支**（单文件 MP4、低清晰度）。带 cookie 的高清晰度走 `data.dash`（音视频分离），它在本轮样本里根本没出现，因此下面的类型里没有那个键 —— 看到类型里缺 `dash` 不等于平台不返回。
 *
 * 注释只能挂在**样本里存在**的路径上（挂到不存在的路径会被报成孤立注释），所以这条平台知识写在这里而不是写成一条 `data.dash` 的注释。
 */
export type VideoStream_V0 = {
  code: number
  data: Data
  /** 平台错误文案，成功时是 `"0"`。 */
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  accept_description: string[]
  accept_format: string
  /** 这个稿件可选的清晰度编号列表。与 `accept_description` 一一对应、同序。 */
  accept_quality: number[]
  auto_qn_resp: AutoQnResp
  cur_language: string
  cur_production_type: number
  /** **单文件 MP4 的地址列表**（老格式）。未登录、低清晰度走这一支，本轮样本覆盖的就是它。多个元素是同一段视频的多个备用地址，不是分段。 */
  durl: Durl[]
  format: string
  from: string
  high_format: null
  last_play_cid: number
  last_play_time: number
  message: string
  play_conf: PlayConf
  /** 本次实际返回的清晰度编号。它可能**低于**请求的 `qn`：没有权限时平台静默降级，而不是报错。 */
  quality: number
  result: string
  seek_param: string
  seek_type: string
  /** 各清晰度的详细信息。要判断「能不能拿 1080P」看这里，别看 `accept_quality` 的最大值 —— 后者不含权限判断。 */
  support_formats: SupportFormat[]
  /** 时长，**毫秒**（而 `videoInfo` 的 `data.duration` 是秒）。两个端点单位不同，这是踩过的坑。 */
  timelength: number
  video_codecid: number
  view_info: null
  [property: string]: any
}

type AutoQnResp = {
  dyeid: string
  [property: string]: any
}

type Durl = {
  ahead: string
  backup_url: null
  length: number
  order: number
  size: number
  url: string
  vhead: string
  [property: string]: any
}

type PlayConf = {
  is_new_description: boolean
  [property: string]: any
}

type SupportFormat = {
  can_watch_qn_reason: number
  codecs: null
  display_desc: string
  format: string
  limit_watch_reason: number
  new_description: string
  quality: number
  report: { [property: string]: any }
  superscript: string
  [property: string]: any
}
