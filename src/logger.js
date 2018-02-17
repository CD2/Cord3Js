
class Logger {

  log(id_or_msg, msg) {
    if (msg) msg = `[${id_or_msg}]${msg}`
    console.warn(msg)
  }

  error(msg) {
    console.error(msg)
  }

  warn(msg) {
    console.warn(msg)
  }

}

export default new Logger()
