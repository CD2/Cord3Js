// @ts-check
import { observable } from "mobx"

import Collection from "../Collection"
import IdsModel from "../Ids"
import { RequestBuilder } from "./RequestBuilder"
import { pluralize, humanize } from "help-my-strings"

import "../validators/Presence"
import "../validators/Acceptance"
import "../validators/Format"
import "../validators/Email"
import "../validators/Password"

class Model {
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
          const ifCallback = typeof val.if === `string` ? this[val.if] : val.if
          // Checks to see whether the callback is a function, executes if it is otherwise
          // calls the string in the model
          if (typeof ifCallback === `function`) {
            if (ifCallback.call(this, this) === false) return acc
          } else {
            if (!ifCallback) return acc
          }
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
      return errors.map(msg => ` ${friendlyName} ${msg}`)
    },
  }

  static create(attributes) {
    const record = new this(attributes)
    record.save()
    return record
  }

  _attributesForSaveWithValues() {
    let attrs = this.changes.toJS()
    this.class.additionalAttributesToSave.forEach(a => {
      const value = this[a].serialize()
      if (value) {
        attrs = { ...attrs, ...value }
      }
    })
    return attrs
  }

  async save() {
    const valid = await this.isValid()
    if (!valid) {
      console.error(valid, this.errors.messages())
      return false
    }

    await this.runCallbacks(`beforeSave`)
    const saveMethod = this.newRecord ? this._create_record : this._update_record

    try {
      await saveMethod.call(this)
    } catch (err) {
      if (err === `save_failed`) return false
      throw err
    }
    await this.runCallbacks(`afterSave`)
    return true
  }

  async _create_record() {
    const attributes = this._attributesForSaveWithValues()
    await this.runCallbacks(`beforeCreate`)
    const { data, errors } = await this.class.perform(`create`, attributes)
    if (this.processErrors(errors)) {
      throw `save_failed`
    }
    this._id = data.id
    await this.load()
    await this.runCallbacks(`afterCreate`)
    return this._id
  }

  async _update_record() {
    const attributes = this._attributesForSaveWithValues()
    //TODO: only save changed fields
    await this.runCallbacks(`beforeUpdate`)
    const { data, errors } = await this.perform(`update`, attributes)
    if (this.processErrors(errors)) {
      throw `save_failed`
    }
    this.record.update({ ...attributes, ...data })
    this.reset()
    this.runCallbacks(`afterUpdate`)
  }

  processErrors(errors) {
    if (errors.length > 0) {
      try {
        Object.entries(JSON.parse(errors[0])).forEach(([field, messages]) => {
          messages.forEach(msg => this.errors.add(field, msg))
        })
      } catch (e) {
        this.errors.add("Unknown error")
      }
      console.error(errors)
      throw `save_failed`
    } else {
      return false
    }
  }

  async destroy() {
    if (!this.persisted) throw new Error(`YO CANT DELETE THIS - ITS NOT REALLY THERE YET`)
    await this.runCallbacks(`beforeDestroy`)
    const { errors } = await this.perform(`destroy`)
    if (errors.length > 0) {
      throw `delete_failed`
    }
    this.record.remove()
    this.runCallbacks(`afterDestroy`)
  }
  static callbacks(name) {
    if (!this._callbacks) this._callbacks = {}
    return this._callbacks[name]
  }
  static registerCallback(callbackName) {
    Object.defineProperty(this, callbackName, {
      value(...args) {
        this.addCallback(callbackName, ...args)
      },
    })
    Object.defineProperty(this.prototype, callbackName, {
      value(...args) {
        this.addCallback(callbackName, ...args)
      },
    })
  }
  static addCallback(callbackName, cbOrName, cb) {
    if (cb === undefined) cb = cbOrName
    if (this._callbacks === undefined) this._callbacks = {}
    if (this._callbacks[callbackName] === undefined) this._callbacks[callbackName] = []
    this._callbacks[callbackName].push(cb)
  }
  static callbacksFor(name) {
    if (!this._callbacks) return []
    return this._callbacks[name] || []
  }

  addCallback(callbackName, cbOrName, cb) {
    if (cb === undefined) cb = cbOrName
    if (this._callbacks === undefined) this._callbacks = {}
    if (this._callbacks[callbackName] === undefined) this._callbacks[callbackName] = []
    this._callbacks[callbackName].push(cb)
  }
  callbacksFor(name) {
    if (!this._callbacks) return []
    return this._callbacks[name] || []
  }

  /* run callbacks
  returns: promise
  name: callbacks to run
  args: [arguments for each callback]
*/
  runCallbacks(name, args = []) {
    const clsCallbacks = this.class.callbacksFor(name)
    const instCallbacks = this.callbacksFor(name)
    const callbacks = clsCallbacks.concat(instCallbacks)
    const rets = callbacks.map(cb => cb(this, ...args))
    return Promise.all(rets)
  }

  assignAttributes(attrs) {
    Object.entries(attrs).forEach(([key, value]) => (this[key] = value))
  }

  changed() {
    this.changes.keys().length > 0
  }

  reset() {
    this.changes.clear()
  }

  static get className() {
    return this._className || this.name
  }

  static set className(val) {
    this._className = val
  }

  static get tableName() {
    let table_name
    table_name = this.className.split(/(?=[A-Z])/)
    const lastIdx = table_name.length - 1
    table_name[lastIdx] = pluralize(table_name[lastIdx])
    table_name = table_name.join(`_`)
    table_name = table_name.toLowerCase()
    return table_name
  }

  static get apiName() {
    let table_name
    table_name = this.className.split(/(?=[A-Z])/)
    const lastIdx = table_name.length - 1
    table_name[lastIdx] = pluralize(table_name[lastIdx])
    table_name = table_name.join(`/`)
    table_name = table_name.toLowerCase()
    return table_name
  }

  static defaultRequestAttributes = []
  static associations = []
  _id = undefined
  changes = observable.map()

  constructor(attributes = {}, requestedAttributes) {
    this.assignAttributes(attributes)
    this.requestedAttributes = requestedAttributes
  }

  static new(...args) {
    return new this(...args)
  }

  get newRecord() {
    return this._id === undefined
  }
  get persisted() {
    return !this.newRecord
  }

  static withAttributes(attributes) {
    return new RequestBuilder(this, { attributes })
  }

  static isModel(thing) {
    return thing instanceof this
  }

  get class() {
    return this.constructor
  }

  get id() {
    return this._id
  }

  get record() {
    return this.class.store.getRecord(this.class.tableName, this.id)
  }

  withAttributes(attrs) {
    if (this.persisted) {
      const newAttrs = [...this.requestedAttributes, ...attrs]
      return this.class.withAttributes(newAttrs).find(this.id)
    }
    this.requestedAttributes = this.requestedAttributes.concat(attrs)
    return this
  }

  static get associationNames() {
    return this.associations.map(({ name }) => name)
  }

  static getAssociation(needleName) {
    return this.associations.find(({ name }) => name === needleName)
  }

  async load() {
    const { id, requestedAttributes } = this
    const { apiName, tableName } = this.class
    this.loading = true

    const request = await this.class.store.findRecord(apiName, tableName, {
      id,
      attributes: requestedAttributes,
    })
    if (request.errors && request.errors.length) {
      throw request.errors
    }
  }

  reload() {
    return this.class.reload(this.id, this.requestedAttributes)
  }

  static reload(id, attributes) {
    return this.store.findRecord(this.apiName, this.tableName, { id, attributes, reload: true })
  }

  toJSON() {
    return this.attributeValues ? this.attributeValues.toJS() : {}
  }

  async perform(action, data) {
    const { store, apiName, tableName } = this.class
    const response = await store.perform(apiName, tableName, { action, id: this._id, data })
    return response
  }

  static perform(action, data) {
    return this.store.perform(this.apiName, this.tableName, { action, data })
  }

  static get Ids() {
    return IdsModel.bind(null, this)
  }

  static prepare(id) {
    const model = new this()
    model._id = id
    return model
  }

  static find(id) {
    return new RequestBuilder(this, { id })
  }

  static all() {
    return new Collection(this)
  }
  static first(...args) {
    return this.all().first(...args)
  }
  static last(...args) {
    return this.all().last(...args)
  }

  static get requestedAttributeAliases() {
    if (!(`_requestedAttributeAliases_${this.name}` in this)) {
      this[`_requestedAttributeAliases_${this.name}`] = {}
    }
    return this[`_requestedAttributeAliases_${this.name}`]
  }
  static get additionalAttributesToSave() {
    if (!(`_additionalAttributesToSave_${this.name}` in this)) {
      this[`_additionalAttributesToSave_${this.name}`] = []
    }
    return this[`_additionalAttributesToSave_${this.name}`]
  }
}

// Model.attributes = ['created_at', 'updated_at']
;[
  `beforeValidation`,
  `afterValidation`,
  `beforeSave`,
  `afterSave`,
  `beforeCreate`,
  `afterCreate`,
  `beforeUpdate`,
  `afterUpdate`,

  `afterInitialize`,
  // 'afterRequestedAttributesChanged',
  `afterFind`,
  `beforeDestroy`,
  `afterDestroy`,
].forEach(name => Model.registerCallback(name))
export default Model
