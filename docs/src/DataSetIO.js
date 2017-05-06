// Export/Import DataSets
import DataSet from './DataSet.js'
import util from './util.js'

/* global LZMA, pako */
// import LZMA from '../libs/lzma.js'
// import pako from '../libs/pako.min.js'

const lzma = new LZMA() // new LZMA('../libs/lzma_worker.js')
// const lzma = new LZMA()

const DataSetIO = {
  // JSON import/export. The JSON returned looks like:
  // ```
  // {
  //   width: dataset.width,
  //   height: dataset.height,
  //   data: string, // json or base64 string of DataSet data
  //   datatype: string, // name of data array type: TypedArray or Array
  //   type: string, // dataset class name
  //   name: string, // identifier of this dataset,
  //   compression: string, // 'none', 'base64', 'zip', 'lzma',
  //   level: num // 0-9, 0 least, 9 most compressed
  // }
  // ```
  compressionNames: ['none', 'base64', 'zip', 'lzma'],
  checkCompression (compression) {
    // if (this.compressionNames.indexOf(compression) < 0)
    if (!this.compressionNames.includes(compression))
      util.error(`DataSetIO: illegal compression ${compression}`)
  },

  // The lzma compressor uses a webworker, therefore async
  lzmaCompressPromise (dataset, level = 9) {
    const dataUint8 = util.arrayToBuffer(dataset.data)
    return new Promise((resolve, reject) => {
      lzma.compress(dataUint8, level, (result, error) => {
        if (error) reject(error)
        const uint8array = result.buffer ? result : new Uint8Array(result)
        const json = this.toJsonString(dataset, uint8array, 'lzma', level)
        resolve(json)
      })
    })
  },
  lzmaDecompressPromise (jsonObj) {
    const {width, height, data, datatype} = jsonObj
    const dataUint8 = util.base64ToBuffer(data)
    return new Promise((resolve, reject) => {
      lzma.decompress(dataUint8, (result, error) => {
        if (error) reject(error)
        const uint8array = new Uint8Array(result)
        const data = util.bufferToArray(uint8array, window[datatype])
        resolve(new DataSet(width, height, data))
      })
    })
  },

  toJson (dataset, compression = 'none', level = 9) {
    this.checkCompression(compression)

    if (compression === 'lzma')
      return this.lzmaCompressPromise(dataset, level)
    if (compression === 'none')
      return this.toJsonString(dataset, dataset.data, compression, level)

    let uint8array = util.arrayToBuffer(dataset.data)
    if (compression === 'zip')
      uint8array = pako.deflate(uint8array, {level})

    return this.toJsonString(dataset, uint8array, compression, level)
  },
  toDataSet (json) {
    const jsonObj = JSON.parse(json)
    const {compression, datatype, width, height} = jsonObj
    this.checkCompression(compression)
    let data = jsonObj.data
    // if (util.typeOf(data) === 'string') data = JSON.parse(data)

    if (compression === 'lzma')
      return this.lzmaDecompressPromise(jsonObj)
    if (compression === 'none')
      return new DataSet(width, height,
        util.convertArray(data, window[datatype]))

    let uint8array = util.base64ToBuffer(data)
    if (compression === 'zip')
      uint8array = pako.inflate(uint8array)
    data = util.bufferToArray(uint8array, window[datatype])

    return new DataSet(width, height, data)
  },
  toJsonString (dataset, data, compression, level) {
    const jsonObj = this.toJsonObject(dataset, data, compression, level)
    return JSON.stringify(jsonObj)
  },
  // Create a legal dataset JSON object, defaulting to non-compressed dataset.
  toJsonObject (dataset, data = dataset.data, compression = 'none', level = 9) {
    data = compression === 'none'
      ? util.convertArray(data, Array)
      : util.bufferToBase64(data)
    const jsonObj = {
      width: dataset.width,
      height: dataset.height,
      datatype: dataset.datatype().name,
      type: dataset.type().name,
      name: dataset.getName(),
      compression: compression,
      level: level,
      data: data
    }
    return jsonObj
  },
  isLZMA (json) { return json.search(/compression":"lzma/) },
  // IndexedDB uses the [Structured Clone Algorithm](https://goo.gl/x8H9HK).
  // DataSets can be directly stored and retrieved, they satisfy
  // the SCA requirements.
  toIndexedDB (dataset) {
    return dataset // place holder for IDB sugar if needed
  }
}

export default DataSetIO
