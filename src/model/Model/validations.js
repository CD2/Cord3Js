import { observable, computed, toJS, when } from "mobx"
import Validator from "../validators/Validator"
import { humanize } from "help-my-strings"

require(`../validators/Presence`)
require(`../validators/Acceptance`)
require(`../validators/Format`)
require(`../validators/Email`)
require(`../validators/Password`)

export default BaseClass =>
  class extends BaseClass {
    static get _validators() {
      return this.__validators || (this.__validators = [])
    }
    static set _validators(val) {
      this.__validators = val
    }

    async isValid() {
      this.errors.clear()

      try {
        await this.runCallbacks(`beforeValidation`)
      } catch (error) {
        console.error(error)
        return false
      }

      let validatableAttributes
      validatableAttributes = Object.keys(this.class._validators)
      // if (this.newRecord) {
      // } else {
      //   validatableAttributes = this.changes.keys().slice(0)
      // }
      const context = this.newRecord ? `create` : `update`

      const attributeValidionPromises = validatableAttributes.map(async attr => {
        const validations = this.validationsFor(attr)

        //filter the validations
        const applicableValidations = validations.reduce((acc, val) => {
          if (val.on && val.on !== context) return acc
          if (val.if) {
            const ifCallback = typeof val.if === "string" ? this[val.if] : val.if
            console.log(val, val.if)
            if (typeof ifCallback !== "function")
              throw new Error(
                `'${val.if}' is not a function. it is used in as the if of a validation`,
              )
            if (ifCallback.call(this, this) === false) return acc
          }
          return acc.concat(val)
        }, [])

        //call the validations
        const validationPromises = applicableValidations.map(({ validator: name, options }) => {
          const klass = Validator.getValidator(name)
          if (klass === undefined) throw new Error(`unknown validator ${name}`)
          const validator = new klass(options)
          return validator.validate(this)
        })

        await Promise.all(validationPromises)
      })

      await Promise.all(attributeValidionPromises)

      const isValid = this.errors.empty()
      if (isValid) await this.runCallbacks(`afterValidation`)
      return isValid
    }

    validationsFor(attr) {
      return this.class._validators[attr] || []
    }

    errors = {
      errors: observable.map(),
      add(fieldName, message = `is invalid`) {
        if (!this.has(fieldName)) this.errors.set(fieldName, [])
        this.errors.get(fieldName).push(message)
      },
      has(fieldName) {
        return this.errors.has(fieldName)
      },
      clear() {
        this.errors.clear()
      },
      empty() {
        return this.errors.size === 0
      },
      any() {
        return !this.empty()
      },
      for(fieldName) {
        return this.errors.get(fieldName) || []
      },
      messages() {
        return this.errors.keys().map(name => this.messagesFor(name))
      },
      messagesFor(fieldName) {
        const friendlyName = humanize(fieldName)
        const errors = this.for(fieldName)
        return errors.map(msg => `${friendlyName} ${msg}`)
      },
    }
  }
