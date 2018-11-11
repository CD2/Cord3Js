/**
 * creates a random id
 * @param {integer} len length of id to produce
 */
export function uid(len = 8) {
  let str = ``
  for (let i = 0; i < len; i++) {
    str += Math.floor(Math.random() * 0xf).toString(0xf)
  }
  return str
}

/**
 * converts a buffer object to base64 encoded
 * @param  {Buffer} buffer
 */
export function toBase64(buffer) {
  let binary = ``
  let bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
