import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDockMotion } from '../src/lib/dockMotion'

const controllers: ReturnType<typeof createDockMotion>[] = []
afterEach(() => controllers.splice(0).forEach((controller) => controller.dispose()))
const setup = (reduced = true) => {
  const bounds = { available: 800, minimum: 200 }
  const render = vi.fn<(height: number, expanded: boolean) => void>()
  const controller = createDockMotion({ measure: () => ({ ...bounds }), render, reducedMotion: () => reduced })
  controllers.push(controller)
  return { controller, render, bounds }
}

describe('响应面板的动画与拖拽', () => {
  it('首次展开分配阅读空间，收起再展开恢复用户拖过的高度', () => {
    const { controller, render } = setup()
    expect(render).toHaveBeenLastCalledWith(40, false)
    controller.open()
    expect(render).toHaveBeenLastCalledWith(496, true)
    controller.begin()
    controller.move(-104)
    controller.end()
    controller.close()
    expect(render).toHaveBeenLastCalledWith(40, false)
    controller.open()
    expect(render).toHaveBeenLastCalledWith(600, true)
  })

  it('拖动不能挤掉请求操作栏，释放不足以阅读的面板时吸附收放', () => {
    const { controller, render } = setup()
    controller.begin()
    controller.move(-2000)
    controller.end()
    expect(render).toHaveBeenLastCalledWith(748, true)
    controller.begin()
    controller.move(678)
    controller.end()
    expect(render).toHaveBeenLastCalledWith(40, false)
    controller.begin()
    controller.move(-120)
    controller.end()
    expect(render).toHaveBeenLastCalledWith(200, true)
  })

  it('键盘一次向上就能展开，窗口变矮时保留请求栏', () => {
    const { controller, render, bounds } = setup()
    controller.begin()
    controller.move(-1, true)
    controller.end()
    expect(render).toHaveBeenLastCalledWith(200, true)
    bounds.available = 240
    bounds.minimum = 140
    controller.resize()
    expect(render).toHaveBeenLastCalledWith(188, true)
    controller.close()
    bounds.available = 800
    controller.resize()
    expect(render).toHaveBeenLastCalledWith(40, false)
  })

  it('GSAP 展开可被拖拽打断，结束后不会被旧动画拉回', () => {
    const { controller, render } = setup(false)
    controller.open()
    controller.begin()
    controller.move(-260)
    controller.end()
    controller.finish()
    expect(render).toHaveBeenLastCalledWith(300, true)
    controller.close()
    controller.finish()
    expect(render).toHaveBeenLastCalledWith(40, false)
  })

  it('快速反向收放最终服从最后一次操作；销毁后停止动画回调', () => {
    const { controller, render } = setup(false)
    controller.open()
    controller.close()
    controller.open()
    controller.finish()
    expect(render).toHaveBeenLastCalledWith(496, true)
    controller.close()
    controller.dispose()
    const calls = render.mock.calls.length
    controller.finish()
    expect(render).toHaveBeenCalledTimes(calls)
  })
})
