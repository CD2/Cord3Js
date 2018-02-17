import HasOneAssication from '../HasOneAssociation'


export default function hasOne(target, name, descriptor) {
  if (!(target instanceof Function)) target = target.constructor
  const options = descriptor.initializer ? descriptor.initializer() : {}
  HasOneAssication.install(target, name, options)
  return {}
}
