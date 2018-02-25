import Validator from "./Validator"

export default class FormatValidator extends Validator {
  defaultOptions = {
    with: {
      test: () => {
        throw new Error(`must specify with option in format validator `)
      },
    },
  }

  validate(record) {
    const value = record[this.options.attribute]
    if (!this.options.with.test(value)) {
      record.errors.add(this.attribute, this.message)
    }
  }
}

Validator.registerValidator(FormatValidator)
