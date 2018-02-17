import BaseValidator from "./base"

export default class FormatValidator extends BaseValidator {
  defaultOptions() {
    return {
      with: {
        test: () => {
          throw new Error(`must specify with option in format validator `)
        },
      },
    }
  }

  validate(value) {
    return this.options.with.test(value)
  }
}
