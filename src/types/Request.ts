import { FastifyRequest } from 'fastify'
import { DouyinOptionsType, BilibiliOptionsType } from './OptionsType'

export interface DouyinRequest extends FastifyRequest {
  Querystring: DouyinOptionsType
}

export interface BilibiliRequest extends FastifyRequest {
  Querystring: BilibiliOptionsType
}