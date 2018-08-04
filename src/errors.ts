//Generic Cord Error
export class CordError extends Error {}

// thrown when a record is requested but no data was returned for it
export class RecordNotFoundError extends CordError {}

// attempting to use a record before its request has finished executing
export class RecordNotLoadedError extends CordError {}

// record was requested with attributes but response did not contain them
export class MissingAttributesError extends CordError {}

// problem with the model definition
export class AttributeDefinitionError extends CordError {}

// ids were requested but not returned
export class IdsNotFoundError extends CordError {}

// duh
export class NotImplementedError extends CordError {
  constructor() {
    super(`not implemented`)
  }
}
