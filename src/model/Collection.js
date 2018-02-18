import Ids from "./Ids"
import { observable } from "mobx"

export default class Collection {
  constructor(model) {
    this.model = model
  }

  @observable _sort
  @observable _query
  @observable _scope
  @observable _limit
  @observable _offset = 0
  // SCOPING

  _withAttributes = []
  withAttributes(attrs = []) {
    if (!Array.isArray(attrs)) attrs = [attrs]
    this._withAttributes = this._withAttributes.concat(attrs)
    return this
  }
  sort(val) {
    this._sort = val
    this._allIds = undefined
    this.triggerChange()
    return this
  }
  query(val) {
    this._query = val
    this._allIds = undefined
    this.triggerChange()
    return this
  }
  scope(val) {
    this._scope = val
    this._allIds = undefined
    this.triggerChange()
    return this
  }
  limit(val) {
    this._limit = val
    this.triggerChange()
    return this
  }
  unlimit() {
    this._limit = undefined
    this.triggerChange()
    return this
  }
  offset(val) {
    this._offset = val
    this.triggerChange()
    return this
  }
  unoffset() {
    this._offset = undefined
    this.triggerChange()
    return this
  }
  // TODO: isScoped() returns if there is a scope on the collection e.g. sorting or a query
  dup() {
    const dupped = new this.constructor(this.model)
    dupped._withAttributes = [...this._withAttributes]
    dupped._sort = this._sort
    dupped._query = this._query
    dupped._scope = this._scope
    dupped._limit = this._limit
    dupped._offset = this._offset
    return dupped
  }

  get sortedColumn() {
    return this._sort ? this._sort.split(" ")[0] : undefined
  }
  get sortedDir() {
    return this._sort ? this._sort.split(" ")[1] : undefined
  }

  _onChangeCallbacks = []
  onChange(cb) {
    const idx = this._onChangeCallbacks.length
    this._onChangeCallbacks[idx] = cb
    //cant delete it from the array of all the idx will get shifted which would break other callbacks
    return () => {
      this._onChangeCallbacks[idx] = null
    }
  }
  triggerChange() {
    this._onChangeCallbacks.forEach(cb => (cb === null ? null : cb()))
  }

  async ids() {
    const scope = {
      sort: this._sort,
      query: this._query,
      scope: this._scope,
    }
    const { _limit, _offset = 0 } = this

    if (!this._allIds) {
      this._allIds = await new Ids(this.model, scope).ids()
    }

    if (_limit) {
      return this._allIds.slice(_offset, _offset + _limit)
    }
    if (_offset) {
      return this._allIds.slice(_offset)
    }
    return this._allIds
  }

  async find(id) {
    const ids = await this.ids()
    if (!ids.includes(id)) throw "record not found error"
    return this.model.find(id, this._withAttributes)
  }

  async records() {
    const ids = await this.ids()
    const records = ids.map(id => this.model.find(id, this._withAttributes))
    return Promise.all(records)
  }
  all() {
    return this.records()
  }
  toArray() {
    return this.records()
  }
  async first(n = 1) {
    let ids = await this.ids()
    ids = ids.slice(0, n)
    if (n === 1) {
      return this.model.find(ids[0], this._withAttributes)
    } else {
      return ids.map(id => this.model.find(id, this._withAttributes))
    }
  }
  async last(n = 1) {
    let ids = await this.ids()
    ids = ids.slice(-n)
    if (n === 1) {
      return this.model.find(ids[0], this._withAttributes)
    } else {
      return ids.map(id => this.model.find(id, this._withAttributes))
    }
  }
  async count() {
    return (await this.ids()).length
  }
  async forEach(cb) {
    const ids = await this.ids()
    ids.forEach((id, i) => {
      const record = this.find(id)
      cb(record, i, this)
    })
  }
  async map(cb) {
    //TODO
  }

  async pluck(...attrs) {
    const ids = await this.ids()
    const data = ids.map(async id => {
      const { record, ...rest } = await this.model.store.findRecord(
        this.model.apiName,
        this.model.tableName,
        { id, attributes: attrs },
      )
      if (attrs.length === 1) {
        return record.data.get(attrs[0])
      }
      return attrs.map(attr => record.data.get(attr))
    })

    return await Promise.all(data)
  }
}
