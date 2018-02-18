import IdsModel from "../Ids"
import Collection from "../Collection"
import { mixin } from "../../module"
import { observable } from "mobx"
class ModelBuilder {
  constructor(model, requestedAttributes) {
    this.model = model
    this.requestedAttributes = requestedAttributes
  }

  // COMMENT SIX: This is sometimes used for look ups - it will eventually be good
  new(attrs) {
    const record = new this.model(attrs)
    record.requestedAttributes = this.requestedAttributes
    return record
  }

  find(id) {
    return this.model.find(id, this.requestedAttributes)
  }
  all() {
    return this.model
      .Collection()
      .withAttributes(this.requestedAttributes)
      .all()
  }
  first() {
    return this.model
      .Collection()
      .withAttributes(this.requestedAttributes)
      .first()
  }
  last() {
    return this.model
      .Collection()
      .withAttributes(this.requestedAttributes)
      .last()
  }
}

import NamingModule from "./naming"
import CallbacksModule from "./callbacks"
import AttributesModule from "./attributes"
import PersistenceModule from "./persistence"
import ValidationsModule from "./validations"
import RecordModule from "./record"

// @mixin(
//   BaseClass =>
//     class extends BaseClass {
//       constructor() {
//         super()
//         Object.seal(this)
//       }
//     },
// )
@mixin(NamingModule)
@mixin(CallbacksModule)
@mixin(AttributesModule)
@mixin(PersistenceModule)
@mixin(ValidationsModule)
@mixin(RecordModule)
export default class Model {
  static defaultRequestAttributes = []
  static associations = []
  _id = undefined
  changes = observable.map()

  constructor(attributes = {}, requestedAttributes) {
    this.assignAttributes(attributes)
    this.requestedAttributes = requestedAttributes

    // this prevents you setting new properties on the model
    // means you cant accidently assign to a non attribute for instance
    // Object.seal(this)
  }

  static new(...args) {
    return new this(...args)
  }

  static withAttributes(requested) {
    return new ModelBuilder(this, requested)
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

  async load() {
    const { id, requestedAttributes } = this
    const { apiName, tableName } = this.class
    this.loading = true

    try {
      const request = await this.class.store.findRecord(apiName, tableName, {
        id,
        attributes: requestedAttributes,
      })
      if (request.errors && request.errors.length) {
        throw request.errors
      } else {
        this.loading = false
        this.loaded = true
      }
    } catch (err) {
      this.errored = true
      this.loading = false
      throw err
    }
  }

  reload() {
    this.class.reload(this.id, this.requestedAttributes)
  }

  static reload(id, attributes) {
    this.store.findRecord(this.apiName, this.tableName, { id, attributes, reload: true })
  }

  toJSON() {
    return this.attributeValues.toJS()
    return Object.values(this.attributes).reduce((acc, attr) => {
      acc[attr.name] = attr.get()
      return acc
    }, {})
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

  static find(id, attrs = []) {
    const requestedAttributes = [...this.defaultRequestAttributes, ...attrs]
    const modelRequest = new ModelRequest(this, id, requestedAttributes)
    return modelRequest.load()
  }

  static collection() {
    console.warn("DEPRICATED: please change all calls from .collection() to .all() ")
    return this.all()
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
}

// Model.attributes = ['created_at', 'updated_at']

class ModelRequest {
  constructor(model, id, attrs) {
    this.model = model
    this.id = id
    this.attrs = attrs
  }

  async load() {
    const { id, attrs } = this
    const { apiName, tableName } = this.model

    const record = this.model.new()
    record.requestedAttributes = attrs
    record._id = id

    try {
      const request = await this.model.store.findRecord(apiName, tableName, {
        id,
        attributes: this.attrs,
      })
      if (request.errors && request.errors.length) {
        throw request.errors
      } else {
        record.loaded = true
      }
    } catch (err) {
      record.errored = true
      throw err
    }
    record.loading = false

    return record
  }
}
