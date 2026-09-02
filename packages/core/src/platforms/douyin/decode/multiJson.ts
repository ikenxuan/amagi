/**
 * 抖音反爬的 multi-JSON 解码。
 *
 * 从 v6 `platform/douyin/getdata.ts` 原样搬迁（v6 里零测试），v7 补上单测。
 * 用途：`search` 端点。抖音搜索接口（general 类型）的响应不是单个 JSON，
 * 而是**多个 JSON 对象粘连在一起**的字符串（反爬手段）；`parseDouyinMultiJson`
 * 按花括号深度把它们切成一个个独立块，`filterSearchResponses` 只保留
 * 带 `cursor` / `has_more` / `data` 的合法搜索响应块。
 */

/**
 * 解析抖音反爬的 multi-JSON 响应。
 *
 * 遍历字符串，按 `{` / `}` 深度切块：深度从 0 升到 0 就是一个完整 JSON 对象。
 * 每块尝试 `JSON.parse`，解析失败的块静默跳过（v6 原行为）。
 * @param raw - 原始响应字符串
 * @returns 解析出的对象数组（可能为空）
 */
export const parseDouyinMultiJson = (raw: string): unknown[] => {
  const blocks: string[] = []
  let depth = 0
  let start = -1

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]

    if (c === '{') {
      if (depth === 0) start = i
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        blocks.push(raw.slice(start, i + 1))
        start = -1
      }
    }
  }

  const parsed: unknown[] = []
  for (const block of blocks) {
    try {
      parsed.push(JSON.parse(block))
    } catch {
      // 畸形块跳过（v6 原行为）
    }
  }
  return parsed
}

/** 一条合法搜索响应的形状（`filterSearchResponses` 的保留条件） */
export interface SearchResponseBlock {
  cursor: number
  has_more: number
  data: unknown[]
}

/**
 * 只保留包含 cursor/has_more/data 的合法搜索响应。
 * @param objs - 解析出的对象数组
 * @returns 合法搜索响应块
 */
export const filterSearchResponses = (objs: unknown[]): SearchResponseBlock[] => {
  return objs.filter(
    (o): o is SearchResponseBlock =>
      !!o &&
      typeof o === 'object' &&
      typeof (o as Record<string, unknown>).cursor === 'number' &&
      typeof (o as Record<string, unknown>).has_more === 'number' &&
      Array.isArray((o as Record<string, unknown>).data)
  )
}
