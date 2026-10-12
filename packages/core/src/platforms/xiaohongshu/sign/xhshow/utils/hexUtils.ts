import { CryptoConfig } from '../config'

export class HexProcessor {
  private config: CryptoConfig

  constructor() {
    this.config = new CryptoConfig()
  }

  hexStringToBytes(hexString: string): number[] {
    const byteValues: number[] = []
    for (let i = 0; i < hexString.length; i += this.config.HEX_CHUNK_SIZE) {
      const hexChunk = hexString.slice(i, i + this.config.HEX_CHUNK_SIZE)
      byteValues.push(parseInt(hexChunk, 16))
    }
    return byteValues
  }

  processHexParameter(hexString: string, xorKey: number): number[] {
    if (hexString.length !== this.config.EXPECTED_HEX_LENGTH) {
      throw new Error(`hex parameter must be ${this.config.EXPECTED_HEX_LENGTH} characters`)
    }

    const byteValues = this.hexStringToBytes(hexString)
    return byteValues.map((byteVal) => byteVal ^ xorKey).slice(0, this.config.OUTPUT_BYTE_COUNT)
  }
}
