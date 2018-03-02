import { Model } from "./model"
import { camelize } from "help-my-strings"
import attribute from "./dsl/attribute"
export default class HasOneAssication {
  static install(model, name, { model: foreignModelName, foreignKey } = {}) {
    if (!foreignModelName) foreignModelName = camelize(name)
    if (!foreignKey) foreignKey = `${name}_id`

    const options = {
      name,
      model: foreignModelName,
      foreignKey,
      type: `one`,
    }
    //
    // model.afterInitialize(record => {
    // })
    // model.afterRequestedAttributesChanged((record) => {
    // })

    model.associations.push(options)

    attribute(model, foreignKey)

    Object.defineProperties(model.prototype, {
      [`${name}_association`]: {
        get() {
          if (this[`_${name}_association`] === undefined) {
            this[`_${name}_association`] = new HasOneAssication(this, options)
          }
          return this[`_${name}_association`]
        },
      },
      [name]: {
        get() {
          return this[`${name}_association`].get()
        },
        set(val) {
          this[`${name}_association`].set(val)
        },
      },
      [`build_${name}`]: {
        value(...args) {
          return this[`${name}_association`].build(...args)
        },
      },
    })
  }

  constructor(model, options) {
    this.owner = model
    this.options = options
    // this.requestedAttributes = model.requestedAttributes[options.name]
  }

  get requestedAttributes() {
    const { name } = this.options
    const r = (this.owner.requestedAttributes || []).find(el => {
      if (typeof el === `string`) return el === name
      return el[name]
    })
    if (r === undefined) return
    if (typeof r === `string`) return []
    return r[name]
  }

  get targetModel() {
    return this.owner.class.store.getModel(this.options.model)
  }

  get foreignKey() {
    return this.owner[this.options.foreignKey]
  }
  set foreignKey(val) {
    return (this.owner[this.options.foreignKey] = val)
  }

  async get() {
    if (this.foreignKey) {
      if (!this.target || this.target.id !== this.foreignKey) {
        this.target = await this.targetModel.find(this.foreignKey, this.requestedAttributes)
      }
      return this.target
    }
  }

  set(val) {
    if (Model.isModel(val)) {
      this.target = val
      val = val.id
    }
    this.foreignKey = val
  }

  build() {}
}
