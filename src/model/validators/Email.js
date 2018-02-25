/* eslint-disable max-len,no-useless-escape */
import Validator from "./Validator"

export default class EmailValidator extends Validator {
  defaultMessage = `must be a valid email`

  validate(record) {
    const value = record[this.options.attribute]
    if (
      !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value,
      )
    ) {
      record.errors.add(this.attribute, this.message)
    }
  }
}

Validator.registerValidator(EmailValidator)
