import { defineConfig } from 'vitest/config'

// 本包独立的最小 vitest 配置，只为包内 `pnpm test`（从本目录向上找配置，命中本文件）。
// **CI 走的不是这里**：CI 的必需检查跑根脚本 `vitest run`，而根 vitest.config.ts 的
// `include` 是一份显式白名单 —— 本包必须同时出现在那份白名单里，否则这些用例在 CI 里
// 等于不存在（codemod 包踩过这个坑）。
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
