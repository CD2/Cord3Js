export class Attribute {
  static get(record, name, { defaultValue }: any) {
    if (record.changes.has(name)) {
      return record.changes.get(name)
    }
    if (record.persisted) {
      if (!record.record.data.has(name)) {
        throw new Error(`attribute not loaded: ${name}`)
      }
      return record.record.get(name)
    }
    return defaultValue
  }

  static set(record, name, val, options) {
    if (record.persisted) {
      if (!record.record.data.has(name)) {
        throw new Error(`cant modify persisted attributes without having them loaded`)
      }
    }
    record.changes.set(name, val)
  }

  static install(model, name, options: any = {}) {
    const klass = this

    Object.defineProperty(model, name, {
      get() {
        return klass.get(this, name, options)
      },
      set(val) {
        klass.set(this, name, val, options)
      },
      configurable: true,
    })
  }
}

const attributeTypes = {
  default: Attribute,
}

export default function attribute(target, name, descriptor: any = {}) {
  if (name === `id`) throw new Error(`STOP SETTING \`id\` AS AN ATTRIBUTE`)
  if (target instanceof Function) target = target.prototype

  Attribute.install(target, name)

  return {}
}

// @attrubute formattedAddress = {
//   requestedAttribute: ['address_line_1', 'address_line_2'],
//   install(model) {
//     attribute(model, address_line_1)
//     attribute(model, address_line_2)
//   },
//   get() {
//     return this.address_line_1
//   },
//   set(val) {

//   },
// }
