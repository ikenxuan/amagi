import { defineConfig } from 'tsup'
import type { Options } from 'tsup'
import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @description v5版本的 `tsup` 配置选项
 */
export const options: Options = {
  entry: ['src/v5/index.ts'], // v5入口文件
  format: ['esm', 'cjs'], // 输出格式
  target: 'node16', // 目标环境
  splitting: false, // 是否拆分文件
  sourcemap: false, // 是否生成 sourcemap
  clean: false, // 是否清理输出目录
  dts: {
    compilerOptions: {
      removeComments: false // 确保不移除注释
    }
  },
  outDir: 'dist/v5', // v5输出目录
  treeshake: true, // 树摇优化
  minify: false, // 压缩代码
  shims: true, // 为旧环境提供兼容性支持
  outExtension ({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs', // ESM 用 .mjs，CJS 用 .cjs
    }
  },
  // 使用 Node.js 脚本进行目录操作
  onSuccess: async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    copyV5Files()
  }
}

export default defineConfig(options)

const copyV5Files = () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  const distDir = path.join(__dirname, 'dist', 'v5')
  const esmDir = path.join(distDir, 'esm')
  const cjsDir = path.join(distDir, 'cjs')

  // 创建 esm 和 cjs 目录
  fs.mkdirSync(esmDir, { recursive: true })
  fs.mkdirSync(cjsDir, { recursive: true })

  // 移动 .mjs 文件到 esm 目录
  fs.readdirSync(distDir).forEach((file) => {
    if (file.endsWith('.mjs')) {
      fs.renameSync(path.join(distDir, file), path.join(esmDir, file))
    }
  })

  // 移动 .cjs 文件到 cjs 目录
  fs.readdirSync(distDir).forEach((file) => {
    if (file.endsWith('.cjs')) {
      fs.renameSync(path.join(distDir, file), path.join(cjsDir, file))
    }
    // 删除 .d.cts 文件
    if (file.endsWith('.d.cts')) {
      fs.rmSync(path.join(distDir, file))
    }
  })

  console.log('V5 build files moved successfully!')
}