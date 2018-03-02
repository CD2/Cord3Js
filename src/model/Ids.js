import { observable } from "mobx"

export default class Ids {
  @observable loading = false
  @observable loaded = false
  @observable errored = false
  @observable idsArr = []

  /*
    model: a model
    query: description of a scope e.g:
      'all'
      { scope: 'all', sort: 'name ASC' }
      { scope: 'published', query: 'my search query' }
  */

  constructor(model, query = {}) {
    this.model = model
    this.query = query
  }

  get tableName() {
    return this.model.tableName
  }

  get apiName() {
    return this.model.apiName
  }

  get store() {
    return this.model.store
  }

  get query() {
    return this._query
  }
  set query(val) {
    if (typeof val === `string`) val = { scopes: [val] }
    if (val.scope) {
      val.scopes = [val.scope]
      delete val.scope
    }
    if (!val.scopes) val.scopes = [`all`]
    this._query = val
  }

  get scopes() {
    return this.query.scopes
  }
  set scopes(val) {
    this.query.scopes = Array.isArray(val) ? val : [val]
  }

  get sort() {
    return this.query.sort
  }
  set sort(val) {
    this.query.sort = val
  }

  get search() {
    return this.query.query
  }
  set search(val) {
    this.query.query = val
  }

  async load({ reload = false } = {}) {
    this.loading = true
    const data = { ...this.query, reload }
    try {
      this.record = await this.store.findIds(this.apiName, this.tableName, data)
      const ids = this.record.getData()
      this.idsArr = ids[this.scopes[0]] || []
      this.loaded = true
    } catch (err) {
      throw err
      this.errored = true
    }
    this.loading = false
    return this.idsArr
  }

  reload() {
    return this.load({ reload: true })
  }

  async ids() {
    //return array of ids
    await this.load()
    return this.idsArr
  }
}
