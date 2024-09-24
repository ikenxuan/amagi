import { Amagi, getBilibiliData } from '.'

const client = new Amagi({
  douyin: '',
  bilibili: ''
}).initServer(true)

await client.startClient(client.Instance, 4567)

const douyinData = await client.getDouyinData('官方emoji数据')
const bilibiliData = await getBilibiliData('emoji数据')

console.log({ douyinData, bilibiliData })
