/* eslint-disable max-len,no-useless-escape */
import BaseValidator from "./base"

export default class EmailValidator extends BaseValidator {
  static message = `must be a valid email`

  validate(value) {
    return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      value,
    )
  }
}
