
export default BaseCls =>
  class extends BaseCls {
    static extended(cls) {
      ;[
        `beforeValidation`,
        `afterValidation`,
        `beforeSave`,
        `afterSave`,
        `beforeCreate`,
        `afterCreate`,
        `beforeUpdate`,
        `afterUpdate`,

        `afterInitialize`,
        // 'afterRequestedAttributesChanged',
        `afterFind`,
        `beforeDestroy`,
        `afterDestroy`,
      ].forEach(name => cls.registerCallback(name))
    }

    static callbacks(name) {
      if (!this._callbacks) this._callbacks = {}
      return this._callbacks[name]
    }
    static registerCallback(callbackName) {
      Object.defineProperty(this, callbackName, {
        value(...args) {
          this.addCallback(callbackName, ...args)
        },
      })
      Object.defineProperty(this.prototype, callbackName, {
        value(...args) {
          this.addCallback(callbackName, ...args)
        },
      })
    }
    static addCallback(callbackName, cbOrName, cb) {
      if (cb === undefined) cb = cbOrName
      if (this._callbacks === undefined) this._callbacks = {}
      if (this._callbacks[callbackName] === undefined) this._callbacks[callbackName] = []
      this._callbacks[callbackName].push(cb)
    }
    static callbacksFor(name) {
      if (!this._callbacks) return []
      return this._callbacks[name] || []
    }

    addCallback(callbackName, cbOrName, cb) {
      if (cb === undefined) cb = cbOrName
      if (this._callbacks === undefined) this._callbacks = {}
      if (this._callbacks[callbackName] === undefined) this._callbacks[callbackName] = []
      this._callbacks[callbackName].push(cb)
    }
    callbacksFor(name) {
      if (!this._callbacks) return []
      return this._callbacks[name] || []
    }

    /* run callbacks
    returns: promise
    name: callbacks to run
    args: [arguments for each callback]
  */
    runCallbacks(name, args = []) {
      const clsCallbacks = this.class.callbacksFor(name)
      const instCallbacks = this.callbacksFor(name)
      const callbacks = clsCallbacks.concat(instCallbacks)
      const rets = callbacks.map(cb => cb(this, ...args))
      return Promise.all(rets)
    }
  }
