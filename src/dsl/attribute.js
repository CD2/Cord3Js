class Attribute {
  configurable = true

  static get(record, name, { defaultValue }) {
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

  static install(model, name, options) {
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

class DateAttribute extends Attribute {
  static get(record, name, options) {
    return new Date(Date.parse(super.get(record, name, options)))
  }

  static set(record, name, val, options) {
    const d = new Date(Date.parse(val))
    super.set(record, name, d.toJSON(), options)
  }
}

class PriceAttribute extends Attribute {
  static install(model, name, options) {
    super.install(model, name, options)
    super.install(model, `${name}_currency`)
    super.install(model, `${name}_price`)
  }
}

const attributeTypes = {
  default: Attribute,
  date: DateAttribute,
  price: PriceAttribute,
}

export default function attribute(target, name, descriptor = {}) {
  if (name === `id`) throw new Error(`STOP SETTING \`id\` AS AN ATTRIBUTE`)
  if (target instanceof Function) target = target.prototype

  function createMethodWithSuper(method, sup) {
    if (!method) return sup
    return function(...args) {
      const super_was = this.super
      this.super = sup
      const ret = method.apply(this, args)
      this.super = super_was
      return ret
    }
  }

  function defaultGetter(name) {
    return function() {
      return Attribute.get(this, name, {})
    }
  }

  function defaultSetter(name) {
    return function(val) {
      Attribute.set(this, name, val)
    }
  }

  const { initializer, value, get, set } = descriptor

  if (initializer) {
    //TODO: need check if initializer is object or other object
    const { type = `default`, ...otherOptions } = initializer()
    const AttributeClass = attributeTypes[type]

    AttributeClass.install(target, name, otherOptions)
  } else if (value) {
    throw new Error(`Attributes as functions not supported`)
  } else if (get || set) {
    // define getter and setter on target but add the functions super into context
    const attributeDescriptor = {
      get: createMethodWithSuper(get, defaultGetter(name)),
      set: createMethodWithSuper(set, defaultSetter(name)),
    }
    // if (get)
    // attributeDescriptor.get = createMethodWithSuper(get, defaultGetter(name));
    // if (set)
    //   attributeDescriptor.set = createMethodWithSuper(set, defaultSetter(name));
    Object.defineProperty(target, name, attributeDescriptor)
  } else {
    // @attribute name
    Object.defineProperty(target, name, {
      get: defaultGetter(name),
      set: defaultSetter(name),
      configurable: true,
      // configurable: true,
    })
  }

  // override default descriptor
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
