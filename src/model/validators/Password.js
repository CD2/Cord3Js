import Validator from "./Validator"

export default class PasswordValidator extends Validator {
  static validationName = `password`

  defaultMessage = `must be at least 8 characters`

  validate(record) {
    const value = record[this.options.attribute]
    if (!(value && value.length > 7)) record.errors.add(this.attribute, this.message)
  }
}

Validator.registerValidator(PasswordValidator)
