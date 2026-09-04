import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['typescript', 'react'],
  categories: {
    correctness: 'warn'
  },
  env: {
    builtin: true
  },
  ignorePatterns: ['node_modules', 'dist', 'lib', '.next'],
  rules: {
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        args: 'after-used'
      }
    ],
    // React Hooks 两条。`correctness` 类别里没有它们，而 `packages/web` 是全仓第一份
    // React 代码 —— 违反 hooks 规则的后果是运行时行为错乱（条件调用 hook 会让状态错位），
    // 那类 bug 靠读代码抓不住，所以直接设成 error 而不是跟着类别走 warn。
    //
    // 这两条也正是 Vite 脚手架自己生成的 `.oxlintrc.json` 里唯一开的两条 ——
    // 那个文件删掉了（全仓一份根配置，per-package 副本是冗余的），规则搬到这里。
    'react/rules-of-hooks': 'error',
    'react/only-export-components': ['warn', { allowConstantExport: true }]
  }
})
