import path from 'path'
import fs from 'fs'
import chalk from 'chalk'

const configDir = path.join(process.cwd(), 'config')
const configFilePath = path.join(configDir, 'config.yaml')

export function createcfgfile () {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  const configContent = `douoyin: 
  bilibili: `

  fs.writeFileSync(configFilePath, configContent)
  console.log(chalk.green('配置文件创建成功，config/config.yaml'))
}
try {
  fs.readFileSync(configFilePath)
} catch {
  createcfgfile()
}