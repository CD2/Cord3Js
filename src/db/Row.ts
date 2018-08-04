import { observable, when, toJS } from "mobx"

export default class Row {
  @observable fetched = false
  @observable fetching = false
  @observable fetch_error = false
  @observable error = null
  @observable data = observable.map()

  whenLoaded(callback) {
    when(() => this.fetched, () => callback.call(this, this))
  }

  whenLoading(callback) {
    when(() => this.fetching, () => callback.call(this, this))
  }

  whenErrored(callback) {
    when(() => this.fetch_error, () => callback.call(this, this.error, this))
  }

  toJS() {
    return toJS(this.data)
  }
}
