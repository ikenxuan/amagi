import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import globals from 'globals'

export default [
  {
    files: ['lib/**/*.js', 'lib/**/*.d.ts'],
    languageOptions: {
      ecmaVersion: 11,
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node
      }
    },
    rules: {
      // 禁用驼峰命名命名规则，允许使用下划线命名法。
      'camelcase': ['off'],
      // 启用等号严格比较规则，静止使用==和!=进行比较。
      'eqeqeq': [1, 'always'],
      // 禁用优先使用const声明变量的规则，允许使用let和var。
      'prefer-const': ['off'],
      // 要求对象属性的末尾不能有逗号，设置为错误等级1。
      'comma-dangle': [1, 'never'],
      // 禁用箭头函数体风格规则，允许使用任意风格。
      'arrow-body-style': 'off',
      // 启用缩进规则，要求使用两个空格进行缩进，并且switch语句的case子句缩进增加一层。
      'indent': [1, 2, { "SwitchCase": 1 }],
      // 要求函数参数列表前的空格，设置为错误等级1。
      'space-before-function-paren': 1,
      // 要求语句末尾不使用分号，设置为错误等级1。
      "semi": [1, 'never'],
      // 要求代码中不能有尾随空格，设置为错误等级1。
      "no-trailing-spaces": 1,
      // 要求对象字面量大括号内两侧必须有空格，设置为错误等级1。
      "object-curly-spacing": [1, 'always'],
      // 要求数组字面量中括号内两侧必须有空格，设置为错误等级1。
      "array-bracket-spacing": [1, 'always'],
      // 最多允许 2 个连续的空行，禁止文件末尾空行
      'no-multiple-empty-lines': [1, { max: 2, maxEOF: 0 }]
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.d.ts'],
    languageOptions: {
      ecmaVersion: 11,
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node
      },
      parserOptions: {
        project: './tsconfig.json'
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      'camelcase': ['off'],
      'eqeqeq': [1, 'always'],
      'prefer-const': ['off'],
      'comma-dangle': [1, 'never'],
      'arrow-body-style': 'off',
      'indent': [1, 2, { "SwitchCase": 1 }],
      'space-before-function-paren': 1,
      "semi": [1, 'never'],
      "no-trailing-spaces": 1,
      "object-curly-spacing": [1, 'always'],
      "array-bracket-spacing": [1, 'always'],
      'no-multiple-empty-lines': [1, { max: 2, maxEOF: 0 }]
    }
  }
]