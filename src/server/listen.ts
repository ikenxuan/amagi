import { FastifyInstance } from 'fastify'
import { logger } from 'amagi/model'
import chalk from 'chalk'

interface ServerOptions {
  /**
   * 端口
   */
  port?: number
  /**
   * 是否启用日志
   */
  log?: boolean
}

/** 启动监听 */
export const StartClient = async (client: FastifyInstance, options: ServerOptions): Promise<void> => {
  // 继承 amagi 路由规则
  return client.listen({ port: options.port, host: '127.0.0.1' }, (_err, address) => {
    if (_err) logger.error(_err)
    console.log(chalk.green(`amagi 服务监听于 ${address}`))
  })
}