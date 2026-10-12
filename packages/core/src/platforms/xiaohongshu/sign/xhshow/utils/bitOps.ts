import { CryptoConfig } from '../config'

export class BitOperations {
  private config: CryptoConfig

  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()
  }

  normalizeTo32bit(value: number): number {
    return value & this.config.MAX_32BIT
  }

  toSigned32bit(unsignedValue: number): number {
    if (unsignedValue > this.config.MAX_SIGNED_32BIT) {
      return unsignedValue - 0x100000000
    }
    return unsignedValue
  }

  computeSeedValue(seed32bit: number): number {
    const normalizedSeed = this.normalizeTo32bit(seed32bit)

    const shift15Bits = normalizedSeed >> 15
    const shift13Bits = normalizedSeed >> 13
    const shift12Bits = normalizedSeed >> 12
    const shift10Bits = normalizedSeed >> 10

    const xorMaskedResult = (shift15Bits & ~shift13Bits) | (shift13Bits & ~shift15Bits)
    const shiftedResult = ((xorMaskedResult ^ shift12Bits ^ shift10Bits) << 31) & this.config.MAX_32BIT

    return this.toSigned32bit(shiftedResult)
  }

  xorTransformArray(sourceIntegers: number[]): Uint8Array {
    const result = new Uint8Array(sourceIntegers.length)
    const keyBytes = Buffer.from(this.config.HEX_KEY, 'hex')
    const keyLength = keyBytes.length

    for (let i = 0; i < sourceIntegers.length; i++) {
      if (i < keyLength) {
        result[i] = (sourceIntegers[i] ^ keyBytes[i]) & 0xff
      } else {
        result[i] = sourceIntegers[i] & 0xff
      }
    }

    return result
  }
}
