import { ConfigType } from '../types'
import fs from 'fs'
import YAML from 'yaml'
import path from 'path'

export default function Config (): ConfigType {
  const fileContents = fs.readFileSync(path.join(process.cwd(), 'config', 'config.yaml'), 'utf8')
  const parsedConfig = YAML.parse(fileContents)

  // 使用类型断言将解析后的数据转换为 ConfigType
  return parsedConfig as ConfigType
}