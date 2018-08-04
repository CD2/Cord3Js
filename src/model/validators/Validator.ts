export default class Validator {
  [key: string]: any
  defaultOptions = {}

  constructor({ message, ...options }: any = {}) {
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

  validate(record: any) {
    throw new Error(`validator must override #validate method`)
  }
}
