import fastify, { FastifyRequest, FastifyInstance, RouteHandler, HTTPMethods } from 'fastify'
import { DouyinResult } from 'amagi/business/douyin'
import { BilibiliResult } from './business/bilibili'
import { DouyinDataType, BilibiliDataType, DouyinOptionsType, BilibiliOptionsType } from 'amagi/types'
import { logger } from 'amagi/model'
import chalk from 'chalk'


// 定义请求类型，包括OptionsType的属性
interface DouyinRequest extends FastifyRequest {
  Querystring: DouyinOptionsType
}

interface BilibiliRequest extends FastifyRequest {
  Querystring: BilibiliOptionsType
}

interface ServerOptions {
  /**
   * 端口
   */
  port?: number;
  /**
   * 是否启用日志
   */
  log?: boolean;
}

export const initServer = async (client: FastifyInstance): Promise<FastifyInstance> => {
  client.get<DouyinRequest>('/api/douyin/aweme', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['单个视频作品数据']).result({ url }))
  })

  client.get<DouyinRequest>('/api/douyin/comments', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['评论数据']).result({ url }))
  })

  client.get<DouyinRequest>('/api/douyin/comments/reply', async (request, reply) => {
    const { aweme_id, comment_id } = request.query
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['二级评论数据']).result({ aweme_id, comment_id }))
  })

  client.get<DouyinRequest>('/api/douyin/userinfo', async (request, reply) => {
    const sec_uid = request.query.sec_uid
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['用户主页数据']).result({ sec_uid }))
  })

  client.get<DouyinRequest>('/api/douyin/uservideoslist', async (request, reply) => {
    const sec_uid = request.query.sec_uid
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['用户主页视频列表数据']).result({ sec_uid }))
  })

  client.get<DouyinRequest>('/api/douyin/suggestwords', async (request, reply) => {
    const query = request.query.query
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['热点词数据']).result({ query }))
  })

  client.get<DouyinRequest>('/api/douyin/search', async (request, reply) => {
    const query = request.query.query
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['搜索数据']).result({ query }))
  })

  client.get<DouyinRequest>('/api/douyin/emoji', async (_request, reply) => {
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['官方emoji数据']).result())
  })

  client.get<DouyinRequest>('/api/douyin/expressionplus', async (_request, reply) => {
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['动态表情数据']).result())
  })

  client.get<DouyinRequest>('/api/douyin/music', async (request, reply) => {
    const music_id = request.query.music_id
    reply.type('application/json').send(await new DouyinResult(DouyinDataType['音乐数据']).result({ music_id }))
  })

  // bilibili
  client.get<BilibiliRequest>('/api/bilibili/work', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['单个视频作品数据']).result({ url }))
  })

  client.get<BilibiliRequest>('/api/bilibili/comment', async (request, reply) => {
    const bvid = request.query.bvid
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['评论数据']).result({ bvid }))
  })

  client.get<BilibiliRequest>('/api/bilibili/emoji', async (_request, reply) => {
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['emoji数据']).result())
  })

  client.get<BilibiliRequest>('/api/bilibili/bangumivideoinfo', async (request, reply) => {
    const url = request.query.url
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['番剧基本信息数据']).result({ url }))
  })

  client.get<BilibiliRequest>('/api/bilibili/bangumivideodownloadlink', async (request, reply) => {
    const { cid, ep_id } = request.query
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['番剧下载信息数据']).result({ cid, ep_id }))
  })

  client.get<BilibiliRequest>('/api/bilibili/dynamiclist', async (request, reply) => {
    const host_mid = request.query.host_mid
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['用户主页动态列表数据']).result({ host_mid }))
  })

  client.get<BilibiliRequest>('/api/bilibili/dynamicinfo', async (request, reply) => {
    const dynamic_id = request.query.dynamic_id
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['动态详情数据']).result({ dynamic_id }))
  })

  client.get<BilibiliRequest>('/api/bilibili/dynamicdard', async (request, reply) => {
    const dynamic_id = request.query.dynamic_id
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['动态卡片数据']).result({ dynamic_id }))
  })

  client.get<BilibiliRequest>('/api/bilibili/userinfo', async (request, reply) => {
    const host_mid = request.query.host_mid
    reply.type('application/json').send(await new BilibiliResult(BilibiliDataType['用户主页数据']).result({ host_mid }))
  })

  // 返回fastify实例
  return client;
};


/**
 * 添加路由
 * @param client fastify实例
 * @param routeOptions[] 路由参数，传递数组
 * @returns 
 */
export const AddRoute = (client: FastifyInstance, routeOptions: RouteOptions[] = []): any => {
  for (const item of routeOptions) {
    client.route({ method: item.method, handler: item.handler, url: item.url });
  }
  return client
};

/** 创建一个新的 fastify 实例 */
export const CreateNewClient = (options: ServerOptions): FastifyInstance => {
  return fastify({ logger: options.log })
};

/** 启动监听 */
export const StartClient = async (client: FastifyInstance, options: ServerOptions): Promise<void> => {
  // 继承 amagi 路由规则
  initServer(client)
  return client.listen({ port: options.port, host: '127.0.0.1' }, (_err, address) => {
    if (_err) logger.error(_err)
    console.log(chalk.green(`服务监听于 ${address}`));
  });
};

interface RouteOptions {
  method: HTTPMethods;
  url: string;
  handler: RouteHandler;
}