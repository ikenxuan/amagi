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
    ]
  }
})
