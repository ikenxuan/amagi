import { Amagi, getBilibiliData } from '.'

const client = new Amagi({
  douyin: '',
  bilibili: ''
})
const h = client.startClient()

await h.getDouyinData('官方emoji数据')
const b = await h.getBilibiliData('单个视频作品数据', { id_type: 'bvid', id: 'BV1WvpTekEPQ' })

const douyinData = await client.getDouyinData('官方emoji数据')
const bilibiliData = await getBilibiliData('emoji数据')

console.log({ douyinData, bilibiliData, b })

if (douyinData && bilibiliData) {
  h.Instance.close()
  process.exit(0)
} else {
  process.exit(1)
}

