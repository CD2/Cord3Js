import { observable, computed, toJS, when } from "mobx"

export default BaseClass =>
  class extends BaseClass {
    get newRecord() {
      return this._id === undefined
    }
    get persisted() {
      return !this.newRecord
    }
  }
