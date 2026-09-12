import { createFromSource } from 'fumadocs-core/search/server'

import { source } from '@/lib/source'

/**
 * 站内搜索的后端。
 *
 * **不要传 `language`。** 这个参数是 tokenizer 的语言白名单，默认值是
 * `'multilingual'`（上游类型注释：works with every language, zero config needed）。
 * 这里从前写的是 `language: 'english'` —— Orama 时代的遗留（原来那行注释指向
 * Orama 的语言表，而 fumadocs-core 16.x 的引擎早已换成内置的 ZBSearch）——
 * 后果是**中文查询全部返回空**：本站 121 页正文几乎全是中文，
 * `/api/search?query=install` 有结果而 `?query=安装` 是 `[]`（2026-09-13 实测）。
 */
export const { GET } = createFromSource(source)
