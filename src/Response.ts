export default class Response {
  _response: any
  constructor(response) {
    this._response = response
  }

  forEach(cb) {
    this._response.forEach(cb)
  }

  for(table) {
    return this.tables.find(blob => blob.table === table)
  }

  recordsFor(table) {
    const records = this.for(table).records
    return Array.prototype.concat.apply([], records)
  }

  idsFor(table) {
    return this.for(table).ids
  }

  findActionById(table, id) {
    const actions = this.for(table).actions
    const { data, _errors = [] } = actions.find(({ _id }) => _id === id)
    return { data, errors: _errors }
  }

  findRecordById(table, needleId) {
    const { aliases } = this.for(table)
    let lookupId = (aliases && aliases[needleId]) || needleId
    const records = this.recordsFor(table)
    return records.find(({ id }) => id == lookupId)
  }

  findIds(table, _id = `_`) {
    return this.idsFor(table)[_id]
  }

  get tables() {
    return this._response.filter(({ table }) => table !== `_errors`)
  }

  get errors() {
    const errors = this._response.filter(({ table }) => table === `_errors`)
    if (errors && errors._errors == true) return errors._errors
  }
}
