import { observable, action } from "mobx"

import Record from "./Record"
import Ids from "./Ids"

export default class Table {
  constructor(name) {
    this.name = name
  }

  @observable ids = new Ids()
  @observable keyed_ids = observable.map()

  @observable records = observable.map()
  @observable aliases = observable.map()

  getRecord(id) {
    if (this.aliases.has(id)) {
      id = this.aliases.get(id)
    }
    if (!this.records.has(id)) {
      this.records.set(id, new Record(id))
    }
    return this.records.get(id)
  }

  getIds(key) {
    if (!key) return this.ids
    if (!this.keyed_ids.has(key)) {
      this.keyed_ids.set(key, new Ids(key))
    }
    return this.keyed_ids.get(key)
  }

  insertIds({ key, ...scopes }) {
    this.getIds(key).data.merge(scopes)
  }

  @action
  insertRecords(records) {
    records.forEach(record => this.insertRecord(record))
  }

  @action
  insertRecord(data) {
    const { id } = data
    if (this.records.has(id)) {
    }
    const record = this.records.has(id) ? this.records.get(id) : new Record(id)
    record.fetched = true
    record.update(data)
    this.records.set(id, record)
  }

  @action
  insertAliases(aliasObject) {
    Object.entries(aliasObject).forEach(([alias, id]) => {
      const recordData = this.records.get(alias).toJS()
      if (recordData) {
        recordData.id = id
        this.insertRecord(recordData)
      }
      this.records.delete(alias)
    })
    this.aliases.merge(aliasObject)
  }

  insertErrors(errors) {
    if (errors == true) throw errors
  }
}
