import Fastify from '../index'
import fs from 'fs'
import YAML from 'yaml'
import { ConfigType } from '../types/ConfigType'


class Index {
  /**
   * 启动服务
   */
  async run () {
    await Fastify()
  }

  /**
   * 
   * @returns 获取配置文件
   */
  cfg (): ConfigType {
    return YAML.parse(fs.readFileSync(process.cwd() + '/config/config.yaml', 'utf8')) as any
  }
}

export default new Index()
