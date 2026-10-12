/**
 * Fingerprint generation helper functions
 */

import { createHash, randomBytes } from 'node:crypto'

import * as FPData from '../data/fingerprintData'

/**
 * Random choice a value from list according to the given weights
 */
export function weightedRandomChoice<T>(options: T[], weights: number[]): string {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < options.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return String(options[i])
    }
  }

  return String(options[options.length - 1])
}

/**
 * Get random GPU renderer information
 */
export function getRendererInfo(): [string, string] {
  const rendererStr = FPData.GPU_VENDORS[Math.floor(Math.random() * FPData.GPU_VENDORS.length)]
  const [vendor, renderer] = rendererStr.split('|')
  return [vendor, renderer]
}

/**
 * Get random screen configuration with width, height, and available dimensions
 */
export function getScreenConfig(): { width: number; height: number; availWidth: number; availHeight: number } {
  const resolution = weightedRandomChoice(FPData.SCREEN_RESOLUTIONS.resolutions, FPData.SCREEN_RESOLUTIONS.weights)
  const [widthStr, heightStr] = resolution.split(';')
  const width = parseInt(widthStr, 10)
  const height = parseInt(heightStr, 10)

  let availWidth: number
  let availHeight: number

  if (Math.random() < 0.5) {
    const offset = parseInt(weightedRandomChoice([0, 30, 60, 80], [0.1, 0.4, 0.3, 0.2]), 10)
    availWidth = width - offset
    availHeight = height
  } else {
    availWidth = width
    const offset = parseInt(weightedRandomChoice([30, 60, 80, 100], [0.2, 0.5, 0.2, 0.1]), 10)
    availHeight = height - offset
  }

  return { width, height, availWidth, availHeight }
}

/**
 * Generate canvas fingerprint hash
 */
export function generateCanvasHash(): string {
  return FPData.CANVAS_HASH
}

/**
 * Generate WebGL fingerprint hash
 */
export function generateWebglHash(): string {
  return createHash('md5').update(randomBytes(32)).digest('hex')
}
