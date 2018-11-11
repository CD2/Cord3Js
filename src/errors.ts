//Generic Cord Error
export class CordError extends Error {}

// thrown when a record is requested but no data was returned for it
export class RecordNotFoundError extends CordError {}

// ids were requested but not returned
export class IdsNotFoundError extends CordError {}
