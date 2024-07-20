import fs from 'node:fs'

const main = () => {
  /** 不符合规则的启动方式 */
  if (!process.argv?.[2] === '--type' || !process.argv?.[3]) {
    console.error('[pkg] 请使用正确的启动方式：npm run delpkg')
    process.exit(1)
  }

  if (process.argv[3] === 'del') {
    /** 准备推送npm 删除所有开发依赖 */
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
    delete pkg.devDependencies
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2))
    console.log('[pkg] 已删除所有开发依赖')
  }
}

main()