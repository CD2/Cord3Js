import Validator from "./Validator"

export default class AcceptanceValidator extends Validator {
  static validationName = `acceptance`

  defaultMessage = `must be accepted`

  defaultOptions = {
    accept: [true, 1, `1`, `true`],
  }

  validate(record) {
    const value = record[this.options.attribute]
    if (!{ ...this.defaultOptions, ...this.options }.accept.includes(value)) {
      record.errors.add(this.options.attribute, this.message)
    }
  }
}

Validator.registerValidator(AcceptanceValidator)
