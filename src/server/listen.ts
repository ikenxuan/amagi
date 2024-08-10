import { FastifyInstance } from 'fastify'

/**
 * 启动本地 http 服务
 * @param client Fastify 实例
 * @param port 监听端口
 * @returns
 */
export const StartClient = async (client: FastifyInstance, port: 4567): Promise<void> => {
  return client.listen({ port: port, host: '::' }, (_err, _address) => {
    if (_err) client.log.error(_err)
    console.log(`amagi server listening on ${port} port. API docs: https://amagi.apifox.cn`)
  })
}