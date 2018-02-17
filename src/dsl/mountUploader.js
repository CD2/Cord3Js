import FileManager from '../FileManager'

export default function mountUploader(target, name, descriptor) {
  if (!(target instanceof Function)) target = target.constructor
  const options = descriptor.initializer ? descriptor.initializer() : {}
  FileManager.install(target, name, options)
  return {}
}
