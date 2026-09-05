// v6 写法（migration sample）：小红书内容抓取 + 校验错误处理
// 覆盖：strict 同行删除、错误链读法、校验异常处理标注
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { xiaohongshu: 'sample-cookie' } })

export async function fetchNote(noteId: string): Promise<unknown> {
  const params = { note_id: noteId, typeMode: 'strict' }
  try {
    const r = await client.xiaohongshu.fetcher.fetchNoteDetail(params)
    if (!r.success) throw new Error(r.error.amagiError.errorDescription)
    return r.data
  } catch (e) {
    if (e.issues) {
      console.error('校验失败', e.issues)
    }
    throw e
  }
}
