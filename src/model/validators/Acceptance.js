import Validator from "./Validator"

export default class AcceptanceValidator extends Validator {
  defaultMessage = `must be accepted`

  defaultOptions = {
    accept: [true, 1, `1`, `true`],
  }

  validate(record) {
    const value = record[this.options.attribute]
    if (!this.options.accept.includes(value)) {
      record.errors.add(this.attribute, this.message)
    }
  }
}

Validator.registerValidator(AcceptanceValidator)
