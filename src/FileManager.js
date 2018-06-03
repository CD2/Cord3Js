import { observable, action } from "mobx"
import App from "models/App"
import attribute from "./dsl/attribute"

export default class FileManager {
  static install(model, name, options) {
    model.beforeValidation(`ensure file type for ${name}`, m => {
      const manager = m[name]
      if (manager && !manager.hasValidFileType()) {
        m.errors.add(name, `must be of type ${manager.allowedTypes}`)
      }
    })
    model.beforeValidation(`ensure ${name} file has loaded`, m => {
      const manager = m[name]
      if (manager && manager.loading) {
        return new Promise((resolve, reject) => {
          manager.onFileLoad(() => resolve())
          manager.onFileError(() => reject({ [name]: `failed to load` }))
        })
      }
    })

    attribute(model, `${name}_uid`)
    attribute(model, `${name}_name`)

    model.requestedAttributeAliases[`${name}`] = [`${name}_name`, `${name}_uid`]
    model.additionalAttributesToSave.push(`${name}`)

    Object.defineProperty(model.prototype, name, {
      get() {
        if (!this[`_${name}`]) {
          this[`_${name}`] = new FileManager(this, name, options)
        }
        return this[`_${name}`]
      },
      set(val) {
        if (!this[`_${name}`]) {
          this[`_${name}`] = new FileManager(this, name, options)
        }
        this[`_${name}`].set(val)
      },
    })

    // ${name}_url()
    Object.defineProperty(model.prototype, `${name}_url`, {
      set(val) {
        this[`name`].setUrl(val)
      },
    })
  }

  @observable _url = undefined
  @observable _file = undefined
  @observable _name = undefined
  @observable changed = false
  @observable loaded = false
  @observable loading = false

  constructor(record, fieldName, { allowedTypes, versions = {} } = {}) {
    window.record = record
    this.record = record
    this.fieldName = fieldName
    this.allowedTypes = allowedTypes
    Object.entries(versions).forEach(([name, size]) => this.addVersion(name, size))
  }

  addVersion(name, size) {
    Object.defineProperty(this, name, {
      value: { url: this.buildUrl({ size }) },
    })
  }

  async buildUrl(size) {
    const img = await App.image({ uid: this.rawUid, size: size })
    if(img) {
      this.setUrl(img.data.url)
      return this._url
    }
  }

  get() {
    return this
  }

  @action
  set(val) {
    this.loading = true
    this.loaded = false
    this.constructor.loadFile(val).then(
      action(`file loaded`, ({ name, url }) => {
        this._file = val
        this.record[`${this.fieldName}_name`] = name
        this._url = url
        this.changed = true
        this.loading = false
        this.loaded = true
      }),
    )
  }

  serialize() {
    if (this.changed) {
      return {
        [this.fieldName]: {
          data: this.url || null,
          name: this.filename || null,
        },
      }
    }
  }

  @action
  setUrl(val) {
    this._url = val
    this._file = undefined
    this.changed = true
  }

  get rawUid() {
    return this.record[`${this.fieldName}_uid`]
  }

  get url() {
    if (this._url) return this._url
    if (this.rawUid) return this.buildUrl()
  }

  get data() {
    if (!this.file) return
    return this._data
  }

  static loadFile(file) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader()
      reader.onload = function(e) {
        const fileInfo = {
          name: file.name,
          url: e.target.result,
        }
        resolve(fileInfo)
      }
      reader.onerror = function(e) {
        reject(e)
      }
      reader.readAsDataURL(file)
    })
  }

  get filename() {
    if (this._filename) return this._filename
    if (this._name) return this._name
    return this.record.file_name
  }

  set filename(val) {
    this._filename = val
  }
  get extension() {
    if (this.filename) return this.filename.slice(this.filename.lastIndexOf(`.`) + 1).toLowerCase()
  }
  get basename() {
    if (this.filename) return this.filename.slice(0, this.filename.lastIndexOf(`.`))
  }

  get type() {
    if (this._type) return this.type
    if (this.file) return this.file.type
  }
  set type(val) {
    this._type = val
  }

  _typeSets = {
    image: `.jpg,.png,.jpeg,.gif,.tiff,.svg,.bmp`,
    spreadSheets: `.xls,.xlw,.xlt,.xml,.xlsx,.xlsm,.xltx,.xltm,.xlsb`,
  }

  get allowedTypes() {
    return this._allowedTypes || []
  }
  set allowedTypes(val) {
    if (typeof val === `string`) {
      const set = this._typeSets[val]
      if (!set) throw new Error(`unknown type set ${val}`)
      this._allowedTypes = set
    } else {
      this._allowedTypes = val
    }
  }

  hasValidFileType() {
    if (this.allowedTypes.length === 0 || !this.extension) return true
    return this.allowedTypes.some(type => this.extension.match(`^${type}$`))
  }
}
