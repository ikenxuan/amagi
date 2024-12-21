import { FastifyRequest } from 'fastify'

import { BilibiliOptionsType, DouyinOptionsType, KuaishouOptionsType } from './OptionsType'

export interface DouyinRequest extends FastifyRequest {
  Querystring: DouyinOptionsType
}

export interface BilibiliRequest extends FastifyRequest {
  Querystring: BilibiliOptionsType
}

export interface KusiahouRequest extends FastifyRequest {
  Querystring: KuaishouOptionsType
}
