import amagi, { getBilibiliData, Amagi } from '.'

const client = Amagi({
  douyin: '',
  bilibili: ''
})
const h = client.startClient()

await client.getDouyinData('Emoji数据')
const b = await client.getBilibiliData('单个视频作品数据', { id_type: 'bvid', id: 'BV1WvpTekEPQ' })

const douyinData = await client.getDouyinData('Emoji数据')
const bilibiliData = await getBilibiliData('Emoji数据')

console.log({ douyinData, bilibiliData, b })

if (douyinData && bilibiliData) {
  h.close()
  process.exit(0)
} else {
  process.exit(1)
}

