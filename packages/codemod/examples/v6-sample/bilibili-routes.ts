// v6 写法（migration sample）：bilibili 路由注册
// 覆盖：strict 同行删除、错误链读法、顶层 code 读法、路由注册调用改名
import amagi from '@ikenxuan/amagi'

type App = { use: (path: string, handler: unknown) => void }

export async function mountBilibili(app: App): Promise<void> {
  const client = amagi({ cookies: { bilibili: 'sample-cookie' } })
  const opts = { bvid: 'BV1xx411c7mD', typeMode: 'strict' }
  const r = await client.bilibili.fetcher.fetchVideoInfo(opts)
  if (r.success) {
    console.log(r.data)
  } else {
    console.error(r.code, r.error.errorDescription)
  }
  app.use('/bilibili', amagi.registerBilibiliRoutes(client))
}
