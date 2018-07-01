export default BaseCls =>
  class extends BaseCls {
    static create(attributes) {
      const record = new this(attributes)
      record.save()
      return record
    }

    _attributesForSaveWithValues() {
      let attrs = this.changes.toJS()
      this.class.additionalAttributesToSave.forEach(a => {
        const value = this[a].serialize()
        if (value) {
          attrs = { ...attrs, ...value }
        }
      })
      return attrs
    }

    async save() {
      const valid = await this.isValid()
      if (!valid) {
        console.error(valid, this.errors.messages())
        return false
      }

      await this.runCallbacks(`beforeSave`)
      const saveMethod = this.newRecord ? this._create_record : this._update_record

      try {
        await saveMethod.call(this)
      } catch (err) {
        if (err === `save_failed`) return false
        throw err
      }
      await this.runCallbacks(`afterSave`)
      return true
    }

    async _create_record() {
      const attributes = this._attributesForSaveWithValues()
      await this.runCallbacks(`beforeCreate`)
      const { data, errors } = await this.class.perform(`create`, attributes)
      if (this.processErrors(errors)) {
        throw `save_failed`
      }
      this._id = data.id
      await this.load()
      await this.runCallbacks(`afterCreate`)
      return this._id
    }

    async _update_record() {
      const attributes = this._attributesForSaveWithValues()
      //TODO: only save changed fields
      await this.runCallbacks(`beforeUpdate`)
      const { data, errors } = await this.perform(`update`, attributes)
      if (this.processErrors(errors)) {
        throw `save_failed`
      }
      this.record.update({ ...attributes, ...data })
      this.reset()
      this.runCallbacks(`afterUpdate`)
    }

    processErrors(errors) {
      if (errors.length > 0) {
        try {
          Object.entries(JSON.parse(errors[0])).forEach(([field, messages]) => {
            messages.forEach(msg => this.errors.add(field, msg))
          })
        } catch (e) {
          this.errors.add(`Unknown error`)
        }
        console.error(errors)
        throw `save_failed`
      } else {
        return false
      }
    }

    async destroy() {
      if (!this.persisted) throw new Error(`YO CANT DELETE THIS - ITS NOT REALLY THERE YET`)
      await this.runCallbacks(`beforeDestroy`)
      const { errors } = await this.perform(`destroy`)
      if (errors.length > 0) {
        throw `delete_failed`
      }
      this.record.remove()
      this.runCallbacks(`afterDestroy`)
    }
  }
