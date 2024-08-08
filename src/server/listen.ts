import { logger } from 'amagi/model'
import { FastifyInstance } from 'fastify'

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


/**
 * 启动 fastify 实例
 * @param client fastify 实例
 * @param options 配置项
 * @returns 
 */
export const StartClient = async (client: FastifyInstance, options: ServerOptions): Promise<void> => {
  return client.listen({ port: options.port, host: '::' }, (_err, _address) => {
    if (_err) logger.error(_err)
    logger.info(`amagi server listening on ${options.port} port. API docs: https://amagi.apifox.cn`)
  })
}