import { defineConfig } from 'tsdown'
import fs from 'node:fs'
import path from 'node:path'

const exportsDir = path.join(process.cwd(), 'src', 'exports')
const exportFiles = fs.readdirSync(exportsDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => file.replace('.ts', ''))

const exportEntries: Record<string, string> = {
  'default/index': 'src/index.ts'
}
exportFiles.forEach(file => {
  exportEntries[`exports/${file}`] = `src/exports/${file}.ts`
})

// 读取 package.json 获取版本号
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))

export default defineConfig({
  entry: exportEntries,
  outDir: 'dist',
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  },
  outputOptions (outputOptions, format) {
    if (format === 'cjs') {
      outputOptions.entryFileNames = '[name].cjs'
    } else if (format === 'es') {
      outputOptions.entryFileNames = '[name].js'
    }
    return outputOptions
  }
})
