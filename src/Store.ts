import { action } from "mobx"
import { Database } from "./db"
import Request from "./Request"
import Response from "./Response"
import { uid } from "./utils"
import { CordError, RecordNotFoundError, IdsNotFoundError } from "./errors"

//in charge of communication between the models, the db and the api
export default class Store {
  models = {}

  apiUrl: string
  batchTimeout: number
  httpRequest: any
  errorHandler: any
  db = new Database()

  constructor({ apiUrl = `/`, batchTimeout = 100, httpMethod, onError = () => {} }) {
    this.apiUrl = apiUrl
    this.batchTimeout = batchTimeout
    this.httpRequest = httpMethod
    this.errorHandler = onError
  }

  registerModel(model) {
    model.store = this
    this.models[model.className] = model
  }

  getModel(modelName) {
    if (!(modelName in this.models)) throw new CordError(`Model not found ${modelName}`)
    return this.models[modelName]
  }

  findIds(api, tableName, { reload = false, ...data }) {
    if (data._id === undefined) data._id = uid()
    const row = this.getIds(tableName, data._id)
    return this.fetchIds(api, tableName, data)
      .catch(err => {
        throw err
      })
      .then(() => row)
  }

  getIds(tableName, _id) {
    const table = this.db.getTable(tableName)
    return table.getIds(_id)
  }

  fetchIds(api, tableName, data) {
    this.request.addIds(api, data)
    const { _id } = data
    return new Promise((resolve, reject) => {
      this.request.then(response => {
        if (response.findIds(tableName, _id)) resolve()
        else reject(new IdsNotFoundError())
      })
    })
  }

  async findRecord(api, tableName, { id, attributes = [], reload = false }: any = {}) {
    const response = await this.fetchRecord(api, tableName, { id, attributes })

    if (response._errors) this.errorHandler(response._errors)
    return {
      record: this.getRecord(tableName, id),
      errors: response._errors,
      response,
    }
  }

  getRecord(tableName, id) {
    return this.db.getTable(tableName).getRecord(id)
  }

  async fetchRecord(api, tableName, { id, attributes = [] }: any = {}, { reload = false } = {}) {
    this.request.addRecords(api, [id], attributes)

    const response = await this.request

    const recordResponse = response.findRecordById(tableName, id)
    if (!recordResponse) throw new RecordNotFoundError()
    return recordResponse
  }

  async perform(apiName, tableName, { action, id, ids, data }) {
    return new Promise((resolve, reject) => {
      if (id !== undefined) {
        if (ids === undefined) ids = []
        ids.push(id)
      }
      const uid = this.request.addAction(apiName, action, ids, data)
      this.request
        .then(response => {
          const x = response.findActionById(tableName, uid)
          if (x.errors.length) this.errorHandler({ errors: x.errors, apiName, action, ids, data })
          resolve(x)
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  _request: any
  _batchTimer: any
  /*
    returns a request builder
  */
  get request() {
    if (!this._request) {
      this.beginBatchTimer()
      this._request = new Request(this)
    }
    return this._request
  }

  beginBatchTimer() {
    this._batchTimer = setTimeout(() => this.performRequest(), this.batchTimeout)
  }

  cancelBatchTimer() {
    clearTimeout(this._batchTimer)
  }

  performRequest() {
    if (this.request.empty()) return
    const request = this.request
    const requestJson = request.toJSON()
    this.sendRequest(requestJson)
      .then(response => request.resolve(response))
      .catch(error => request.reject(error))
    this._request = undefined
  }

  sendRequest(data) {
    return this.httpRequest(this.apiUrl, data, { processData: false })
      .then(response => new Response(response.data))
      .then(this.processResponse)
  }

  @action
  processResponse = response => {
    if (response.errors) {
      throw new CordError(response.errors)
    }

    response.tables.forEach(responseBlob => {
      let { table: tableName, ids = {}, records = [], aliases = {}, _errors } = responseBlob
      const table = this.db.getTable(tableName)

      Object.entries(ids).forEach(([key, scopes]) => {
        if (key === `_`) key = undefined
        table.insertIds({ key, ...scopes })
      })

      table.insertAliases(aliases)

      records.forEach(r => {
        if (!Array.isArray(r)) r = [r]
        r.forEach(r => table.insertRecord(r))
      })

      if (_errors) this.errorHandler(_errors)
      table.insertErrors(_errors)
    })
    return response
  }
}
