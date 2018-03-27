export default function validates(target, name, descriptor) {
  const attribute_name = name[0] === '_' ? name.substring(1, name.length) : name
  const { on, if: ifCallback, ...validators } = descriptor.initializer()
  const validations = Object.entries(validators).map(([validator, options]) => {
    if (options === true) options = {}
    options.attribute = attribute_name
    return { validator, on, if: ifCallback, options }
  })
  target.constructor._validators[attribute_name] = validations

  descriptor.configurable = true
  delete descriptor.value
  delete descriptor.initializer
  return null
}
