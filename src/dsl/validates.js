export default function validates(target, name, descriptor) {
  const { on, if: ifCallback, ...validators } = descriptor.initializer()
  const validations = Object.entries(validators).map(([validator, options]) => {
    if (options === true) options = {}
    options.attribute = name
    return { validator, on, if: ifCallback, options }
  })
  target.constructor._validators[name] = validations

  descriptor.configurable = true
  delete descriptor.value
  delete descriptor.initializer
  return null
}
