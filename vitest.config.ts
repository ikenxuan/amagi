import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const corePath = (p: string) => fileURLToPath(new URL(`./packages/core/${p}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      // core 内部使用 `amagi/*` 自别名（tsconfig paths -> ./src/*）
      { find: /^amagi\/(.*)$/, replacement: `${corePath('src')}/$1` }
    ]
  },
  test: {
    // codemod / typegen 包也进根 `pnpm test` —— 它们有自己的 vitest.config.ts 供包内单跑，
    // 但 CI 的必需检查跑的是根脚本，不收进来等于这些用例在 CI 里不存在
    include: ['packages/core/test/**/*.test.ts', 'packages/codemod/test/**/*.test.ts', 'packages/typegen/test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // 签名算法测试会 stub Math.random / Date.now，必须串行以避免互相干扰
    fileParallelism: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    typecheck: {
      enabled: false,
      include: ['packages/core/test/**/*.test-d.ts'],
      tsconfig: './packages/core/tsconfig.test.json'
    },
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['packages/core/src/types/ReturnDataType/**', 'packages/core/src/dev.ts', 'packages/core/src/exports/**']
    }
  }
})
