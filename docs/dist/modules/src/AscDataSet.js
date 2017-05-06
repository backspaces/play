import util from './util.js'
import DataSet from './DataSet.js'

// An .asc GIS file: a text file with a header:
//
//     ncols 195
//     nrows 195
//     xllcorner -84.355652
//     yllcorner 39.177963
//     cellsize 0.000093
//     NODATA_value -9999
//
// ..followed by a ncols X nrows matrix of numbers

class AscDataSet extends DataSet {
  constructor (ascString, Type = Array, options = {}) {
    const textData = ascString.split('\n')
    const header = {}
    util.repeat(6, (i) => {
      const keyVal = textData[i].split(/\s+/)
      header[keyVal[0].toLowerCase()] = parseFloat(keyVal[1])
    })
    const data = []
    util.repeat(header.nrows, (i) => {
      const nums = textData[6 + i].trim().split(' ')
      for (const num of nums)
        data.push(parseFloat(num))
    })
    super(header.ncols, header.nrows, util.convertArray(data, Type))
    this.header = header
    Object.assign(this, options)
  }
}

export default AscDataSet
