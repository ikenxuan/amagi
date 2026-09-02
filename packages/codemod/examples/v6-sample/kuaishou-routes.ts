// v6 写法（migration sample）：kuaishou 路由注册 + ApiRoutes 端点清单
// 覆盖：ApiRoutes 具名导入内联删除、路由注册调用改名
import amagi, { DouyinApiRoutes, KuaishouApiRoutes } from '@ikenxuan/amagi'

type App = { use: (path: string, handler: unknown) => void }

const endpointMaps = [DouyinApiRoutes, KuaishouApiRoutes] as const

export function hasEndpoint(name: string): boolean {
  return endpointMaps.some((map) => name in map)
}

export function mountKuaishou(app: App): void {
  const client = amagi({ cookies: { kuaishou: 'sample-cookie' } })
  app.use('/kuaishou', amagi.registerKuaishouRoutes(client))
}
