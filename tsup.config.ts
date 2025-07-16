import { defineConfig } from 'tsup'
import type { Options } from 'tsup'
import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { URL } from 'node:url'

/**
 * @description 递归删除指定目录下的所有.d.cts文件
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
 * @description 整理输出文件结构
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

// 读取 package.json 获取依赖信息
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url), 'utf-8'))

/**
 * @description 主要模块的构建配置
 */
const mainConfig: Options = {
  entry: {
    'index': 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  target: 'node16',
  splitting: false,
  sourcemap: false,
  clean: true,
  banner: {
    js: `/*!
 * @ikenxuan/amagi
 * Copyright(c) 2023 ikenxuan
 * GPL-3.0 Licensed
 */`,
  },
  dts: {
    compilerOptions: {
      removeComments: false
    }
  },
  outDir: 'dist/default',
  treeshake: true,
  minify: false,
  shims: true,
  outExtension ({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    }
  },
  onSuccess: async () => {
    await new Promise((resolve) => setTimeout(resolve, 10000))
    organizeFiles()
  }
}

/**
 * @description 导出模块的构建配置
 */
const exportsConfig: Options = {
  entry: ['src/exports/*.ts'],
  format: ['cjs', 'esm'],
  target: 'node16',
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  outDir: 'dist/exports',
  treeshake: true,
  external: Object.keys(pkg.dependencies),
  onSuccess: async () => {
    // 清理 exports 目录
    if (fs.existsSync('dist/exports')) {
      console.log('Exports build completed successfully!')
    }
  }
}

// 根据环境变量或命令行参数决定使用哪个配置
const buildTarget = process.env.BUILD_TARGET || 'main'

export default defineConfig(buildTarget === 'exports' ? exportsConfig : mainConfig)