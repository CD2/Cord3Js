import { pluralize } from "help-my-strings"

export default BaseCls =>
  class extends BaseCls {
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
  }
