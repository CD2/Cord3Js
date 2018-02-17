import { action, reaction, computed } from "mobx"
import Row from "./Row"

export default class Record extends Row {
  constructor(id) {
    super()
    this.id = id
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
