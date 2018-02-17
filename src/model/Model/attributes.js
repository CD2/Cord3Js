import { observable, computed, action } from "mobx"
import attribute from "../../dsl/attribute"
import { depricationWarning } from "../../utils"
console.log(depricationWarning, attribute)
const attributeDepricationWarning = depricationWarning(
  "using static attributes to assign multiple attributes. Please use `@attribute name` syntax",
)

export default BaseCls =>
  class extends BaseCls {
    defaultAttributes = {}
    changes = observable.map()

    assignAttributes(attrs) {
      Object.entries(attrs).forEach(([key, value]) => (this[key] = value))
    }

    changed() {
      this.changes.keys().length > 0
    }

    reset() {
      this.changes.clear()
    }

    static set attributes(val) {
      attributeDepricationWarning()
      val.forEach(attrName => {
        // console.log(attrName, this)
        attribute(this.prototype, attrName, {})
      })
    }
  }
