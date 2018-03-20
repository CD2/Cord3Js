import { computed } from "mobx"
import Row from "./Row"

export default class Record extends Row {
  constructor(table, id) {
    super()
    this.table = table
    this.id = id
  }

  remove() {
    this.table.removeRecord(this.id)
  }

  update(attributes) {
    this.data.merge(attributes)
  }

  get(name) {
    return this.data.get(name)
  }

  @computed
  get attributes() {
    return this.data.keys()
  }

  hasAttributes(attrs) {
    return attrs.every(attr => this.data.has(attr))
  }

  missingAttributes(attrs = []) {
    if (!attrs.filter) console.warn(attrs)
    return attrs.filter(attr => !this.attributes.includes(attr))
  }
}
