import { ConfigType } from '@zuks/types'
import fs from 'fs'
import YAML from 'yaml'

export default function cfg (): ConfigType {
  return YAML.parse(fs.readFileSync(process.cwd() + '/config/config.yaml', 'utf8')) as any
}