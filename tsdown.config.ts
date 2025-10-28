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

export default defineConfig({
  entry: exportEntries,
  outDir: 'dist',
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outputOptions (outputOptions, format) {
    if (format === 'cjs') {
      outputOptions.entryFileNames = '[name].cjs'
    } else if (format === 'es') {
      outputOptions.entryFileNames = '[name].js'
    }
    return outputOptions
  }
})
