// v6 写法（migration sample）：**实例总线**上的事件监听
// 覆盖：平铺负载读法进 meta、methodType 值变化、log:* 的 timestamp 只标注
import amagi from '@ikenxuan/amagi'

const client = amagi({ cookies: { douyin: 'sample-cookie' } })

client.events.on('api:success', (data) => {
  console.log(`[${data.platform}] ${data.methodType} 耗时 ${data.duration}ms`)
})

client.events.on('api:error', (data) => {
  console.error(`[${data.platform}] ${data.methodType} 失败: ${data.errorMessage}`)
})

client.on('log:warn', (data) => {
  console.warn(data.timestamp, data.message)
})

export const stop = (): void => client.events.removeAllListeners()
