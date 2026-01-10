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
  sourcemap: false,
  external: ['axios', 'chalk', 'express'],
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  },
  outputOptions (outputOptions, format) {
    if (format === 'cjs') {
      outputOptions.entryFileNames = '[name].cjs'
      outputOptions.sourcemap = false
    } else if (format === 'es') {
      outputOptions.entryFileNames = '[name].mjs'
      outputOptions.sourcemap = false
    }
    return outputOptions
  },
  async onSuccess () {
    // 清理不需要的文件
    const { glob } = await import('tinyglobby')
    const { unlink, copyFile } = await import('node:fs/promises')

    // 删除所有 .map 文件
    const mapFiles = await glob('dist/**/*.map')
    for (const file of mapFiles) {
      await unlink(file).catch(() => {})
    }

    // 将 .d.mts 重命名为 .d.ts
    const dmtsFiles = await glob('dist/**/*.d.mts')
    for (const file of dmtsFiles) {
      const dtsFile = file.replace('.d.mts', '.d.ts')
      await copyFile(file, dtsFile).catch(() => {})
      await unlink(file).catch(() => {})
    }

    // 删除 .d.cts 文件
    const dctsFiles = await glob('dist/**/*.d.cts')
    for (const file of dctsFiles) {
      await unlink(file).catch(() => {})
    }
  }
})
