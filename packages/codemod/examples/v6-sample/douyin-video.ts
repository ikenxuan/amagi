// v6 写法（migration sample）：douyin fetcher 直连
// 覆盖：strict/loose 键删除、错误链读法、顶层 code 读法
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { douyin: 'sample-cookie' } })

export async function fetchVideo(awemeId: string): Promise<unknown> {
  const r = await client.douyin.fetcher.fetchVideoWork({
    aweme_id: awemeId,
    typeMode: 'strict',
  })
  if (r.success) return r.data
  console.error(r.code, r.error.amagiError.errorDescription)
  return null
}

export async function fetchVideoLoose(awemeId: string): Promise<unknown> {
  const r = await client.douyin.fetcher.fetchVideoWork({
    aweme_id: awemeId,
    typeMode: 'loose',
  })
  return r.data
}
