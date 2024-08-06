import { FastifyInstance } from 'fastify'
import { logger } from 'amagi/model'

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
  return client.listen({ port: options.port, host: '127.0.0.1' }, (_err, address) => {
    if (_err) logger.error(_err)
    logger.info(`amagi server listening on ${address}`)
  })
}