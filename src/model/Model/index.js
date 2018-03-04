import IdsModel from "../Ids"
import Collection from "../Collection"
import { mixin } from "../../module"
import { observable } from "mobx"
class ModelBuilder {
  constructor(model, requestedAttributes = []) {
    this.model = model
    this.requestedAttributes = requestedAttributes
  }

  withAttributes(attrs) {
    this.requestedAttributes = this.requestedAttributes.concat(attrs)
    return this
  }

  new(attrs) {
    const record = new this.model(attrs)
    record.requestedAttributes = this.requestedAttributes
    return record
  }

  find(id) {
    return loadRecord(this.model, id, this.requestedAttributes)
  }
  all() {
    return this.model
      .all()
      .withAttributes(this.requestedAttributes)
      .all()
  }
  first() {
    return this.model
      .all()
      .withAttributes(this.requestedAttributes)
      .first()
  }
  last() {
    return this.model
      .all()
      .withAttributes(this.requestedAttributes)
      .last()
  }
}
import NamingModule from "./naming"
import CallbacksModule from "./callbacks"
import AttributesModule from "./attributes"
import PersistenceModule from "./persistence"
import ValidationsModule from "./validations"

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

  get newRecord() {
    return this._id === undefined
  }
  get persisted() {
    return !this.newRecord
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
    this.class.reload(this.id, this.requestedAttributes)
  }

  static reload(id, attributes) {
    this.store.findRecord(this.apiName, this.tableName, { id, attributes, reload: true })
  }

  toJSON() {
    return this.attributeValues.toJS()
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
    if (attrs.length > 0) passingAttributesAsSecondArgumentToFindDepricationWarning()
    return new ModelBuilder(this).withAttributes(attrs).find(id)
  }

  static collection() {
    console.warn(`DEPRICATED: please change all calls from .collection() to .all() `)
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
import { depricationWarning } from "../../utils"

const complexRequestedAttributeDepricationWarning = depricationWarning(
  `requesting associations attributes directly is depricated. please use withAttributes on the assocaition instead.`,
)
const passingAttributesAsSecondArgumentToFindDepricationWarning = depricationWarning(
  `Passing requested arguments to find is depricated. Please use withAttributes instead`,
)

async function loadRecord(model, id, attrs) {
  let processedAttrs = []
  attrs.forEach(attr => {
    if (typeof attr != `string`) {
      complexRequestedAttributeDepricationWarning()
      return
    }
    const aliases = model.requestedAttributeAliases[attr]
    if (aliases !== undefined) {
      if (Array.isArray(aliases)) {
        processedAttrs = processedAttrs.concat(aliases)
      } else {
        processedAttrs.push(aliases)
      }
    } else {
      processedAttrs.push(attr)
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

  const record = model.new()
  record.requestedAttributes = attrs
  record._id = id
  return record
}
