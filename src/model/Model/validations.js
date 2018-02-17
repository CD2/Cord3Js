import { observable, computed, toJS, when } from "mobx"
import { humanize } from "help-my-strings"

export default BaseClass =>
  class extends BaseClass {
    static extended(cls) {
      console.log("CLASS HAS BEEN EXTENDED")
      cls.registerValidator(`presence`, require(`../validators/presence`).default)
      cls.registerValidator(`acceptance`, require(`../validators/acceptance`).default)
      cls.registerValidator(`format`, require(`../validators/format`).default)
      cls.registerValidator(`email`, require(`../validators/email`).default)
      cls.registerValidator(`password`, require(`../validators/password`).default)
    }

    static _validators = {}
    static registerValidator(name, validator) {
      this._validators[name] = validator
    }

    static get _fieldValidations() {
      return this.__fieldValidations || (this.__fieldValidations = {})
    }
    static get _funcValidations() {
      return this.__funcValidations || (this.__funcValidations = [])
    }
    static get validations() {
      return {
        fields: this._fieldValidations,
        funcs: this._funcValidations,
      }
    }

    get validations() {
      return this.class.validations
    }

    async isValid() {
      this.errors.clear()

      try {
        await this.runCallbacks("beforeValidation")
      } catch (error) {
        console.error(error)
        return false
      }
      Object.entries(this.class._fieldValidations).forEach(([fieldName, validators]) => {
        const value = this[fieldName]
        Object.entries(validators).map(([validatorName, options]) => {
          const validator_class = this.class._validators[validatorName]
          if (!validator_class) {
            throw new Error(`unknown validator ${validatorName}`)
          }
          if (options === false) return
          if (options === true) options = {}
          const validator = new validator_class(options)
          if (!validator.validate(value)) {
            this.errors.add(fieldName, validator.message())
          }
        })
      })
      this.class._funcValidations.forEach(callback => callback.call(this))

      const isValid = this.errors.empty()
      if (isValid) this.runCallbacks("afterValidation")
      return isValid
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

// export default module({

//   extended(cls) {
//     cls.registerValidator(`presence`, require(`../validators/presence`).default)
//     cls.registerValidator(
//       `acceptance`,
//       require(`../validators/acceptance`).default,
//     )
//     cls.registerValidator(`format`, require(`../validators/format`).default)
//     cls.registerValidator(`email`, require(`../validators/email`).default)
//     cls.registerValidator(`password`, require(`../validators/password`).default)

//   },

//   static: {
//     _validators: {},
//     registerValidator(name, validator) {
//       this._validators[name] = validator
//     },

//     get _fieldValidations() { return this.__fieldValidations || (this.__fieldValidations = {}) },
//     get _funcValidations() { return this.__funcValidations || (this.__funcValidations = []) },
//     get validations() {
//       return {
//         fields: this._fieldValidations,
//         funcs: this._funcValidations,
//       }
//     },
//   },

//   get validations() { return this.class.validations },

//   async isValid() {
//     this.errors.clear()

//     try {
//       await this.runCallbacks('beforeValidation')
//     } catch (error) {
//       console.error(error)
//       return false
//     }
//     Object.entries(this.class._fieldValidations).forEach(
//       ([fieldName, validators]) => {
//         const value = this.get(fieldName)
//         Object.entries(validators).map(([validatorName, options]) => {
//           const validator_class = this.class._validators[validatorName]
//           if (!validator_class) {
//             throw new Error(`unknown validator ${validatorName}`)
//           }
//           if (options === false) return
//           if (options === true) options = {}
//           const validator = new validator_class(options)
//           if (!validator.validate(value)) {
//             this.errors.add(fieldName, validator.message())
//           }
//         })
//       },
//     )
//     this.class._funcValidations.forEach(callback => callback.call(this))

//     const isValid = this.errors.empty()
//     if (isValid) this.runCallbacks('afterValidation')
//     return isValid

//   },

//   errors: {
//     errors: observable.map(),
//     add(fieldName, message = `is invalid`) {
//       if (!this.has(fieldName)) this.errors.set(fieldName, [])
//       this.errors.get(fieldName).push(message)
//     },
//     has(fieldName) { return this.errors.has(fieldName) },
//     clear() { this.errors.clear() },
//     empty() { return this.errors.size === 0 },
//     any() { return !this.empty() },
//     for(fieldName) { return this.errors.get(fieldName) || [] },
//     messages() { return this.errors.keys().map(name => this.messagesFor(name)) },
//     messagesFor(fieldName) {
//       const friendlyName = humanize(fieldName)
//       const errors = this.for(fieldName)
//       return errors.map(msg => `${friendlyName} ${msg}`)
//     },
//   },

// })
