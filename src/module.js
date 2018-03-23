// Extend method taken from TypeScript
var ___extends =
  (this && this.__extends) ||
  (function() {
    var extendStatics =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function(d, b) {
          d.__proto__ = b
        }) ||
      function(d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]
      }
    return function(d, b) {
      extendStatics(d, b)
      function __() {
        this.constructor = d
      }
      d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __())
    }
  })()

function giveClassAName(cls, name) {
  const funcString = `
        const _this = this
        return function ${name}() {
            return _this !== null && _this.apply(this, arguments) || this;
        }
    `
  const named = new Function(funcString).call(cls)
  ___extends(named, cls)
  return named
}

export function mixin(MixinClass) {
  return BaseCls => {
    // let extended = () => {}
    const wrappedCls = MixinClass(BaseCls)
    if (wrappedCls.extended) {
      wrappedCls.extended(wrappedCls)
      delete wrappedCls.extended
    }
    return giveClassAName(wrappedCls, BaseCls.name)
  }
}

// function Timestamped(Base) {
//   return class extends Base {
//     timestamp = Date.now();

//     test() {
//       console.log(this, "tested");
//     }
//   };
// }

// @mixin(Timestamped)
// class User {
//   thing() {
//     console.log(this.constructor.name);
//   }
// }

// // const TimestampedUser = Timestamped(User)
// // const u = new TimestampedUser()
// // u.test()

// const user = new User();
// console.log(user.timestamp);
// console.log(user.test);
// user.thing();
// console.log(User.name);
