import HasManyAssociation from "../HasManyAssociation"

export default function hasMany(target, name, descriptor) {
  if (!(target instanceof Function)) target = target.constructor
  const options = descriptor.initializer ? descriptor.initializer() : {}
  HasManyAssociation.install(target, name, options)
  return {}
}
