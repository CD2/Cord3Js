import { action } from "mobx"
import { post } from "axios"

import { Database } from "./db"
import Request from "./Request"
import Response from "./Response"
import { uid } from "./utils"
import { toJS } from "mobx"

import { CordError, RecordNotFoundError, IdsNotFoundError } from "./errors"

//in charge of communication between the models, the db and the api
export default class Store {
  models = {}

  constructor({ apiUrl = `/`, batchTimeout = 100, httpMethod = post } = {}) {
    this.apiUrl = apiUrl
    this.batchTimeout = batchTimeout
    this.db = new Database()
    this.httpRequest = httpMethod
  }

  registerModel(model) {
    model.store = this
    // if (model.name in this.models) throw new CordError('Two models have the same name!')
    this.models[model.className] = model
  }

  getModel(modelName) {
    if (!(modelName in this.models)) throw new CordError(`Model not found ${modelName}`)
    return this.models[modelName]
  }

  findIds(api, tableName, { reload = false, ...data }) {
    if (data._id === undefined) data._id = uid()
    const row = this.getIds(tableName, data._id)
    if (!reload && (row.fetched || row.fetching)) return Promise.resolve(row)
    // needs to request
    row.fetching = true
    return this.fetchIds(api, tableName, data)
      .catch(err => {
        row.fetching = false
        row.fetch_error = true
        throw err
      })
      .then(() => {
        row.fetching = false
        row.fetched = true
        return row
      })
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

  async findRecord(api, tableName, { id, attributes = [], reload = false } = {}) {
    const row = this.getRecord(tableName, id)
    if (!reload && (row.fetched || row.fetching) && row.hasAttributes(attributes)) {
      return { record: row, errors: [] }
    }
    //needs to request
    row.fetching = true
    let response
    const missingAttributes = row.missingAttributes(attributes)
    try {
      response = await this.fetchRecord(api, tableName, { id, attributes: missingAttributes })
    } catch (err) {
      row.fetching = false
      row.fetch_error = true
      /*request err*/
      throw err
    }
    row.fetching = false
    row.fetched = true
    return {
      record: this.getRecord(tableName, id),
      errors: response._errors,
      response,
    }
  }

  getRecord(tableName, id) {
    const table = this.db.getTable(tableName)
    return table.getRecord(id)
  }

  async fetchRecord(api, tableName, { id, attributes = [] } = {}, { reload = false } = {}) {
    this.request.addRecords(api, [id], attributes)

    const response = await this.request
    console.log('recordResponse', response)

    const recordResponse = response.findRecordById(tableName, id)
    console.log('recordResponse', recordResponse)
    if (!recordResponse) throw new RecordNotFoundError()
    return recordResponse
  }

  async perform(apiName, tableName, { action, id, ids, data }) {
    if (id !== undefined) {
      if (ids === undefined) ids = []
      ids.push(id)
    }
    const uid = this.request.addAction(apiName, action, ids, data)
    const response = await this.request
    return response.findActionById(tableName, uid)
  }

  /*
    returns a request builder
  */
  get request() {
    return (
      this._request ||
      do {
        this.beginBatchTimer()
        this._request = new Request(this)
      }
    )
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

      table.insertErrors(_errors)
    })
    return response
  }
}
