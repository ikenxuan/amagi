// v6 写法（migration sample）：顶层 amagiEvents 全局单例 —— v7 形状一字未改。
// 反例：codemod 跑完这个文件必须**一字不变**（改了就是把好代码改坏）。
import amagi, { amagiEvents } from '@ikenxuan/amagi'

amagiEvents.on('api:success', (data) => {
  console.log(`[${data.platform}] ${data.methodType} 耗时 ${data.duration}ms`)
})

amagiEvents.on('log:info', (data) => {
  console.log(data.timestamp, data.message)
})

// 静态方法也是同一条全局单例（src/index.ts: CreateAmagiApp.on = amagiEvents.on）
amagi.on('api:error', (data) => {
  console.error(`${data.methodType}: ${data.errorMessage}`)
})

amagi.events.once('network:retry', (data) => {
  console.warn(data.attempt, data.maxRetries, data.delayMs)
})
