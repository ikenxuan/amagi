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
  return client.listen({ port: options.port, host: '[::]' }, (_err, _address) => {
    if (_err) logger.error(_err)
    logger.info(`amagi server listening on http://localhost:${options.port}`)
  })
}