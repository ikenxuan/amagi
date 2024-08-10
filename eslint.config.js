import tsParser from '@typescript-eslint/parser'
import globals from 'globals'

export default [{
  files: ['lib/**/*.js', 'lib/**/*.d.ts'],

  languageOptions: {
    globals: {
      ...globals.node
    },

    parser: tsParser
  },

  rules: {
    // 禁用驼峰命名命名规则，允许使用下划线命名法。
    'camelcase': [ 'off' ],
    // 禁用等号严格比较规则，允许使用==和!=进行比较。
    'eqeqeq': [ 'off' ],
    // 禁用优先使用const声明变量的规则，允许使用let和var。
    'prefer-const': [ 'off' ],
    // 要求对象属性的末尾不能有逗号，设置为错误等级1。
    'comma-dangle': [ 1, 'never' ],
    // 禁用箭头函数体风格规则，允许使用任意风格。
    'arrow-body-style': 'off',
    // 启用default-case规则，要求switch语句必须有default分支。
    'default-case': 1,
    // 启用缩进规则，要求使用两个空格进行缩进，并且switch语句的case子句缩进增加一层。
    'indent': [ 1, 2, { "SwitchCase": 1 } ],
    // 要求函数参数列表前的空格，设置为错误等级1。
    'space-before-function-paren': 1,
    // 要求语句末尾不使用分号，设置为错误等级1。
    "semi": [ 1, 'never' ],
    // 要求代码中不能有尾随空格，设置为错误等级1。
    "no-trailing-spaces": 1,
    // 要求对象字面量大括号内两侧必须有空格，设置为错误等级1。
    "object-curly-spacing": [ 1, 'always' ],
    // 要求数组字面量中括号内两侧必须有空格，设置为错误等级1。
    "array-bracket-spacing": [ 1, 'always' ]
  }
}]