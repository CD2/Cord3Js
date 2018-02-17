export default class BaseValidator {
  static message

  constructor({ message, ...options } = {}) {
    this.errorMessage = message
    this.options = { ...this.defaultOptions(), ...options }
  }

  defaultOptions() {
    return {}
  }

  message() {
    return this.errorMessage || this.constructor.message || `is invalid`
  }
}
