import { defineConfig } from 'tsdown'

import packageJson from './package.json' with { type: 'json' }

export default defineConfig({
  entry: {
    'default/index': 'src/index.ts',
    'exports/*': 'src/exports/*.ts'
  },
  format: {
    cjs: {
      dts: false
    },
    esm: {}
  },
  dts: {
    sourcemap: false,
    compilerOptions: {
      declarationMap: false
    }
  },
  outExtensions({ format }) {
    return {
      js: format === 'es' ? '.mjs' : '.cjs',
      dts: '.d.ts'
    }
  },
  define: {
    __VERSION__: JSON.stringify(packageJson.version)
  }
})
