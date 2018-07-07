import Validator from "./Validator"

export default class PresenceValidator extends Validator {
  static validationName = `presence`

  defaultMessage = `is required`

  constructor(options) {
    super(options)
    const { allowBlank = true } = options
    this.allowBlank = allowBlank
    this.attribute = options.attribute
  }

  validate(record) {
    let value = record[this.attribute]
    if (value === undefined || value === null) {
      value = false
    } else if (typeof value === `boolean`) {
      return
    } else if (typeof value === `string`) {
      value = (this.allowBlank ? value : value.trim()) !== ``
    } else if (Array.isArray(value)) {
      value = value.length > 0
    } else if (typeof value === `object`) {
      value = Object.keys(value).length > 0
    }
    if (!value) record.errors.add(this.attribute, this.message)
  }
}

Validator.registerValidator(PresenceValidator)
