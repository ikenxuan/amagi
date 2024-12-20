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
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      },
      globals: { ...globals.node }
    },
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    files: ['src/**/*.ts', 'eslint.config.js'],
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
      // 允许使用 RegExp
      'prefer-regex-literals': 0,
      // 禁用驼峰命名规则，允许使用下划线或其他命名方式。
      camelcase: ['off'],
      // 要求使用 === 和 !== 而不是 == 和 !=，以避免类型强制转换带来的潜在错误。
      eqeqeq: [1, 'always'],
      // 禁用优先使用 const 规则，允许使用 var 声明变量。
      'prefer-const': ['off'],
      // 修改逗号拖尾规则，不允许在多行数组、枚举、导出、导入、对象和函数中使用拖尾逗号。
      'comma-dangle': [1, {
        arrays: 'never',
        objects: 'never',
        imports: 'never',
        exports: 'never',
        functions: 'never'
      }],
      // 禁用箭头函数体的代码风格规则，允许使用大括号或不使用大括号。
      'arrow-body-style': 'off',
      // 要求使用两个空格进行缩进，并且在 switch case 语句中也使用两个空格缩进。
      indent: [1, 2, { SwitchCase: 1 }],
      // 要求在函数声明的参数列表开括号前有一个空格。
      'space-before-function-paren': 1,
      // 要求不使用分号来结束语句。
      semi: [1, 'never'],
      // 禁止行尾有多余的空格。
      'no-trailing-spaces': 1,
      // 要求对象字面量中的大括号内侧有一个空格。
      'object-curly-spacing': [0, 'always'],
      // 要求数组字面量中的方括号内侧有一个空格。
      'array-bracket-spacing': [0, 'always'],
      // 禁止多个空行，最多允许两行空行，文件末尾不允许空行。
      'no-multiple-empty-lines': [1, { max: 2, maxEOF: 0, maxBOF: 0 }],
      // 要求导入语句按照字母顺序排序。
      'simple-import-sort/imports': 'error',
      // 要求导出语句按照字母顺序排序。
      'simple-import-sort/exports': 'error',
      // 要求逗号后面有空格，而逗号前面没有空格。
      'comma-spacing': [1, { before: false, after: true }],
      // 要求对象字面量中键和冒号之间没有空格，而冒号后面有空格。
      'key-spacing': [1, { beforeColon: false, afterColon: true }],
      // 要求二元操作符周围有空格。
      'space-infix-ops': 1,
      // 要求一元操作符与其操作数之间有空格，无论是单词类型的操作符还是非单词类型的操作符。
      'space-unary-ops': [
        1, {
          words: true,
          nonwords: false
        }],
      // 要求代码块的开括号前有一个空格。
      'space-before-blocks': [1, 'always'],
      // 要求小括号内侧没有空格。
      'space-in-parens': [1, 'never'],
      'keyword-spacing': [1, {
        before: true,
        after: true,
        overrides: {
          if: {
            after: true
          }
        }
      }],
      // 执行 one true brace 风格规则。
      'brace-style': [1, '1tbs']
    }
  }
)
