import { humanize, pluralize } from "help-my-strings"
import { observable } from "mobx"

import Collection from "./Collection"
import IdsModel from "./Ids"
import { Attribute } from "../dsl/attribute"
import FileManager from "../FileManager"

export function createModel({ name, attributes = [], validations = {}, uploaders = {} }, NewModel) {
  NewModel.className = name
  attributes.forEach(attr => Attribute.install(NewModel.prototype, attr))
  NewModel.prototype.validations = validations
  Object.keys(uploaders).forEach(name => FileManager.install(NewModel, name, uploaders[name]))
  return NewModel
}

const validatePresence = value => {
  const msg = "is required"
  if (value === undefined || value === null) {
    return msg
  } else if (typeof value === `boolean`) {
    return
  } else if (typeof value === `string`) {
    if (value === ``) return msg
  } else if (Array.isArray(value)) {
    if (value.length === 0) return msg
  } else if (typeof value === `object`) {
    if (Object.keys(value).length === 0) return msg
  }
}

const validateEmail = value => {
  if (
    !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      value,
    )
  ) {
    return `must be a valid email`
  }
}

async function loadRecord(model, id, attrs) {
  let processedAttrs = []
  attrs.forEach(attr => {
    if (model.associationNames.includes(attr)) {
      console.log("requesting assoc", model.apiName, id, attr)
    }
    const aliases = model.requestedAttributeAliases[attr]
    if (aliases === undefined) {
      processedAttrs.push(attr)
    } else if (Array.isArray(aliases)) {
      processedAttrs = processedAttrs.concat(aliases)
    } else {
      processedAttrs.push(aliases)
    }
  })

  const { apiName, tableName } = model

  const request = await model.store.findRecord(apiName, tableName, {
    id,
    attributes: processedAttrs,
  })
  if (request.errors && request.errors.length) {
    throw request.errors
  }

  const record = new model()
  record.requestedAttributes = attrs
  record._id = id

  return record
}

class Model {
  [key: string]: any

  async isValid() {
    this.errors.clear()

    try {
      await this.runCallbacks(`beforeValidation`)
    } catch (error) {
      console.error(error)
      return false
    }

    let validatableAttributes
    validatableAttributes = Object.keys(this.validations || {})
    // if (this.newRecord) {
    // } else {
    //   validatableAttributes = this.changes.keys().slice(0)
    // }
    const context = this.newRecord ? `create` : `update`

    const attributeValidionPromises = validatableAttributes.map(async attr => {
      const validations = (this.validations || {})[attr]
      if (!validations) return
      const { if: onlyIf, ...validators } = validations
      //filter the validations

      let applicableValidations
      if (onlyIf) {
        const ifCallback = typeof onlyIf === `string` ? this[onlyIf] : onlyIf
        // Checks to see whether the callback is a function, executes if it is otherwise
        // calls the string in the model
        if (typeof ifCallback === `function`) {
          if (ifCallback.call(this, this) === false) applicableValidations = []
        } else if (!ifCallback) {
          return (applicableValidations = [])
        }
      } else {
        applicableValidations = Object.entries(validators)
      }

      //call the validations
      const validationPromises = applicableValidations.map(([name]) => {
        let msg
        if (name === "presence") {
          msg = validatePresence(this[attr])
        } else if (name === "email") {
          msg = validateEmail(this[attr])
        } else {
          throw new Error(`unknown validation ${name}`)
        }
        if (msg) this.errors.add(attr, msg)
      })

      await Promise.all(validationPromises)
    })

    await Promise.all(attributeValidionPromises)

    const isValid = this.errors.empty()
    if (isValid) await this.runCallbacks(`afterValidation`)
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
      return errors.map(msg => ` ${friendlyName} ${msg}`)
    },
  }

  static create(attributes) {
    const record = new this(attributes)
    record.save()
    return record
  }

  _attributesForSaveWithValues(this: any) {
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

  async _create_record(this: any) {
    const attributes = this._attributesForSaveWithValues()
    await this.runCallbacks(`beforeCreate`)
    const { data, errors } = await this.constructor.perform(`create`, attributes)
    if (this.processErrors(errors)) {
      throw `save_failed`
    }
    this._id = data.id
    await this.reload()
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
        Object.entries(JSON.parse(errors[0])).forEach(([field, messages]: any) => {
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

  async destroy(this: any) {
    if (!this.persisted) throw new Error(`YO CANT DELETE THIS - ITS NOT REALLY THERE YET`)
    await this.runCallbacks(`beforeDestroy`)
    const { errors } = await this.perform(`destroy`)
    if (errors.length > 0) {
      throw `delete_failed`
    }
    this.record.remove()
    this.runCallbacks(`afterDestroy`)
  }
  static callbacks(this: any, name) {
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
  static addCallback(this: any, callbackName, cbOrName, cb) {
    if (cb === undefined) cb = cbOrName
    if (this._callbacks === undefined) this._callbacks = {}
    if (this._callbacks[callbackName] === undefined) this._callbacks[callbackName] = []
    this._callbacks[callbackName].push(cb)
  }
  static callbacksFor(this: any, name) {
    if (!this._callbacks) return []
    return this._callbacks[name] || []
  }

  addCallback(this: any, callbackName, cbOrName, cb) {
    if (cb === undefined) cb = cbOrName
    if (this._callbacks === undefined) this._callbacks = {}
    if (this._callbacks[callbackName] === undefined) this._callbacks[callbackName] = []
    this._callbacks[callbackName].push(cb)
  }
  callbacksFor(this: any, name) {
    if (!this._callbacks) return []
    return this._callbacks[name] || []
  }

  /* run callbacks
  returns: promise
  name: callbacks to run
  args: [arguments for each callback]
*/
  runCallbacks(this: any, name, args = []) {
    const clsCallbacks = this.class.callbacksFor(name)
    const instCallbacks = this.callbacksFor(name)
    const callbacks = clsCallbacks.concat(instCallbacks)
    const rets = callbacks.map(cb => cb(this, ...args))
    return Promise.all(rets)
  }

  assignAttributes(attrs) {
    Object.entries(attrs).forEach(([key, value]) => Attribute.set(this, key, value, {}))
  }

  changed() {
    Array.from(this.changes.keys()).length > 0
  }

  reset() {
    this.changes.clear()
  }

  static _className: any
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

  constructor(attributes = {}, requestedAttributes = []) {
    this.assignAttributes(attributes)
    this.requestedAttributes = requestedAttributes
  }

  get newRecord() {
    return this._id === undefined
  }
  get persisted() {
    return !this.newRecord
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

  get record(this: any) {
    return this.class.store.getRecord(this.class.tableName, this.id)
  }

  withAttributes(this: any, attrs) {
    if (this.persisted) {
      const newAttrs = [...this.requestedAttributes, ...attrs]
      return this.class.find(this.id, newAttrs)
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

  reload(this: any) {
    return this.class.reload(this.id, this.requestedAttributes)
  }

  static reload(this: any, id, attributes) {
    return this.store.findRecord(this.apiName, this.tableName, { id, attributes })
  }

  toJSON() {
    return this.attributeValues ? this.attributeValues.toJS() : {}
  }

  async perform(this: any, action, data) {
    const { store, apiName, tableName } = this.class
    const response = await store.perform(apiName, tableName, { action, id: this._id, data })
    return response
  }

  static perform(this: any, action, data) {
    return this.store.perform(this.apiName, this.tableName, { action, data })
  }

  static get Ids() {
    return IdsModel.bind(null, this)
  }

  static db: any = {}

  static find(id, attributes: string[] = []) {
    if (!(this.apiName in this.db)) {
      this.db[this.apiName] = {}
    }
    const table = this.db[this.apiName]
    if (!(id in table)) {
      table[id] = {}
    }

    const tableKey = attributes.length === 0 ? "RECORD_EXISTS?" : JSON.stringify(attributes)
    if (!(tableKey in table[id])) {
      console.log("loading record for ", id, tableKey)
      const prom = loadRecord(this, id, attributes)
      // prom
      //   .then(() => {
      //     delete table[id][tableKey]
      //   })
      //   .catch(() => {
      //     delete table[id][tableKey]
      //   })
      table[id][tableKey] = prom
    }

    return table[id][tableKey]
  }

  static all() {
    return new Collection(this)
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
