import eslint from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import neostandard from 'neostandard'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...neostandard(),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/*.config.{js,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser,
      globals: { ...globals.node }
    },
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-unsafe-assignment': 0,
      '@typescript-eslint/no-unsafe-member-access': 0,
      '@typescript-eslint/no-unsafe-argument': 0,
      '@typescript-eslint/no-unused-expressions': 0,
      '@typescript-eslint/no-unsafe-call': 0,
      'no-prototype-builtins': 0,
      'no-unsafe-optional-chaining': 0,
      'no-useless-escape': 0,
      '@typescript-eslint/prefer-optional-chain': 0,
      '@typescript-eslint/no-floating-promises': 0,
      '@typescript-eslint/no-unsafe-return': 0,
      '@typescript-eslint/no-unused-vars': 0,
      '@typescript-eslint/restrict-template-expressions': 0,
      '@typescript-eslint/prefer-nullish-coalescing': 1,
      '@typescript-eslint/no-misused-promises': 0,
      '@typescript-eslint/no-redundant-type-constituents': 0,
      '@typescript-eslint/no-unsafe-enum-comparison': 0,
      '@typescript-eslint/prefer-for-of': 1,
      'prefer-regex-literals': 0,
      camelcase: ['off'],
      eqeqeq: [1, 'always'],
      'prefer-const': ['off'],
      'comma-dangle': [1, {
        arrays: 'never',
        objects: 'never',
        imports: 'never',
        exports: 'never',
        functions: 'never'
      }],
      'arrow-body-style': 'off',
      indent: [1, 2, { SwitchCase: 1 }],
      'space-before-function-paren': 1,
      semi: [1, 'never'],
      'no-trailing-spaces': 1,
      'object-curly-spacing': [0, 'always'],
      'array-bracket-spacing': [0, 'always'],
      'no-multiple-empty-lines': [1, { max: 2, maxEOF: 0, maxBOF: 0 }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'comma-spacing': [1, { before: false, after: true }],
      'key-spacing': [1, { beforeColon: false, afterColon: true }],
      'space-infix-ops': 1,
      'space-unary-ops': [1, { words: true, nonwords: false }],
      'space-before-blocks': [1, 'always'],
      'space-in-parens': [1, 'never'],
      'keyword-spacing': [1, {
        before: true,
        after: true,
        overrides: {
          if: { after: true }
        }
      }],
      'brace-style': [1, '1tbs'],
      'no-debugger': 0,
      'no-use-before-define': 0,
      '@typescript-eslint/no-namespace': 0
    }
  }
)
