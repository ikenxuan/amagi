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
    'camelcase': ['off'],
    'eqeqeq': ['off'],
    'prefer-const': ['off'],
    'comma-dangle': [2, 'never'],
    'arrow-body-style': 'off',
    'default-case': 2,
    'indent': ['error', 2]
  }
}]