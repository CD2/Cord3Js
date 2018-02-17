
export default function validates(target, name, desc) {
  if (desc.initializer) {
    const curValidations = target.validations.fields[name] || {}
    target.validations.fields[name] = {
      ...curValidations,
      ...desc.initializer(),
    }
  } else {
    target.validations.funcs.push(desc.value)
  }
  return { configurable: true }
}
