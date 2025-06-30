import { defineConfig } from 'tsup'
import type { Options } from 'tsup'
import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @description 主要的 `tsup` 配置选项
 */
export const options: Options = {
  entry: {
    'index': 'src/index.ts',
    'v5': 'src/v5.ts'
  },
  format: ['esm', 'cjs'], // 输出格式
  target: 'node16', // 目标环境
  splitting: false, // 是否拆分文件
  sourcemap: false, // 是否生成 sourcemap
  clean: true, // 清理输出目录
  banner: {
    js: `/*!
 * @ikenxuan/amagi
 * Copyright(c) 2023 ikenxuan
 * GPL-3.0 Licensed
 */`,
  },
  dts: {
    compilerOptions: {
      removeComments: false // 确保不移除注释
    }
  },
  outDir: 'dist/default', // 输出目录
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
    await new Promise((resolve) => setTimeout(resolve, 5000))
    organizeFiles()
  }
}

export default defineConfig(options)

/**
 * 递归删除指定目录下的所有.d.cts文件
 * @param dir - 要搜索的目录路径
 */
const removeDCtsFiles = (dir: string) => {
  if (!fs.existsSync(dir)) {
    return
  }

  const items = fs.readdirSync(dir)

  for (const item of items) {
    const itemPath = path.join(dir, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      // 递归处理子目录
      removeDCtsFiles(itemPath)
    } else if (item.endsWith('.d.cts')) {
      // 删除.d.cts文件
      fs.rmSync(itemPath)
      console.log(`已删除: ${itemPath}`)
    }
  }
}

/**
 * 整理输出文件结构
 */
const organizeFiles = () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  const distDir = path.join(__dirname, 'dist', 'default')
  const esmDir = path.join(distDir, 'esm')
  const cjsDir = path.join(distDir, 'cjs')

  // 首先递归删除所有.d.cts文件
  removeDCtsFiles(distDir)

  // 创建 esm 和 cjs 目录
  fs.mkdirSync(esmDir, { recursive: true })
  fs.mkdirSync(cjsDir, { recursive: true })

  // 移动文件到对应目录
  fs.readdirSync(distDir).forEach((file) => {
    const filePath = path.join(distDir, file)

    // 跳过目录
    if (fs.statSync(filePath).isDirectory()) {
      return
    }

    if (file.endsWith('.mjs')) {
      fs.renameSync(filePath, path.join(esmDir, file))
    } else if (file.endsWith('.cjs')) {
      fs.renameSync(filePath, path.join(cjsDir, file))
    }
  })

  console.log('Build files organized successfully!')
}