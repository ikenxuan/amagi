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
    include: ['packages/core/test/**/*.test.ts'],
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
