import { logger } from 'amagi/model'
import { FastifyInstance } from 'fastify'

/**
 * 启动本地 http 服务
 * @param client Fastify 实例
 * @param port 监听端口
 * @returns
 */
export const startClient = (client: FastifyInstance, port: 4567) => {
  return client.listen({ port, host: '::' }, (_err, _address) => {
    if (_err) client.log.error(_err)
    logger.mark(`amagi server listening on ${port} port. API docs: https://amagi.apifox.cn`)
  })
}

/**
 * 已废弃，请使用 startClient 方法
 * @deprecated
 */
export const StartClient = startClient
