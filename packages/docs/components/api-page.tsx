'use client'

import { createOpenAPIPage } from 'fumadocs-openapi/ui'

/**
 * 生成页里的 `<OpenAPIPage />`（端点卡片：参数表 + 响应样例 + 多语言代码示例 + playground）。
 *
 * 主题与 `source.config.ts` 的代码高亮保持一致；playground 默认开启，直连
 * 用户本地的 amagi 服务（`lib/openapi.ts` 没有配 proxyUrl）。
 */
export const OpenAPIPage = createOpenAPIPage({
  shikiOptions: { themes: { light: 'github-light', dark: 'github-dark' } }
})
