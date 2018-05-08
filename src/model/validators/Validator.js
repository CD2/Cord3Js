export default class Validator {
  defaultOptions = {}

  constructor({ message, ...options } = {}) {
    this.customMessage = message
    this.options = { ...this.defaultOptions, ...options }
  }

  static _validators = {}

  static getValidator(name) {
    return this._validators[name]
  }

  static registerValidator(validator) {
    this._validators[validator.validationName] = validator
  }

  defaultMessage = `is required`

  get message() {
    return this.customMessage || this.defaultMessage
  }

  validate() {
    throw new Error(`validator must override #validate method`)
  }
}
