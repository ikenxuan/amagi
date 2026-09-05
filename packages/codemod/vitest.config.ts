import { defineConfig } from 'vitest/config'

// 本包独立的最小 vitest 配置：root 的 vitest.config.ts 只 include packages/core/test，
// 不覆盖 codemod 的测试。包内 `pnpm test`（vitest run）从本目录向上找配置，
// 命中的是本文件。
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
