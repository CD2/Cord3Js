import { action } from "mobx"
import { uid } from './utils'

export default class Request {

  request = {}
  onSuccessCallbacks = []
  onErrorCallbacks = []

  constructor(store) {
    this.store = store
  }

  __promise = null
  toPromise() {
    return this.__promise || do {
      this.__promise = new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      }).then(response => {
        this.resolve = () => {}
        this.reject = () => {}
        return response
      }).catch(error => {
        this.resolve = () => {}
        this.reject = () => {}
        throw error
      })
    }
  }

  then(cb) { return this.toPromise().then(cb) }
  catch(cb) { return this.toPromise().catch(cb) }
  resolve() {} // stubs; overridden in `toPromise`
  reject() {} // stubs; overridden in `toPromise`

  addApi(api) {
    if (this.request[api] === undefined) {
      this.request[api] = {
        records: [],
        ids: [],
        actions: [],
      }
    }
    return this.request[api]
  }

  getApi(api) {
    return this.request[api] || this.addApi(api)
  }

  addRecords(api, ids, attributes = []) {
    this.getApi(api).records.push({ ids, attributes })
  }

  addIds(api, data) {
    if (Array.isArray(data)) {
      this.getApi(api).ids.push(data)
    } else {
      this.getApi(api).ids.push(data)
    }
  }

  addAction(api, name, ids, data) {
    const _id = uid()
    this.getApi(api).actions.push({ _id, name, ids, data })
    return _id
  }

  // onSuccess(callback) {
  //   this.onSuccessCallbacks.push(callback)
  // }
  //
  // onError(callback) {
  //   this.onErrorCallbacks.push(callback)
  // }

  empty() {
    return !this.request
  }
  //
  // resolve(response) {
  //   this.onSuccessCallbacks.forEach(cb => cb(resp))
  // }
  //
  // reject(error) {
  //   this.onErrorCallbacks.forEach(cb => cb(error))
  // }

  /*
  returns an array of compiled requests
  */

  toJSON() {
    const compiled = Object.entries(this.request).reduce(
      (compiled, [api, request]) => {
        const subRequest = {}
        subRequest.api = api
        if (request.ids) subRequest.ids = request.ids
        if (request.records) subRequest.records = request.records
        if (request.actions) subRequest.actions = request.actions
        compiled.push(subRequest)
        return compiled
      },
      [],
    )
    return compiled
    // return objectToFormData(compiled)
  }

}
import objectToFormData from 'object-to-formdata'
