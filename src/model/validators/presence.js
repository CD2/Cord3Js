import BaseValidator from "./base"

export default class PresenceValidator extends BaseValidator {
  static message = `is required`

  defaultOptions() {
    return {
      allow_blank: true,
    }
  }

  validate(value) {
    if (value === undefined || value === null) return false
    if (typeof value === `boolean`) return true
    if (typeof value === `string`) {
      return (this.options.allow_blank ? value : value.trim()) !== ``
    }
    if (Array.isArray(value)) {
      return (
        (this.options.allow_blank ? value : value.filter(x => x)).length !== 0
      )
    }
    if (typeof value === `object`) return Object.keys(value).length !== 0
    return !!value
  }
}
