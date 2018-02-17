
import {
  observable,
  computed,
  toJS,
  when,
} from "mobx"

export default BaseClass => class extends BaseClass {

  get newRecord() { return this._id === undefined }
  get persisted() { return !this.newRecord }

  @observable errored = false
  @observable loading = false
  @observable _loaded = false

}

// export default module({

//   get newRecord() {
//     return this._id === undefined
//   },

//   get persisted() {
//     return !this.newRecord
//   },

//   // @computed
//   // get loaded() {
//   //   return this.record.fetched
//   // },
//   // @computed
//   // get loading() {
//   //   return this.record.fetching
//   // },
//   // @computed
//   // get errored() {
//   //   return this.record.fetch_error
//   // },

//   @observable errored: false,
//   @observable loading: false,
//   @observable _loaded: false,

// //   get loaded() {
// //   console.warn('THIS IS ABOUT TO BE REMOVED')
// //   return this._loaded
// // },
// // get safe_loaded() { return this._loaded },
// // set loaded(val) { this._loaded = val },

// // whenLoaded(callback) {
// //   when(() => this.loaded, () => callback.call(this, this))
// // },
// // whenLoading(callback) {
// //   when(() => this.loading, () => callback.call(this, this))
// // },

// // __promise: undefined,
// //   toPromise() {
// //   if (!this.__promise) {
// //     this.__promise = new Promise((resolve, reject) => {
// //       when(() => this.loaded, () => {
// //         //when resolving with an object, if that object has a then method then
// //         // it is called because it is thought to be a promise. So before
// //         // resolving it we must delete the then method, then resolve, then
// //         // restore it
// //         const temp = this.then
// //         this.then = undefined
// //         resolve(this)
// //         this.then = temp
// //       })
// //       when(() => this.errored, () => {
// //         reject(this)
// //       })
// //     })
// //   }
// //   return this.__promise
// // },
// // then(callback_or_resolve, reject) {
// //   console.warn('STOP USING THIS THEN METHOD, YOUR DUMMY')
// //   if (this.newRecord) callback_or_resolve(this)
// //   if (reject) {
// //     this.then(result => {
// //       //somthing tried to resolve a promise with this model as the response
// //       // so we have to temporatily delete the `then` method
// //       const temp = this.then
// //       this.then = undefined
// //       // then resolve with this. Now since there is no then method it wont break
// //       callback_or_resolve(result)
// //       // lastly restore the method
// //       this.then = temp
// //     })
// //   } else {
// //     return this.toPromise().then(callback_or_resolve)
// //   }
// // },
// //   catch (callback) { return this.toPromise().catch(callback) },




// })
