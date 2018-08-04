import { observable, computed, toJS } from "mobx"

export default class IdsRecord {
  @observable fetched = false
  @observable fetching = false
  @observable fetch_error = false
  @observable error = null
  @observable data = observable.map()

  key: any
  constructor(key?) {
    this.key = key
  }

  @computed
  get scopes() {
    return Array.from(this.data.keys())
  }

  hasScopes(scopes) {
    return scopes.every(scope => this.data.has(scope))
  }

  missingScopes(scopes) {
    return scopes.filter(scope => !this.scopes.includes(scope))
  }

  getScopes(scopes) {
    return toJS(scopes.map(scope => this.data.get(scope)))
  }

  getScope(scope) {
    return toJS(this.data.get(scope))
  }

  getData() {
    return toJS(this.data)
  }

  toJSON() {
    const json: any = {
      fetched: this.fetched,
      fetching: this.fetching,
      fetch_error: this.fetch_error,
      scopes: toJS(this.data),
    }
    if (this.error) json.error = this.error
    if (this.key) json.key = this.key
    return json
  }
}
