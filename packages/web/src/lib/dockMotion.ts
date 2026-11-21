import { gsap } from 'gsap/gsap-core'

export const DOCK_COLLAPSED_HEIGHT = 40

/** One height drives both the request area and the response dock, including interrupted animations. */
export function createDockMotion({
  measure,
  render,
  reducedMotion
}: {
  measure: () => { available: number; minimum: number }
  render: (height: number, expanded: boolean) => void
  reducedMotion: () => boolean
}) {
  const value = { height: DOCK_COLLAPSED_HEIGHT }
  const context = gsap.context(() => {})
  let tween: ReturnType<typeof gsap.to> | undefined
  let target = DOCK_COLLAPSED_HEIGHT
  let remembered = 0.62
  let bounds = measure()
  const maximum = () => Math.max(DOCK_COLLAPSED_HEIGHT, bounds.available - 52)
  const minimum = () => Math.min(bounds.minimum, maximum())
  const clamp = (height: number) => Math.max(DOCK_COLLAPSED_HEIGHT, Math.min(maximum(), height))
  const paint = () => render(value.height, target > DOCK_COLLAPSED_HEIGHT)
  const remember = () => {
    if (value.height >= minimum()) remembered = value.height / bounds.available
  }
  const interrupt = () => {
    tween?.kill()
    tween = undefined
    context.clear()
    target = value.height
  }
  const animate = (height: number) => {
    interrupt()
    bounds = measure()
    target = clamp(height)
    paint()
    const complete = () => {
      value.height = target
      tween = undefined
      remember()
      paint()
    }
    if (reducedMotion() || Math.abs(target - value.height) < 1) {
      complete()
      return
    }
    context.add(() => {
      tween = gsap.to(value, {
        height: target,
        duration: target > value.height ? 0.28 : 0.2,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: paint,
        onComplete: complete
      })
    })
  }
  const open = () => {
    bounds = measure()
    if (target > DOCK_COLLAPSED_HEIGHT && value.height >= minimum()) return
    animate(Math.max(minimum(), bounds.available * remembered))
  }
  const close = () => {
    if (!tween) remember()
    animate(DOCK_COLLAPSED_HEIGHT)
  }
  paint()
  return {
    open,
    close,
    toggle: () => (target > DOCK_COLLAPSED_HEIGHT ? close() : open()),
    begin: () => {
      interrupt()
      bounds = measure()
    },
    move: (deltaY: number, keyboard = false) => {
      let next = clamp(value.height - deltaY * (keyboard ? 24 : 1))
      if (keyboard && next > DOCK_COLLAPSED_HEIGHT && next < minimum()) next = deltaY < 0 ? minimum() : DOCK_COLLAPSED_HEIGHT
      value.height = next
      target = next
      paint()
    },
    end: () => {
      if (value.height < minimum()) animate(value.height < (minimum() + DOCK_COLLAPSED_HEIGHT) / 2 ? DOCK_COLLAPSED_HEIGHT : minimum())
      else remember()
    },
    maximize: () => {
      bounds = measure()
      animate(maximum())
    },
    resize: () => {
      const next = measure()
      if (next.available === bounds.available && next.minimum === bounds.minimum) return
      const expanded = target > DOCK_COLLAPSED_HEIGHT
      interrupt()
      bounds = next
      value.height = expanded ? Math.max(minimum(), clamp(value.height)) : DOCK_COLLAPSED_HEIGHT
      target = value.height
      paint()
    },
    finish: () => {
      tween?.progress(1)
    },
    dispose: () => {
      interrupt()
      context.revert()
    }
  }
}
