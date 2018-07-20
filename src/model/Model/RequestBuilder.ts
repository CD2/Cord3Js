import Model from "."

export class RequestBuilder {
  id: number | string
  attributes: string[] = []
  model: typeof Model

  constructor(
    model: typeof Model,
    { id, attributes = [] }: { id?: number | string; attributes?: string[] },
  ) {
    this.model = model
    this.id = id
    this.attributes = attributes
  }

  withAttributes(attrs) {
    return new RequestBuilder(this.model, {
      id: this.id,
      attributes: this.attributes.concat(attrs),
    })
  }

  new(attrs) {
    const record = new this.model(attrs)
    record.requestedAttributes = this.attributes
    return record
  }

  find(id) {
    return new RequestBuilder(this.model, { id, attributes: this.attributes })
  }
  load() {
    if (!this._promise) {
      this._promise = loadRecord(this.model, this.id, this.attributes)
    }
    return this._promise
  }
  all() {
    return this.model
      .all()
      .withAttributes(this.attributes)
      .all()
  }
  first() {
    return this.model
      .all()
      .withAttributes(this.attributes)
      .first()
  }
  last() {
    return this.model
      .all()
      .withAttributes(this.attributes)
      .last()
  }

  then(cb) {
    return this.load().then(cb)
  }
  catch(cb) {
    return this.load().catch(cb)
  }

  async perform(action, data) {
    const { store, apiName, tableName } = this.model
    const actionData: any = { action, data }
    if (this.id) actionData.id = this.id
    const response = await store.perform(apiName, tableName, actionData)
    return response
  }
}

async function loadRecord(model, id, attrs) {
  let processedAttrs = []
  attrs.forEach(attr => {
    const aliases = model.requestedAttributeAliases[attr]
    if (aliases !== undefined) {
      if (Array.isArray(aliases)) {
        processedAttrs = processedAttrs.concat(aliases)
      } else {
        processedAttrs.push(aliases)
      }
    } else {
      processedAttrs.push(attr)
    }
  })

  const { apiName, tableName } = model

  const request = await model.store.findRecord(apiName, tableName, {
    id,
    attributes: processedAttrs,
  })
  if (request.errors && request.errors.length) {
    throw request.errors
  }

  const record = model.new()
  record.requestedAttributes = attrs
  record._id = id

  return record
}
