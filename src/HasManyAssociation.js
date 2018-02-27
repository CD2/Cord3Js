import { camelize, singularize } from "help-my-strings"
import { NotImplementedError } from "./errors"
import Collection from "./model/Collection"
import Model from "./model/Model"
import attribute from "./dsl/attribute"
import { reaction, computed } from "mobx"

export default class HasManyAssociation extends Collection {
  static install(model, name, { model: foreignModelName, foreignKey, inverseOf } = {}) {
    if (!foreignModelName) foreignModelName = camelize(singularize(name))
    if (!foreignKey) foreignKey = `${singularize(name)}_ids`
    const options = {
      name,
      model: foreignModelName,
      foreignKey,
      inverseOf,
      type: "many",
    }
    model.associations.push(options)

    attribute(model, foreignKey, { defaultValue: [] })

    Object.defineProperty(model.prototype, name, {
      get() {
        if (!this[`_${name}`]) {
          this[`_${name}`] = new HasManyAssociation(this, options)
        }
        return this[`_${name}`]
      },
    })
  }

  associationType = "hasMany"

  constructor(owner, options) {
    const targetModel = owner.class.store.getModel(options.model)
    super(targetModel)
    this.owner = owner
    this.options = options

    if (this.owner[this.options.foreignKey]) {
      this.owner[this.options.foreignKey].observe(() => {
        this._allIds = null
        this.triggerChange()
      })
    }
  }

  dup() {
    const dupped = new this.constructor(this.owner, this.options)
    dupped._withAttributes = [...this._withAttributes]
    dupped._sort = this._sort
    dupped._query = this._query
    dupped._unsavedIds = this._unsavedIds
    dupped._unsavedRecords = this._unsavedRecords
    return dupped
  }

  _unsavedIds = []
  async ids() {
    // if (!this.owner.attributeLoaded(this.options.foreignKey)) {
    //   this.owner.requestedAttributes.push(this.options.foreignKey)
    //   await this.owner.load()
    // }
    // TODO: check if attribute loaded, if not then load it!!
    const persistedIds = this.owner[this.options.foreignKey] || []
    let ids = persistedIds.concat(this._unsavedIds)

    // if this.isScoped() {
    const { _limit, _offset = 0 } = this

    this._limit = undefined
    this._offset = undefined
    const scopedIds = await super.ids()
    this._limit = _limit
    this._offset = _offset

    ids = scopedIds.filter(id => ids.includes(id))

    if (_limit) {
      ids = ids.slice(_offset, _offset + _limit)
    }
    if (_offset) {
      ids = ids.slice(_offset)
    }

    // }
    return ids
  }

  _unsavedRecords = []
  async records() {
    const records = await super.records()
    return records.concat(this._unsavedRecords)
  }

  new(...args) {
    return this.build(...args)
  }

  build(attrs) {
    const record = this.targetModel.withAttributes(this._withAttributes).new(attrs)
    this._unsavedRecords.push(record)

    record.afterCreate("adding newly created association", record => {
      this.owner.record.update({
        [this.options.foreignKey]: this.owner[this.options.foreignKey].concat(record.id),
      })
      this._unsavedRecords = this._unsavedRecords.filter(r => r !== record)
    })

    const { inverseOf } = this.options
    if (inverseOf) {
      if (this.model.getAssociation(inverseOf).type === "many") {
        record[inverseOf].push(this.owner)
      } else {
        record[inverseOf] = this.owner
      }
    }

    return record
  }
  create(attrs) {
    const record = this.build(attrs)
    return record.save()
  }

  get targetModel() {
    return this.owner.class.store.getModel(this.options.model)
  }

  // get foreignKey() { return this.owner[this.options.foreignKey] }
  // set foreignKey(val) { return this.owner[this.options.foreignKey] = val }

  get() {
    return this
  }
  set(val) {
    throw Error("Cant assign to has many assoc")
  }
  // serialize() { return }
  // async ids() {
  //   return this.owner[this.options.foreignKey]
  // }
  // async delete(id_or_record) { throw new NotImplementedError('has many: ', 'DELETE') }

  // async find(id) {
  //   const ids = await this.ids()
  //   // if (!ids.includes(id)) throw 'record not found error'
  //   return this.model.find(id, this.attributes)
  // }

  push(id_or_record) {
    if (Model.isModel(id_or_record)) {
      if (id_or_record.persisted) {
        console.log(
          "asdasdasd",
          this.owner,
          this.options.foreignKey,
          this.owner[this.options.foreignKey],
        )
        this.owner[this.options.foreignKey].push(id_or_record.id)
      } else {
        this._unsavedRecords.push(id_or_record)
      }
    } else {
      this.owner[this.options.foreignKey].push(id_or_record)
    }
  }

  // newRecords = []

  // build(attributes = {}) {
  //   const newRecord = new this.model(attributes)
  //   this.newRecords.push(newRecord)

  //   newRecord.afterCreate('adding newly created association', (record) => {
  //     this.push(record)
  //     this.newRecords = this.newRecords.filter(r => r !== newRecord)
  //   })

  //   const { inverseOf } = this.options
  //   if (inverseOf) {
  //     if (this.model.getAssociation(inverseOf).type === 'many') {
  //       newRecord[inverseOf].push(this.owner)
  //     } else {
  //       newRecord[inverseOf] = this.owner
  //     }
  //   }

  //   return newRecord
  // }
}

import Ids from "./model/Ids"
