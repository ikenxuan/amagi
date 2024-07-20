import _ from 'lodash'
import YAML from 'yaml'
import fs from 'node:fs'
import { logger } from 'amagi/model'
import chokidar from 'chokidar'
import chalk from 'chalk'

class Config {
  config: any
  watcher: any
  constructor () {
    this.config = {}
    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} }
    this.initCfg()
  }

  /** 初始化配置 */
  initCfg () {
    const path = `${process.cwd()}/config/`
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    const pathDef = `${process.cwd()}/config/`
    const files = fs.readdirSync(pathDef).filter(file => file.endsWith('.yaml'))
    for (const file of files) {
      if (!fs.existsSync(`${path}config.yaml`)) {
        fs.copyFileSync(`${pathDef}${file}`, `${pathDef}config.yaml`)
      } else {
        const config = YAML.parse(fs.readFileSync(`${path}${file}`, 'utf8'))
        const defConfig = YAML.parse(fs.readFileSync(`${pathDef}${file}`, 'utf8'))
        const { differences, result } = this.mergeObjectsWithPriority(config, defConfig)
        if (differences) {
          fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
          for (const key in result) {
            this.modify(file.replace('.yaml', ''), key, result[key])
          }
        }
      }
      // 检查是否在 PM2 环境中运行
      if (process.env.pm_id) {
        // 如果是 PM2 运行，则执行 watch 方法
        this.watch(`${path}${file}`, file.replace('.yaml', ''), 'config')
      }
    }
  }

  get douyin () {
    const cfg = this.getDefOrConfig('config')
    return cfg.douyin
  }

  get bilibili () {
    const cfg = this.getDefOrConfig('config')
    return cfg.bilibili
  }


  /** 默认配置和用户配置 */
  getDefOrConfig (name: string) {
    const config = this.getConfig(name)
    return config
  }

  /** 默认配置 */
  getdefSet (name: any) {
    return this.getYaml('default_config', name)
  }

  /** 用户配置 */
  getConfig (name: any) {
    return this.getYaml('config', name)
  }

  /**
   * 获取配置yaml
   * @param type 默认跑配置-defSet，用户配置-config
   * @param name 名称
   */
  getYaml (type: string | undefined, name: any) {
    const file = `${process.cwd()}/${type}/${name}.yaml`
    const key = `${type}.${name}`

    if (this.config['config.config']) return this.config[key]

    const cfg = YAML.parse(
      fs.readFileSync(file, 'utf8')
    )

    this.watch(file, name, type)

    return cfg
  }

  /** 监听配置文件 */
  watch (file: string, name: string, type = 'default_config') {
    const key = `${type}.${name}`
    if (this.watcher[key]) return

    const watcher = chokidar.watch(file)
    watcher.on('change', async (path: any) => {
      delete this.config[key]
      logger.mark(`[${process.cwd()}][修改配置文件][${type}][${name}]`)
    })

    this.watcher[key] = watcher
  }

  /**
   * 修改设置
   * @param {'douoyin','bilibili'} name 文件名
   * @param {String} key 修改的key值
   * @param {String|Number} value 修改的value值
   * @param {'config'|'default_config'} type 配置文件或默认
   */
  modify (name: string, key: string, value: any, type = 'config') {
    const path = `${process.cwd()}/config/${name}.yaml`
    new YamlReader(path).set(key, value)
    delete this.config[`${type}.${name}`]
  }

  mergeObjectsWithPriority (objA: any, objB: any) {
    let differences = false

    function customizer (objValue: undefined, srcValue: any, key: any, object: any, source: any, stack: any) {
      if (_.isArray(objValue) && _.isArray(srcValue)) {
        return objValue
      } else if (_.isPlainObject(objValue) && _.isPlainObject(srcValue)) {
        if (!_.isEqual(objValue, srcValue)) {
          return _.mergeWith({}, objValue, srcValue, customizer)
        }
      } else if (!_.isEqual(objValue, srcValue)) {
        differences = true
        return objValue !== undefined ? objValue : srcValue
      }
      return objValue !== undefined ? objValue : srcValue
    }

    const result = _.mergeWith({}, objA, objB, customizer)

    return {
      differences,
      result
    }
  }
}

/**
 * YamlReader类提供了对YAML文件的动态读写功能
 */
export class YamlReader {
  filePath: string
  document: any
  /**
  * 创建一个YamlReader实例。
  * @param {string} filePath - 文件路径
  */
  constructor (filePath: string) {
    this.filePath = filePath
    this.document = this.parseDocument()
  }

  /**
  * 解析YAML文件并返回Document对象，保留注释。
  * @returns {Document} 包含YAML数据和注释的Document对象
  */
  parseDocument () {
    const fileContent = fs.readFileSync(this.filePath, 'utf8')
    return YAML.parseDocument(fileContent)
  }

  /**
   * 修改指定参数的值。
   * @param {string} key - 参数键名
   * @param {any} value - 新的参数值
   */
  set (key: any, value: any) {
    this.document.set(key, value)
    this.write()
  }

  /**
   * 从YAML文件中删除指定参数。
   * @param {string} key - 要删除的参数键名
   */
  rm (key: any) {
    this.document.delete(key)
    this.write()
  }

  /**
     * 将更新后的Document对象写入YAML文件中。
     */
  write () {
    fs.writeFileSync(this.filePath, this.document.toString(), 'utf8')
  }
}
export default new Config()