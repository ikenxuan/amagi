import neostandard from 'neostandard'

const eslintConfig = {
  ...neostandard({
    ignores: ['node_modules', 'temp'],
    globals: ['logger', 'NodeJS'],
    ts: true,
  }),
  rules: {
    // 驼峰命名规则关闭
    camelcase: 'off',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/camelcase': 'off', // 关闭 TypeScript 特定的 camelcase 规则
      },
    },
  ],
}

module.exports = eslintConfig
