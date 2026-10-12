import { CryptoConfig } from './config'

/**
 * Immutable state for a single signing operation
 */
export interface SignState {
  /** Page load timestamp in milliseconds */
  pageLoadTimestamp: number
  /** Sequence counter value */
  sequenceValue: number
  /** Window properties length */
  windowPropsLength: number
  /** URI length */
  uriLength: number
}

/**
 * Manages the state for a simulated user session to generate more realistic signatures.
 *
 * This class maintains counters that should persist and evolve across multiple requests
 * within the same logical session.
 */
export class SessionManager {
  private config: CryptoConfig
  pageLoadTimestamp: number
  sequenceValue: number
  windowPropsLength: number

  constructor(config?: CryptoConfig) {
    this.config = config || new CryptoConfig()
    this.pageLoadTimestamp = Math.floor(Date.now())
    this.sequenceValue = this.randomInt(this.config.SESSION_SEQUENCE_INIT_MIN, this.config.SESSION_SEQUENCE_INIT_MAX)
    this.windowPropsLength = this.randomInt(this.config.SESSION_WINDOW_PROPS_INIT_MIN, this.config.SESSION_WINDOW_PROPS_INIT_MAX)
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Updates the session state to simulate user activity between requests.
   *
   * This method should be called before each signing operation.
   */
  updateState(): void {
    this.sequenceValue += this.randomInt(this.config.SESSION_SEQUENCE_STEP_MIN, this.config.SESSION_SEQUENCE_STEP_MAX)
    this.windowPropsLength += this.randomInt(this.config.SESSION_WINDOW_PROPS_STEP_MIN, this.config.SESSION_WINDOW_PROPS_STEP_MAX)
  }

  /**
   * Get the current signing state for a request.
   *
   * This method automatically updates the session state counters and calculates
   * the URI length from the provided URI string.
   *
   * @param uri - The URI string for the current request
   * @returns An immutable object with the current state for signing
   */
  getCurrentState(uri: string): SignState {
    this.updateState()
    return {
      pageLoadTimestamp: this.pageLoadTimestamp,
      sequenceValue: this.sequenceValue,
      windowPropsLength: this.windowPropsLength,
      uriLength: uri.length
    }
  }
}
