// Import the lib/ mmodules via relative paths
import DataSet from '../../src/DataSet.js'
import RGBDataSet from '../../src/RGBDataSet.js'
import util from '../../src/util.js'

// import LZMA from '../libs/lzma-min.js'
// import pako from '../libs/pako.min.js'
// const lzma = new LZMA('../libs/lzma_worker-min.js')
// import lzma from '../libs/lzma_worker.js'

// import LZMA from 'node_modules/lzma/src/lzma.js'
// import pako from 'libs/pako.min.js'
// const lzma = new LZMA('node_modules/lzma/src/lzma_worker.js')
// import LZMA from 'node_modules/lzma/src/lzma-min.js'
// import pako from 'node_modules/pako/libs/pako.min.js'
// const lzma = new LZMA('node_modules/lzma/src/lzma_worker-min.js')

const modules = { DataSet, RGBDataSet, util, LZMA, lzma, pako }
util.toWindow(modules)
console.log(Object.keys(modules).join(', '))

const imageUrl = 'test/data/redfish.png' // 26k
// const imageUrl = 'test/data/7.15.35.png' // 112K
// const imageUrl = 'test/data/10.20.263.png' // 26k
// const imageUrl = 'test/data/ASTGTM2_N00E035_dem.png' // 4.8MB (16->8 bit gray)
const useImg = false
const async = false
if (async) lzma = new LZMA('../libs/lzma_worker.js')
const png24 = imageUrl.match(/.*\/[0-9]/) != null
const [compress, level] = [lzma, 9] // pako or lzma

function compressPromise (compressor, uint8Array, level = 9) {
  return new Promise((resolve, reject) => {
    if (compressor.compress)
      compressor.compress(uint8Array, level,
        (r) => resolve(r.buffer ? r : new Uint8Array(r)))
    else
      resolve(pako.deflate(uint8Array, {level}))
  })
}
function decompressPromise (compressor, uint8Array) {
  return new Promise((resolve, reject) => {
    if (compressor.decompress)
      compressor.decompress(uint8Array,
        (r) => resolve(r.buffer ? r : new Uint8Array(r)))
    else
      resolve(pako.inflate(uint8Array))
  })
}
// const typedArray = util.randomArray(1e6, 0, 256, Uint8Array)
const typedArray = util.repeat(1e6, (i, a) => { a[i] = i }, new Uint8Array(1e6))
util.toWindow({useImg, png24, compressPromise, imageUrl, typedArray})

// const array8toUint8 = (array) => new Uint8Array(new Int8Array(array).buffer)
// const uint8toArray8 = (uint8s) =>
//   util.convertArray(new Int8Array(uint8s.buffer), Array)

// var pixels
// util.imagePromise(imageUrl)
// .then((img) => {
//   pixels = util.imageToBytes(img, true)
//   return compress(pako, pixels, 9)
// })
// .then((pixc) => {
//   console.log(`compression: ${pixels.length} -> ${pixc.length}`)
//   util.toWindow({pixc})
// })
// .catch((error) => console.log(error))

// indexdb; sharable; event system

function sizes (orig, compressed) {
  const percent = 100 * compressed.length / orig.length
  return [orig.length, compressed.length, percent.toFixed(2) + '%']
}
function * main () {
  const img = yield util.imagePromise(imageUrl)
  console.log(useImg ? imageUrl : 'typedarray ' + typedArray.length)
  let pixels = !useImg ? typedArray
    : png24 ? new RGBDataSet(img).data
    : util.imageToBytes(img, true)
  console.log('pixels', pixels)
  if (util.typeOf(pixels) !== 'uint8array') {
    pixels = new Uint8Array(pixels.buffer)
    console.log('uint8array', pixels)
  }
  util.toWindow({img, pixels})

  // const pixjson =
  // const pixels = typedArray
  // console.log('img', img, 'pixels', pixels)

  console.log('compressor:', compress === pako ? 'pako' : 'lzma', level)
  console.time('compress')
  const pixc = yield compressPromise(compress, pixels, level)
  console.timeEnd('compress')
  console.log('compression', ...sizes(pixels, pixc))
  util.toWindow({main, pixels, pixc})

  console.time('decompress')
  const pixd = yield decompressPromise(compress, pixc)
  console.timeEnd('decompress')
  console.log('pixels === pixd', util.arraysEqual(pixels, pixd))

  const pixcs = util.bufferToByteString(pixc)
  console.log('compressed byte string', pixcs.length)
  const pixcsc = util.byteStringToBuffer(pixcs)
  console.log('pixc === pixcsc', util.arraysEqual(pixc, pixcsc))

  const pixcb = util.bufferToBase64(pixc)
  console.log('base64 string', pixcb.length)
  const pixcbc = util.base64ToBuffer(pixcb)
  console.log('pixc === pixcbc', util.arraysEqual(pixc, pixcbc))
  console.log('byte string vs base64', ...sizes(pixcs, pixcb))

  const pixj = JSON.stringify(util.convertArray(pixels, Array))
  util.toWindow({pixd, pixcs, pixcsc, pixcb, pixcbc, pixj})
  console.log('json vs base64', ...sizes(pixj, pixcb))
  console.log('json vs byte string', ...sizes(pixj, pixcs))
}
util.runGenerator(main)
// util.toWindow({main})

// s = String.fromCharCode.apply(null, pixc64c)
// s.length
// a = []
// for(let c of s) a.push(c) // single char strings
// aa = a.map(s=> s.codePointAt(0))
// util.arraysEqual(aa, pixc64c) // true
// al = a.map(c=>c.length)
// util.arraySum(al) // same lengths

  // const pixels = util.imageToBytes(img, true)
  // // const pixc = lzma.compress(pixels, 9) // sync, returns Array
  // const pixc = compress(lzma, pixels, 9) // sync, returns Array
  // util.toWindow({ img, pixels, pixc })
  // console.log('lzma: compression pixels/pixc', pixels.length, pixc.length)
  // const pixd = lzma.decompress(pixc) // sync, returns Array
  // console.log('lzma: pixels = pixd', util.arraysEqual(pixels, pixd))
  // util.toWindow({ img, pixels, pixc, pixd })
  //
  // const pixcUint8 = new Uint8Array(pixc) // Uint & Int same values
  // const pixels64 = util.bufferToBase64(pixels)
  // const pixc64 = util.bufferToBase64(pixcUint8)
  // console.log('lzma: base64 pixels/pixc size', pixels64.length, pixc64.length)
  // util.toWindow({ pixcUint8, pixels64, pixc64 })
  // // console.log('img', img, 'pixels', pixels.length)
  //
  // const pixels64c = lzma.compress(pixels64, 9)
  // const pixc64c = lzma.compress(pixc64, 9)
  // console.log('lzma: string compression', pixels64c.length, pixc64c.length)
  // util.toWindow({ pixels64c, pixc64c })
  //
  // const pixels64cd = lzma.decompress(pixels64c)
  // const pixc64cd = lzma.decompress(pixc64c)
  // console.log('lzma: string decompression', pixels64cd.length, pixc64cd.length)
  // util.toWindow({ pixels64cd, pixc64cd })
// })

// const id = new ImageData(10, 5)
// util.repeat(id.data.length, (i) => { id.data[i] = i })
// const idpx = util.imageToBytes(id)
// const idbase64 = util.bufferToBase64(idpx)
// util.toWindow({ id, idpx, idbase64 })
//
// const blob = new Blob([idpx], {type: 'application/octet-binary'})
// const bloburl = URL.createObjectURL(blob)
// util.toWindow({ blob, bloburl })
