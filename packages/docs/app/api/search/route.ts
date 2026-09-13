import { createFromSource } from 'fumadocs-core/search/server'

import { source } from '@/lib/source'

/**
 * 站内搜索的后端 —— **静态导出形态**。
 *
 * 从 `GET` 换成 `staticGET`：静态站上没有服务端，搜索索引在构建期导出成一个
 * 文件，浏览器下载它、在本地算（`fumadocs-core/search/client/orama-static` 的
 * `staticClient`）。客户端那一半配在 `app/layout.tsx` 的 `RootProvider` 上
 * （`search.options.type === 'static'`）—— 框架的默认搜索弹窗认这个值，
 * 所以不必自己写弹窗。
 *
 * `revalidate = false` 是必需的：索引只在构建期算一次。
 *
 * **不要传 `language`。** 那个参数是 tokenizer 的语言白名单，默认值
 * `'multilingual'`（works with every language, zero config needed）。这里从前
 * 写的是 `language: 'english'` —— Orama 时代的遗留 —— 后果是**中文查询全部
 * 返回空**：本站 121 页正文几乎全是中文，`?query=install` 有结果而
 * `?query=安装` 是 `[]`（2026-09-13 实测）。
 */
export const revalidate = false

export const { staticGET: GET } = createFromSource(source)
